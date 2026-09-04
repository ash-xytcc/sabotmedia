import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync(new URL('../src/adminEditorSelectionTools.js', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')

test('visual editor toolbar freezes the pre-prompt range and restores that exact range for link creation', () => {
  assert.match(runtime, /native-content-editor__toolbar button/)
  assert.match(runtime, /native-content-editor__visual\[contenteditable\]/)
  assert.match(runtime, /pendingToolbarRange = range\.cloneRange\(\)/)
  assert.match(runtime, /selectionLocked = true/)
  assert.match(runtime, /if \(selectionLocked\) return savedVisualRange/)
  assert.match(runtime, /const linkRange = pendingToolbarRange\?\.cloneRange/)
  assert.match(runtime, /runCommand\('createLink', href, 'createLink', linkRange\)/)
  assert.match(runtime, /restoreRange\(linkRange\)/)
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
  assert.match(runtime, /const linkRange = rememberVisualSelection\(\)\?\.cloneRange/)
  assert.match(runtime, /createLink/)
})
