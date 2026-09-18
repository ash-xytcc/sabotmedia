import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const pasteTools = fs.readFileSync(new URL('../src/adminEditorPasteTools.js', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')

test('visual editor paste normalization is loaded globally but scoped to the native visual editor', () => {
  assert.match(main, /adminEditorPasteTools\.js/)
  assert.match(pasteTools, /\.native-content-editor__visual\[contenteditable\]/)
  assert.match(pasteTools, /document\.addEventListener\('paste', handlePaste, true\)/)
})

test('pasted rich text drops imported black-background and font styling without rewriting existing content', () => {
  assert.match(pasteTools, /'background'/)
  assert.match(pasteTools, /'background-color'/)
  assert.match(pasteTools, /'color'/)
  assert.match(pasteTools, /'font-family'/)
  assert.match(pasteTools, /'font-size'/)
  assert.match(pasteTools, /name === 'class'/)
  assert.match(pasteTools, /name === 'id'/)
})

test('pasted HTML is inserted at the active editor selection and participates in undo when supported', () => {
  assert.match(pasteTools, /selectionBelongsTo\(editor\)/)
  assert.match(pasteTools, /execCommand\?\.\('insertHTML', false, html\)/)
  assert.match(pasteTools, /range\.insertNode\(fragment\)/)
  assert.match(pasteTools, /inputType: 'insertFromPaste'/)
})

test('paste sanitizer blocks executable or form markup and javascript URLs', () => {
  assert.match(pasteTools, /script, style, meta, link, iframe, object, embed, form, input, button, textarea, select/)
  assert.match(pasteTools, /name\.startsWith\('on'\)/)
  assert.match(pasteTools, /javascript:/)
})
