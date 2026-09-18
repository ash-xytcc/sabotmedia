import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

import { buildPodcastFeedXml, podcastChannelCoverUrl, staticPodcastCoverPath } from '../functions/rss/podcast.xml.js'
import { isPodcastCoverMimeType, migratedPodcastMediaKey, podcastCoverPath } from '../shared/podcastHosting.js'

const coverRoute = fs.readFileSync(new URL('../functions/podcast-covers/[[path]].js', import.meta.url), 'utf8')
const currentShows = [
  'molotov-now',
  'the-child-and-its-enemies',
  'get-to-know-your-neighborhood',
]

test('current podcast shows use crawler-safe static JPEG cover URLs', () => {
  for (const slug of currentShows) {
    const expectedPath = `/podcast-covers/${slug}.jpg`
    assert.equal(staticPodcastCoverPath(slug), expectedPath)
    assert.equal(podcastChannelCoverUrl({ slug }, 'https://sabot.media'), `https://sabot.media${expectedPath}`)

    const bytes = fs.readFileSync(new URL(`../public${expectedPath}`, import.meta.url))
    assert.ok(bytes.length > 0, `${slug} cover should not be empty`)
    assert.equal(bytes[0], 0xff, `${slug} cover should start with JPEG SOI marker`)
    assert.equal(bytes[1], 0xd8, `${slug} cover should start with JPEG SOI marker`)
    assert.equal(bytes[bytes.length - 2], 0xff, `${slug} cover should end with JPEG EOI marker`)
    assert.equal(bytes[bytes.length - 1], 0xd9, `${slug} cover should end with JPEG EOI marker`)
  }
})

test('migrated current-show artwork is hidden behind the static directory cover', () => {
  const stored = 'https://sabot.media/api/media/files?key=media%2Fuploads%2Fpodcast-migration%2Fabc123'
  const settings = {
    id: 'molotov-now',
    slug: 'molotov-now',
    podcastTitle: 'Molotov Now!',
    defaultCoverArt: stored,
    websiteUrl: 'https://sabot.media',
  }

  assert.equal(podcastCoverPath(settings.slug), '/podcast-covers/molotov-now')
  assert.equal(migratedPodcastMediaKey(stored, 'https://sabot.media'), 'media/uploads/podcast-migration/abc123')
  assert.equal(podcastChannelCoverUrl(settings, 'https://sabot.media'), 'https://sabot.media/podcast-covers/molotov-now.jpg')

  const xml = buildPodcastFeedXml({
    requestUrl: 'https://sabot.media/feeds/podcasts/molotov-now.xml',
    selfPath: '/feeds/podcasts/molotov-now.xml',
    settings,
    items: [],
  })

  assert.match(xml, /<itunes:image href="https:\/\/sabot\.media\/podcast-covers\/molotov-now\.jpg" \/>/)
  assert.match(xml, /<image>\s*<url>https:\/\/sabot\.media\/podcast-covers\/molotov-now\.jpg<\/url>/)
  assert.doesNotMatch(xml, /<itunes:image[^>]+api\/media\/files/)
})

test('historical migration hostnames resolve to the current static show cover', () => {
  const stored = 'https://old-preview.pages.dev/api/media/files?key=media%2Fuploads%2Fpodcast-migration%2Foldcover'
  assert.equal(migratedPodcastMediaKey(stored, 'https://sabot.media'), 'media/uploads/podcast-migration/oldcover')
  assert.equal(
    podcastChannelCoverUrl({ slug: 'the-child-and-its-enemies', defaultCoverArt: stored }, 'https://sabot.media'),
    'https://sabot.media/podcast-covers/the-child-and-its-enemies.jpg',
  )
})

test('future shows without a static cover retain the existing external/dynamic fallback behavior', () => {
  const source = 'https://cdn.example.org/podcast/cover.jpg'
  assert.equal(migratedPodcastMediaKey(source, 'https://sabot.media'), '')
  assert.equal(podcastChannelCoverUrl({ slug: 'show', defaultCoverArt: source }, 'https://sabot.media'), source)

  const stored = 'https://sabot.media/api/media/files?key=media%2Fuploads%2Fpodcast-migration%2Ffuture123'
  assert.equal(podcastChannelCoverUrl({ slug: 'future-show', defaultCoverArt: stored }, 'https://sabot.media'), 'https://sabot.media/podcast-covers/future-show')
})

test('podcast cover MIME guard accepts directory-safe raster formats', () => {
  assert.equal(isPodcastCoverMimeType('image/jpeg'), true)
  assert.equal(isPodcastCoverMimeType('image/png; charset=binary'), true)
  assert.equal(isPodcastCoverMimeType('image/webp'), false)
  assert.equal(isPodcastCoverMimeType('image/svg+xml'), false)
})

test('legacy dynamic podcast cover route still supports locally stored JPEG/PNG for fallback shows', () => {
  assert.match(coverRoute, /findPodcastShow\(db, slug\)/)
  assert.match(coverRoute, /migratedPodcastMediaKey\(show\.defaultCoverArt, origin\)/)
  assert.match(coverRoute, /detectMediaStorageBinding/)
  assert.match(coverRoute, /bucket\.head\(storageKey\)/)
  assert.match(coverRoute, /bucket\.get\(storageKey\)/)
  assert.match(coverRoute, /isPodcastCoverMimeType\(contentType\)/)
  assert.match(coverRoute, /access-control-allow-origin/)
  assert.match(coverRoute, /export async function onRequestHead/)
})
