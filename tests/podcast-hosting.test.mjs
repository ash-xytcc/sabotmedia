import test from 'node:test'
import assert from 'node:assert/strict'
import { testDb } from './helpers/course-db.mjs'
import { upsertNativeEntry } from '../functions/api/_lib/nativePublicContent.js'
import { upsertPodcastShow, findPodcastShow } from '../functions/api/_lib/podcastSettings.js'
import { beginHosting, finishHosting, hostingStatus } from '../functions/api/_lib/podcastHosting.js'
import { onRequestGet, onRequestHead } from '../functions/api/podcasts/audio.js'
import { recordPodcastDownload } from '../functions/api/_lib/podcastAnalytics.js'
import { buildPodcastFeedXml } from '../functions/rss/podcast.xml.js'
import { podcastRange, storedMediaKey } from '../shared/podcastHosting.js'
import { importPodcastSource } from '../functions/api/_lib/podcastImportService.js'

const mediaUrl = 'https://sabot.media/api/media/files?key=media/uploads/audio/test.mp3'
async function fixture(status = 'published') {
  const db = testDb()
  const item = await upsertNativeEntry(db, { id: 'episode', title: 'Episode', contentType: 'podcast', status, sourceExternalId: 'original-guid', primaryProjectSlug: 'show', projects: ['Show'], podcastAudioUrl: mediaUrl, podcastFileSize: 10, publishedAt: '2025-01-02', relatedAssets: [{ role: 'canonical-audio', url: mediaUrl, mimeType: 'audio/mpeg', size: 10 }] })
  await upsertPodcastShow(db, { id: 'show', slug: 'show', podcastTitle: 'Show' })
  const bucket = { head: async () => ({ size: 10, httpEtag: '"version"', httpMetadata: { contentType: 'audio/mpeg' } }), get: async (_, options) => ({ body: options?.range ? '0123456789'.slice(options.range.offset, options.range.offset + options.range.length) : '0123456789' }) }
  return { item, env: { BF_DB: db, SABOT_MEDIA_BUCKET: bucket }, request: new Request('https://sabot.media/api/podcasts/audio?id=episode') }
}

test('range handling supports suffixes, clipped ends, invalid syntax and unsatisfiable ranges', () => {
  assert.deepEqual(podcastRange('bytes=-3', 10), { start: 7, end: 9, length: 3 })
  assert.deepEqual(podcastRange('bytes=5-99', 10), { start: 5, end: 9, length: 5 })
  assert.deepEqual(podcastRange('bytes=10-', 10), { unsatisfiable: true })
  assert.deepEqual(podcastRange('bytes=-0', 10), { unsatisfiable: true })
  assert.equal(podcastRange('bytes=0-1,4-5', 10), null)
  assert.equal(storedMediaKey('https://evil.example/api/media/files?key=media/uploads/a'), '')
})

test('public audio serves bytes, seeking, HEAD and 416 without exposing drafts', async () => {
  const context = await fixture()
  assert.equal(await (await onRequestGet(context)).text(), '0123456789')
  context.request = new Request(context.request.url, { headers: { range: 'bytes=-3' } })
  const partial = await onRequestGet(context)
  assert.equal(partial.status, 206)
  assert.equal(partial.headers.get('content-range'), 'bytes 7-9/10')
  assert.equal(await partial.text(), '789')
  const head = await onRequestHead(context)
  assert.equal(head.headers.get('content-length'), '10')
  assert.equal(await head.text(), '')
  context.request = new Request(context.request.url, { headers: { range: 'bytes=100-' } })
  assert.equal((await onRequestGet(context)).status, 416)
  assert.equal((await onRequestGet(await fixture('draft'))).status, 404)
})

test('RSS uses Sabot delivery and preserves GUID, date, MIME and size', async () => {
  const { item } = await fixture()
  const xml = buildPodcastFeedXml({ requestUrl: 'https://sabot.media/feeds/podcasts/show.xml', items: [item] })
  assert.match(xml, /enclosure url="https:\/\/sabot.media\/api\/podcasts\/audio\?id=episode" type="audio\/mpeg" length="10"/)
  assert.match(xml, /<guid isPermaLink="false">original-guid<\/guid>/)
  assert.match(xml, /02 Jan 2025/)
})

