import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  canonicalCoverageUrl,
  defaultEditorialStatusForUrl,
  fetchGdeltAiCoverage,
  isStrictGdeltCandidate,
  listAiCoverageArchive,
  normalizeArchiveItem,
  updateCoverageEditorialState,
  upsertAiCoverageItems,
} from '../functions/api/_lib/aiCampaignCoverageArchive.js'
import { selectHubCoverage } from '../src/lib/campaignCoverage.js'
import { isPublicCampaignPath } from '../functions/_middleware.js'

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
let DatabaseSync = null
try { ({ DatabaseSync } = await import('node:sqlite')) } catch { /* Node 20 CI lacks the optional built-in SQLite test driver. */ }

test('campaign hub deliberately limits coverage while preserving editorial selections', () => {
  const items = Array.from({ length: 14 }, (_, index) => ({ id: `item-${index}`, date: `2026-08-${String(30 - index).padStart(2, '0')}`, title: `Coverage ${index}`, url: `https://example.org/${index}`, editorialStatus: index === 5 ? 'featured' : index === 6 ? 'hidden' : 'automatic' }))
  const selected = selectHubCoverage(items)
  assert.equal(selected.length, 8)
  assert.equal(selected[0].id, 'item-5')
  assert.equal(selected.some((item) => item.id === 'item-6'), false)
})

test('coverage URL canonicalization removes fragments, tracking and trailing slash variants', () => {
  const base = 'https://www.torinocronaca.it/news/cronaca/687032/luomo-del-pd-e-tra-i-siti-dei-terroristi-ora-interrogazioni-a-roma-e-bruxelles.html'
  assert.equal(canonicalCoverageUrl(`${base}/?utm_source=x&fbclid=abc#google_vignette`), base)
  assert.equal(canonicalCoverageUrl(`${base}?msclkid=abc`), base)
  assert.equal(defaultEditorialStatusForUrl(`${base}/?utm_campaign=test#google_vignette`), 'hidden')
  assert.equal(defaultEditorialStatusForUrl('https://www.torinocronaca.it/news/cronaca/future-story.html'), 'automatic')
})

test('D1 editorial flow hides, preserves and restores collected coverage without deletion', { skip: !DatabaseSync }, async () => {
  const db = d1Database()
  const item = { title: 'Autistici/Inventati sanctions coverage', url: 'https://example.org/case?utm_source=first', date: '2026-08-30', automated: true }
  await upsertAiCoverageItems(db, [item])
  let publicView = await listAiCoverageArchive(db)
  assert.equal(publicView.items.length, 1)
  assert.equal('editorialNote' in publicView.items[0], false)
  const id = publicView.items[0].id

  await updateCoverageEditorialState(db, { id, campaignSlug: 'autistici-inventati', editorialStatus: 'hidden', editorialNote: 'Private review', actor: 'editor@example.org' })
  publicView = await listAiCoverageArchive(db)
  assert.equal(publicView.items.length, 0)
  let hiddenView = await listAiCoverageArchive(db, { includeHidden: true, editorialStatus: 'hidden' })
  assert.equal(hiddenView.items.length, 1)
  assert.equal(hiddenView.items[0].editorialNote, 'Private review')

  await upsertAiCoverageItems(db, [{ ...item, url: 'https://example.org/case/?fbclid=refresh#duplicate', title: 'Refreshed title' }])
  hiddenView = await listAiCoverageArchive(db, { includeHidden: true, editorialStatus: 'hidden' })
  assert.equal(hiddenView.items.length, 1)
  assert.equal(hiddenView.items[0].title, 'Refreshed title')

  await updateCoverageEditorialState(db, { id, campaignSlug: 'autistici-inventati', editorialStatus: 'automatic', editorialNote: '', actor: 'editor@example.org' })
  publicView = await listAiCoverageArchive(db)
  assert.equal(publicView.items.length, 1)
  assert.equal(publicView.items[0].editorialStatus, 'automatic')
})

