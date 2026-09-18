const DESTINATIONS = new Set(['website', 'podcastRss', 'youtube', 'peertube'])
const JOB_STATUSES = new Set(['queued', 'processing', 'published', 'failed', 'retrying', 'cancelled'])
const STALE_JOB_MINUTES = 30

export async function ensureEpisodePublishingTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS episode_destination_state (
      episode_id TEXT NOT NULL,
      destination TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      remote_id TEXT NOT NULL DEFAULT '',
      remote_url TEXT NOT NULL DEFAULT '',
      last_error TEXT NOT NULL DEFAULT '',
      override_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (episode_id, destination)
    )
  `).run()

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS episode_publish_jobs (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      destination TEXT NOT NULL,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      idempotency_key TEXT NOT NULL UNIQUE,
      depends_on_id TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      available_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      locked_at TEXT NOT NULL DEFAULT '',
      last_error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run()

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_episode_jobs_status_available ON episode_publish_jobs(status, available_at)`).run()
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_episode_jobs_episode ON episode_publish_jobs(episode_id, updated_at DESC)`).run()
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_episode_destination_episode ON episode_destination_state(episode_id, updated_at DESC)`).run()
}

export function normalizeDestinationList(input = []) {
  const values = Array.isArray(input) ? input : [input]
  return [...new Set(values.map((value) => String(value || '').trim()).filter((value) => DESTINATIONS.has(value)))]
}

export async function listEpisodePublishingState(db, episodeId) {
  await ensureEpisodePublishingTables(db)
  const statesResult = await db.prepare(`
    SELECT episode_id, destination, status, remote_id, remote_url, last_error, override_json, created_at, updated_at
    FROM episode_destination_state
    WHERE episode_id = ?
    ORDER BY destination ASC
  `).bind(episodeId).all()
  const jobsResult = await db.prepare(`
    SELECT id, episode_id, destination, job_type, status, idempotency_key, depends_on_id, attempts, max_attempts, available_at, locked_at, last_error, created_at, updated_at
    FROM episode_publish_jobs
    WHERE episode_id = ?
    ORDER BY datetime(created_at) DESC
    LIMIT 100
  `).bind(episodeId).all()

  return {
    destinations: (statesResult?.results || []).map(rowToDestinationState),
    jobs: (jobsResult?.results || []).map(rowToJob),
  }
}

export async function markDestination(db, episodeId, destination, patch = {}) {
  await ensureEpisodePublishingTables(db)
  if (!DESTINATIONS.has(destination)) throw new Error(`unsupported destination: ${destination}`)
  const current = await db.prepare(`
    SELECT episode_id, destination, status, remote_id, remote_url, last_error, override_json, created_at, updated_at
    FROM episode_destination_state WHERE episode_id = ? AND destination = ? LIMIT 1
  `).bind(episodeId, destination).first()

  const now = new Date().toISOString()
  const status = normalizeStatus(patch.status || current?.status || 'queued')
  const remoteId = clean(patch.remoteId ?? current?.remote_id)
  const remoteUrl = cleanUrl(patch.remoteUrl ?? current?.remote_url)
  const lastError = clean(patch.lastError ?? current?.last_error, 4000)
  const overrideJson = JSON.stringify(normalizeOverride(patch.override ?? parseJson(current?.override_json)))
  const createdAt = String(current?.created_at || now)

  await db.prepare(`
    INSERT INTO episode_destination_state (
      episode_id, destination, status, remote_id, remote_url, last_error, override_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(episode_id, destination) DO UPDATE SET
      status = excluded.status,
      remote_id = excluded.remote_id,
      remote_url = excluded.remote_url,
      last_error = excluded.last_error,
      override_json = excluded.override_json,
      updated_at = excluded.updated_at
  `).bind(episodeId, destination, status, remoteId, remoteUrl, lastError, overrideJson, createdAt, now).run()

  return {
    episodeId,
    destination,
    status,
    remoteId,
    remoteUrl,
    lastError,
    override: parseJson(overrideJson),
    createdAt,
    updatedAt: now,
  }
}