test('cutover is blocked until inventory and every stored asset verify; native ownership blocks resync', async () => {
  const context = await fixture()
  await assert.rejects(finishHosting(context, 'show'), /complete/)
  await beginHosting(context, 'show')
  assert.equal((await hostingStatus(context, 'show')).show.hostingMode, 'migrating')
  const head = context.env.SABOT_MEDIA_BUCKET.head
  context.env.SABOT_MEDIA_BUCKET.head = async () => null
  await assert.rejects(finishHosting(context, 'show'), /verification failed/)
  context.env.SABOT_MEDIA_BUCKET.head = head
  await finishHosting(context, 'show')
  assert.equal((await findPodcastShow(context.env.BF_DB, 'show')).hostingMode, 'native')
  await upsertPodcastShow(context.env.BF_DB, { id: 'show', hostingMode: 'external', podcastTitle: 'Edited title' })
  assert.equal((await findPodcastShow(context.env.BF_DB, 'show')).hostingMode, 'native')
  await assert.rejects(importPodcastSource(context.env.BF_DB, { showId: 'show', feedUrl: 'https://feeds.acast.com/example' }), /disabled/)
})

test('analytics deduplicate ranges by day and episode without storing IP or UA; bots excluded', async () => {
  const context = await fixture()
  context.request = new Request(context.request.url, { headers: { 'cf-connecting-ip': '203.0.113.10', 'user-agent': 'AntennaPod/3.0' } })
  await recordPodcastDownload(context, 'episode', 3)
  await recordPodcastDownload(context, 'episode', 7)
  const rows = (await context.env.BF_DB.prepare('SELECT * FROM podcast_downloads').all()).results
  assert.equal(rows.length, 1)
  assert.equal(rows[0].requests, 2)
  assert.equal(rows[0].requested_bytes, 10)
  assert.equal(rows[0].app, 'AntennaPod')
  assert.doesNotMatch(JSON.stringify(rows), /203\.0\.113|AntennaPod\/3/)
  context.request = new Request(context.request.url, { headers: { 'cf-connecting-ip': '203.0.113.20', 'user-agent': 'Googlebot' } })
  await recordPodcastDownload(context, 'episode', 10)
  assert.equal((await context.env.BF_DB.prepare('SELECT * FROM podcast_downloads').all()).results.length, 1)
})

test('migration streams, verifies and resumes a remote file without changing GUID or authored text', async () => {
  const { migrateNextAsset } = await import('../functions/api/_lib/podcastHosting.js')
  const context = await fixture()
  const db = context.env.BF_DB
  const external = { ...context.item, podcastAudioUrl: 'https://cdn.example.com/episode.mp3', relatedAssets: [], bodyHtml: '<p>Our edited notes</p>' }
  await upsertNativeEntry(db, external)
  await beginHosting(context, 'show')
  const objects = new Map()
  let copies = 0
  context.env.SABOT_MEDIA_BUCKET = {
    head: async key => objects.get(key) || null,
    put: async (key, stream, options) => {
      assert.equal(typeof stream.getReader, 'function')
      const bytes = await new Response(stream).arrayBuffer()
      copies++
      objects.set(key, { size: bytes.byteLength, httpMetadata: options.httpMetadata })
    },
    delete: async key => objects.delete(key),
  }
  const previousFetch = globalThis.fetch
  globalThis.fetch = async url => String(url).includes('cloudflare-dns.com')
    ? Response.json({ Status: 0, Answer: [{ type: 1, data: '93.184.216.34' }] })
    : new Response('0123456789', { headers: { 'content-type': 'audio/mpeg', 'content-length': '10' } })
  try {
    await migrateNextAsset(context, 'show')
    await migrateNextAsset(context, 'show')
    assert.equal(copies, 1)
    const status = await hostingStatus(context, 'show')
    assert.equal(status.pending.length, 0)
    assert.equal(status.entries[0].sourceExternalId, 'original-guid')
    assert.equal(status.entries[0].bodyHtml, '<p>Our edited notes</p>')
    assert.equal(status.entries[0].podcastFileSize, '10')
    await finishHosting(context, 'show')
  } finally { globalThis.fetch = previousFetch }
})


test('native output removes the automatic Acast footer while preserving authored mentions', async () => {
  const { withoutAcastFooter } = await import('../shared/podcastHosting.js')
  const footer = `<p style='color:grey'>Hosted on Acast. See <a href='https://acast.com/privacy'>acast.com/privacy</a> for more information.</p>`
  assert.equal(withoutAcastFooter('<p>We left Acast.</p>' + footer), '<p>We left Acast.</p>')
})
