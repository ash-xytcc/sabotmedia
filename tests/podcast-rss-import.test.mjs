import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parsePodcastRss, validatePodcastFeedUrl } from '../functions/api/_lib/podcastRssImport.js'
import { buildPodcastFeedXml } from '../functions/rss/podcast.xml.js'

const importApi = fs.readFileSync(new URL('../functions/api/podcast-import.js', import.meta.url), 'utf8')
const settingsPage = fs.readFileSync(new URL('../src/components/PodcastSettingsPage.jsx', import.meta.url), 'utf8')
const feedAdmin = fs.readFileSync(new URL('../src/components/FeedSettingsAdminPage.jsx', import.meta.url), 'utf8')
const feedManifest = fs.readFileSync(new URL('../functions/api/feed-manifest.js', import.meta.url), 'utf8')

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Molotov Now!</title>
  <link>https://example.org/show</link>
  <description><![CDATA[Independent audio from the network.]]></description>
  <language>en-us</language>
  <itunes:author>Sabot Media</itunes:author>
  <itunes:image href="https://cdn.example.org/show.jpg" />
  <itunes:category text="News" />
  <itunes:owner><itunes:name>Sabot</itunes:name><itunes:email>podcast@example.org</itunes:email></itunes:owner>
  <item>
    <title>Episode One</title>
    <guid isPermaLink="false">episode-guid-1</guid>
    <pubDate>Wed, 27 Aug 2026 12:00:00 GMT</pubDate>
    <content:encoded><![CDATA[<p>Episode description.</p>]]></content:encoded>
    <enclosure url="https://cdn.example.org/episode-one.mp3" type="audio/mpeg" length="12345" />
    <itunes:duration>00:42:10</itunes:duration>
    <itunes:episode>7</itunes:episode>
    <itunes:season>2</itunes:season>
    <itunes:explicit>yes</itunes:explicit>
  </item>
</channel>
</rss>`

test('podcast RSS parser preserves channel identity and episode enclosure metadata', () => {
  const parsed = parsePodcastRss(SAMPLE, 'https://example.org/feed.xml')
  assert.equal(parsed.podcast.title, 'Molotov Now!')
  assert.equal(parsed.podcast.author, 'Sabot Media')
  assert.equal(parsed.podcast.imageUrl, 'https://cdn.example.org/show.jpg')
  assert.equal(parsed.podcast.ownerEmail, 'podcast@example.org')
  assert.equal(parsed.episodeCount, 1)
  assert.equal(parsed.episodes[0].guid, 'episode-guid-1')
  assert.equal(parsed.episodes[0].enclosureUrl, 'https://cdn.example.org/episode-one.mp3')
  assert.equal(parsed.episodes[0].enclosureType, 'audio/mpeg')
  assert.equal(parsed.episodes[0].enclosureLength, 12345)
  assert.equal(parsed.episodes[0].duration, '00:42:10')
  assert.equal(parsed.episodes[0].episodeNumber, '7')
  assert.equal(parsed.episodes[0].season, '2')
  assert.equal(parsed.episodes[0].explicit, true)
})

test('podcast source fetch validation rejects local and private network URLs', () => {
  assert.throws(() => validatePodcastFeedUrl('http://localhost/feed.xml'), /public host/)
  assert.throws(() => validatePodcastFeedUrl('http://127.0.0.1/feed.xml'), /private network/)
  assert.throws(() => validatePodcastFeedUrl('http://192.168.1.20/feed.xml'), /private network/)
  assert.equal(validatePodcastFeedUrl('https://example.org/feed.xml'), 'https://example.org/feed.xml')
})

test('podcast import endpoint is D1 authoritative, permission checked, duplicate aware, and show scoped', () => {
  assert.match(importApi, /publishing:write/)
  assert.match(importApi, /listNativeEntries\(db, \{ includeFuture: true \}\)/)
  assert.match(importApi, /sourceKind: 'podcast-rss'/)
  assert.match(importApi, /sourceExternalId: episode\.guid/)
  assert.match(importApi, /rss-resync/)
  assert.match(importApi, /MAX_IMPORT_EPISODES = 250/)
  assert.match(importApi, /requestedShowId/)
  assert.match(importApi, /entryBelongsToShowImport/)
  assert.match(importApi, /upsertPodcastShow/)
  assert.doesNotMatch(importApi, /localStorage/)
})

test('podcast settings UI supports preview, selective import, repeatable resync, and separate shows', () => {
  assert.match(settingsPage, /Import or synchronize this podcast RSS feed/)
  assert.match(settingsPage, /Create this podcast from an RSS feed/)
  assert.match(settingsPage, /previewPodcastFeed/)
  assert.match(settingsPage, /showId: activeShowId/)
  assert.match(settingsPage, /Import selected/)
  assert.match(settingsPage, /Resync selected/)
  assert.match(settingsPage, /sourceFeedLastSyncedAt/)
  assert.match(settingsPage, /Canonical Sabot RSS feed URL/)
})

test('feeds admin uses authoritative live manifest instead of browser archive guesses', () => {
  assert.match(feedAdmin, /loadFeedManifest/)
  assert.match(feedAdmin, /Server-detected terms/)
  assert.match(feedAdmin, /Download feed manifest \(JSON\)/)
  assert.doesNotMatch(feedAdmin, /getPieces/)
  assert.doesNotMatch(feedAdmin, /buildRssBundle/)
  assert.doesNotMatch(feedAdmin, /Download RSS Bundle/)
  assert.match(feedManifest, /terms: runtime\.terms/)
})

test('podcast output uses imported GUID and delivery-asset explicit metadata', () => {
  const xml = buildPodcastFeedXml({
    requestUrl: 'https://sabot.media/feeds/podcasts/molotov-now.xml',
    selfPath: '/feeds/podcasts/molotov-now.xml',
    settings: { podcastTitle: 'Imported Show', author: 'Sabot' },
    items: [{
      id: 'native-id',
      slug: 'episode-one',
      title: 'Episode One',
      sourceExternalId: 'original-guid-123',
      publishedAt: '2026-08-27T12:00:00Z',
      relatedAssets: [{
        role: 'delivery',
        source: 'podcast-rss',
        type: 'audio',
        url: 'https://cdn.example.org/episode.mp3',
        mimeType: 'audio/mpeg',
        size: 98765,
        podcastExplicit: true,
        podcastGuid: 'original-guid-123',
      }],
    }],
  })
  assert.match(xml, /<guid isPermaLink="false">original-guid-123<\/guid>/)
  assert.match(xml, /<enclosure url="https:\/\/cdn\.example\.org\/episode\.mp3" type="audio\/mpeg" length="98765" \/>/)
  assert.match(xml, /<itunes:explicit>yes<\/itunes:explicit>/)
  assert.match(xml, /<atom:link href="https:\/\/sabot\.media\/feeds\/podcasts\/molotov-now\.xml"/)
})
