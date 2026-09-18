import { detectMediaStorageBinding } from '../media/files.js'
import { fetchPodcastFeed } from './podcastRssImport.js'
import { importPodcastSource } from './podcastImportService.js'
import { findPodcastShow, upsertPodcastShow, podcastShowOwnsEntry } from './podcastSettings.js'
import { listNativeEntries, saveRevisionSnapshot } from './nativePublicContent.js'
import { validatePublicRemoteUrl, assertPublicResolution, resolveHostnameWithDoh } from './safeRemoteFeed.js'
import { upsertMediaAsset } from './mediaAssets.js'
import { podcastAudioSource, storedMediaKey } from '../../../shared/podcastHosting.js'

const IMAGE_FIELDS = ['podcastCoverImage', 'featuredImage', 'heroImage']

export async function hostingStatus(context, showId) {
  const db = context.env.BF_DB
  const show = await findPodcastShow(db, showId)
  if (!show) throw new Error('Podcast show not found')
  const entries = (await listNativeEntries(db, { includeFuture: true })).filter(entry => podcastShowOwnsEntry(show, entry) && entry.contentType === 'podcast' && entry.status !== 'trash')
  const origin = new URL(context.request.url).origin
  const pending = []
  for (const entry of entries) {
    const source = podcastAudioSource(entry)
    if (!storedMediaKey(source, origin)) pending.push({ id: entry.id, title: entry.title, field: 'audio', source })
    for (const field of IMAGE_FIELDS) {
      if (entry[field] && !storedMediaKey(entry[field], origin)) pending.push({ id: entry.id, title: entry.title, field, source: entry[field] })
    }
  }
  if (show.defaultCoverArt && !storedMediaKey(show.defaultCoverArt, origin)) pending.push({ id: show.id, title: show.podcastTitle, field: 'cover', source: show.defaultCoverArt })
  const ids = new Set(entries.map(entry => entry.sourceExternalId || entry.id))
  const missing = (show.hostingManifest || []).filter(id => !ids.has(id))
  return { show, entries, pending, missing, storageReady: Boolean(detectMediaStorageBinding(context.env)) }
}

export async function beginHosting(context, showId) {
  const status = await hostingStatus(context, showId)
  if (!status.storageReady) throw new Error('Configure SABOT_MEDIA_BUCKET before moving hosting')
  if (status.show.hostingMode === 'native') return
  if (status.show.hostingMode === 'migrating') return
  // Freeze external refreshes before taking the source inventory. Failed inventories can be retried.
  await upsertPodcastShow(context.env.BF_DB, { ...status.show, hostingMode: 'migrating', hostingManifest: [], hostingInventoryComplete: false }, { showId, hostingTransition: true })
  await inventoryHosting(context, showId)
}

export async function inventoryHosting(context, showId) {
  const db = context.env.BF_DB
  const show = await findPodcastShow(db, showId)
  if (show.hostingMode !== 'migrating') throw new Error('Start migration first')
  if (show.sourceFeedUrl) {
    const feed = await fetchPodcastFeed(show.sourceFeedUrl)
    // Existing editorial records are never overwritten by the migration import.
    for (let index = 0; index < feed.parsed.episodes.length; index += 100) {
      await importPodcastSource(db, { feedUrl: show.sourceFeedUrl, showId, selectedKeys: feed.parsed.episodes.slice(index, index + 100).map(e => e.guid), syncExisting: false, importChannelSettings: false, hostingMigration: true })
    }
    const latest = await findPodcastShow(db, showId)
    await upsertPodcastShow(db, { ...latest, hostingManifest: feed.parsed.episodes.map(e => e.guid), hostingInventoryComplete: true }, { showId, hostingTransition: true })
  } else {
    await upsertPodcastShow(db, { ...show, hostingInventoryComplete: true, hostingManifest: [] }, { showId, hostingTransition: true })
  }
}

export async function migrateNextAsset(context, showId) {
  const db = context.env.BF_DB
  const status = await hostingStatus(context, showId)
  if (status.show.hostingMode !== 'migrating') throw new Error('Start migration first')
  if (!status.show.hostingInventoryComplete) { await inventoryHosting(context, showId); return }
  const task = status.pending[0]
  if (!task) return
  if (!task.source) throw new Error(`Choose an audio file for “${task.title}” before continuing`)
  const media = await copyRemoteMedia(context, task.source, task.field === 'audio' ? 'audio' : 'image')
  if (task.field === 'cover') {
    const latest = await findPodcastShow(db, showId)
    if (latest.defaultCoverArt !== task.source) throw new Error('Show artwork changed during copying; retry')
    await upsertPodcastShow(db, { ...latest, defaultCoverArt: media.url }, { showId, hostingTransition: true })
    return
  }
  // Compare the original JSON at commit time so an editor's concurrent changes cannot be lost.
  const row = await db.prepare('SELECT content_json FROM native_public_content WHERE id = ?').bind(task.id).first()
  if (!row) throw new Error('Episode was removed during migration')
  const entry = JSON.parse(row.content_json)
  if ((task.field === 'audio' ? podcastAudioSource(entry) : entry[task.field]) !== task.source) throw new Error('Episode changed during copying; retry')
  const next = { ...entry }
  if (task.field === 'audio') {
    next.audioSourceUrl = next.podcastAudioUrl = next.podcastRssEnclosureUrl = next.podcastDeliveryAudioUrl = media.url
    next.podcastAudioStorageKey = media.storageKey
    next.podcastAudioMediaId = media.id
    next.podcastFileSize = String(media.size)
    next.podcastMimeType = media.mimeType
    next.relatedAssets = (entry.relatedAssets || []).filter(a => !['canonical-audio', 'delivery'].includes(a.role))
    next.relatedAssets.push({ ...media, type: 'audio', role: 'canonical-audio', source: 'sabot-hosted', originalUrl: task.source, podcastGuid: entry.sourceExternalId })
  } else {
    // A single copy also replaces duplicate uses of this artwork on the same episode.
    for (const field of IMAGE_FIELDS) if (entry[field] === task.source) next[field] = media.url
  }
  await saveRevisionSnapshot(db, entry, 'before-podcast-hosting-migration')
  const result = await db.prepare('UPDATE native_public_content SET content_json = ?, updated_at = ? WHERE id = ? AND content_json = ?')
    .bind(JSON.stringify(next), new Date().toISOString(), task.id, row.content_json).run()
  if (!result.meta?.changes) throw new Error('Episode changed during copying; retry')
}

