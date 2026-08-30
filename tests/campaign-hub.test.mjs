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
const polish = fs.readFileSync(new URL('../src/campaign-page-polish.css', import.meta.url), 'utf8')
const socialServer = fs.readFileSync(new URL('../functions/api/_lib/aiCampaignPublic.js', import.meta.url), 'utf8')
const socialEndpoint = fs.readFileSync(new URL('../functions/api/campaign-social.js', import.meta.url), 'utf8')
const graphicsManifest = fs.readFileSync(new URL('../functions/api/_lib/aiCampaignGraphics.js', import.meta.url), 'utf8')
const intelligence = fs.readFileSync(new URL('../functions/api/_lib/aiCampaignIntelligence.js', import.meta.url), 'utf8')
const nativeModel = fs.readFileSync(new URL('../functions/api/_lib/nativePublicContent.js', import.meta.url), 'utf8')
const postEditor = fs.readFileSync(new URL('../src/components/NativeContentBridgePage.jsx', import.meta.url), 'utf8')

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
  assert.match(model, /updatedAt:\s*String\(input\.updatedAt \|\| now\)/)
  assert.match(model, /normalizeCampaign\(\{ \.\.\.campaign, updatedAt: new Date\(\)\.toISOString\(\) \}\)/)
  assert.match(server, /databaseUnavailable\('campaign reads'\)/)
  assert.match(server, /databaseUnavailable\('campaign writes'\)/)
  assert.doesNotMatch(model, /localStorage/)
  assert.doesNotMatch(client, /localStorage/)
  assert.match(middleware, /\['\/api\/campaigns', 'publishing:write'\]/)
})

test('campaign seeds the canonical A/I hub and exposes the requested sections', () => {
  assert.match(model, /Communications Infrastructure Is Not Terrorism/)
  assert.match(model, /https:\/\/kuma\.accol\.li\/status\/aimonitor/)
  assert.doesNotMatch(model, /campaignKeywords: \[[^\]]*'terrorism'/)
  assert.doesNotMatch(model, /campaignKeywords: \[[^\]]*'sanctions'/)
  for (const id of ['status', 'act', 'reporting', 'letters', 'updates', 'graphics', 'social', 'sources']) {
    assert.match(page, new RegExp(`id=\\"${id}\\"`))
  }
  assert.match(page, /PRESS \+ RESPONSE/)
  assert.match(page, /Coverage and statements/)
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
  for (const key of ['updates', 'resources', 'social', 'graphics', 'coverage', 'signatories', 'sources', 'timeline', 'faq', 'translations']) {
    assert.match(admin, new RegExp(`key: '${key}'`))
  }
  assert.match(admin, /Campaign hub saved to D1/)
  assert.match(admin, /Nothing has been saved locally/)
})

test('campaign reporting excludes body-only false positives and keeps explicit A/I relationships', () => {
  assert.doesNotMatch(page, /piece\.body|piece\.bodyHtml|podcastSummary/)
  assert.match(page, /exactSlugs/)
  assert.match(page, /piece\.tags/)
  assert.match(page, /piece\.campaigns/)
  assert.match(page, /autistici/)
  assert.doesNotMatch(page, /keywords\.some/)
})