export async function enqueueJob(db, input = {}) {
  await ensureEpisodePublishingTables(db)
  const episodeId = clean(input.episodeId, 200)
  const destination = clean(input.destination, 40)
  const jobType = clean(input.jobType, 80)
  const idempotencyKey = clean(input.idempotencyKey, 500)
  if (!episodeId || !destination || !jobType || !idempotencyKey) throw new Error('episode job is missing required identity fields')

  const existing = await db.prepare(`
    SELECT id, episode_id, destination, job_type, status, idempotency_key, depends_on_id, attempts, max_attempts, available_at, locked_at, last_error, created_at, updated_at
    FROM episode_publish_jobs WHERE idempotency_key = ? LIMIT 1
  `).bind(idempotencyKey).first()
  if (existing) return rowToJob(existing)

  const id = createId('episode-job')
  const now = new Date().toISOString()
  const status = normalizeStatus(input.status || 'queued')
  const payload = input.payload && typeof input.payload === 'object' ? input.payload : {}
  const dependsOnId = clean(input.dependsOnId, 200)
  const maxAttempts = Math.min(20, Math.max(1, Number(input.maxAttempts || 5) || 5))
  const availableAt = cleanDate(input.availableAt) || now

  await db.prepare(`
    INSERT INTO episode_publish_jobs (
      id, episode_id, destination, job_type, status, idempotency_key, depends_on_id,
      payload_json, attempts, max_attempts, available_at, locked_at, last_error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, '', '', ?, ?)
  `).bind(
    id,
    episodeId,
    destination,
    jobType,
    status,
    idempotencyKey,
    dependsOnId,
    JSON.stringify(payload),
    maxAttempts,
    availableAt,
    now,
    now,
  ).run()

  return {
    id,
    episodeId,
    destination,
    jobType,
    status,
    idempotencyKey,
    dependsOnId,
    attempts: 0,
    maxAttempts,
    availableAt,
    lockedAt: '',
    lastError: '',
    createdAt: now,
    updatedAt: now,
  }
}

export async function retryDestination(db, episodeId, destination) {
  await ensureEpisodePublishingTables(db)
  if (!DESTINATIONS.has(destination)) throw new Error(`unsupported destination: ${destination}`)

  const state = await db.prepare(`SELECT status, remote_id, remote_url FROM episode_destination_state WHERE episode_id = ? AND destination = ? LIMIT 1`)
    .bind(episodeId, destination)
    .first()
  if (state?.remote_id || state?.remote_url || state?.status === 'published') {
    return markDestination(db, episodeId, destination, { status: 'published', lastError: '' })
  }

  const job = await db.prepare(`
    SELECT id, depends_on_id FROM episode_publish_jobs
    WHERE episode_id = ? AND destination = ? AND status IN ('failed', 'cancelled')
    ORDER BY datetime(updated_at) DESC LIMIT 1
  `).bind(episodeId, destination).first()
  if (!job?.id) throw new Error(`no failed ${destination} job is available to retry`)

  const now = new Date().toISOString()
  if (job.depends_on_id) {
    const dependency = await db.prepare(`
      SELECT id, status FROM episode_publish_jobs WHERE id = ? LIMIT 1
    `).bind(job.depends_on_id).first()
    if (dependency?.id && ['failed', 'cancelled'].includes(String(dependency.status || ''))) {
      await db.prepare(`
        UPDATE episode_publish_jobs
        SET status = 'retrying', attempts = 0, available_at = ?, locked_at = '', last_error = '', updated_at = ?
        WHERE id = ?
      `).bind(now, now, dependency.id).run()
    }
  }

  await db.prepare(`
    UPDATE episode_publish_jobs
    SET status = 'retrying', attempts = 0, available_at = ?, locked_at = '', last_error = '', updated_at = ?
    WHERE id = ?
  `).bind(now, now, job.id).run()
  return markDestination(db, episodeId, destination, { status: 'retrying', lastError: '' })
}

