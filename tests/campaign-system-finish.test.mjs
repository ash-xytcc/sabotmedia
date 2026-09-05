import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { blankCampaign, validateDeadlineWallTime } from '../src/lib/campaignDeadline.js'
import { normalizeCampaign } from '../functions/api/_lib/campaigns.js'
import { loadCampaignAutomation } from '../functions/api/_lib/campaignAutomation.js'

const admin = fs.readFileSync(new URL('../src/components/CampaignAdminPage.jsx', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../src/components/CampaignPage.jsx', import.meta.url), 'utf8')
const directory = fs.readFileSync(new URL('../src/components/CampaignsIndexPage.jsx', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const routes = fs.readFileSync(new URL('../src/routing/routes.js', import.meta.url), 'utf8')
const endpoint = fs.readFileSync(new URL('../functions/api/campaigns.js', import.meta.url), 'utf8')
const socialEndpoint = fs.readFileSync(new URL('../functions/api/campaign-social.js', import.meta.url), 'utf8')
const middleware = fs.readFileSync(new URL('../functions/_middleware.js', import.meta.url), 'utf8')
const backup = fs.readFileSync(new URL('../src/lib/systemBackup.js', import.meta.url), 'utf8')
const revisions = fs.readFileSync(new URL('../functions/api/_lib/campaigns.js', import.meta.url), 'utf8')
const health = fs.readFileSync(new URL('../functions/api/site-health.js', import.meta.url), 'utf8')

test('generic campaigns persist opt-in live automation settings', () => {
  const draft = blankCampaign()
  assert.deepEqual(draft.automation.blueskyActors, [])
  const item = normalizeCampaign({ title: 'Save the Library', automation: { enabled: true, discoverNews: true, startAt: '2026-08-01T00:00:00Z', blueskyActors: ['library.bsky.social'], mastodonAccounts: ['@library@social.example'], coverageFeeds: ['https://news.example/feed.xml'], signatoriesUrl: 'https://letter.example/signers.json' } })
  assert.equal(item.automation.enabled, true)
  assert.equal(item.automation.discoverNews, true)
  assert.deepEqual(item.automation.mastodonAccounts, ['@library@social.example'])
  assert.match(admin, /Live Sources \+ Automation/)
  assert.match(admin, /Signatories JSON URL/)
  assert.match(admin, /Discover exact-match news coverage automatically/)
})

test('generic social automation uses public server APIs, filters strictly, and isolates failures', async () => {
  const campaign = normalizeCampaign({ title: 'Save the Library', slug: 'save-the-library', campaignKeywords: ['save the library'], automation: { enabled: true, startAt: '2026-08-01T00:00:00Z', blueskyActors: ['library.bsky.social'], mastodonAccounts: ['@library@social.example'] } })
  const fetcher = async (url) => {
    if (String(url).includes('public.api.bsky.app')) return new Response(JSON.stringify({ feed: [
      { post: { cid: 'yes', uri: 'at://did/app.bsky.feed.post/yes', indexedAt: '2026-08-29T12:00:00Z', author: { handle: 'library.bsky.social', displayName: 'Library' }, record: { createdAt: '2026-08-29T12:00:00Z', text: 'Read the Save the Library campaign' } } },
      { post: { cid: 'no', uri: 'at://did/app.bsky.feed.post/no', indexedAt: '2026-08-29T12:00:00Z', author: { handle: 'library.bsky.social' }, record: { createdAt: '2026-08-29T12:00:00Z', text: 'Unrelated lunch update' } } },
    ] }), { status: 200, headers: { 'content-type': 'application/json' } })
    throw new Error('Mastodon unavailable')
  }
  const result = await loadCampaignAutomation(campaign, 'https://sabot.media/campaigns/save-the-library', fetcher)
  assert.equal(result.social.length, 1)
  assert.match(result.social[0].url, /bsky\.app/)
  assert.equal(result.errors.length, 1)
  assert.equal(result.socialSources.find((item) => item.platform === 'mastodon').ok, false)
  assert.match(socialEndpoint, /loadCampaignAutomation/)
  assert.doesNotMatch(socialEndpoint, /localStorage|embed\.js|<script/)
})

test('campaign lifecycle controls protect the seeded A/I identity', () => {
  assert.match(admin, /Add New Campaign/)
  assert.match(admin, /Duplicate/)
  assert.match(admin, /Archive/)
  assert.match(admin, /Delete/)
  assert.match(admin, /isProtectedAiCampaign/)
  assert.match(endpoint, /the seeded A\/I campaign URL slug cannot be changed/)
  assert.match(endpoint, /onRequestDelete/)
})

test('campaign directory and campaign-specific metadata are public', () => {
  assert.match(routes, /campaigns:\s*['"]\/campaigns['"]/)
  assert.match(app, /path=\{publicRoutes\.campaigns\} element=\{<CampaignsIndexPage \/>\}/)
  assert.doesNotMatch(app, /path=\{publicRoutes\.campaigns\} element=\{<Navigate/)
  assert.match(directory, /loadCampaigns\(\)/)
  assert.match(page, /setDocumentMeta/)
  assert.match(middleware, /renderPublicCampaign/)
  assert.match(middleware, /campaign\?\.heroImage/)
  assert.match(middleware, /link rel="canonical"/)
})

test('nonexistent daylight-saving wall times are rejected explicitly', () => {
  const invalid = validateDeadlineWallTime('2026-03-08T02:30', 'America/New_York')
  assert.equal(invalid.iso, '')
  assert.match(invalid.error, /does not exist.*daylight-saving/i)
  const valid = validateDeadlineWallTime('2026-03-08T03:30', 'America/New_York')
  assert.equal(valid.error, '')
  assert.equal(valid.iso, '2026-03-08T07:30:00.000Z')
  assert.match(admin, /deadlineError/)
})

test('campaign backup and health checks cover the actual complete datasets', () => {
  assert.match(backup, /campaign-revisions\?all=1&limit=500&page=\$\{page\}/)
  assert.match(revisions, /SELECT COUNT\(\*\) AS total FROM campaign_revisions/)
  assert.match(revisions, /LIMIT \? OFFSET \?/)
  assert.match(health, /campaign_coverage_archive/)
  assert.match(health, /campaign_coverage_refresh/)
  assert.doesNotMatch(health, /'campaign_coverage'/)
})

test('configured section order determines real render order without CSS order', () => {
  assert.match(page, /Children\.toArray\(children\)\.sort/)
  assert.match(page, /rank\.get\(a\.props\.id \|\| a\.props\.sectionKey\)/)
  assert.doesNotMatch(page, /style=\{sectionStyle/)
})
