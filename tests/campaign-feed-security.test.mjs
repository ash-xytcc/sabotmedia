import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import { isCampaignRelevant, loadCampaignAutomation } from '../functions/api/_lib/campaignAutomation.js'
import { fetchBoundedText, isPublicIpAddress } from '../functions/api/_lib/safeRemoteFeed.js'

test('feed SSRF guard rejects private, reserved, mapped, and non-public addresses', () => {
  for (const address of ['127.0.0.1', '10.4.5.6', '169.254.169.254', '100.64.1.2', '192.0.2.1', '198.51.100.7', '203.0.113.8', '::1', 'fc00::1', 'fe80::1', '2001:db8::1', '::ffff:127.0.0.1']) {
    assert.equal(isPublicIpAddress(address), false, address)
  }
  assert.equal(isPublicIpAddress('8.8.8.8'), true)
  assert.equal(isPublicIpAddress('2606:4700:4700::1111'), true)
})

test('every redirect target is DNS checked immediately before it is fetched', async () => {
  const events = []
  const resolver = async (hostname) => { events.push(`resolve:${hostname}`); return ['93.184.216.34'] }
  const fetcher = async (url, options) => {
    assert.equal(options.redirect, 'manual')
    const hostname = new URL(url).hostname
    events.push(`fetch:${hostname}`)
    if (hostname === 'feed.example') return new Response(null, { status: 302, headers: { location: 'https://news.example/rss.xml', 'content-length': '0' } })
    return new Response('<rss><channel /></rss>', { headers: { 'content-type': 'application/rss+xml' } })
  }
  const result = await fetchBoundedText('https://feed.example/start', { fetcher, resolver, maxBytes: 2048 })
  assert.equal(result.resolvedUrl, 'https://news.example/rss.xml')
  assert.deepEqual(events, ['resolve:feed.example', 'fetch:feed.example', 'resolve:news.example', 'fetch:news.example'])
})

test('a redirect cannot pivot a feed request onto a private DNS target', async () => {
  let fetchCount = 0
  const resolver = async (hostname) => hostname === 'feed.example' ? ['93.184.216.34'] : ['10.0.0.9']
  const fetcher = async () => {
    fetchCount += 1
    return new Response(null, { status: 302, headers: { location: 'https://internal.example/secrets' } })
  }
  await assert.rejects(fetchBoundedText('https://feed.example/start', { fetcher, resolver }), /private network|reserved/)
  assert.equal(fetchCount, 1)
})

test('feed body limits apply to declared and streamed response sizes', async () => {
  const resolver = async () => ['93.184.216.34']
  await assert.rejects(fetchBoundedText('https://feed.example/rss', {
    resolver, maxBytes: 32,
    fetcher: async () => new Response('small', { headers: { 'content-length': '1000' } }),
  }), /too large/)
  await assert.rejects(fetchBoundedText('https://feed.example/rss', {
    resolver, maxBytes: 32,
    fetcher: async () => new Response('x'.repeat(64)),
  }), /too large/)
})

test('RSS summaries participate in campaign relevance scoring', () => {
  const campaign = { slug: 'save-the-library', title: 'Save the Library', createdAt: '2026-08-01T00:00:00Z', automation: { startAt: '2026-08-01T00:00:00Z' } }
  assert.equal(isCampaignRelevant({ title: 'Weekly bulletin', summary: 'Organizers announced a Save the Library rally.', date: '2026-08-30T12:00:00Z', url: 'https://news.example/story' }, campaign, 'https://sabot.media/campaigns/save-the-library'), true)
  assert.equal(isCampaignRelevant({ title: 'Weekly bulletin', summary: 'An unrelated update.', date: '2026-08-30T12:00:00Z', url: 'https://news.example/other' }, campaign, 'https://sabot.media/campaigns/save-the-library'), false)
})

test('disabled generic automation never invokes any configured source', async () => {
  let calls = 0
  const campaign = {
    slug: 'disabled-campaign', title: 'Disabled Campaign', automation: {
      enabled: false, discoverNews: true, blueskyActors: ['example.bsky.social'], mastodonAccounts: ['@example@social.example'],
      coverageFeeds: ['https://news.example/rss'], signatoriesUrl: 'https://example.org/signers.json',
    },
  }
  const result = await loadCampaignAutomation(campaign, 'https://sabot.media/campaigns/disabled-campaign', async () => { calls += 1; throw new Error('must not fetch') })
  assert.equal(calls, 0)
  assert.equal(result.disabled, true)
  assert.deepEqual(result.social, [])
  assert.deepEqual(result.coverage, [])
  assert.deepEqual(result.signatories, [])
})

test('all campaign and podcast feed readers use the shared redirect and size guard', () => {
  for (const path of ['../functions/api/_lib/campaignAutomation.js', '../functions/api/_lib/aiCampaignIntelligence.js', '../functions/api/_lib/podcastRssImport.js']) {
    const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8')
    assert.match(source, /fetchBoundedText/)
    assert.doesNotMatch(source, /redirect:\s*['"]follow['"]|await response\.text\(\)/)
  }
})

test('generic social and monitor endpoints preserve the campaign automation opt-out', () => {
  const social = fs.readFileSync(new URL('../functions/api/campaign-social.js', import.meta.url), 'utf8')
  const monitor = fs.readFileSync(new URL('../functions/api/campaign-monitor.js', import.meta.url), 'utf8')
  assert.match(social, /loadCampaignAutomation\(campaign/)
  assert.match(monitor, /!campaign\.automation\?\.enabled[\s\S]*disabled:\s*true/)
})
