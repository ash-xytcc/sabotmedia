import assert from 'node:assert/strict'
import test from 'node:test'
import { isPublicSpaPath, onRequest } from '../functions/_middleware.js'

test('edge middleware recognizes every public client-side route family', () => {
  for (const path of [
    '/', '/archive', '/search', '/about', '/security', '/contact', '/submit', '/support', '/press', '/feeds',
    '/collections', '/collections/example', '/publications', '/publications/example', '/reader/example', '/updates',
    '/updates/example', '/projects', '/projects/example', '/project/example', '/print/example', '/post/example/print',
    '/piece/example/print', '/zine/example', '/aberdeen-local-1312-gallery', '/login', '/wp-login', '/logout',
  ]) {
    assert.equal(isPublicSpaPath(path), true, `${path} should receive the SPA shell`)
  }

  for (const path of ['/api/session', '/assets/index.js', '/pgp.asc', '/definitely-not-a-page']) {
    assert.equal(isPublicSpaPath(path), false, `${path} should not be rewritten as a known public route`)
  }
})

test('public info routes receive index.html from the asset binding', async () => {
  let requestedPath = ''
  const response = await onRequest({
    request: new Request('https://sabot.media/contact'),
    env: {
      ASSETS: {
        async fetch(request) {
          requestedPath = new URL(request.url).pathname
          return new Response('<!doctype html><title>Sabot Media</title>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        },
      },
    },
    next() {
      throw new Error('Contact should not fall through to the static 404 asset.')
    },
  })

  assert.equal(requestedPath, '/index.html')
  assert.equal(response.status, 200)
  assert.match(await response.text(), /Sabot Media/)
})

test('the retired generic PGP URL redirects to the canonical info key', async () => {
  const response = await onRequest({
    request: new Request('https://sabot.media/pgp.asc'),
    env: {},
    next() { throw new Error('The stale key path must not reach static assets.') },
  })

  assert.equal(response.status, 308)
  assert.equal(response.headers.get('location'), 'https://sabot.media/keys/info-sabot-media.asc')
})
