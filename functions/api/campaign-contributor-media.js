import { getBoundDb, databaseUnavailable } from './_lib/database.js'
import { contributorFromRequest } from './_lib/campaignCorrespondence.js'
import { upsertMediaAsset } from './_lib/mediaAssets.js'
import { writeAuditLog } from './_lib/auditLog.js'

const MAX_BYTES = 50 * 1024 * 1024
const CANONICAL_MEDIA_BINDING = 'SABOT_MEDIA_BUCKET'
const MEDIA_BINDING_NAMES = [CANONICAL_MEDIA_BINDING, 'MEDIA_BUCKET', 'ASSETS_BUCKET', 'SABOT_AUDIO_BUCKET', 'AUDIO_MEDIA_BUCKET']
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'video/webm', 'video/mp4'])

export async function onRequestPost(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign contributor media')
    const contributor = await contributorFromRequest(db, context.request)
    if (!contributor?.permissions?.uploadMedia) return json({ ok: false, error: 'media permission required' }, 403)
    const storage = getMediaBucket(context.env)
    if (!storage) return json({ ok: false, error: `Media storage is not configured. Add the R2 binding ${CANONICAL_MEDIA_BINDING} in Cloudflare Pages.`, requiredBinding: CANONICAL_MEDIA_BINDING }, 503)
    const form = await context.request.formData()
    const file = form.get('file')
    if (!file || typeof file.arrayBuffer !== 'function') return json({ ok: false, error: 'choose an audio, video, or image file' }, 400)
    const type = String(file.type || '').toLowerCase()
    if (!ALLOWED.has(type)) return json({ ok: false, error: 'unsupported media type' }, 415)
    if (!file.size || file.size > MAX_BYTES) return json({ ok: false, error: 'file must be smaller than 50 MB' }, 413)
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'video/webm': 'webm', 'video/mp4': 'mp4' })[type]
    const mediaId = `media-${crypto.randomUUID()}`
    const filename = sanitizeFilename(file.name || `dispatch.${extension}`)
    const key = `media/campaign-contributors/${contributor.campaignId}/${mediaId}-${filename}`
    await storage.bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { mediaId, contributorId: contributor.id, campaignId: contributor.campaignId, source: 'campaign-contributor' } })
    const url = new URL(context.request.url); url.pathname = '/api/media/files'; url.search = ''; url.searchParams.set('key', key)
    url.searchParams.set('filename', filename)
    const mediaType = type.startsWith('audio/') ? 'audio' : type.startsWith('video/') ? 'video' : 'image'
    try {
      await upsertMediaAsset(db, { id: mediaId, title: filename.replace(/\.[^.]+$/, ''), url: url.toString(), downloadUrl: url.toString(), mimeType: type, size: file.size, mediaType, extension, filename, folder: 'Campaign Dispatches', storageKey: key, source: 'campaign-contributor', createdAt: new Date().toISOString() })
      await writeAuditLog(db, { action: 'campaign_correspondence.media.upload', entityType: 'media_asset', entityId: mediaId, actor: `campaign-contributor:${contributor.id}`, detail: { campaignId: contributor.campaignId, size: file.size, mimeType: type, storageBinding: storage.name } })
    } catch (registrationError) {
      try { await storage.bucket.delete(key) } catch { /* best-effort orphan cleanup */ }
      throw new Error(`Media registry write failed; uploaded file was rolled back. ${String(registrationError?.message || registrationError)}`)
    }
    return json({ ok: true, mediaUrl: url.toString(), mediaType }, 201)
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 500) }
}
function getMediaBucket(env = {}) { for (const name of MEDIA_BINDING_NAMES) if (env?.[name]) return { name, bucket: env[name] }; return null }
function sanitizeFilename(value) { return (String(value || 'dispatch').split(/[\\/]/).pop().trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'dispatch').slice(0, 180) }
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }) }
