import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  fetchGdeltAiCoverage,
  isStrictGdeltCandidate,
  normalizeArchiveItem,
} from '../functions/api/_lib/aiCampaignCoverageArchive.js'
import { selectHubCoverage } from '../src/lib/campaignCoverage.js'
import { isPublicCampaignPath } from '../functions/_middleware.js'

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('campaign hub deliberately limits coverage while preserving editorial selections', () => {
  const items = Array.from({ length: 14 }, (_, index) => ({ id: `item-${index}`, date: `2026-08-${String(30 - index).padStart(2, '0')}`, title: `Coverage ${index}`, url: `https://example.org/${index}`, automated: index > 4 }))
  const selected = selectHubCoverage(items)
  assert.equal(selected.length, 8)
  assert.deepEqual(selected.slice(0, 5).map((item) => item.id), ['item-0', 'item-1', 'item-2', 'item-3', 'item-4'])
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
  assert.match(css, /top:\s*calc\(var\(--masthead-height/)
  assert.ok(main.indexOf("campaign-coverage-archive.css") > main.indexOf("campaign-page-polish.css"))
})

test('verified system backup includes the D1 campaign coverage archive', () => {
  const backup = read('../src/lib/systemBackup.js')
  assert.match(backup, /campaignCoverage/)
  assert.match(backup, /fetchCampaignCoverageForBackup/)
  assert.match(backup, /schemaVersion:\s*8/)
})