test('campaign typography and navigation are bounded and anchor-safe', () => {
  assert.match(polish, /font-size:\s*clamp\(/)
  assert.match(polish, /--campaign-nav-height/)
  assert.match(polish, /scroll-margin-top:/)
  assert.match(polish, /@media \(max-width: 760px\)/)
  assert.match(polish, /\.campaign-local-nav \{ position: relative;/)
  assert.ok(main.indexOf("./campaign-page-polish.css") > main.indexOf("./campaign-page.css"))
})

test('live dashboard includes a responsive daylight-saving-safe Italy clock', () => {
  assert.match(page, /timeZone: 'Europe\/Rome'/)
  assert.match(page, /CURRENT TIME IN ITALY/)
  assert.match(page, /campaign-italy-clock/)
  assert.match(page, /setInterval\(\(\) => setNow\(Date\.now\(\)\), 1000\)/)
  assert.match(polish, /\.campaign-page \.campaign-italy-clock/)
  assert.match(polish, /\.campaign-page \.campaign-italy-clock time strong[\s\S]*font:\s*900 clamp\(/)
  assert.match(polish, /@media \(max-width: 760px\)[\s\S]*\.campaign-page \.campaign-italy-clock/)
})

test('live campaign social is server-side, filtered, normalized and graceful', () => {
  assert.match(socialServer, /public\.api\.bsky\.app\/xrpc\/app\.bsky\.feed\.getAuthorFeed/)
  assert.match(socialServer, /api\/v1\/accounts\/lookup/)
  assert.match(socialServer, /Promise\.allSettled/)
  assert.match(socialServer, /isCampaignSocialPost/)
  assert.match(socialServer, /socialErrors/)
  assert.match(socialEndpoint, /items:\s*\[\]/)
  assert.doesNotMatch(socialServer, /localStorage|embed\.js|<script/)
})

test('live social filtering excludes pre-campaign A\/I and NoBlogs posts', async () => {
  const { isCampaignSocialPost } = await import('../functions/api/_lib/aiCampaignPublic.js')
  assert.equal(isCampaignSocialPost({ date: '2026-05-30T09:56:31Z', text: 'Support A/I and NoBlogs' }), false)
  assert.equal(isCampaignSocialPost({ date: '2026-08-27T11:17:20Z', text: 'Defend Autistici/Inventati before September 25' }), true)
  assert.equal(isCampaignSocialPost({ date: '2026-08-27T11:17:20Z', text: 'Unrelated infrastructure update' }), false)
})

test('bundled campaign graphics manifest resolves every accessible asset', () => {
  const slugs = [...graphicsManifest.matchAll(/\['([a-z0-9-]+)',/g)].map((match) => match[1])
  assert.equal(slugs.length, 22)
  for (const slug of slugs) {
    assert.ok(fs.existsSync(new URL(`../public/campaigns/autistici-inventati/graphics/${slug}.webp`, import.meta.url)), `${slug} web asset exists`)
    assert.ok(fs.existsSync(new URL(`../public/campaigns/autistici-inventati/graphics/originals/${slug}.png`, import.meta.url)), `${slug} original exists`)
  }
  assert.match(graphicsManifest, /alt,/)
  assert.match(page, /Copy alt text/)
  assert.doesNotMatch(page, /Add Bluesky, Mastodon|attached from Campaigns admin|added in Campaigns admin|Source links can be attached/)
})

test('monitor aggregate distinguishes partial from major outage and unavailable data', () => {
  assert.match(monitor, /return 'major-outage'/)
  assert.match(monitor, /return 'partial-outage'/)
  assert.match(page, /monitor unavailable/)
  assert.doesNotMatch(page, /outage detected/)
})

test('campaign follow-up keeps the hero contained and places social last', () => {
  assert.match(polish, /\.campaign-hero__copy[\s\S]*min-width:\s*0/)
  assert.doesNotMatch(page, /campaign-hero__poster/)
  assert.ok(page.indexOf('<SocialSection') > page.indexOf('id="translations"'))
  assert.ok(page.indexOf('href="#reporting">Read the reporting') < page.indexOf('href="#letters">Read the letters'))
})

test('individual letter PDF remains bundled in letters but not primary sources', () => {
  assert.ok(fs.existsSync(new URL('../public/campaigns/autistici-inventati/resources/individual-letter-defend-autistici-inventati.pdf', import.meta.url)))
  assert.match(socialServer, /resource-individual-letter-pdf/)
  assert.doesNotMatch(socialServer, /id: 'source-individual-letter-pdf'/)
  assert.match(socialServer, /actionRank/)
})

test('receipts include authoritative sources, reporting and open letter without the letter PDF', () => {
  for (const expected of ['sb0616', 'designation-of-autistici-inventati', 'www.inventati.org/who/manifesto', 'www.inventati.org/who/collective', 'www.inventati.org/who/rplan/index', 'ai-book-kaos.pdf', 'cavallette.noblogs.org/2026/08/10076', 'MST%2Bresource_edit-2.pdf', '/post/the-server-called-paranoia', '/post/open-letter-ai']) assert.match(socialServer, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.doesNotMatch(socialServer, /www\.autistici\.org\/who\//)
  assert.match(socialServer, /sources: dedupeByUrl\(\[\.\.\.builtInSources/)
})

test('article PDF is bundled with reporting and excluded from the letter resource strip', () => {
  assert.ok(fs.existsSync(new URL('../public/campaigns/autistici-inventati/resources/the-server-called-paranoia-article.pdf', import.meta.url)))
  assert.match(socialServer, /resource-server-called-paranoia-pdf/)
  assert.match(socialServer, /Download article PDF/)
  assert.match(page, /!\/letter\|template\/i/)
  assert.match(page, /\/letter\|template\/i/)
})

test('campaign ships external coverage and prioritizes the official A\/I Mastodon feed', () => {
  for (const expected of ['coverage-crimethinc', 'coverage-repubblica', 'coverage-effimera', 'coverage-rainews']) assert.match(socialServer, new RegExp(expected))
  assert.match(socialServer, /mastodon\.bida\.im['"], acct: ['"]cavallette/)
  assert.match(socialServer, /sourcePriority/)
  assert.match(socialServer, /setTimeout\(\(\) => controller\.abort\(\), 12000\)/)
  assert.match(socialServer, /coverage: dedupeCoverage\(\[\.\.\.\(campaign\.coverage \|\| \[\]\), \.\.\.builtInCoverage, \.\.\.intelligence\.coverage\]\)/)
})

test('campaign coverage and official statements refresh automatically with strict server-side sources', () => {
  assert.match(intelligence, /cavallette\.noblogs\.org\/feed/)
  assert.match(intelligence, /api\.gdeltproject\.org\/api\/v2\/doc\/doc/)
  assert.match(intelligence, /news\.google\.com\/rss\/search/)
  assert.match(intelligence, /Promise\.allSettled/)
  assert.match(intelligence, /isCampaignCoverageCandidate/)
  assert.match(intelligence, /CACHE_TTL_SECONDS = 600/)
  assert.match(socialServer, /loadLiveAiIntelligence/)
  assert.match(socialServer, /intelligenceCheckedAt/)
  assert.match(page, /AUTOMATIC CAMPAIGN WATCH/)
  assert.match(page, /setInterval\(refreshDashboard, 300000\)/)
  assert.doesNotMatch(intelligence, /localStorage|embed\.js|<script/)
})

test('post editor provides an explicit persistent campaign relationship', () => {
  assert.match(nativeModel, /campaigns: normalizeTags\(raw\.campaigns/)
  assert.match(postEditor, /Campaign relationship/)
  assert.match(postEditor, /value="autistici-inventati"/)
  assert.match(postEditor, /campaigns: normalizeTermList\(merged\.campaigns\)/)
  assert.match(intelligence, /deriveAiCampaignPublicationUpdates/)
  assert.match(server, /listNativeEntries\(db, \{ status: 'published' \}\)/)
  assert.match(feeds, /decorateAiCampaignForPublic/)
})

test('signatory carousel is populated from the published letter and placed before social', async () => {
  const { extractAiLetterSignatories } = await import('../functions/api/_lib/aiCampaignPublic.js')
  const sample = '<div>Signed,</div><div><p>Sabot Media - USA<br />Example Collective - Italy says:</p><blockquote>Infrastructure is not terrorism.</blockquote><p>Another Signer, USA</p></div><div><br /></div><div><b>Sign on</b></div>'
  assert.deepEqual(extractAiLetterSignatories(sample).map(({ name, location, statement }) => ({ name, location, statement })), [
    { name: 'Sabot Media', location: 'USA', statement: undefined },
    { name: 'Example Collective', location: 'Italy', statement: 'Infrastructure is not terrorism.' },
    { name: 'Another Signer', location: 'USA', statement: undefined },
  ])
  for (const expected of ['Sabot Media', 'We Will Free Us', 'Grounded Futures Podcast', 'The Final Straw Radio', '#MilkTeaAlliance Calendar Team', 'Datenpunks e.V.', 'Jeremy Beausoleil Smith']) assert.match(socialServer, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(server, /getNativeEntry\(db, 'open-letter-ai'\)/)
  assert.match(server, /extractAiLetterSignatories/)
  assert.match(page, /function SignatoryCarousel/)
  assert.match(page, /scrollBy/)
  assert.ok(page.indexOf('<SignatoryCarousel') < page.indexOf('<SocialSection'))
  assert.match(polish, /scroll-snap-type:\s*inline mandatory/)
})

test('coverage and live social disclose language and exact followed accounts', () => {
  for (const expected of ['Italian', 'translatedTitle', 'mastodon.bida.im/@cavallette', 'Official Autistici/Inventati account', 'primarily Italian', 'Italian + English']) assert.match(socialServer, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(socialServer, /label: `@\$\{account\.acct\}@\$\{new URL\(account\.instance\)\.host\}`/)
  assert.match(page, /ACCOUNTS IN THIS LIVE FEED/)
  assert.match(page, /These are the exact public accounts queried by the server/)
  assert.match(page, /A\/I is based in Italy/)
  assert.match(page, /campaign-social-post__language/)
  assert.match(page, /campaign-link-list__translation/)
  assert.match(model, /signatories: normalizeRows/)
})

test('hero uses an asterisk and campaign chronology is fully populated', () => {
  assert.match(polish, /\.campaign-page \.campaign-hero::after[\s\S]*content:\s*"\*"/)
  assert.match(polish, /border-radius:\s*0/)
  for (const expected of ['timeline-founded', 'timeline-first-request', 'timeline-trenitalia', 'timeline-aruba', 'timeline-aruba-discovery', 'timeline-plan-r', 'timeline-norway', 'timeline-designation', 'timeline-deadline']) assert.match(socialServer, new RegExp(expected))
  for (const expected of ['update-designation', 'update-ai-response', 'update-investigation', 'update-open-letter', 'update-individual-letter', 'update-graphics', 'update-launch']) assert.match(socialServer, new RegExp(expected))
  assert.match(page, /sortByDate\(campaign\?\.updates \|\| \[\], false\)/)
  assert.match(socialServer, /timeline: dedupeById/)
  assert.match(socialServer, /mergeCampaignUpdates/)
})

test('new A/I press release is promoted as a current update and primary source', () => {
  assert.match(socialServer, /source-ai-press-release/)
  assert.match(socialServer, /timeline-ai-press-release/)
  assert.match(socialServer, /update-ai-press-release/)
  assert.match(socialServer, /https:\/\/www\.inventati\.org\/campaign\/press/)
  assert.match(socialServer, /English-language A\/I briefing/)
  assert.match(socialServer, /serverHold/)
  assert.match(socialServer, /update-ai-communique-aug29[^\n]*pinned:\s*true/)
  assert.match(socialServer, /cavallette\.noblogs\.org\/2026\/08\/10093/)
  assert.match(page, /const latestPinned = updates\.filter\(\(item\) => item\.pinned\)\.at\(-1\)/)
  assert.match(page, /latestUpdate.*latestPinned/)
})