export async function claimNextEpisodeJob(db, options = {}) {
  await ensureEpisodePublishingTables(db)
  await requeueStaleEpisodeJobs(db)
  const destination = clean(options.destination, 40)
  const now = new Date().toISOString()
  const clauses = ["j.status IN ('queued', 'retrying')", 'datetime(j.available_at) <= datetime(?)', 'j.attempts < j.max_attempts']
  const binds = [now]
  if (destination) {
    clauses.push('j.destination = ?')
    binds.push(destination)
  }
  clauses.push(`(j.depends_on_id = '' OR EXISTS (
    SELECT 1 FROM episode_publish_jobs dep WHERE dep.id = j.depends_on_id AND dep.status = 'published'
  ))`)

  const row = await db.prepare(`
    SELECT j.id, j.episode_id, j.destination, j.job_type, j.status, j.idempotency_key, j.depends_on_id,
           j.payload_json, j.attempts, j.max_attempts, j.available_at, j.locked_at, j.last_error, j.created_at, j.updated_at
    FROM episode_publish_jobs j
    WHERE ${clauses.join(' AND ')}
    ORDER BY datetime(j.available_at) ASC, datetime(j.created_at) ASC
    LIMIT 1
  `).bind(...binds).first()
  if (!row?.id) return null

  const lockedAt = new Date().toISOString()
  const result = await db.prepare(`
    UPDATE episode_publish_jobs
    SET status = 'processing', attempts = attempts + 1, locked_at = ?, updated_at = ?
    WHERE id = ? AND status IN ('queued', 'retrying')
  `).bind(lockedAt, lockedAt, row.id).run()
  if (Number(result?.meta?.changes || 0) !== 1) return null

  return {
    ...rowToJob({ ...row, status: 'processing', attempts: Number(row.attempts || 0) + 1, locked_at: lockedAt, updated_at: lockedAt }),
    payload: parseJson(row.payload_json),
  }
}

export async function requeueStaleEpisodeJobs(db, minutes = STALE_JOB_MINUTES) {
  await ensureEpisodePublishingTables(db)
  const safeMinutes = Math.max(5, Math.min(24 * 60, Number(minutes || STALE_JOB_MINUTES) || STALE_JOB_MINUTES))
  const cutoff = new Date(Date.now() - safeMinutes * 60_000).toISOString()
  const now = new Date().toISOString()
  await db.prepare(`
    UPDATE episode_publish_jobs
    SET status = 'retrying', locked_at = '', available_at = ?, last_error = 'Worker lease expired; automatically requeued.', updated_at = ?
    WHERE status = 'processing' AND locked_at != '' AND datetime(locked_at) < datetime(?) AND attempts < max_attempts
  `).bind(now, now, cutoff).run()
}

export async function finishEpisodeJob(db, jobId, result = {}) {
  await ensureEpisodePublishingTables(db)
  const row = await db.prepare(`
    SELECT id, episode_id, destination, job_type, status, idempotency_key, depends_on_id, payload_json,
           attempts, max_attempts, available_at, locked_at, last_error, created_at, updated_at
    FROM episode_publish_jobs WHERE id = ? LIMIT 1
  `).bind(jobId).first()
  if (!row?.id) throw new Error('episode publish job not found')

  const ok = result.ok === true
  const now = new Date().toISOString()
  const status = ok ? 'published' : 'failed'
  const error = ok ? '' : clean(result.error || 'publishing job failed', 4000)
  await db.prepare(`
    UPDATE episode_publish_jobs
    SET status = ?, locked_at = '', last_error = ?, updated_at = ?
    WHERE id = ?
  `).bind(status, error, now, jobId).run()

  if (row.destination === 'youtube' || row.destination === 'peertube') {
    await markDestination(db, row.episode_id, row.destination, {
      status,
      remoteId: result.remoteId || '',
      remoteUrl: result.remoteUrl || '',
      lastError: error,
    })
  }

  return rowToJob({ ...row, status, locked_at: '', last_error: error, updated_at: now })
}