test('the two specified Torino Cronaca records seed hidden while future outlet stories remain automatic', { skip: !DatabaseSync }, async () => {
  const db = d1Database()
  await upsertAiCoverageItems(db, [
    { title: 'Specified Torino item one', url: 'https://www.torinocronaca.it/news/cronaca/687032/luomo-del-pd-e-tra-i-siti-dei-terroristi-ora-interrogazioni-a-roma-e-bruxelles.html#google_vignette', date: '2026-08-30', automated: true },
    { title: 'Specified Torino item two', url: 'https://www.torinocronaca.it/news/cronaca/687100/e-questa-sinistra-vorrebbe-governare-litalia-autistici-inventati-cavedagna-incalza-chiariscano-su-de-rosa.html?utm_medium=feed', date: '2026-08-30', automated: true },
    { title: 'Future Torino Cronaca coverage', url: 'https://www.torinocronaca.it/news/cronaca/future-ai-report.html', date: '2026-08-31', automated: true },
  ])
  const publicView = await listAiCoverageArchive(db)
  assert.deepEqual(publicView.items.map((item) => item.title), ['Future Torino Cronaca coverage'])
  const hiddenView = await listAiCoverageArchive(db, { includeHidden: true, editorialStatus: 'hidden' })
  assert.equal(hiddenView.items.length, 2)
})

test('GDELT archive ingestion accepts exact case coverage and rejects broad keyword collisions', () => {
  assert.equal(isStrictGdeltCandidate({ title: 'Autistici/Inventati designated under U.S. sanctions', description: 'OFAC action', url: 'https://news.example/ai', seendate: '20260830T120000Z' }), true)
  assert.equal(isStrictGdeltCandidate({ title: 'Grays Harbor SOS: a report from the rural edge', description: 'Infrastructure and terrorism appear in unrelated reporting.', url: 'https://news.example/grays', seendate: '20260830T120000Z' }), false)
  assert.equal(isStrictGdeltCandidate({ title: 'Molotov Now podcast', description: 'NoBlogs hosts many unrelated projects.', url: 'https://news.example/molotov', seendate: '20260830T120000Z' }), false)
})

