import test from 'node:test'
import assert from 'node:assert/strict'

import {
  fetchWeblateTranslationFile,
  listWeblateTranslations,
} from '../functions/api/_lib/weblateSync.js'

function withFetchStub(handler, run) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = handler
  return Promise.resolve()
    .then(run)
    .finally(() => { globalThis.fetch = originalFetch })
}

test('public Weblate translation list works without an API token', async () => {
  await withFetchStub(async (url, options = {}) => {
    assert.equal(String(url), 'https://hosted.weblate.org/api/components/sabotpress/ai-server-called-paranoia/translations/')
    assert.equal(options.headers?.Authorization, undefined)
    assert.equal(options.headers?.Accept, 'application/json')
    assert.equal(options.cache, 'no-store')
    return new Response(JSON.stringify({
      results: [{ language: { code: 'ca', name: 'Català' } }],
      next: null,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }, async () => {
    const rows = await listWeblateTranslations({
      env: {},
      project: 'sabotpress',
      component: 'ai-server-called-paranoia',
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0].language.code, 'ca')
  })
})

test('public Weblate translation file works without an API token', async () => {
  await withFetchStub(async (url, options = {}) => {
    assert.equal(String(url), 'https://hosted.weblate.org/api/translations/sabotpress/ai-server-called-paranoia/ca/file/')
    assert.equal(options.headers?.Authorization, undefined)
    assert.equal(options.headers?.Accept, 'application/json')
    assert.equal(options.cache, 'no-store')
    return new Response(JSON.stringify({
      title: 'El servidor anomenat Paranoia',
      body: { '001': '<p>Traducció</p>' },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }, async () => {
    const bundle = await fetchWeblateTranslationFile({
      env: {},
      project: 'sabotpress',
      component: 'ai-server-called-paranoia',
      language: 'ca',
    })
    assert.equal(bundle.title, 'El servidor anomenat Paranoia')
  })
})

test('configured Weblate token is still used when present', async () => {
  await withFetchStub(async (_url, options = {}) => {
    assert.equal(options.headers?.Authorization, 'Token test-token')
    return new Response(JSON.stringify({ results: [], next: null }), { status: 200 })
  }, async () => {
    await listWeblateTranslations({
      env: { WEBLATE_API_TOKEN: 'test-token' },
      project: 'sabotpress',
      component: 'ai-server-called-paranoia',
    })
  })
})
