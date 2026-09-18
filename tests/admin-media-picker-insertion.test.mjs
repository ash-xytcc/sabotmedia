import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync(new URL('../src/adminEditorInsertionController.js', import.meta.url), 'utf8')

test('body media picker bookmarks the editor location before the modal steals focus', () => {
  assert.match(runtime, /native-content-editor__add-media/)
  assert.match(runtime, /captureVisualMediaBookmark\(\)/)
  assert.match(runtime, /boundaryIndex/)
  assert.match(runtime, /textOffset/)
  assert.match(runtime, /pendingBodyMediaPick = true/)
  assert.match(runtime, /mediaBookmark = visualEditor\(\) \? captureVisualMediaBookmark\(\) : captureTextBookmark\(\)/)
})

test('React Media Library selection is intercepted before the image-only editor handler', () => {
  assert.match(runtime, /\.media-picker-modal/)
  assert.match(runtime, /use selected media/)
  assert.match(runtime, /media-library-tile\.is-selected/)
  assert.match(runtime, /buildMediaEmbed\(media\)/)
  assert.match(runtime, /stopImmediatePropagation/)
})

test('non-body media selections are left to the normal React picker', () => {
  assert.match(runtime, /if \(!pendingBodyMediaPick\) return/)
  assert.match(runtime, /if \(!modal \|\| label !== 'use selected media'\) return/)
  assert.match(runtime, /pendingBodyMediaPick = false/)
})