export async function finishHosting(context, showId) {
  const status = await hostingStatus(context, showId)
  if (!status.show.hostingInventoryComplete || status.pending.length || status.missing.length || !status.entries.length) {
    throw new Error('The source inventory, audio and artwork must all be complete before switching hosting')
  }
  const origin = new URL(context.request.url).origin
  const bucket = context.env[detectMediaStorageBinding(context.env)]
  const keys = new Set()
  for (const entry of status.entries) {
    const key = storedMediaKey(podcastAudioSource(entry), origin)
    const head = await bucket.head(key)
    if (!head?.size || !String(head.httpMetadata?.contentType).startsWith('audio/')) throw new Error(`Stored audio verification failed: ${entry.title}`)
    if (Number(entry.podcastFileSize) !== head.size) throw new Error(`Audio size needs correcting: ${entry.title}`)
    for (const field of IMAGE_FIELDS) if (entry[field]) keys.add(storedMediaKey(entry[field], origin))
  }
  if (status.show.defaultCoverArt) keys.add(storedMediaKey(status.show.defaultCoverArt, origin))
  for (const key of keys) if (!(await bucket.head(key))?.size) throw new Error('Stored artwork verification failed')
  await upsertPodcastShow(context.env.BF_DB, { ...status.show, hostingMode: 'native', hostingCompletedAt: new Date().toISOString(), websiteUrl: origin }, { showId, hostingTransition: true })
}

export async function copyRemoteMedia(context, source, kind) {
  const bucket = context.env[detectMediaStorageBinding(context.env)]
  if (!bucket) throw new Error('SABOT_MEDIA_BUCKET binding is required')
  let url = validatePublicRemoteUrl(new URL(source, context.request.url).toString(), { allowHttp: true })
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)))].map(n => n.toString(16).padStart(2, '0')).join('')
  const key = `media/uploads/podcast-migration/${hash}`
  let head = await bucket.head(key)
  if (!head) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 180000)
    try {
      let response
      for (let redirects = 0; redirects <= 5; redirects++) {
        await assertPublicResolution(url.hostname, resolveHostnameWithDoh)
        response = await fetch(url, { redirect: 'manual', signal: controller.signal, headers: { 'accept-encoding': 'identity', 'user-agent': 'SabotPress Podcast Migration/1.0' } })
        if (![301, 302, 303, 307, 308].includes(response.status)) break
        await response.body?.cancel()
        if (redirects === 5 || !response.headers.get('location')) throw new Error('Media redirect limit reached')
        url = validatePublicRemoteUrl(new URL(response.headers.get('location'), url).toString(), { allowHttp: true })
      }
      if (!response.ok || !response.body) throw new Error(`Media download failed: ${response.status}`)
      const mimeType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase()
      const size = Number(response.headers.get('content-length'))
      const max = kind === 'audio' ? 1024 * 1024 * 1024 : 20 * 1024 * 1024
      if (!mimeType.startsWith(`${kind}/`) || mimeType === 'image/svg+xml' || !Number.isSafeInteger(size) || size <= 0 || size > max || response.headers.get('content-encoding')) {
        await response.body.cancel()
        throw new Error('Source must provide a valid media type and file size (audio up to 1 GB; artwork up to 20 MB). Upload the original file if needed.')
      }
      // Pass through the original fixed-length stream; do not buffer episode audio in Worker memory.
      await bucket.put(key, response.body, { httpMetadata: { contentType: mimeType }, customMetadata: { sourceUrl: source } })
      head = await bucket.head(key)
      if (!head || head.size !== size) { await bucket.delete(key); throw new Error('Stored file length did not match the download') }
    } finally { clearTimeout(timer) }
  }
  const urlOut = new URL('/api/media/files', context.request.url)
  urlOut.searchParams.set('key', key)
  const media = { id: `podcast-media-${hash}`, url: urlOut.toString(), storageKey: key, size: head.size, mimeType: head.httpMetadata?.contentType, mediaType: kind, title: `Podcast ${kind}`, source: 'server-upload' }
  await upsertMediaAsset(context.env.BF_DB, media)
  return media
}
