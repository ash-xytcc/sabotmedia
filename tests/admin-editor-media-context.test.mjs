import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/adminFileMediaInsert.js', import.meta.url), 'utf8')

test('body media insertion bookmarks the real visual caret before the media modal steals focus', () => {
  assert.match(source, /CARET_MARKER_ATTR = 'data-sabot-media-caret'/)
  assert.match(source, /captureEditorSelection\(\{ withMarker: true \}\)/)
  assert.match(source, /range\.setStartBefore\(caretMarker\)/)
  assert.match(source, /insertMarkup\(markup\)/)
})

test('react media picker insertion uses the selected media type instead of forcing an image', () => {
  assert.match(source, /selectedReactMediaData/)
  assert.match(source, /mediaType/)
  assert.match(source, /mimeType/)
  assert.match(source, /buildMediaEmbed\(media\)/)
  assert.doesNotMatch(source, /<img src=.*selectedReactMediaData/)
})

test('right click exposes an editor inspector for links and embedded media', () => {
  assert.match(source, /document\.addEventListener\('contextmenu', handleEditorContextMenu, true\)/)
  assert.match(source, /Edit \$\{target\.kind/)
  assert.match(source, /data-field="url"/)
  assert.match(source, /data-field="width"/)
  assert.match(source, /data-field="height"/)
  assert.match(source, /data-action="remove"/)
})

test('context editing synchronizes DOM changes back through the visual editor input path', () => {
  assert.match(source, /syncContextEdit\(target\.editor\)/)
  assert.match(source, /dispatchEditorInput\(editor/)
})
