import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const routes = fs.readFileSync(new URL('../src/routing/routes.js', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../src/components/CampaignPage.jsx', import.meta.url), 'utf8')
const admin = fs.readFileSync(new URL('../src/components/CampaignAdminPage.jsx', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../src/lib/campaignsApi.js', import.meta.url), 'utf8')
const server = fs.readFileSync(new URL('../functions/api/campaigns.js', import.meta.url), 'utf8')
const model = fs.readFileSync(new URL('../functions/api/_lib/campaigns.js', import.meta.url), 'utf8')
const monitor = fs.readFileSync(new URL('../functions/api/campaign-monitor.js', import.meta.url), 'utf8')
const middleware = fs.readFileSync(new URL('../functions/_middleware.js', import.meta.url), 'utf8')
const feeds = fs.readFileSync(new URL('../functions/feeds/[[path]].js', import.meta.url), 'utf8')
const manifest = fs.readFileSync(new URL('../functions/api/feed-manifest.js', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../src/campaign-page.css', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const topbar = fs.readFileSync(new URL('../src/components/PublicationTopbar.jsx', import.meta.url), 'utf8')
const rail = fs.readFileSync(new URL('../src/components/AdminRail.jsx', import.meta.url), 'utf8')

test('A/I campaign is a first-class public and admin route', () => {
  assert.match(routes, /aiCampaign:\s*'\/campaigns\/autistici-inventati'/)
  assert.match(routes, /campaigns:\s*'\/wp-admin\/campaigns'/)
  assert.match(app, /CampaignPage/)
  assert.match(app, /CampaignAdminPage/)
  assert.match(app, /path=\{publicRoutes\.aiCampaign\}/)
  assert.match(app, /path=\{adminRoutes\.campaigns\}/)
  assert.match(topbar, /A\/I Campaign/)
  assert.match(rail, /label: 'Campaigns'/)
})

test('campaign publishing is D1-backed and fail-closed rather than browser-local', () => {
  assert.match(model, /CREATE TABLE IF NOT EXISTS campaigns/)
  assert.match(model, /campaign_json TEXT NOT NULL/)
  assert.match(model, /await db\.prepare/)
  assert.match(server, /databaseUnavailable\('campaign reads'\)/)
  assert.match(server, /databaseUnavailable\('campaign writes'\)/)
  assert.doesNotMatch(model, /localStorage/)
  assert.doesNotMatch(client, /localStorage/)
  assert.match(middleware, /\['\/api\/campaigns', 'publishing:write'\]/)
})

test('campaign seeds the canonical A/I hub and exposes the requested sections', () => {
  assert.match(model, /Communications Infrastructure Is Not Terrorism/)
  assert.match(model, /https:\/\/kuma\.accol\.li\/status\/aimonitor/)
  for (const id of ['status', 'act', 'reporting', 'letters', 'updates', 'graphics', 'social', 'sources']) {
    assert.match(page, new RegExp(`id=\\"${id}\\"`))
  }
  assert.match(page, /Press \+ Coverage/)
  assert.match(page, /PRIMARY SOURCES/)
  assert.match(page, /FAQ/)
  assert.match(page, /campaign\.disclaimer/)
})

test('A/I status uses a fixed server-side Uptime Kuma proxy and fails gracefully', () => {
  assert.match(monitor, /https:\/\/kuma\.accol\.li\/api\/status-page\/aimonitor/)
  assert.match(monitor, /https:\/\/kuma\.accol\.li\/api\/status-page\/heartbeat\/aimonitor/)
  assert.match(monitor, /aggregateStatus/)
  assert.match(monitor, /overall:\s*'unknown'/)
  assert.doesNotMatch(monitor, /searchParams/)
  assert.match(page, /window\.setInterval\(refresh, 60000\)/)
  assert.match(page, /This does not mean A\/I is down/)
  assert.doesNotMatch(page, /<iframe/)
})

test('campaign updates have a direct D1 RSS feed and manifest entry', () => {
  assert.match(feeds, /campaigns\\\/\(\[a-z0-9-\]\+\)\\\.xml/)
  assert.match(feeds, /buildCampaignRssXml/)
  assert.match(feeds, /x-sabot-feed-source': 'campaign-d1'/)
  assert.match(manifest, /campaigns\/\$\{AI_CAMPAIGN_SLUG\}\.xml/)
  assert.match(model, /Campaign Updates/)
})

test('campaign public design is isolated, responsive, and loaded after legacy public styles', () => {
  assert.match(main, /import '\.\/campaign-page\.css'/)
  assert.match(css, /\.campaign-hero/)
  assert.match(css, /\.campaign-status-grid/)
  assert.match(css, /\.campaign-graphics-grid/)
  assert.match(css, /@media \(max-width: 700px\)/)
  assert.match(css, /prefers-reduced-motion/)
  assert.ok(main.indexOf("./campaign-page.css") > main.indexOf("./sitewide-mobile-polish.css"))
})

test('campaign editor can manage updates, resources, social, graphics, coverage, sources, timeline, FAQ and translations', () => {
  for (const key of ['updates', 'resources', 'social', 'graphics', 'coverage', 'sources', 'timeline', 'faq', 'translations']) {
    assert.match(admin, new RegExp(`key: '${key}'`))
  }
  assert.match(admin, /Campaign hub saved to D1/)
  assert.match(admin, /Nothing has been saved locally/)
})