export function buildEpisodeJobPayload(episode = {}, show = {}, override = {}) {
  const canonicalAudio = findRelatedAsset(episode, ['canonical-audio', 'podcast-audio', 'audio'])
  const artwork = findRelatedAsset(episode, ['episode-artwork', 'artwork', 'cover'])
  const title = String(episode.title || 'Untitled episode')
  const description = String(episode.podcastSummary || episode.excerpt || stripHtml(episode.bodyHtml || episode.body || ''))
  const audioUrl = String(episode.podcastRssEnclosureUrl || episode.podcastAudioUrl || canonicalAudio?.url || '')
  const artworkUrl = String(episode.podcastCoverImage || episode.featuredImage || artwork?.url || show.defaultCoverArt || '')
  return {
    episodeId: String(episode.id || ''),
    guid: String(episode.sourceExternalId || episode.id || ''),
    showId: String(show.id || show.slug || ''),
    showTitle: String(show.podcastTitle || ''),
    title: clean(override.title || title, 300),
    description: clean(override.description || description, 5000),
    tags: Array.isArray(override.tags) ? override.tags : Array.isArray(episode.tags) ? episode.tags : [],
    publishAt: String(episode.publishedAt || ''),
    episodeNumber: String(episode.podcastEpisodeNumber || ''),
    season: String(episode.podcastSeason || ''),
    transcript: String(episode.podcastTranscript || ''),
    explicit: episode.podcastExplicit == null ? Boolean(canonicalAudio?.podcastExplicit) : Boolean(episode.podcastExplicit),
    hosts: Array.isArray(canonicalAudio?.hosts) ? canonicalAudio.hosts : [],
    audio: {
      mediaId: String(canonicalAudio?.mediaId || canonicalAudio?.id || episode.podcastAudioMediaId || ''),
      storageKey: String(canonicalAudio?.storageKey || episode.podcastAudioStorageKey || ''),
      url: audioUrl,
      mimeType: String(canonicalAudio?.mimeType || episode.podcastMimeType || 'audio/mpeg'),
      size: Number(canonicalAudio?.size || episode.podcastFileSize || 0) || 0,
    },
    artwork: {
      mediaId: String(artwork?.mediaId || artwork?.id || ''),
      storageKey: String(artwork?.storageKey || ''),
      url: artworkUrl,
    },
    override: normalizeOverride(override),
  }
}

export function findRelatedAsset(episode = {}, roles = []) {
  const accepted = new Set(roles.map((value) => String(value).toLowerCase()))
  return (Array.isArray(episode.relatedAssets) ? episode.relatedAssets : []).find((asset) => {
    const values = [asset?.role, asset?.type, asset?.kind].map((value) => String(value || '').toLowerCase())
    return values.some((value) => accepted.has(value))
  }) || null
}

function rowToDestinationState(row = {}) {
  return {
    episodeId: String(row.episode_id || ''),
    destination: String(row.destination || ''),
    status: normalizeStatus(row.status),
    remoteId: String(row.remote_id || ''),
    remoteUrl: String(row.remote_url || ''),
    lastError: String(row.last_error || ''),
    override: normalizeOverride(parseJson(row.override_json)),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  }
}

function rowToJob(row = {}) {
  return {
    id: String(row.id || ''),
    episodeId: String(row.episode_id || ''),
    destination: String(row.destination || ''),
    jobType: String(row.job_type || ''),
    status: normalizeStatus(row.status),
    idempotencyKey: String(row.idempotency_key || ''),
    dependsOnId: String(row.depends_on_id || ''),
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 0),
    availableAt: String(row.available_at || ''),
    lockedAt: String(row.locked_at || ''),
    lastError: String(row.last_error || ''),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  }
}

function normalizeOverride(value = {}) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    title: clean(raw.title, 300),
    description: clean(raw.description, 5000),
    tags: Array.isArray(raw.tags) ? raw.tags.map((tag) => clean(tag, 80)).filter(Boolean).slice(0, 50) : [],
    privacy: clean(raw.privacy, 40),
    categoryId: clean(raw.categoryId, 80),
    channelId: clean(raw.channelId, 200),
  }
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase()
  return JOB_STATUSES.has(status) ? status : 'queued'
}

function parseJson(value) {
  if (value && typeof value === 'object') return value
  try {
    const parsed = JSON.parse(String(value || '{}'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function clean(value, max = 1000) {
  return String(value || '').trim().slice(0, max)
}

function cleanUrl(value) {
  const raw = clean(value, 3000)
  if (!raw) return ''
  if (raw.startsWith('/')) return raw
  return /^https?:\/\//i.test(raw) ? raw : ''
}

function cleanDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const time = new Date(raw).getTime()
  return Number.isFinite(time) ? new Date(time).toISOString() : ''
}

function createId(prefix) {
  if (typeof crypto?.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
