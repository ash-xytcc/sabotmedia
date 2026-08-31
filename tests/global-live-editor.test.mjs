import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { getPublicPageMeta, publicPageRegistry, withSiteEdit } from '../src/lib/publicPageRegistry.js'
import { readPublicSiteConfig, writePublicSiteConfig } from '../functions/api/_lib/publicSiteConfig.js'

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const settings = fs.readFileSync(new URL('../src/components/WpAdminScaffoldPages.jsx', import.meta.url), 'utf8')
const launcher = fs.readFileSync(new URL('../src/components/PublicDraftPage.jsx', import.meta.url), 'utf8')
const editContext = fs.readFileSync(new URL('../src/components/PublicEditContext.jsx', import.meta.url), 'utf8')
const editableText = fs.readFileSync(new URL('../src/components/EditableText.jsx', import.meta.url), 'utf8')
const editableLink = fs.readFileSync(new URL('../src/components/EditableLink.jsx', import.meta.url), 'utf8')
const topbar = fs.readFileSync(new URL('../src/components/PublicationTopbar.jsx', import.meta.url), 'utf8')
const homepage = fs.readFileSync(new URL('../src/components/NativeUpdatesPage.jsx', import.meta.url), 'utf8')
const editPanel = fs.readFileSync(new URL('../src/components/PublicEditPanel.jsx', import.meta.url), 'utf8')
const publicToolbar = fs.readFileSync(new URL('../src/components/PublicAdminToolbar.jsx', import.meta.url), 'utf8')

const routeRenderers = [
  'NativeUpdatesPage.jsx',
  'PiecePage.jsx',
  'PrintPage.jsx',
  'CollectionsIndexPage.jsx',
  'CollectionPage.jsx',
  'CampaignsIndexPage.jsx',
  'CampaignPage.jsx',
  'CampaignCoverageArchivePage.jsx',
  'PublicFeedsPage.jsx',
  'GalleryArchivePage.jsx',
  'PublicationReaderPage.jsx',
  'PublicSurfacePage.jsx',
  'PublicInfoPage.jsx',
  'PublicSearchPage.jsx',
  'NotFoundPage.jsx',
]

test('live editor registry includes every direct public destination', () => {
  const paths = new Set(publicPageRegistry.map((page) => page.path))
  for (const path of [
    '/', '/archive', '/search', '/collections', '/campaigns',
    '/campaigns/autistici-inventati', '/campaigns/autistici-inventati/coverage',
    '/feeds', '/aberdeen-local-1312-gallery', '/updates', '/press', '/publications',
    '/about', '/contact', '/submit', '/support', '/security',
  ]) {
    assert.ok(paths.has(path), `missing public live-edit destination: ${path}`)
  }
})

test('live editor identifies every dynamic public route family', () => {
  const cases = {
    '/post/example': 'post',
    '/post/example/print': 'post-print',
    '/print/example': 'print',
    '/collections/example': 'collection',
    '/campaigns/example': 'campaign',
    '/publications/example': 'publication',
    '/reader/example': 'reader',
  }
  for (const [path, id] of Object.entries(cases)) {
    assert.equal(getPublicPageMeta(path).id, id)
  }
})

test('all public route renderers expose route-specific inline edit fields', () => {
  for (const filename of routeRenderers) {
    const source = fs.readFileSync(new URL(`../src/components/${filename}`, import.meta.url), 'utf8')
    assert.match(source, /<Editable(Text|Link)\b/, `${filename} has no route-specific editable field`)
  }
  assert.match(app, /data-live-edit-page=/)
  assert.match(app, /data-live-edit-family=/)
  assert.match(editPanel, /querySelectorAll\('\[data-field\]'\)/)
  assert.match(editPanel, /editableFieldCount/)
})

