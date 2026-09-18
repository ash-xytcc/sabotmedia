import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const editorSource = fs.readFileSync(new URL('../src/components/NativeContentBridgePage.jsx', import.meta.url), 'utf8')
const sanitizerSource = fs.readFileSync(new URL('../src/lib/classicEditorBody.js', import.meta.url), 'utf8')
const rendererSource = fs.readFileSync(new URL('../src/lib/renderImportedBody.jsx', import.meta.url), 'utf8')
const serverSource = fs.readFileSync(new URL('../functions/api/_lib/nativePublicContent.js', import.meta.url), 'utf8')

test('classic post save path keeps audio as supported media', () => {
  assert.match(sanitizerSource, /if \(tag === 'audio'\)/)
  assert.match(sanitizerSource, /<audio controls preload=/)
  assert.match(sanitizerSource, /sanitizeUrl\(node\.getAttribute\('src'\)/)
  assert.match(sanitizerSource, /data-media-id/)
  assert.match(sanitizerSource, /data-media-title/)
  assert.match(sanitizerSource, /data-media-mime/)
})

test('native editor serializes the live body and D1 keeps bodyHtml', () => {
  assert.match(editorSource, /bodyHtml:\s*liveBodyToBodyHtml\(merged\.body \|\| ''\)/)
  assert.match(editorSource, /syncVisualBodyIntoDraft\(\)/)
  assert.match(serverSource, /bodyHtml:\s*String\(raw\.bodyHtml \|\| raw\.body \|\| ''\)/)
})

test('public renderer handles audio inside figures and standalone audio', () => {
  assert.match(rendererSource, /const audio = node\.querySelector\('audio'\)/)
  assert.match(rendererSource, /if \(audio\) return renderAudioNode\(audio, mode, key, captionHtml\)/)
  assert.match(rendererSource, /case 'audio':\s*return renderAudioNode\(node, mode, key\)/)
  assert.match(rendererSource, /<audio[\s\S]*controls[\s\S]*preload="metadata"/)
})

test('public audio renderer accepts only site-relative or http(s) sources', () => {
  assert.match(rendererSource, /value\.startsWith\('\/'\)/)
  assert.match(rendererSource, /parsed\.protocol === 'https:' \|\| parsed\.protocol === 'http:'/)
})
