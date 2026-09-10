import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const contextSource = fs.readFileSync(new URL('../src/adminFileMediaInsert.js', import.meta.url), 'utf8')
const insertionSource = fs.readFileSync(new URL('../src/adminEditorInsertionController.js', import.meta.url), 'utf8')

test('body media insertion preserves a stable visual location before the media modal steals focus', () => {
  assert.match(insertionSource, /captureVisualMediaBookmark/)
  assert.match(insertionSource, /boundaryIndex/)
  assert.match(insertionSource, /textOffset/)
  assert.match(insertionSource, /resolveBoundaryIndex/)
  assert.match(insertionSource, /insertVisualMarkup\(markup, mediaBookmark\)/)
})

test('react media picker insertion uses the selected media type instead of forcing an image', () => {
  assert.match(insertionSource, /selectedReactMediaData/)
  assert.match(insertionSource, /mediaType/)
  assert.match(insertionSource, /mimeType/)
  assert.match(insertionSource, /buildMediaEmbed\(media\)/)
  assert.doesNotMatch(insertionSource, /<img src=.*selectedReactMediaData/)
})

test('right click exposes an editor inspector for links and embedded media', () => {
  assert.match(contextSource, /document\.addEventListener\('contextmenu', handleEditorContextMenu, true\)/)
  assert.match(contextSource, /Edit \$\{target\.kind/)
  assert.match(contextSource, /data-field="url"/)
  assert.match(contextSource, /data-field="width"/)
  assert.match(contextSource, /data-field="height"/)
  assert.match(contextSource, /data-action="remove"/)
})

test('context editing synchronizes DOM changes back through the visual editor input path', () => {
  assert.match(contextSource, /syncContextEdit\(target\.editor\)/)
  assert.match(contextSource, /dispatchEditorInput\(editor/)
})
