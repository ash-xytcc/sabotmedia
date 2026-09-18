import assert from 'node:assert/strict'
import test from 'node:test'
import { isPublicSpaPath, onRequest } from '../functions/_middleware.js'

test('edge middleware recognizes every public client-side route family', () => {
  for (const path of [
    '/', '/archive', '/search', '/about', '/security', '/contact', '/submit', '/support', '/press', '/feeds',
    '/campaigns', '/collections', '/collections/example', '/publications', '/publications/example', '/reader/example', '/read/example', '/updates',
    '/updates/example', '/projects', '/projects/example', '/project/example', '/print/example', '/post/example/print',
    '/piece/example/print', '/zine/example', '/investigations', '/investigations/example', '/gallery/crumbs', '/lounge', '/saboteur',
    '/aberdeen-local-1312-gallery', '/login', '/wp-login', '/logout',
  ]) {
    assert.equal(isPublicSpaPath(path), true, `${path} should receive the public HTML shell`)
  }

  for (const path of ['/api/session', '/assets/index.js', '/pgp.asc', '/definitely-not-a-page']) {
    assert.equal(isPublicSpaPath(path), false, `${path} should not be rewritten as a known public route`)
  }
})

test('public info routes fail closed when live storage is unavailable', async () => {
  let requestedPath = ''
  const response = await onRequest({
    request: new Request('https://sabot.media/contact'),
    env: {
      ASSETS: {
        async fetch(request) {
          requestedPath = new URL(request.url).pathname
          return new Response('<!doctype html><html><body><noscript data-sabot-static-noscript><h1>Contact</h1></noscript></body></html>', {
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

  assert.equal(requestedPath, '/')
  assert.equal(response.status, 503)
  const html = await response.text()
  assert.doesNotMatch(html, /data-sabot-static-noscript/)
  assert.match(html, /Temporarily unavailable/)
  assert.match(html, /data-sabot-plain-html/)
})

test('unavailable public content retains the interactive application shell', async () => {
  const requested = []
  const response = await onRequest({
    request: new Request('https://sabot.media/support'),
    env: {
      ASSETS: {
        async fetch(request) {
          const pathname = new URL(request.url).pathname
          requested.push(pathname)
          if (pathname === '/support/index.html') return new Response('missing', { status: 404 })
          return new Response('<!doctype html><html><body><div id="root"></div></body></html>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        },
      },
    },
    next() {
      throw new Error('Support should stay inside the public route handler.')
    },
  })

  assert.deepEqual(requested, ['/'])
  assert.equal(response.status, 503)
  assert.match(await response.text(), /data-sabot-plain-html/)
})

test('trailing slashes on public reading routes canonicalize globally', async () => {
  for (const [input, expected] of [
    ['/post/example/', '/post/example'],
    ['/piece/example/', '/piece/example'],
    ['/campaigns/example/', '/campaigns/example'],
    ['/collections/example/', '/collections/example'],
    ['/investigations/example/', '/investigations/example'],
    ['/about/', '/about'],
  ]) {
    const response = await onRequest({
      request: new Request(`https://sabot.media${input}`),
      env: {},
      next() { throw new Error(`${input} should canonicalize before reaching route assets.`) },
    })
    assert.equal(response.status, 308)
    assert.equal(new URL(response.headers.get('location')).pathname, expected)
  }
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
        async fetch(request) {
          const requestedPath = new URL(request.url).pathname
          if (requestedPath !== '/' && requestedPath !== '/archive/') return new Response('missing', { status: 404 })
          return new Response('<!doctype html><html><body><div id="root"></div></body></html>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        },
      },
    },
    next() {
      throw new Error(`${pathname} should receive the public shell.`)
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