test('Settings, Pages, and the launcher open the real selected route in edit mode', () => {
  assert.equal(withSiteEdit('/feeds?format=all#top'), '/feeds?format=all&edit=site#top')
  assert.match(settings, /withSiteEdit\(page\.path\)/)
  assert.match(settings, /withSiteEdit\('\/'\)/)
  assert.doesNotMatch(settings, /liveEditor\}\?page=/)
  assert.match(launcher, /publicPageRegistry\.map/)
  assert.match(launcher, /withSiteEdit\(page\.path\)/)
})

test('published config boots empty and becomes authoritative only after D1 loads', () => {
  assert.match(editContext, /const \[savedConfig, setSavedConfig\] = useState\(\(\) => emptyConfig\(\)\)/)
  assert.doesNotMatch(editContext, /getStoredPublicConfig|setStoredPublicConfig|clearStoredPublicConfig/)
  assert.doesNotMatch(editContext, /applyDraftLocally|replaceSavedConfigLocally/)
  assert.doesNotMatch(publicToolbar, /Apply Local|applyDraftLocally/)
  assert.doesNotMatch(launcher, /replace-saved-local|replace saved local/)
  assert.match(editContext, /backendMode !== 'd1' \|\| loadState !== 'loaded'/)
  assert.match(editContext, /isConfigReady = backendMode === 'd1' && loadState === 'loaded'/)
  assert.match(editableText, /canEditInline = isEditing && isAdmin && isConfigReady/)
  assert.match(editableLink, /canEditInline = isEditing && isAdmin && isConfigReady/)
  assert.doesNotMatch(topbar, /customizerLocal|loadCustomizerSettings/)
  assert.doesNotMatch(homepage, /customizerLocal|loadCustomizerSettings/)
  assert.match(topbar, /getConfiguredBlock\(resolvedConfig, 'site\.masthead'\)/)
  assert.match(homepage, /getConfiguredBlock\(resolvedConfig, 'site\.homepage'\)/)
})

test('editable text preserves semantic attributes required by every page', () => {
  assert.match(editableText, /\.\.\.elementProps/)
  assert.match(editableText, /<Tag\s+[\s\S]*\{\.\.\.elementProps\}/)
})

test('editable mail, feed, and download links remain real browser destinations', () => {
  assert.match(editableLink, /usesNativeAnchor/)
  assert.match(editableLink, /mailto\|tel/)
  assert.match(editableLink, /xml\|pdf\|zip/)
  assert.match(editableLink, /href=\{href\}/)
})

test('page-specific live edits survive a D1 write and a fresh read', async () => {
  const rows = new Map()
  const db = {
    prepare(sql) {
      let params = []
      return {
        bind(...values) { params = values; return this },
        async run() {
          if (sql.includes('INSERT OR IGNORE INTO public_site_configs')) {
            const [scope, configJson] = params
            if (!rows.has(scope)) rows.set(scope, { id: rows.size + 1, scope, config_json: configJson, updated_at: '2026-08-31T00:00:00Z' })
          } else if (sql.includes('ON CONFLICT(scope) DO UPDATE')) {
            const [scope, configJson] = params
            rows.set(scope, { id: rows.get(scope)?.id || rows.size + 1, scope, config_json: configJson, updated_at: '2026-08-31T00:01:00Z' })
          }
          return { success: true }
        },
        async first() {
          if (!sql.includes('FROM public_site_configs')) return null
          return rows.get(params[0]) || null
        },
      }
    },
  }

  await writePublicSiteConfig(db, {
    text: {
      'campaign.autistici-inventati.hero.title': 'Edited campaign title',
      'feeds.hero.title': 'Edited feeds title',
      'nav.gallery.href': '/aberdeen-local-1312-gallery',
    },
    styles: {},
    blocks: {},
  })
  const reloaded = await readPublicSiteConfig(db)
  assert.equal(reloaded.config.text['campaign.autistici-inventati.hero.title'], 'Edited campaign title')
  assert.equal(reloaded.config.text['feeds.hero.title'], 'Edited feeds title')
  assert.equal(reloaded.config.text['nav.gallery.href'], '/aberdeen-local-1312-gallery')
})
