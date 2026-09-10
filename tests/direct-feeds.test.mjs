import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDetectedTerms, normalizeFeedRequestPath } from '../functions/api/_lib/feedRuntime.js'
import { buildPodcastFeedXml } from '../functions/rss/podcast.xml.js'
import { buildRssBundle, resolveFeedFormat, resolveFeedProject } from '../src/lib/rssFeeds.js'
import { normalizeFeedTerm } from '../src/lib/feedSettings.js'

const directRoute = fs.readFileSync(new URL('../functions/feeds/[[path]].js', import.meta.url), 'utf8')
const runtime = fs.readFileSync(new URL('../functions/api/_lib/feedRuntime.js', import.meta.url), 'utf8')
const manifest = fs.readFileSync(new URL('../functions/api/feed-manifest.js', import.meta.url), 'utf8')
const manifestClient = fs.readFileSync(new URL('../src/lib/feedManifestApi.js', import.meta.url), 'utf8')
const publicPage = fs.readFileSync(new URL('../src/components/PublicFeedsPage.jsx', import.meta.url), 'utf8')
const publicRegistry = fs.readFileSync(new URL('../src/lib/editableContentRegistry.js', import.meta.url), 'utf8')
const documentShell = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')

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

test('project feeds use archive project identity instead of legacy generic categories', () => {
  const items = [
    {
      id: 'harbor-story', slug: 'harbor-story', title: 'A Harbor story', status: 'published',
      contentType: 'dispatch', sourceKind: 'imported', sourceLabel: 'post', primaryProject: 'General',
      categories: ['General', 'article'], author: 'Sabot Media',
    },
    {
      id: 'communique', slug: 'communique-volume-18', title: 'The Communique Volume 18', status: 'published',
      contentType: 'dispatch', sourceKind: 'imported', sourceLabel: 'post', primaryProject: 'The Communique',
      categories: ['The Communique', 'General'], author: 'Sabot Media',
    },
    {
      id: 'generic-podcast-label', slug: 'generic-podcast-label', title: 'Ordinary written post', status: 'published',
      contentType: 'dispatch', sourceKind: 'imported', sourceLabel: 'post', primaryProject: 'podcast',
      categories: ['podcast'], author: 'Sabot Media',
    },
  ]

  const bundle = buildRssBundle(items)
  assert.equal(resolveFeedProject(items[0]), 'The Harbor Rat Report')
  assert.equal(resolveFeedProject(items[1]), 'The Communique')
  assert.equal(resolveFeedProject(items[2]), 'The Harbor Rat Report')
  assert.ok(bundle['projects/the-harbor-rat-report.xml'])
  assert.match(bundle['projects/the-harbor-rat-report.xml'], /A Harbor story/)
  assert.match(bundle['projects/the-harbor-rat-report.xml'], /Ordinary written post/)
  assert.ok(bundle['projects/the-communique.xml'])
  assert.match(bundle['projects/the-communique.xml'], /The Communique Volume 18/)
  assert.equal(bundle['projects/general.xml'], undefined)
  assert.equal(bundle['projects/podcast.xml'], undefined)
})

