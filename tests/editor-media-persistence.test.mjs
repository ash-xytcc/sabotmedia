import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const sanitizerSource = fs.readFileSync(new URL('../src/lib/classicEditorBody.js', import.meta.url), 'utf8')
const rendererSource = fs.readFileSync(new URL('../src/lib/renderImportedBody.jsx', import.meta.url), 'utf8')

test('classic editor sanitizer has explicit supported branches for audio video and iframe', () => {
  assert.match(sanitizerSource, /if \(tag === 'audio'\)/)
  assert.match(sanitizerSource, /if \(tag === 'video'\)/)
  assert.match(sanitizerSource, /if \(tag === 'iframe'\)/)
  assert.match(sanitizerSource, /<video controls preload=/)
  assert.match(sanitizerSource, /playsinline/)
  assert.match(sanitizerSource, /referrerpolicy="no-referrer"/)
})

test('dangerous embedded object types remain stripped', () => {
  assert.match(sanitizerSource, /tag === 'script'/)
  assert.match(sanitizerSource, /tag === 'object'/)
  assert.match(sanitizerSource, /tag === 'embed'/)
})

test('public figure renderer recognizes audio video iframe and image embeds', () => {
  assert.match(rendererSource, /const audio = node\.querySelector\('audio'\)/)
  assert.match(rendererSource, /const video = node\.querySelector\('video'\)/)
  assert.match(rendererSource, /const iframe = node\.querySelector\('iframe'\)/)
  assert.match(rendererSource, /renderAudioNode\(audio/)
  assert.match(rendererSource, /renderVideoNode\(video/)
  assert.match(rendererSource, /renderIframeNode\(iframe/)
  assert.match(rendererSource, /node\.querySelector\('img'\)/)
})

test('public video and iframe rendering normalize media sources instead of injecting saved outerHTML', () => {
  assert.match(rendererSource, /function renderVideoNode/)
  assert.match(rendererSource, /function renderIframeNode/)
  assert.match(rendererSource, /normalizeMediaSrc/)
  assert.doesNotMatch(rendererSource, /case 'iframe':[\s\S]{0,300}dangerouslySetInnerHTML/)
})
