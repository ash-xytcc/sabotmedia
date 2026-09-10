import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

import { buildPodcastFeedXml, podcastChannelCoverUrl } from '../functions/rss/podcast.xml.js'
import { isPodcastCoverMimeType, migratedPodcastMediaKey, podcastCoverPath } from '../shared/podcastHosting.js'

const coverRoute = fs.readFileSync(new URL('../functions/podcast-covers/[[path]].js', import.meta.url), 'utf8')

test('migrated podcast artwork gets a stable canonical show cover URL', () => {
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
  assert.equal(podcastChannelCoverUrl(settings, 'https://sabot.media'), 'https://sabot.media/podcast-covers/molotov-now')

  const xml = buildPodcastFeedXml({
    requestUrl: 'https://sabot.media/feeds/podcasts/molotov-now.xml',
    selfPath: '/feeds/podcasts/molotov-now.xml',
    settings,
    items: [],
  })

  assert.match(xml, /<itunes:image href="https:\/\/sabot\.media\/podcast-covers\/molotov-now" \/>/)
  assert.match(xml, /<image>\s*<url>https:\/\/sabot\.media\/podcast-covers\/molotov-now<\/url>/)
  assert.doesNotMatch(xml, /<itunes:image[^>]+api\/media\/files/)
})

test('historical migration hostnames still resolve to the canonical current cover path', () => {
  const stored = 'https://old-preview.pages.dev/api/media/files?key=media%2Fuploads%2Fpodcast-migration%2Foldcover'
  assert.equal(migratedPodcastMediaKey(stored, 'https://sabot.media'), 'media/uploads/podcast-migration/oldcover')
  assert.equal(podcastChannelCoverUrl({ slug: 'the-child-and-its-enemies', defaultCoverArt: stored }, 'https://sabot.media'), 'https://sabot.media/podcast-covers/the-child-and-its-enemies')
})

test('external artwork is left at its public source instead of being misidentified as stored media', () => {
  const source = 'https://cdn.example.org/podcast/cover.jpg'
  assert.equal(migratedPodcastMediaKey(source, 'https://sabot.media'), '')
  assert.equal(podcastChannelCoverUrl({ slug: 'show', defaultCoverArt: source }, 'https://sabot.media'), source)
})

test('podcast cover MIME guard accepts directory-safe raster formats', () => {
  assert.equal(isPodcastCoverMimeType('image/jpeg'), true)
  assert.equal(isPodcastCoverMimeType('image/png; charset=binary'), true)
  assert.equal(isPodcastCoverMimeType('image/webp'), false)
  assert.equal(isPodcastCoverMimeType('image/svg+xml'), false)
})

test('public podcast cover route reads the show from D1 and streams its R2 image for GET and HEAD', () => {
  assert.match(coverRoute, /findPodcastShow\(db, slug\)/)
  assert.match(coverRoute, /migratedPodcastMediaKey\(show\.defaultCoverArt, origin\)/)
  assert.match(coverRoute, /detectMediaStorageBinding/)
  assert.match(coverRoute, /bucket\.head\(storageKey\)/)
  assert.match(coverRoute, /bucket\.get\(storageKey\)/)
  assert.match(coverRoute, /isPodcastCoverMimeType\(contentType\)/)
  assert.match(coverRoute, /access-control-allow-origin/)
  assert.match(coverRoute, /export async function onRequestHead/)
})
