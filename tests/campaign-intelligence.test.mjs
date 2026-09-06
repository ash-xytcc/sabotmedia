import assert from 'node:assert/strict'
import test from 'node:test'

import {
  deriveAiCampaignPublicationUpdates,
  isAiCampaignRelationship,
  isCampaignCoverageCandidate,
  loadLiveAiIntelligence,
  mergeCampaignUpdates,
} from '../functions/api/_lib/aiCampaignIntelligence.js'

test('global coverage discovery requires exact A/I case signals', () => {
  assert.equal(isCampaignCoverageCandidate({ date: '2026-08-29', title: 'New reporting on Autistici/Inventati sanctions', url: 'https://example.org/ai' }), true)
  assert.equal(isCampaignCoverageCandidate({ date: '2026-08-29', title: 'NoBlogs.org targeted after terrorist designation', url: 'https://example.org/noblogs' }), true)
  assert.equal(isCampaignCoverageCandidate({ date: '2026-08-29', title: 'Grays Harbor infrastructure report', url: 'https://example.org/harbor' }), false)
  assert.equal(isCampaignCoverageCandidate({ date: '2026-08-29', title: 'Molotov Now: terrorism and resistance', url: 'https://example.org/podcast' }), false)
  assert.equal(isCampaignCoverageCandidate({ date: '2026-05-01', title: 'Autistici/Inventati history', url: 'https://example.org/old' }), false)
})

test('published Sabot posts use an explicit campaign relationship without scanning bodies', () => {
  assert.equal(isAiCampaignRelationship({ slug: 'a-creative-headline', title: 'A Creative Headline', campaigns: ['autistici-inventati'], body: 'No keywords required.' }), true)
  assert.equal(isAiCampaignRelationship({ slug: 'unrelated', title: 'Rural infrastructure and terrorism', body: 'Mentions Noblogs and Autistici/Inventati in passing.' }), false)

  const updates = deriveAiCampaignPublicationUpdates([{
    slug: 'a-creative-headline',
    title: 'A Creative Headline',
    campaigns: ['autistici-inventati'],
    publishedAt: '2026-08-30T10:00:00Z',
    excerpt: 'New reporting connected explicitly to the campaign.',
  }], 'https://sabot.media/api/campaigns')
  assert.equal(updates.length, 1)
  assert.equal(updates[0].url, 'https://sabot.media/post/a-creative-headline')
  assert.equal(updates[0].automated, true)
})

test('campaign update merging deduplicates a publication already represented editorially', () => {
  const merged = mergeCampaignUpdates(
    [{ id: 'curated', url: 'https://sabot.media/post/report', title: 'Curated update' }],
    [{ id: 'automatic', url: 'https://sabot.media/post/report', title: 'Automatic update' }],
    [{ id: 'no-url', title: 'Manual log entry' }],
  )
  assert.deepEqual(merged.map((item) => item.id), ['curated', 'no-url'])
})

test('campaign update merging also removes stale persisted copies with the same id', () => {
  const merged = mergeCampaignUpdates(
    [{ id: 'update-launch', url: 'https://sabot.media/campaigns/autistici-inventati', body: 'Current public copy' }],
    [{ id: 'update-launch', url: '', body: 'Stale persisted copy' }],
  )
  assert.deepEqual(merged.map((item) => item.body), ['Current public copy'])
})

