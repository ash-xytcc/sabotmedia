import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeFeedRequestPath } from '../functions/api/_lib/feedRuntime.js'
import { buildPodcastFeedXml } from '../functions/rss/podcast.xml.js'
import { buildRssBundle } from '../src/lib/rssFeeds.js'

const directRoute = fs.readFileSync(new URL('../functions/feeds/[[path]].js', import.meta.url), 'utf8')
const runtime = fs.readFileSync(new URL('../functions/api/_lib/feedRuntime.js', import.meta.url), 'utf8')
const manifest = fs.readFileSync(new URL('../functions/api/feed-manifest.js', import.meta.url), 'utf8')
const publicPage = fs.readFileSync(new URL('../src/components/PublicFeedsPage.jsx', import.meta.url), 'utf8')

test('feed catch-all path normalization preserves grouped XML paths', () => {
  assert.equal(normalizeFeedRequestPath(['projects', 'grays-harbor.xml']), 'projects/grays-harbor.xml')
  assert.equal(normalizeFeedRequestPath('all-content.xml'), 'all-content.xml')
  assert.equal(normalizeFeedRequestPath([]), '')
})

test('direct feed route preserves the human feeds page and fails without D1', () => {
  assert.match(directRoute, /if \(!requestedPath\) return context\.next\(\)/)
  assert.match(directRoute, /BF_DB binding is required/)
  assert.match(directRoute, /application\/rss\+xml/)
  assert.match(directRoute, /x-sabot-feed-source/)
})

test('live feed runtime uses native public visibility, D1-safe DDL, and persisted feed settings', () => {
  assert.match(runtime, /listNativeEntries\(db, \{\}\)/)
  assert.match(runtime, /SELECT value_json, updated_at FROM site_settings/)
  assert.match(runtime, /mergeFeedSettings/)
  assert.match(runtime, /buildRssBundle/)
  assert.doesNotMatch(runtime, /db\.exec/)
})

test('released scheduled work is included but future scheduled work is not', () => {
  const settings = {
    exposeMainFeed: true,
    exposeFormatFeeds: false,
    exposeProjectFeeds: false,
    exposeCollectionFeeds: false,
    exposeAuthorFeeds: false,
    exposeTopicFeeds: false,
    exposeSeriesFeeds: false,
    aliases: {},
    hiddenTerms: {},
  }
  const now = new Date('2026-08-28T12:00:00Z').getTime()
  const bundle = buildRssBundle([
    { id: 'past', slug: 'past', title: 'Past schedule', status: 'scheduled', scheduledFor: '2026-08-28T11:00:00Z' },
    { id: 'future', slug: 'future', title: 'Future schedule', status: 'scheduled', scheduledFor: '2026-08-28T13:00:00Z' },
  ], { settings, now })
  assert.match(bundle['all-content.xml'], /Past schedule/)
  assert.doesNotMatch(bundle['all-content.xml'], /Future schedule/)
})

test('public feeds page links only to server manifest endpoints', () => {
  assert.match(publicPage, /fetch\('\/api\/feed-manifest'/)
  assert.match(publicPage, /href=\{`\/feeds\/\$\{file\}`\}/)
  assert.doesNotMatch(publicPage, /buildRssBundle\(getPieces\(\)/)
  assert.match(publicPage, /Nothing is being presented as a working subscription URL until it does/)
  assert.match(manifest, /mode: 'd1'/)
  assert.match(manifest, /'podcasts\/all\.xml'/)
})

test('podcast feed output includes enclosure and directory metadata', () => {
  const xml = buildPodcastFeedXml({
    requestUrl: 'https://sabot.media/feeds/podcasts/all.xml',
    selfPath: '/feeds/podcasts/all.xml',
    settings: {
      podcastTitle: 'Molotov Now!',
      author: 'Sabot Media',
      description: 'A test show description.',
      defaultCoverArt: 'https://media.sabot.media/podcast-cover.jpg',
      websiteUrl: 'https://sabot.media',
      language: 'en-us',
      category: 'News',
      ownerName: 'Sabot Media',
      ownerEmail: 'podcast@sabot.media',
      explicit: false,
    },
    items: [{
      id: 'episode-1', slug: 'episode-one', title: 'Episode One',
      podcastAudioUrl: 'https://media.sabot.media/episode-one.mp3',
      podcastMimeType: 'audio/mpeg', podcastFileSize: '12345', publishedAt: '2026-08-27T12:00:00Z',
      podcastDuration: '00:42:00', podcastEpisodeNumber: '7', podcastSeason: '2',
    }],
  })
  assert.match(xml, /<title>Molotov Now!<\/title>/)
  assert.match(xml, /<itunes:author>Sabot Media<\/itunes:author>/)
  assert.match(xml, /<itunes:category text="News" \/>/)
  assert.match(xml, /<itunes:image href="https:\/\/media\.sabot\.media\/podcast-cover\.jpg" \/>/)
  assert.match(xml, /<itunes:owner>/)
  assert.match(xml, /<enclosure url="https:\/\/media\.sabot\.media\/episode-one\.mp3" type="audio\/mpeg" length="12345" \/>/)
  assert.match(xml, /<itunes:duration>00:42:00<\/itunes:duration>/)
  assert.match(xml, /<itunes:episode>7<\/itunes:episode>/)
  assert.match(xml, /<itunes:season>2<\/itunes:season>/)
  assert.match(xml, /<atom:link href="https:\/\/sabot\.media\/feeds\/podcasts\/all\.xml"/)
})

test('direct podcasts endpoint uses D1 settings and proper podcast feed generator', () => {
  assert.match(directRoute, /requestedPath === 'podcasts\/all\.xml'/)
  assert.match(directRoute, /getPodcastFeedItems\(db\)/)
  assert.match(directRoute, /readPodcastSettings\(db\)/)
  assert.match(directRoute, /buildPodcastFeedXml/)
})
