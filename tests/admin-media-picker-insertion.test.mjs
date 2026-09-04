import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync(new URL('../src/adminFileMediaInsert.js', import.meta.url), 'utf8')

test('body media picker captures the editor selection before the modal steals focus', () => {
  assert.match(runtime, /native-content-editor__add-media/)
  assert.match(runtime, /captureEditorSelection\(\)/)
  assert.match(runtime, /pendingBodyMediaPick = true/)
  assert.match(runtime, /savedVisualRange = range\.cloneRange\(\)/)
})

test('React Media Library selection is intercepted before the image-only editor handler', () => {
  assert.match(runtime, /\.media-picker-modal/)
  assert.match(runtime, /use selected media/)
  assert.match(runtime, /media-library-tile\.is-selected/)
  assert.match(runtime, /buildMediaEmbed\(media\)/)
  assert.match(runtime, /stopImmediatePropagation/)
})

test('featured-image selection is left to the normal React picker', () => {
  assert.match(runtime, /choose from media/)
  assert.match(runtime, /pendingBodyMediaPick = false/)
})