test('GDELT public API results are normalized to metadata and links without article bodies', async () => {
  let requested = ''
  const items = await fetchGdeltAiCoverage(async (url) => {
    requested = url
    return new Response(JSON.stringify({ articles: [{ title: 'Autistici/Inventati faces sanctions designation', url: 'https://example.org/story?utm_source=test', seendate: '20260830T120000Z', domain: 'example.org', language: 'English', socialimage: 'https://example.org/image.jpg' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
  })
  assert.match(requested, /api\.gdeltproject\.org\/api\/v2\/doc\/doc/)
  assert.match(requested, /format=json/)
  assert.equal(items.length, 1)
  assert.equal(items[0].url, 'https://example.org/story')
  assert.equal('body' in items[0], false)
})

test('archive records use canonical URLs and distinguish editorial from automated discovery', () => {
  const editorial = normalizeArchiveItem({ title: 'Case analysis', url: 'https://example.org/story/?utm_source=x', automated: false, date: '2026-08-30' })
  const automated = normalizeArchiveItem({ title: 'Autistici/Inventati sanctions', url: 'https://example.org/live', automated: true, date: '2026-08-30' }, { source: 'gdelt-doc-api' })
  assert.equal(editorial.url, 'https://example.org/story')
  assert.equal(editorial.isFeatured, true)
  assert.equal(automated.discoverySource, 'gdelt-doc-api')
  assert.equal(automated.isFeatured, false)
  const decoded = normalizeArchiveItem({ title: 'L&#8217;uomo &#232; qui', summary: 'Finalit&#224;', url: 'https://example.org/entities', date: '2026-08-30' })
  assert.equal(decoded.title, 'L’uomo è qui')
  assert.equal(decoded.summary, 'Finalità')
})

test('coverage archive is D1-backed, searchable, scheduled and gracefully isolates source errors', () => {
  const server = read('../functions/api/_lib/aiCampaignCoverageArchive.js')
  const endpoint = read('../functions/api/campaign-coverage.js')
  const workflow = read('../.github/workflows/campaign-coverage-refresh.yml')
  assert.match(server, /CREATE TABLE IF NOT EXISTS campaign_coverage_archive/)
  assert.match(server, /campaign_coverage_refresh/)
  assert.match(server, /lower\(title\) LIKE/)
  assert.match(server, /ON CONFLICT\(campaign_slug, canonical_url\)/)
  assert.match(server, /summary = CASE WHEN excluded\.summary != '' THEN excluded\.summary ELSE summary END/)
  assert.match(server, /reason: 'source-error'/)
  assert.doesNotMatch(server + endpoint, /localStorage|sessionStorage/)
  assert.match(endpoint, /context\.waitUntil\(refreshPromise/)
  assert.match(workflow, /schedule:/)
  assert.match(workflow, /campaign-coverage\?campaign=autistici-inventati&refresh=1/)
})

test('coverage archive route receives the SPA shell and public UI exposes useful filters', () => {
  const page = read('../src/components/CampaignCoverageArchivePage.jsx')
  const campaign = read('../src/components/CampaignPage.jsx')
  const selection = read('../src/lib/campaignCoverage.js')
  const css = read('../src/campaign-coverage-archive.css')
  const main = read('../src/main.jsx')
  assert.equal(isPublicCampaignPath('/campaigns/autistici-inventati/coverage'), true)
  assert.match(page, /Search the archive/)
  assert.match(page, /All languages/)
  assert.match(page, /All outlets/)
  assert.match(page, /timeZone:\s*'UTC'/)
  assert.match(campaign, /Browse the full coverage archive/)
  assert.match(selection, /slice\(0, limit\)/)
  assert.match(css, /overflow-x:\s*clip/)
  assert.match(css, /\.campaign-coverage-page\s*\{[\s\S]*?max-width:\s*none/)
  assert.match(css, /\.campaign-coverage-page \.publication-topbar--masthead\s*\{[\s\S]*?background:\s*var\(--coverage-ink\)\s*!important/)
  assert.match(css, /\.campaign-coverage-controls\s*\{[\s\S]*?top:\s*0/)
  assert.match(css, /\.campaign-coverage-card h2 a\s*\{[\s\S]*?overflow-wrap:\s*normal\s*!important/)
  assert.ok(main.indexOf("campaign-coverage-archive.css") > main.indexOf("campaign-page-polish.css"))
})

test('verified system backup includes the D1 campaign coverage archive', () => {
  const backup = read('../src/lib/systemBackup.js')
  assert.match(backup, /campaignCoverage/)
  assert.match(backup, /fetchCampaignCoverageForBackup/)
  assert.match(backup, /schemaVersion:\s*8/)
  assert.match(backup, /admin=1&editorialStatus=all/)
})

test('coverage moderation is authenticated, reusable and separated on the public campaign page', () => {
  const server = read('../functions/api/_lib/aiCampaignCoverageArchive.js')
  const endpoint = read('../functions/api/campaign-coverage.js')
  const campaignsEndpoint = read('../functions/api/campaigns.js')
  const admin = read('../src/components/CampaignCoverageModeration.jsx')
  const campaign = read('../src/components/CampaignPage.jsx')
  assert.match(server, /editorial_status TEXT NOT NULL DEFAULT 'automatic'/)
  assert.match(server, /reviewed_at TEXT/)
  assert.match(server, /reviewed_by TEXT/)
  assert.match(server, /editorial_note TEXT/)
  assert.doesNotMatch(server.match(/ON CONFLICT\(campaign_slug, canonical_url\)[\s\S]*?last_seen_at = excluded\.last_seen_at/)?.[0] || '', /editorial_status\s*=/)
  assert.match(endpoint, /resolvePublicSitePermission/)
  assert.match(endpoint, /COVERAGE_EDITORIAL_STATUSES\.includes/)
  assert.match(endpoint, /includeHidden:\s*adminView/)
  assert.match(campaignsEndpoint, /campaignSlug:\s*item\.slug/)
  for (const label of ['Feature', 'Show publicly', 'Hide from public feed', 'Restore', 'Private editorial note', 'Featured', 'Automatic', 'Hidden']) assert.match(admin, new RegExp(label))
  assert.match(campaign, /Featured Coverage/)
  assert.match(campaign, /Automated Coverage Feed/)
  assert.match(campaign, /Inclusion does not constitute endorsement by Sabot Media or indicate that we have independently verified the reporting/)
  assert.doesNotMatch(campaign, /editorialNote|reviewedBy/)
})

function d1Database() {
  const sqlite = new DatabaseSync(':memory:')
  return {
    prepare(sql) {
      let values = []
      return {
        bind(...next) { values = next; return this },
        async run() { const result = sqlite.prepare(sql).run(...values); return { meta: { changes: Number(result.changes || 0) } } },
        async all() { return { results: sqlite.prepare(sql).all(...values) } },
        async first() { return sqlite.prepare(sql).get(...values) || null },
      }
    },
  }
}
