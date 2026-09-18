import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync(new URL('../src/campaignContributorDocumentTools.js', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')

test('contributor composer exposes PDF uploads and renders archived PDFs as document links', () => {
  assert.match(runtime, /audio\/\*,video\/\*,image\/\*,application\/pdf/)
  assert.match(runtime, /contributor-composer input\[type="file"\]/)
  assert.match(runtime, /Contributor attachment/)
  assert.match(runtime, /replaceWith\(link\)/)
  assert.match(runtime, /Open attached PDF/)
  assert.match(main, /campaignContributorDocumentTools\.js/)
})
