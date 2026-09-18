import { getBoundDb } from '../api/_lib/database.js'
import { findPodcastShow } from '../api/_lib/podcastSettings.js'
import { detectMediaStorageBinding } from '../api/media/files.js'
import { isPodcastCoverMimeType, migratedPodcastMediaKey } from '../../shared/podcastHosting.js'

export async function onRequestGet(context) {
  return servePodcastCover(context, false)
}

export async function onRequestHead(context) {
  return servePodcastCover(context, true)
}

async function servePodcastCover(context, headOnly) {
  try {
    const slug = normalizeRequestedSlug(context.params?.path)
    if (!slug) return text('Podcast cover not found.', 404)

    const db = getBoundDb(context)
    if (!db) return text('Podcast cover unavailable: BF_DB binding is required.', 503)

    const show = await findPodcastShow(db, slug)
    if (!show?.defaultCoverArt) return text('Podcast cover not found.', 404)

    const origin = new URL(context.request.url).origin
    const storageKey = migratedPodcastMediaKey(show.defaultCoverArt, origin)
    if (!storageKey) return text('Podcast cover is not stored locally.', 404)

    const bindingName = detectMediaStorageBinding(context.env || {})
    const bucket = bindingName ? context.env[bindingName] : null
    if (!bucket) return text('Podcast cover storage unavailable.', 503)

    const head = await bucket.head(storageKey)
    if (!head?.size) return text('Podcast cover not found.', 404)

    const contentType = String(head.httpMetadata?.contentType || head.customMetadata?.contentType || '').split(';')[0].trim().toLowerCase()
    if (!isPodcastCoverMimeType(contentType)) {
      return text('Podcast cover must be JPEG or PNG.', 415)
    }

    const headers = coverHeaders({ contentType, size: head.size, etag: head.httpEtag || head.etag || '' })
    if (headOnly) return new Response(null, { status: 200, headers })

    const object = await bucket.get(storageKey)
    if (!object?.body) return text('Podcast cover not found.', 404)
    return new Response(object.body, { status: 200, headers })
  } catch (error) {
    return text(`Podcast cover error: ${String(error?.message || error)}`, 500)
  }
}

function normalizeRequestedSlug(value) {
  const raw = Array.isArray(value) ? value.join('/') : String(value || '')
  const slug = raw.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : ''
}

function coverHeaders({ contentType, size, etag = '' }) {
  const headers = new Headers({
    'content-type': contentType,
    'content-length': String(size),
    'content-disposition': 'inline',
    'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    'x-content-type-options': 'nosniff',
    'access-control-allow-origin': '*',
  })
  if (etag) headers.set('etag', etag)
  return headers
}

function text(body, status) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
