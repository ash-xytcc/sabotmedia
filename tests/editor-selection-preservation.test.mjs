import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync(new URL('../src/adminEditorSelectionTools.js', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')

test('visual editor toolbar preserves and restores the active selection before link creation', () => {
  assert.match(runtime, /native-content-editor__toolbar button/)
  assert.match(runtime, /native-content-editor__visual\[contenteditable\]/)
  assert.match(runtime, /savedVisualRange = range\.cloneRange\(\)/)
  assert.match(runtime, /selection\.addRange\(savedVisualRange\)/)
  assert.match(runtime, /handleToolbarLink/)
  assert.match(runtime, /runCommand\('createLink', href, 'createLink'\)/)
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
  assert.match(runtime, /createLink/)
})
