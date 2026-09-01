import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const routes = fs.readFileSync(new URL('../src/routing/routes.js', import.meta.url), 'utf8')
const rail = fs.readFileSync(new URL('../src/components/AdminRail.jsx', import.meta.url), 'utf8')
const palette = fs.readFileSync(new URL('../src/components/AdminCommandPalette.jsx', import.meta.url), 'utf8')
const podcastAdmin = fs.readFileSync(new URL('../src/components/PodcastAdminPage.jsx', import.meta.url), 'utf8')
const middleware = fs.readFileSync(new URL('../functions/_middleware.js', import.meta.url), 'utf8')

test('podcast settings has a canonical named admin route and protected page', () => {
  assert.match(routes, /podcastSettings: '\/wp-admin\/podcasts\/settings'/)
  assert.match(app, /path=\{`\$\{adminRoutes\.podcasts\}\/settings`\} element=\{protect\(<PodcastSettingsPage/)
})

test('podcast area has one normal admin destination with settings nested inside it', () => {
  assert.match(rail, /adminRoutes\.podcasts, label: 'Podcasts'/)
  assert.doesNotMatch(rail, /adminRoutes\.podcastSettings/)
  assert.doesNotMatch(palette, /Podcast Settings \/ Import RSS|adminRoutes\.podcastSettings/)
})

test('podcast episodes page exposes import and canonical RSS actions', () => {
  assert.match(podcastAdmin, /to=\{adminRoutes\.podcastSettings\}>Podcast Settings \/ Import RSS/)
  assert.match(podcastAdmin, /Import or resync an existing podcast RSS feed/)
  assert.match(podcastAdmin, /href="\/feeds\/podcasts\/all\.xml"/)
})

test('podcast episodes page uses the live D1 feed identity and does not merge the legacy archive', () => {
  assert.match(podcastAdmin, /loadPodcastSettingsAsync/)
  assert.match(podcastAdmin, /loadNativeCollection\(\{ includeFuture: 1 \}\)/)
  assert.match(podcastAdmin, /item\.contentType === 'podcast'/)
  assert.doesNotMatch(podcastAdmin, /getPieces|importedPodcastPieces|source: 'archive'/)
})

test('edge middleware serves the SPA shell for nested authenticated wp-admin routes', () => {
  assert.match(middleware, /'\/wp-admin'/)
  assert.match(middleware, /pathname\.startsWith\(`\$\{path\}\/`\)/)
  assert.match(middleware, /context\.env\.ASSETS\.fetch/)
})
