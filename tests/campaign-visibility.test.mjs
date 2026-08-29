import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const visibility = fs.readFileSync(new URL('../src/config/campaignVisibility.js', import.meta.url), 'utf8')
const routes = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const topbar = fs.readFileSync(new URL('../src/components/PublicationTopbar.jsx', import.meta.url), 'utf8')
const footer = fs.readFileSync(new URL('../src/components/PublicationFooter.jsx', import.meta.url), 'utf8')

test('A/I campaign launch links are hidden behind an explicit temporary flag', () => {
  assert.match(visibility, /SHOW_AI_CAMPAIGN_LINKS\s*=\s*false/)
  assert.match(topbar, /SHOW_AI_CAMPAIGN_LINKS\s*\?\s*<Link/)
  assert.match(footer, /SHOW_AI_CAMPAIGN_LINKS\s*\?\s*<Link/)
})

test('hiding launch links does not remove the direct campaign route', () => {
  assert.match(routes, /path=\{publicRoutes\.aiCampaign\}/)
  assert.match(routes, /<CampaignPage\s*\/>/)
})
