import test from 'node:test'
import assert from 'node:assert/strict'
import { isAdminRoutePath } from '../functions/_middleware.js'
import { onRequestPost as saveNativeContent } from '../functions/api/native-content.js'
import { onRequestPost as saveTaxonomy } from '../functions/api/taxonomy.js'
import { onRequestPost as savePublication } from '../functions/api/publications.js'

function accessContext(path, body) {
  return {
    request: new Request(`https://sabot.media${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-access-authenticated-user-email': 'editor@example.org',
      },
      body: JSON.stringify(body),
    }),
    env: {
      SABOT_TRUST_CF_ACCESS: 'true',
    },
  }
}

test('all discovered admin aliases are edge-protected', () => {
  for (const path of [
    '/admin',
    '/audiolab',
    '/analytics',
    '/audit-log',
    '/site-health',
    '/system-backup',
    '/taxonomy',
    '/roles',
    '/wp-admin/anything',
  ]) {
    assert.equal(isAdminRoutePath(path), true, `${path} must require server-recognized auth`)
  }
  assert.equal(isAdminRoutePath('/archive'), false)
  assert.equal(isAdminRoutePath('/post/example'), false)
})

test('native content write fails loudly when BF_DB is missing', async () => {
  const response = await saveNativeContent(accessContext('/api/native-content', {
    item: { id: 'test', slug: 'test', title: 'Test', status: 'draft' },
  }))
  assert.equal(response.status, 503)
  const payload = await response.json()
  assert.equal(payload.ok, false)
  assert.match(payload.error, /BF_DB binding is required/)
})

test('taxonomy write fails loudly when BF_DB is missing', async () => {
  const response = await saveTaxonomy(accessContext('/api/taxonomy', {
    term: { id: 'term-test', label: 'Test', slug: 'test', taxonomy: 'tag' },
  }))
  assert.equal(response.status, 503)
  const payload = await response.json()
  assert.equal(payload.ok, false)
})

test('publication write fails loudly when BF_DB is missing', async () => {
  const response = await savePublication(accessContext('/api/publications', {
    publication: { id: 'pub-test', slug: 'pub-test', title: 'Test publication', status: 'draft' },
  }))
  assert.equal(response.status, 503)
  const payload = await response.json()
  assert.equal(payload.ok, false)
})
