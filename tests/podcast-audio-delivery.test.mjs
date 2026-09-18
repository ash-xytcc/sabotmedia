import test from 'node:test'
import assert from 'node:assert/strict'
import { testDb } from './helpers/course-db.mjs'
import { upsertNativeEntry } from '../functions/api/_lib/nativePublicContent.js'
import { onRequestGet } from '../functions/api/podcasts/audio.js'
import { buildPodcastFeedXml, podcastEnclosureUrl } from '../functions/rss/podcast.xml.js'

const origin = 'https://sabot.media'
const localAudioUrl = `${origin}/api/media/files?key=media/uploads/audio/molotov-test.mp3`

function testBucket(expectedKey, bytes = '0123456789') {
  return {
    head: async (key) => {
      assert.equal(key, expectedKey)
      return { size: bytes.length, httpEtag: '"test-version"', httpMetadata: { contentType: 'audio/mpeg' } }
    },
    get: async (key, options) => {
      assert.equal(key, expectedKey)
      const body = options?.range
        ? bytes.slice(options.range.offset, options.range.offset + options.range.length)
        : bytes
      return { body }
    },
  }
}

async function deliveryFixture(input, expectedKey = 'media/uploads/audio/molotov-test.mp3') {
  const db = testDb()
  const item = await upsertNativeEntry(db, {
    id: input.id || 'episode',
    title: input.title || 'Episode',
    contentType: input.contentType || 'podcast',
    status: 'published',
    projects: input.projects || ['Molotov Now!'],
    podcastAudioUrl: input.podcastAudioUrl || localAudioUrl,
    podcastFileSize: 10,
    podcastMimeType: 'audio/mpeg',
    publishedAt: '2026-09-10T12:00:00Z',
  })
  return {
    item,
    context: {
      env: { BF_DB: db, SABOT_MEDIA_BUCKET: testBucket(expectedKey) },
      request: new Request(`${origin}/api/podcasts/audio?id=${encodeURIComponent(item.id)}`),
    },
  }
}

test('normal Molotov episode uses the canonical Sabot audio endpoint', async () => {
  const { item } = await deliveryFixture({ id: 'molotov-episode', title: 'Molotov episode' })
  assert.equal(podcastEnclosureUrl(item, origin), `${origin}/api/podcasts/audio?id=molotov-episode`)
  const xml = buildPodcastFeedXml({ requestUrl: `${origin}/feeds/podcasts/molotov-now.xml`, items: [item] })
  assert.match(xml, /<enclosure url="https:\/\/sabot\.media\/api\/podcasts\/audio\?id=molotov-episode" type="audio\/mpeg" length="10" \/>/)
})

test('Molotov audiozine uses the canonical endpoint and its audio is served', async () => {
  const { item, context } = await deliveryFixture({
    id: 'molotov-audiozine',
    title: 'Organizing the Unhoused [AUDIOZINE]',
    contentType: 'print',
  })
  assert.equal(podcastEnclosureUrl(item, origin), `${origin}/api/podcasts/audio?id=molotov-audiozine`)
  const response = await onRequestGet(context)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'audio/mpeg')
  assert.equal(response.headers.get('content-length'), '10')
  assert.equal(await response.text(), '0123456789')
})

test('preview-host migrated audio is canonicalized to sabot.media and remains servable', async () => {
  const previewUrl = 'https://old-preview.pages.dev/api/media/files?key=media%2Fuploads%2Fpodcast-migration%2Fpreview-audio'
  const { item, context } = await deliveryFixture(
    { id: 'preview-migrated', title: 'Preview migrated episode', podcastAudioUrl: previewUrl },
    'media/uploads/podcast-migration/preview-audio',
  )
  assert.equal(podcastEnclosureUrl(item, origin), `${origin}/api/podcasts/audio?id=preview-migrated`)
  const response = await onRequestGet(context)
  assert.equal(response.status, 200)
  assert.equal(await response.text(), '0123456789')
})

test('public non-podcast, non-audiozine content is rejected by podcast audio delivery', async () => {
  const { context } = await deliveryFixture({
    id: 'ordinary-print',
    title: 'Ordinary print piece',
    contentType: 'print',
  })
  const response = await onRequestGet(context)
  assert.equal(response.status, 404)
  assert.equal(await response.text(), 'Episode not found')
})
