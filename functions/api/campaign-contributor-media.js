import { getBoundDb, databaseUnavailable } from './_lib/database.js'
import { contributorFromRequest } from './_lib/campaignCorrespondence.js'

const MAX_BYTES = 50 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'video/webm', 'video/mp4'])

export async function onRequestPost(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign contributor media')
    const contributor = await contributorFromRequest(db, context.request)
    if (!contributor?.permissions?.uploadMedia) return json({ ok: false, error: 'media permission required' }, 403)
    const bucket = context.env?.SABOT_MEDIA_BUCKET || context.env?.MEDIA_BUCKET
    if (!bucket) return json({ ok: false, error: 'media storage is unavailable' }, 503)
    const form = await context.request.formData()
    const file = form.get('file')
    if (!file || typeof file.arrayBuffer !== 'function') return json({ ok: false, error: 'choose an audio, video, or image file' }, 400)
    const type = String(file.type || '').toLowerCase()
    if (!ALLOWED.has(type)) return json({ ok: false, error: 'unsupported media type' }, 415)
    if (!file.size || file.size > MAX_BYTES) return json({ ok: false, error: 'file must be smaller than 50 MB' }, 413)
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'video/webm': 'webm', 'video/mp4': 'mp4' })[type]
    const key = `media/campaign-contributors/${contributor.campaignId}/${crypto.randomUUID()}.${extension}`
    await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { contributorId: contributor.id, campaignId: contributor.campaignId } })
    const url = new URL(context.request.url); url.pathname = '/api/media/files'; url.search = ''; url.searchParams.set('key', key)
    return json({ ok: true, mediaUrl: url.toString(), mediaType: type.startsWith('audio/') ? 'audio' : type.startsWith('video/') ? 'video' : 'image' }, 201)
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 500) }
}
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }) }
