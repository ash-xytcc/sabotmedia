import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const clientSource = fs.readFileSync(new URL('../src/lib/nativePublicContent.js', import.meta.url), 'utf8')
const homepageSource = fs.readFileSync(new URL('../src/components/NativeUpdatesPage.jsx', import.meta.url), 'utf8')
const editorSource = fs.readFileSync(new URL('../src/components/NativeContentBridgePage.jsx', import.meta.url), 'utf8')
const serverSource = fs.readFileSync(new URL('../functions/api/_lib/nativePublicContent.js', import.meta.url), 'utf8')

test('homepage visibility defaults on for existing and new native posts', () => {
  assert.match(clientSource, /showOnHomepage:\s*true/)
  assert.match(clientSource, /showOnHomepage:\s*normalizeBoolean\(raw\.showOnHomepage, true\)/)
})

test('explicit homepage exclusion survives native persistence normalization', () => {
  assert.match(clientSource, /showOnHomepage:\s*normalizeBoolean\(raw\.showOnHomepage, true\)/)
  assert.match(serverSource, /showOnHomepage:\s*normalizeBoolean\(raw\.showOnHomepage, true\)/)
})

test('homepage excludes only posts explicitly marked not for homepage', () => {
  assert.match(homepageSource, /item\.showOnHomepage !== false/)
})

test('post editor exposes the homepage promotion control and autosaves it', () => {
  assert.match(editorSource, />Show on homepage</)
  assert.match(editorSource, /showOnHomepage:\s*draft\?\.showOnHomepage !== false/)
  assert.match(editorSource, /showOnHomepage:\s*merged\.showOnHomepage !== false/)
})

test('server persists homepage visibility in content json', () => {
  assert.match(serverSource, /const contentJson = JSON\.stringify\(normalized\)/)
})
