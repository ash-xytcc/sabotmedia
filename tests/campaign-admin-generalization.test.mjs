import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { blankCampaign, campaignSlug, deadlineInputValue, deadlineIsoValue } from '../src/lib/campaignDeadline.js'
import { AI_CAMPAIGN_DEADLINE, defaultAiCampaign, normalizeCampaign } from '../functions/api/_lib/campaigns.js'

const admin = fs.readFileSync(new URL('../src/components/CampaignAdminPage.jsx', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../src/lib/campaignsApi.js', import.meta.url), 'utf8')
const endpoint = fs.readFileSync(new URL('../functions/api/campaigns.js', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const manifest = fs.readFileSync(new URL('../functions/api/feed-manifest.js', import.meta.url), 'utf8')

test('campaign admin is a general D1-backed manager with an add-new flow', () => {
  assert.match(admin, /<h1>Campaigns<\/h1>/)
  assert.match(admin, /Add New Campaign/)
  assert.match(admin, /loadCampaigns\(\{ includeDrafts: true \}\)/)
  assert.match(admin, /blankCampaign\(\)/)
  assert.match(admin, /URL slug/)
  assert.doesNotMatch(admin, /A\/I Campaign Hub|const CAMPAIGN_SLUG/)
  assert.doesNotMatch(admin, /localStorage/)
  assert.match(client, /export async function loadCampaigns/)
})

test('new campaigns start unpublished and do not inherit A/I identity', () => {
  const campaign = blankCampaign()
  assert.equal(campaign.status, 'draft')
  assert.equal(campaign.slug, '')
  assert.equal(campaign.title, '')
  assert.equal(campaign.monitorUrl, '')
  assert.equal(campaignSlug('  Save Our Local Press!  '), 'save-our-local-press')
  assert.doesNotMatch(JSON.stringify(campaign), /Autistici|Inventati|Noblogs/)
  assert.doesNotMatch(endpoint, /slug:\s*incoming\.slug\s*\|\|\s*AI_CAMPAIGN_SLUG/)
  assert.match(endpoint, /includeDrafts \|\| item\.slug !== AI_CAMPAIGN_SLUG/)
  assert.match(endpoint, /missing campaign title/)
})

test('generic campaign slugs have a public route and appear in the feed manifest', () => {
  assert.match(app, /path=\{publicRoutes\.campaign\} element=\{<CampaignPage \/>\}/)
  assert.match(manifest, /listCampaigns\(db\)/)
  assert.match(manifest, /campaigns\.map\(\(campaign\) => `campaigns\/\$\{campaign\.slug\}\.xml`\)/)
})

test('campaign normalization preserves explicit deadline timezone', () => {
  const campaign = normalizeCampaign({ title: 'Test', deadline: '2026-10-01T12:00:00Z', deadlineTimeZone: 'Europe/Rome' })
  assert.equal(campaign.deadlineTimeZone, 'Europe/Rome')
  assert.equal(campaign.deadline, '2026-10-01T12:00:00.000Z')
})

test('A/I deadline matches OFAC General License 36 and renders as 12:01 a.m. Eastern', () => {
  assert.equal(AI_CAMPAIGN_DEADLINE, '2026-09-25T04:01:00.000Z')
  assert.equal(defaultAiCampaign().deadline, AI_CAMPAIGN_DEADLINE)
  assert.equal(defaultAiCampaign().deadlineTimeZone, 'America/New_York')
  assert.equal(deadlineInputValue(AI_CAMPAIGN_DEADLINE, 'America/New_York'), '2026-09-25T00:01')
  assert.equal(deadlineIsoValue('2026-09-25T00:01', 'America/New_York'), AI_CAMPAIGN_DEADLINE)
})

test('deadline input is independent of the editor browser timezone', () => {
  assert.equal(deadlineInputValue('2026-09-25T04:01:00.000Z', 'America/Los_Angeles'), '2026-09-24T21:01')
  assert.equal(deadlineIsoValue('2026-09-24T21:01', 'America/Los_Angeles'), '2026-09-25T04:01:00.000Z')
  assert.equal(deadlineInputValue('2026-09-25T04:01:00.000Z', 'Europe/Rome'), '2026-09-25T06:01')
})
