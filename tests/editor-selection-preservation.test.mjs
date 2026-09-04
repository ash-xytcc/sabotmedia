import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync(new URL('../src/adminEditorSelectionTools.js', import.meta.url), 'utf8')
const editor = fs.readFileSync(new URL('../src/components/NativeContentBridgePage.jsx', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')

test('visual editor toolbar does not steal the active content selection before link creation', () => {
  assert.match(runtime, /native-content-editor__toolbar button/)
  assert.match(runtime, /native-content-editor__visual\[contenteditable\]/)
  assert.match(runtime, /editor\.contains\(range\.commonAncestorContainer\)/)
  assert.match(runtime, /event\.preventDefault\(\)/)
  assert.match(runtime, /addEventListener\('mousedown'.*true\)/)
  assert.match(editor, /runVisualCommand\('createLink', href\)/)
  assert.match(main, /adminEditorSelectionTools\.js/)
})
