import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { detectMediaSignature, mediaMimeMatchesSignature } from '../functions/api/_lib/mediaSignature.js'

const route = fs.readFileSync(new URL('../functions/api/campaign-contributor-media.js', import.meta.url), 'utf8')

test('media signature detection recognizes safe contributor formats', () => {
  assert.equal(detectMediaSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg')
  assert.equal(detectMediaSignature(new TextEncoder().encode('%PDF-1.7\n')), 'application/pdf')
  assert.equal(detectMediaSignature(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x00])), 'application/webm')
  assert.equal(detectMediaSignature(new TextEncoder().encode('OggSxxxx')), 'application/ogg')
})

test('container signatures allow only their compatible declared media families', () => {
  assert.equal(mediaMimeMatchesSignature('video/webm', 'application/webm'), true)
  assert.equal(mediaMimeMatchesSignature('audio/webm', 'application/webm'), true)
  assert.equal(mediaMimeMatchesSignature('image/png', 'application/webm'), false)
  assert.equal(mediaMimeMatchesSignature('application/pdf', 'application/pdf'), true)
})

test('campaign contributor upload checks bytes before storage and supports bounded PDF files', () => {
  const readAt = route.indexOf('new Uint8Array(await file.arrayBuffer())')
  const detectAt = route.indexOf('detectMediaSignature(bytes)')
  const putAt = route.indexOf('storage.bucket.put')
  assert.ok(readAt > -1 && detectAt > readAt && putAt > detectAt)
  assert.match(route, /MAX_BYTES = 50 \* 1024 \* 1024/)
  assert.match(route, /application\/pdf/)
  assert.match(route, /file contents do not match the claimed media type/)
  assert.match(route, /media permission required/)
})