test('format feeds recover editorial formats from lossy migration buckets', () => {
  const items = [
    {
      id: 'article', slug: 'article', title: 'Imported article', status: 'published',
      contentType: 'dispatch', sourceKind: 'imported', sourceLabel: 'post', primaryProject: 'The Harbor Rat Report',
    },
    {
      id: 'newsletter', slug: 'newsletter', title: 'The Communique Volume 13', status: 'published',
      contentType: 'dispatch', sourceKind: 'imported', sourceLabel: 'post', primaryProject: 'The Communique',
    },
    {
      id: 'comic', slug: 'comic', title: 'The Saboteurs #33', status: 'published',
      contentType: 'publicBlock', sourceKind: 'imported', sourceLabel: 'The Sabotuers', primaryProject: 'The Sabotuers',
    },
    {
      id: 'print', slug: 'print', title: 'A Black Cat pamphlet', status: 'published',
      contentType: 'print', sourceKind: 'imported', sourceLabel: 'post', primaryProject: 'Black Cat Distro',
    },
    {
      id: 'dispatch-storage', slug: 'dispatch-storage', title: 'New article stored as dispatch', status: 'published',
      contentType: 'dispatch', sourceKind: 'manual', primaryProject: 'The Harbor Rat Report',
    },
  ]

  assert.deepEqual(items.map((item) => resolveFeedFormat(item)), ['article', 'newsletter', 'comic', 'print', 'article'])

  const bundle = buildRssBundle(items)
  assert.match(bundle['formats/article.xml'], /Imported article/)
  assert.match(bundle['formats/article.xml'], /New article stored as dispatch/)
  assert.doesNotMatch(bundle['formats/article.xml'], /The Communique Volume 13|The Saboteurs #33|A Black Cat pamphlet/)
  assert.match(bundle['formats/newsletter.xml'], /The Communique Volume 13/)
  assert.match(bundle['formats/comic.xml'], /The Saboteurs #33/)
  assert.match(bundle['formats/print.xml'], /A Black Cat pamphlet/)
  assert.equal(bundle['formats/dispatch.xml'], undefined)
  assert.match(bundle['all-content.xml'], /Imported article/)
  assert.match(bundle['all-content.xml'], /The Communique Volume 13/)
  assert.match(bundle['all-content.xml'], /The Saboteurs #33/)
  assert.match(bundle['all-content.xml'], /A Black Cat pamphlet/)
  assert.match(bundle['all-content.xml'], /New article stored as dispatch/)
})

test('manifest terms are derived from the same taxonomy as generated feeds', () => {
  const items = [
    {
      id: 'article', slug: 'article', title: 'Imported article', status: 'published',
      contentType: 'dispatch', sourceKind: 'imported', sourceLabel: 'post', primaryProject: 'General', categories: ['General'],
    },
    {
      id: 'comic', slug: 'comic', title: 'The Saboteurs #33', status: 'published',
      contentType: 'publicBlock', sourceKind: 'imported', sourceLabel: 'The Sabotuers', primaryProject: 'The Sabotuers', categories: ['podcast'],
    },
  ]
  const terms = buildDetectedTerms(items)
  assert.deepEqual(terms.format, ['article', 'comic'])
  assert.deepEqual(terms.project, ['The Harbor Rat Report', 'The Sabotuers'])
  assert.ok(!terms.project.includes('General'))
  assert.ok(!terms.project.includes('podcast'))
})

test('byline aliases are case-insensitive so one public identity gets one feed', () => {
  assert.equal(normalizeFeedTerm('author', 'Sabot Media'), 'Sabot Media Collective')
  assert.equal(normalizeFeedTerm('author', 'sabot media'), 'Sabot Media Collective')
  assert.equal(normalizeFeedTerm('author', 'SABOT MEDIA'), 'Sabot Media Collective')

  const bundle = buildRssBundle([
    { id: 'one', slug: 'one', title: 'One', status: 'published', author: 'Sabot Media' },
    { id: 'two', slug: 'two', title: 'Two', status: 'published', author: 'sabot media' },
    { id: 'three', slug: 'three', title: 'Three', status: 'published', author: 'SABOT MEDIA' },
  ])
  const bylineFeeds = Object.keys(bundle).filter((name) => name.startsWith('bylines/'))
  assert.deepEqual(bylineFeeds, ['bylines/sabot-media-collective.xml'])
  assert.match(bundle[bylineFeeds[0]], /One/)
  assert.match(bundle[bylineFeeds[0]], /Two/)
  assert.match(bundle[bylineFeeds[0]], /Three/)
})

test('public feeds page links only to server manifest endpoints', () => {
  assert.match(publicPage, /loadFeedManifest/)
  assert.match(manifestClient, /fetch\('\/api\/feed-manifest'/)
  assert.match(publicPage, /href=\{`\/feeds\/\$\{file\}`\}/)
  assert.doesNotMatch(publicPage, /buildRssBundle\(getPieces\(\)/)
  assert.match(publicPage, /Nothing is being presented as a working subscription URL until it does/)
  assert.match(manifest, /mode: 'd1'/)
  assert.match(manifest, /'podcasts\/all\.xml'/)
})

test('topic feeds stay available internally but are not advertised by the public directory', () => {
  assert.match(publicPage, /!file\.startsWith\('topics\/'\)/)
  assert.match(manifest, /!name\.startsWith\('topics\/'\)/)
  assert.doesNotMatch(publicPage, /topics: 'topics'/)
  assert.doesNotMatch(publicPage, /Follow subjects across formats and projects/)
})

test('public feeds are discoverable from site navigation and RSS-aware browsers', () => {
  assert.match(publicRegistry, /defaultLabel: 'Feeds'.*defaultHref: '\/feeds'/)
  assert.match(publicRegistry, /defaultLabel: 'Feeds \/ RSS'.*defaultHref: '\/feeds'/)
  assert.match(documentShell, /rel="alternate" type="application\/rss\+xml".*href="\/feeds\/all-content\.xml"/)
})

test('podcast feed output includes enclosure and directory metadata', () => {
  const xml = buildPodcastFeedXml({
    requestUrl: 'https://sabot.media/feeds/podcasts/molotov-now.xml',
    selfPath: '/feeds/podcasts/molotov-now.xml',
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
  assert.match(xml, /<atom:link href="https:\/\/sabot\.media\/feeds\/podcasts\/molotov-now\.xml"/)
})

test('direct podcasts endpoint supports default alias and distinct per-show feeds', () => {
  assert.match(directRoute, /requestedPath === 'podcasts\/all\.xml'/)
  assert.match(directRoute, /readPodcastShows\(db\)/)
  assert.match(directRoute, /podcastMatch = requestedPath\.match/)
  assert.match(directRoute, /findPodcastShow\(db, slug\)/)
  assert.match(directRoute, /getPodcastFeedItems\(db, show\)/)
  assert.match(directRoute, /`\/feeds\/podcasts\/\$\{show\.slug\}\.xml`/)
  assert.match(directRoute, /buildPodcastFeedXml/)
})