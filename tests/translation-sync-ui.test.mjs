import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const selector = fs.readFileSync(new URL('../src/publicTranslationSelector.js', import.meta.url), 'utf8')
const translationApi = fs.readFileSync(new URL('../src/lib/nativeTranslationsApi.js', import.meta.url), 'utf8')
const syncUi = fs.readFileSync(new URL('../src/adminTranslationSyncUi.js', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')

test('published translations refresh without a hard browser reload', () => {
  assert.match(selector, /TRANSLATION_CACHE_TTL_MS/)
  assert.match(selector, /cache: 'no-store'/)
  assert.match(selector, /existing\.replaceWith\(next\)/)
  assert.match(selector, /window\.addEventListener\('focus', \(\) => queueRefresh\(true\)\)/)
  assert.match(selector, /visibilitychange/)
})

test('selected native translation is reapplied if React replaces translated DOM', () => {
  assert.match(selector, /titleMatches/)
  assert.match(selector, /bodyMatches/)
  assert.match(selector, /LOCAL_TRANSLATION_ATTR/)
  assert.doesNotMatch(selector, /getAttribute\(LOCAL_TRANSLATION_ATTR\) === marker\) return true/)
})

test('translation admin receives and exposes automatic Weblate sync state', () => {
  assert.match(translationApi, /syncWeblate = true/)
  assert.match(translationApi, /sabot:weblate-sync/)
  assert.match(translationApi, /broadcastWeblateSync\(weblateSync\)/)
  assert.match(syncUi, /Sync from Weblate/)
  assert.match(syncUi, /Manual JSON fallback/)
  assert.match(syncUi, /never published automatically/)
  assert.match(main, /adminTranslationSyncUi\.js/)
})
