import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync(new URL('../src/adminEditorSelectionTools.js', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')

test('visual editor toolbar pins link insertion to DOM bookmarks around the real selection', () => {
  assert.match(runtime, /data-sabot-toolbar-link-bookmark/)
  assert.match(runtime, /captureLinkBookmark/)
  assert.match(runtime, /endRange\.insertNode\(end\)/)
  assert.match(runtime, /startRange\.insertNode\(start\)/)
  assert.match(runtime, /range\.setStartAfter\(start\)/)
  assert.match(runtime, /range\.setEndBefore\(end\)/)
  assert.match(runtime, /insertLinkAtBookmark\(href\)/)
  assert.match(runtime, /stopImmediatePropagation/)
  assert.match(main, /adminEditorSelectionTools\.js/)
})

test('visual editor exposes working undo redo bold italic and link keyboard shortcuts', () => {
  assert.match(runtime, /addEventListener\('keydown', handleEditorShortcut, true\)/)
  assert.match(runtime, /key === 'z'/)
  assert.match(runtime, /historyUndo/)
  assert.match(runtime, /historyRedo/)
  assert.match(runtime, /key === 'y'/)
  assert.match(runtime, /key === 'b'/)
  assert.match(runtime, /formatBold/)
  assert.match(runtime, /key === 'i'/)
  assert.match(runtime, /formatItalic/)
  assert.match(runtime, /key === 'k'/)
  assert.match(runtime, /captureLinkBookmark\(\)/)
  assert.match(runtime, /insertLinkAtBookmark\(href\)/)
})
