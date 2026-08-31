import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { normalizeMediaAsset } from '../functions/api/_lib/mediaAssets.js'

const librarySource = fs.readFileSync(new URL('../src/components/MediaLibraryPage.jsx', import.meta.url), 'utf8')
const uploadSource = fs.readFileSync(new URL('../functions/api/media/files.js', import.meta.url), 'utf8')
const registrySource = fs.readFileSync(new URL('../functions/api/_lib/mediaAssets.js', import.meta.url), 'utf8')
const setupSource = fs.readFileSync(new URL('../docs/media-assets-setup.md', import.meta.url), 'utf8')

test('extended media metadata survives normalization', () => {
  const asset = normalizeMediaAsset({
    id: 'media-test',
    title: 'Test asset',
    url: 'https://sabot.media/api/media/files?key=media/uploads/images/test.jpg',
    alt: 'Alt text',
    caption: 'Caption',
    description: 'Description',
    credit: 'Credit',
    attribution: 'Creator, CC BY 4.0',
    creator: 'Creator',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://example.org/source',
    folder: 'Field photos',
    tags: ['protest', 'portrait', 'protest'],
    mediaType: 'image',
    mimeType: 'image/jpeg',
    filename: 'test.jpg',
    size: 12345,
    storageKey: 'media/uploads/images/test.jpg',
    source: 'server-upload',
  })

  assert.equal(asset.altText, 'Alt text')
  assert.equal(asset.description, 'Description')
  assert.equal(asset.creator, 'Creator')
  assert.equal(asset.license, 'CC BY 4.0')
  assert.equal(asset.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/')
  assert.equal(asset.sourceUrl, 'https://example.org/source')
  assert.deepEqual(asset.tags, ['protest', 'portrait'])
  assert.equal(asset.mimeType, 'image/jpeg')
  assert.equal(asset.filename, 'test.jpg')
  assert.equal(asset.size, 12345)
  assert.equal(asset.storageKey, 'media/uploads/images/test.jpg')
})

test('media registry schema has idempotent extended metadata migration', () => {
  assert.match(registrySource, /metadata_json TEXT NOT NULL DEFAULT '\{\}'/)
  assert.match(registrySource, /PRAGMA table_info\(media_assets\)/)
  assert.match(registrySource, /ALTER TABLE media_assets ADD COLUMN metadata_json/)
})

test('media upload succeeds only after R2 and D1 registration', () => {
  assert.match(uploadSource, /await storage\.bucket\.put/)
  assert.match(uploadSource, /await upsertMediaAsset\(db/)
  assert.match(uploadSource, /await storage\.bucket\.delete\(storageKey\)/)
  assert.match(uploadSource, /Media registry write failed; uploaded object was rolled back/)
  assert.match(uploadSource, /SABOT_MEDIA_BUCKET/)
})

test('Media Library never falls back to browser data URLs after upload failure', () => {
  assert.doesNotMatch(librarySource, /fileToDataUrl|makeLocalMediaFromFile|addLocalMediaItem/)
  assert.doesNotMatch(librarySource, /browser-local fallback for drafts/)
  assert.match(librarySource, /fetchMediaAssets/)
  assert.match(librarySource, /saveMediaAsset/)
  assert.match(librarySource, /Legacy browser media recovery/)
})

test('binary replacement is not faked in the client', () => {
  assert.match(librarySource, /Replace File/)
  assert.match(librarySource, /Replace File is intentionally disabled/)
  assert.doesNotMatch(librarySource, /replaceSelectedMediaFile/)
})

test('canonical media binding is documented explicitly', () => {
  assert.match(setupSource, /SABOT_MEDIA_BUCKET/)
  assert.match(setupSource, /Workers & Pages/)
  assert.match(setupSource, /R2 bucket bindings/)
})
