import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { ABERDEEN_1312_GALLERY, legacyMediaId, legacyStorageKey } from '../functions/api/_lib/galleries.js'
import { extractLegacyGalleryImageUrls } from '../functions/api/gallery-migration.js'

const migrationSource = fs.readFileSync(new URL('../functions/api/gallery-migration.js', import.meta.url), 'utf8')
const galleryApi = fs.readFileSync(new URL('../functions/api/galleries/[slug].js', import.meta.url), 'utf8')
const galleryPage = fs.readFileSync(new URL('../src/components/GalleryArchivePage.jsx', import.meta.url), 'utf8')
const galleryCss = fs.readFileSync(new URL('../src/components/GalleryArchivePage.css', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const topbar = fs.readFileSync(new URL('../src/components/PublicationTopbar.jsx', import.meta.url), 'utf8')
const footer = fs.readFileSync(new URL('../src/components/PublicationFooter.jsx', import.meta.url), 'utf8')

test('Aberdeen 1312 manifest preserves the exact WXR gallery order and count', () => {
  assert.equal(ABERDEEN_1312_GALLERY.attachmentIds.length, 76)
  assert.deepEqual(ABERDEEN_1312_GALLERY.attachmentIds.slice(0, 5), [1571, 1572, 1573, 1574, 1575])
  assert.deepEqual(ABERDEEN_1312_GALLERY.attachmentIds.slice(-5), [1647, 1648, 1649, 1650, 1651])
  assert.deepEqual(ABERDEEN_1312_GALLERY.attachmentIds.slice(60, 66), [1638, 1639, 1612, 1613, 1640, 1641])
})

test('legacy gallery media uses deterministic ids and storage keys for idempotent retries', () => {
  assert.equal(legacyMediaId(1571), 'legacy-wp-1571')
  assert.equal(legacyStorageKey(1571, 'Untitled design12.png'), 'media/uploads/images/legacy-noblogs-1571-Untitled-design12.png')
})

test('legacy gallery HTML parser only accepts ordered June 2023 Noblogs gallery image sources', () => {
  const html = `<img src="https://sabotmedia.noblogs.org/files/2023/06/one.png"><img src="https://sabotmedia.noblogs.org/files/2022/10/logo.png"><img src="https://evil.example/files/2023/06/no.png"><img src='https://sabotmedia.noblogs.org/files/2023/06/two.png'><img src="https://sabotmedia.noblogs.org/files/2023/06/one.png">`
  assert.deepEqual(extractLegacyGalleryImageUrls(html), [
    'https://sabotmedia.noblogs.org/files/2023/06/one.png',
    'https://sabotmedia.noblogs.org/files/2023/06/two.png',
  ])
})

test('migration is server authoritative, resumable, and copies binaries into R2 plus D1', () => {
  assert.match(migrationSource, /permissionHasCapability\(permission, 'media:write'\)/)
  assert.match(migrationSource, /storage\.bucket\.put/)
  assert.match(migrationSource, /upsertMediaAsset/)
  assert.match(migrationSource, /upsertGalleryItem/)
  assert.match(migrationSource, /BATCH_SIZE = 5/)
  assert.match(migrationSource, /wp-json\/wp\/v2\/media/)
  assert.match(migrationSource, /legacy-noblogs-gallery/)
})

test('gallery data is exposed through a public D1-backed JSON endpoint', () => {
  assert.match(galleryApi, /getBoundDb/)
  assert.match(galleryApi, /getGallery/)
  assert.match(galleryApi, /mode: 'd1'/)
  assert.match(galleryApi, /public gallery read/)
})

test('old gallery URL is owned by the React public site shell, not standalone HTML', () => {
  assert.equal(fs.existsSync(new URL('../functions/aberdeen-local-1312-gallery.js', import.meta.url)), false)
  assert.match(app, /GalleryArchivePage/)
  assert.match(app, /path=\{publicRoutes\.gallery\}/)
  assert.match(galleryPage, /PublicationTopbar/)
  assert.match(galleryPage, /PublicationFooter/)
  assert.match(galleryPage, /api\/galleries/)
  assert.match(galleryPage, /ArrowLeft/)
  assert.match(galleryPage, /ArrowRight/)
})

test('gallery reuses the archive public layout instead of a separate paper microsite', () => {
  assert.match(galleryPage, /public-search-page archive-page publication-gallery-page/)
  assert.match(galleryPage, /project-hero archive-page__hero publication-gallery-hero/)
  assert.match(galleryPage, /archive-results publication-gallery-results/)
  assert.match(galleryCss, /background:transparent/)
  assert.match(galleryCss, /var\(--archive-surface-strong\)/)
  assert.doesNotMatch(galleryCss, /publication-paper/)
})

test('gallery is linked from the site-wide masthead and footer', () => {
  assert.match(topbar, /aberdeen-local-1312-gallery/)
  assert.match(topbar, /defaultLabel="Gallery"/)
  assert.match(footer, /aberdeen-local-1312-gallery/)
  assert.match(footer, /defaultLabel="Gallery"/)
})
