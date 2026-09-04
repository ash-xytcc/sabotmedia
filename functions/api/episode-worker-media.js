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

    const form = await context.request.formData()
    const file = form.get('file')
    if (!file || typeof file.arrayBuffer !== 'function') return json({ ok: false, error: 'rendered video file is required' }, 400)
    const mimeType = String(file.type || form.get('mimeType') || 'video/mp4').toLowerCase().split(';')[0]
    if (!ALLOWED_VIDEO_TYPES.has(mimeType)) return json({ ok: false, error: `unsupported rendered video type: ${mimeType}` }, 415)
    const size = Number(file.size || 0)
    if (!size) return json({ ok: false, error: 'rendered video is empty' }, 400)
    if (size > MAX_RENDER_UPLOAD_BYTES) return json({ ok: false, error: 'rendered video exceeds the worker handoff limit' }, 413)

    const episodeId = sanitizeSegment(form.get('episodeId') || 'episode')
    const jobId = sanitizeSegment(form.get('jobId') || createId('render'))
    const extension = mimeType === 'video/webm' ? 'webm' : 'mp4'
    const filename = `${episodeId}-${jobId}.${extension}`
    const storageKey = `media/generated/podcast-video/${episodeId}/${jobId}.${extension}`
    const mediaId = `media-${jobId}`
    const bytes = await file.arrayBuffer()
    const createdAt = new Date().toISOString()

    await storage.bucket.put(storageKey, bytes, {
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
    const asset = await upsertMediaAsset(db, {
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

    return json({ ok: true, media: { ...asset, publicUrl: asset.url, storageBinding: storage.name } })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
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
