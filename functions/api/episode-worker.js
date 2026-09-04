import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { getExistingNativeEntry, upsertNativeEntry } from './_lib/nativePublicContent.js'
import {
  claimNextEpisodeJob,
  ensureEpisodePublishingTables,
  finishEpisodeJob,
  markDestination,
} from './_lib/episodePublishing.js'

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      allow: 'POST,OPTIONS',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
    },
  })
}

export async function onRequestPost(context) {
  try {
    const auth = authorizeWorker(context)
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('episode worker')
    await ensureEpisodePublishingTables(db)
    await ensureJobResultTable(db)

    const body = await context.request.json().catch(() => ({}))
    const action = String(body?.action || '').trim()

    if (action === 'claim') {
      const job = await claimNextEpisodeJob(db, { destination: body.destination || '' })
      if (!job) return json({ ok: true, job: null })
      const dependencyResult = job.dependsOnId ? await readJobResult(db, job.dependsOnId) : null
      if (job.destination === 'youtube' || job.destination === 'peertube') {
        await markDestination(db, job.episodeId, job.destination, { status: 'processing', lastError: '' })
        if (job.jobType === 'upload_video') {
          await updatePublicVideoStatus(db, job.episodeId, job.destination, { status: 'processing', lastError: '' })
        }
      }
      return json({ ok: true, job: { ...job, dependencyResult } })
    }

    if (action === 'complete') {
      const jobId = String(body?.jobId || '').trim()
      if (!jobId) return json({ ok: false, error: 'jobId is required' }, 400)
      const result = normalizeResult(body?.result || {})
      await writeJobResult(db, jobId, result)
      const job = await finishEpisodeJob(db, jobId, result)

      if (job.destination === 'youtube' || job.destination === 'peertube') {
        if (result.ok && result.remoteUrl) {
          await attachPublishedVideo(db, job, result)
        } else if (!result.ok && job.jobType === 'upload_video') {
          await updatePublicVideoStatus(db, job.episodeId, job.destination, {
            status: 'failed',
            lastError: result.error || 'Video upload failed.',
          })
        }
      }
      if (!result.ok && job.jobType === 'render_video') {
        await failDependentVideoJobs(db, job.id, result.error || 'Video render failed.')
      }

      return json({ ok: true, job, result })
    }

    return json({ ok: false, error: `unsupported worker action: ${action || 'missing'}` }, 400)
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

async function attachPublishedVideo(db, job, result) {
  const episode = await getExistingNativeEntry(db, job.episodeId)
  if (!episode) return
  const relatedAssets = (Array.isArray(episode.relatedAssets) ? episode.relatedAssets : [])
    .filter((asset) => !(String(asset?.role || '') === 'published-video' && String(asset?.destination || '') === job.destination))
  relatedAssets.push({
    role: 'published-video',
    kind: 'video',
    type: 'video',
    destination: job.destination,
    title: `${job.destination === 'youtube' ? 'YouTube' : 'PeerTube'} video`,
    status: 'published',
    remoteId: String(result.remoteId || ''),
    url: String(result.remoteUrl || ''),
    lastError: '',
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  await upsertNativeEntry(db, { ...episode, relatedAssets })
}

async function updatePublicVideoStatus(db, episodeId, destination, patch = {}) {
  const episode = await getExistingNativeEntry(db, episodeId)
  if (!episode) return
  const existing = (Array.isArray(episode.relatedAssets) ? episode.relatedAssets : [])
    .find((asset) => String(asset?.role || '') === 'published-video' && String(asset?.destination || '') === destination)
  const relatedAssets = (Array.isArray(episode.relatedAssets) ? episode.relatedAssets : [])
    .filter((asset) => !(String(asset?.role || '') === 'published-video' && String(asset?.destination || '') === destination))
  relatedAssets.push({
    role: 'published-video',
    kind: 'video',
    type: 'video',
    destination,
    title: `${destination === 'youtube' ? 'YouTube' : 'PeerTube'} video`,
    status: String(patch.status || existing?.status || 'queued'),
    remoteId: String(patch.remoteId || existing?.remoteId || ''),
    url: safeUrl(patch.remoteUrl || existing?.url || ''),
    lastError: String(patch.lastError || '').slice(0, 500),
    publishedAt: String(existing?.publishedAt || ''),
    updatedAt: new Date().toISOString(),
  })
  await upsertNativeEntry(db, { ...episode, relatedAssets })
}

async function failDependentVideoJobs(db, renderJobId, error) {
  const rows = await db.prepare(`
    SELECT id, episode_id, destination
    FROM episode_publish_jobs
    WHERE depends_on_id = ? AND status IN ('queued', 'retrying')
  `).bind(renderJobId).all()
  const now = new Date().toISOString()
  for (const row of rows?.results || []) {
    await db.prepare(`
      UPDATE episode_publish_jobs SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?
    `).bind(String(error || 'Video render failed.'), now, row.id).run()
    if (row.destination === 'youtube' || row.destination === 'peertube') {
      await markDestination(db, row.episode_id, row.destination, { status: 'failed', lastError: error })
      await updatePublicVideoStatus(db, row.episode_id, row.destination, { status: 'failed', lastError: error })
    }
  }
}

async function ensureJobResultTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS episode_publish_job_results (
      job_id TEXT PRIMARY KEY,
      result_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run()
}

async function writeJobResult(db, jobId, result) {
  const now = new Date().toISOString()
  await db.prepare(`
    INSERT INTO episode_publish_job_results (job_id, result_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(job_id) DO UPDATE SET result_json = excluded.result_json, updated_at = excluded.updated_at
  `).bind(jobId, JSON.stringify(result || {}), now).run()
}

async function readJobResult(db, jobId) {
  const row = await db.prepare('SELECT result_json FROM episode_publish_job_results WHERE job_id = ? LIMIT 1').bind(jobId).first()
  try {
    return row?.result_json ? JSON.parse(row.result_json) : null
  } catch {
    return null
  }
}

function normalizeResult(input = {}) {
  const result = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  return {
    ok: result.ok === true,
    error: String(result.error || '').slice(0, 4000),
    remoteId: String(result.remoteId || '').slice(0, 500),
    remoteUrl: safeUrl(result.remoteUrl),
    renderedVideoUrl: safeUrl(result.renderedVideoUrl),
    renderedMediaId: String(result.renderedMediaId || '').slice(0, 500),
    renderedStorageKey: String(result.renderedStorageKey || '').slice(0, 2000),
    mimeType: String(result.mimeType || '').slice(0, 120),
    size: Number(result.size || 0) || 0,
  }
}

function authorizeWorker(context) {
  const expected = String(context?.env?.EPISODE_WORKER_TOKEN || '').trim()
  if (!expected) return { ok: false, status: 503, error: 'EPISODE_WORKER_TOKEN is not configured' }
  const header = String(context?.request?.headers?.get('authorization') || '')
  const provided = header.replace(/^Bearer\s+/i, '').trim()
  if (!provided || provided !== expected) return { ok: false, status: 403, error: 'invalid episode worker token' }
  return { ok: true, status: 200, error: '' }
}

function safeUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/')) return raw
  return /^https?:\/\//i.test(raw) ? raw.slice(0, 3000) : ''
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
