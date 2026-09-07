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

test('plain HTML home respects homepage visibility while archive includes all public posts', async () => {
  const rows = [
    nativeRow({ id: 'visible', slug: 'visible-post', title: 'Visible Post', status: 'published', showOnHomepage: true }),
    nativeRow({ id: 'archive-only', slug: 'archive-only-post', title: 'Archive Only Post', status: 'published', showOnHomepage: false }),
    nativeRow({ id: 'draft', slug: 'draft-post', title: 'Draft Post', status: 'draft', showOnHomepage: true }),
    nativeRow({ id: 'private', slug: 'private-post', title: 'Private Post', status: 'published', workflowState: 'draft', showOnHomepage: true }),
    nativeRow({ id: 'hidden', slug: 'hidden-post', title: 'Hidden Post', status: 'published', workflowState: 'archived', showOnHomepage: true }),
  ]

  const homeHtml = await renderPublicFallback('/', rows)
  assert.match(homeHtml, /Visible Post/)
  assert.doesNotMatch(homeHtml, /Archive Only Post/)

  const archiveHtml = await renderPublicFallback('/archive', rows)
  assert.match(archiveHtml, /Visible Post/)
  assert.match(archiveHtml, /Archive Only Post/)
  assert.doesNotMatch(archiveHtml, /Draft Post/)
  assert.doesNotMatch(archiveHtml, /Private Post/)
  assert.doesNotMatch(archiveHtml, /Hidden Post/)
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

async function renderPublicFallback(pathname, rows) {
  const response = await onRequest({
    request: new Request(`https://sabot.media${pathname}`),
    env: {
      BF_DB: createNativeContentDb(rows),
      ASSETS: {
        async fetch() {
          return new Response('<!doctype html><html><body><div id="root"></div></body></html>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        },
      },
    },
    next() {
      throw new Error(`${pathname} should receive the SPA shell.`)
    },
  })

  assert.equal(response.status, 200)
  return response.text()
}

function createNativeContentDb(rows) {
  return {
    prepare(sql) {
      return {
        async run() {
          return { success: true }
        },
        bind(...binds) {
          return {
            async all() {
              const allowedStatuses = new Set(binds)
              return {
                results: rows.filter((row) => !allowedStatuses.size || allowedStatuses.has(row.status)),
              }
            },
          }
        },
        async all() {
          return { results: rows }
        },
      }
    },
  }
}

function nativeRow({ id, slug, title, status, workflowState, showOnHomepage }) {
  const now = '2026-09-07T12:00:00.000Z'
  return {
    id,
    slug,
    status,
    target: 'general',
    content_type: 'note',
    created_at: now,
    updated_at: now,
    published_at: status === 'published' ? now : null,
    content_json: JSON.stringify({
      id,
      slug,
      title,
      status,
      workflowState,
      showOnHomepage,
      body: `${title} body`,
      createdAt: now,
      updatedAt: now,
      publishedAt: status === 'published' ? now : '',
    }),
  }
}
