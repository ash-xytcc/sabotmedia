import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { upsertMediaAsset } from './_lib/mediaAssets.js'

const MEDIA_BINDING_NAMES = ['SABOT_MEDIA_BUCKET', 'MEDIA_BUCKET', 'ASSETS_BUCKET', 'SABOT_AUDIO_BUCKET', 'AUDIO_MEDIA_BUCKET']
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm'])
const MAX_RENDER_UPLOAD_BYTES = 1024 * 1024 * 1024

export async function onRequestPost(context) {
  try {
    const auth = authorizeWorker(context)
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status)
    const storage = getMediaBucket(context)
    if (!storage?.bucket) return json({ ok: false, error: 'media storage binding is missing' }, 503)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('episode worker media')

    const rawType = String(context.request.headers.get('content-type') || '').toLowerCase().split(';')[0]
    if (ALLOWED_VIDEO_TYPES.has(rawType) && context.request.headers.get('x-episode-id')) {
      const size = Number(context.request.headers.get('content-length') || 0)
      if (!size) return json({ ok: false, error: 'content-length is required for streamed rendered video' }, 411)
      if (size > MAX_RENDER_UPLOAD_BYTES) return json({ ok: false, error: 'rendered video exceeds the worker handoff limit' }, 413)
      if (!context.request.body) return json({ ok: false, error: 'rendered video body is empty' }, 400)
      return storeRenderedVideo(context, db, storage, {
        mimeType: rawType,
        size,
        episodeId: context.request.headers.get('x-episode-id'),
        jobId: context.request.headers.get('x-job-id'),
        body: context.request.body,
      })
    }

    const form = await context.request.formData()
    const file = form.get('file')
    if (!file || typeof file.arrayBuffer !== 'function') return json({ ok: false, error: 'rendered video file is required' }, 400)
    const mimeType = String(file.type || form.get('mimeType') || 'video/mp4').toLowerCase().split(';')[0]
    if (!ALLOWED_VIDEO_TYPES.has(mimeType)) return json({ ok: false, error: `unsupported rendered video type: ${mimeType}` }, 415)
    const size = Number(file.size || 0)
    if (!size) return json({ ok: false, error: 'rendered video is empty' }, 400)
    if (size > MAX_RENDER_UPLOAD_BYTES) return json({ ok: false, error: 'rendered video exceeds the worker handoff limit' }, 413)

    return storeRenderedVideo(context, db, storage, {
      mimeType,
      size,
      episodeId: form.get('episodeId'),
      jobId: form.get('jobId'),
      body: await file.arrayBuffer(),
    })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

async function storeRenderedVideo(context, db, storage, input) {
  const mimeType = String(input.mimeType || 'video/mp4').toLowerCase().split(';')[0]
  if (!ALLOWED_VIDEO_TYPES.has(mimeType)) return json({ ok: false, error: `unsupported rendered video type: ${mimeType}` }, 415)
  const size = Number(input.size || 0)
  if (!size || size > MAX_RENDER_UPLOAD_BYTES) return json({ ok: false, error: 'invalid rendered video size' }, 400)

  const episodeId = sanitizeSegment(input.episodeId || 'episode')
  const jobId = sanitizeSegment(input.jobId || createId('render'))
  const extension = mimeType === 'video/webm' ? 'webm' : 'mp4'
  const filename = `${episodeId}-${jobId}.${extension}`
  const storageKey = `media/generated/podcast-video/${episodeId}/${jobId}.${extension}`
  const mediaId = `media-${jobId}`
  const createdAt = new Date().toISOString()

  await storage.bucket.put(storageKey, input.body, {
    httpMetadata: {
      contentType: mimeType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      mediaId,
      episodeId,
      jobId,
      source: 'episode-media-worker',
      size: String(size),
      createdAt,
    },
  })

  const publicUrl = publicMediaUrl(context.request.url, storageKey, filename)
  let asset
  try {
    asset = await upsertMediaAsset(db, {
      id: mediaId,
      title: `${episodeId} rendered video`,
      url: publicUrl,
      downloadUrl: publicUrl,
      mimeType,
      size,
      mediaType: 'video',
      extension,
      filename,
      folder: 'Video',
      storageKey,
      source: 'episode-media-worker',
      createdAt,
    })
  } catch (registrationError) {
    try { await storage.bucket.delete(storageKey) } catch { /* best-effort rollback */ }
    throw new Error(`rendered video registry write failed; stored object rolled back. ${String(registrationError?.message || registrationError)}`)
  }

  return json({ ok: true, media: { ...asset, publicUrl: asset.url, storageBinding: storage.name } })
}

function authorizeWorker(context) {
  const expected = String(context?.env?.EPISODE_WORKER_TOKEN || '').trim()
  if (!expected) return { ok: false, status: 503, error: 'EPISODE_WORKER_TOKEN is not configured' }
  const header = String(context?.request?.headers?.get('authorization') || '')
  const provided = header.replace(/^Bearer\s+/i, '').trim()
  if (!provided || !constantTimeEqual(provided, expected)) return { ok: false, status: 403, error: 'invalid episode worker token' }
  return { ok: true, status: 200, error: '' }
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

function getMediaBucket(context) {
  for (const name of MEDIA_BINDING_NAMES) {
    if (context?.env?.[name]) return { name, bucket: context.env[name] }
  }
  return null
}

function publicMediaUrl(requestUrl, storageKey, filename) {
  const url = new URL(requestUrl)
  url.pathname = '/api/media/files'
  url.search = ''
  url.searchParams.set('key', storageKey)
  url.searchParams.set('filename', filename)
  return url.toString()
}

function sanitizeSegment(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'item'
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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