test('trusted A/I feeds flow into the campaign log without redundant keyword filtering', async () => {
  const keepItFreeRss = `<?xml version="1.0"?><rss><channel>
    <item><title>Banca etica sequestra i fondi di A/I</title><link>https://keepitfree.ai/it/announcements/banca-etica-sequestra-i-fondi-di-a/i/</link><pubDate>Sat, 05 Sep 2026 09:00:00 GMT</pubDate><description>Comunicato stampa Autistici/Inventati. Banca Etica ha comunicato la decisione sui fondi dell'associazione.</description></item>
    <item><title>Technical instructions for users</title><link>https://keepitfree.ai/it/technical-updates/user-instructions/</link><pubDate>Sat, 05 Sep 2026 08:00:00 GMT</pubDate><description>Instructions from the official campaign source without repeating campaign keywords.</description></item>
  </channel></rss>`
  const legacyRss = `<?xml version="1.0"?><rss><channel>
    <item><title>Comunicato stampa Autistici / Inventati 29.8.2026</title><link>https://cavallette.noblogs.org/2026/08/10093</link><pubDate>Sat, 29 Aug 2026 17:00:51 GMT</pubDate><description>Aggiornamento sulle sanzioni e sui servizi.</description></item>
  </channel></rss>`
  const mastodonRss = `<?xml version="1.0"?><rss><channel>
    <item><title>Stay human</title><link>https://mastodon.bida.im/@cavallette/115000000000000000</link><pubDate>Sun, 06 Sep 2026 13:30:00 GMT</pubDate><description>Official account update that does not repeat a campaign keyword.</description></item>
  </channel></rss>`
  const bingRss = `<?xml version="1.0"?><rss><channel>
    <item><title>Autistici/Inventati designation draws new scrutiny - News Example</title><link>https://www.bing.com/news/apiclick.aspx?url=https%3A%2F%2Fnews.example%2Fai</link><pubDate>Sun, 30 Aug 2026 09:00:00 GMT</pubDate><description>Exact campaign coverage.</description></item>
    <item><title>Unrelated technology story - News Example</title><link>https://www.bing.com/news/apiclick.aspx?url=https%3A%2F%2Fnews.example%2Funrelated</link><pubDate>Sun, 30 Aug 2026 10:00:00 GMT</pubDate><description>No campaign relationship.</description></item>
  </channel></rss>`
  const fetcher = async (url) => {
    const value = String(url)
    if (value.includes('keepitfree.ai/it/index.xml')) return new Response(keepItFreeRss, { headers: { 'content-type': 'application/rss+xml' } })
    if (value.includes('cavallette.noblogs.org/feed')) return new Response(legacyRss, { headers: { 'content-type': 'application/rss+xml' } })
    if (value.includes('mastodon.bida.im/@cavallette.rss')) return new Response(mastodonRss, { headers: { 'content-type': 'application/rss+xml' } })
    if (value.includes('bing.com/news/search')) return new Response(bingRss, { headers: { 'content-type': 'application/rss+xml' } })
    throw new Error(`unexpected URL ${url}`)
  }
  const result = await loadLiveAiIntelligence('https://sabot.media/api/campaigns', fetcher)
  assert.equal(result.ok, true)
  assert.equal(result.sources.length, 4)
  assert.ok(result.sources.some((source) => source.url === 'https://keepitfree.ai/it/index.xml' && source.ok === true))
  assert.ok(result.sources.some((source) => source.url === 'https://mastodon.bida.im/@cavallette.rss' && source.ok === true))
  assert.ok(result.updates.some((item) => item.id === 'sabot-foia-filed-2026-09-05' && item.pinned === true))
  assert.ok(result.updates.some((item) => /banca-etica-sequestra/.test(item.url) && item.automated === true))
  assert.ok(result.updates.some((item) => /user-instructions/.test(item.url) && item.automated === true))
  assert.ok(result.updates.some((item) => /115000000000000000/.test(item.url) && item.automated === true))
  assert.ok(result.updates.some((item) => /10093/.test(item.url)))
  assert.ok(result.coverage.some((item) => /banca-etica-sequestra/.test(item.url) && item.languageCode === 'it'))
  assert.equal(result.coverage.some((item) => /news\.example\/unrelated/.test(item.url)), false)
})

test('external intelligence failures remain source-level and do not break the campaign', async () => {
  const result = await loadLiveAiIntelligence('https://sabot.media/api/campaigns', async () => { throw new Error('source offline') })
  assert.equal(result.ok, false)
  assert.equal(result.updates.length, 1)
  assert.equal(result.updates[0].id, 'sabot-foia-filed-2026-09-05')
  assert.equal(result.updates[0].automated, false)
  assert.equal(result.coverage.length, 0)
  assert.equal(result.errors.length, 4)
  assert.ok(result.sources.every((source) => source.ok === false))
})