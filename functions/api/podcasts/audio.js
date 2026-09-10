import { getNativeEntry } from '../_lib/nativePublicContent.js'
import { detectMediaStorageBinding } from '../media/files.js'
import { migratedPodcastMediaKey, podcastAudioSource, podcastRange } from '../../../shared/podcastHosting.js'
import { isAudiozineItem } from '../../../src/lib/rssFeeds.js'
import { recordPodcastDownload } from '../_lib/podcastAnalytics.js'

export async function onRequestGet(context) { return serve(context, false) }
export async function onRequestHead(context) { return serve(context, true) }
export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, HEAD, OPTIONS', 'access-control-allow-headers': 'Range, If-Range' } })
}
async function serve(context, headOnly) {
  const db = context.env?.BF_DB
  const binding = detectMediaStorageBinding(context.env)
  if (!db || !binding) return failure('Podcast storage unavailable', 503)
  const url = new URL(context.request.url)
  const entry = await getNativeEntry(db, url.searchParams.get('id') || '')
  if (!entry || (entry.contentType !== 'podcast' && !isAudiozineItem(entry))) return failure('Episode not found', 404)
  const key = migratedPodcastMediaKey(podcastAudioSource(entry), url.origin)
  if (!key) return failure('Episode audio has not been moved to SabotPress', 409)
  const bucket = context.env[binding]
  const object = await bucket.head(key)
  if (!object) return failure('Episode audio not found', 404)
  const headers = new Headers({
    'content-type': object.httpMetadata?.contentType || entry.podcastMimeType || 'audio/mpeg',
    'accept-ranges': 'bytes', 'access-control-allow-origin': '*',
    'access-control-expose-headers': 'Content-Length, Content-Range, Accept-Ranges, ETag',
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    'content-length': String(object.size), 'etag': object.httpEtag || `"${object.etag}"`,
  })
  if (headOnly) return new Response(null, { headers })
  const ifRange = context.request.headers.get('if-range')
  const range = podcastRange(!ifRange || ifRange === headers.get('etag') ? context.request.headers.get('range') : '', object.size)
  if (range?.unsatisfiable) {
    headers.set('content-range', `bytes */${object.size}`)
    headers.set('content-length', '0')
    return new Response(null, { status: 416, headers })
  }
  const body = await bucket.get(key, range ? { range: { offset: range.start, length: range.length } } : undefined)
  if (!body?.body) return failure('Episode audio not found', 404)
  if (range) {
    headers.set('content-range', `bytes ${range.start}-${range.end}/${object.size}`)
    headers.set('content-length', String(range.length))
  }
  const count = recordPodcastDownload(context, entry.id, range?.length || object.size)
    .catch(error => console.error('Podcast analytics unavailable', error.message))
  if (context.waitUntil) context.waitUntil(count)
  else await count
  return new Response(body.body, { status: range ? 206 : 200, headers })
}
function failure(message, status) { return new Response(message, { status, headers: { 'cache-control': 'no-store' } }) }
