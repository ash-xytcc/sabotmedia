import { resolvePublicSitePermission } from './api/_lib/publicSiteAuth.js'
import { getNativeEntry } from './api/_lib/nativePublicContent.js'

export const ADMIN_PREFIXES = [
  '/admin',
  '/wp-admin',
  '/printlab',
  '/audiolab',
  '/content',
  '/posts',
  '/add-new',
  '/post-new',
  '/native-bridge',
  '/native-preview',
  '/media',
  '/settings',
  '/customize',
  '/site-editor',
  '/advanced-draft-tools',
  '/tools',
  '/users',
  '/pages',
  '/collections-admin',
  '/publications-admin',
  '/feeds-admin',
  '/menus',
  '/sites',
  '/podcasts',
  '/draft',
  '/review',
  '/qa',
  '/overrides',
  '/system-backup',
  '/audit-log',
  '/analytics',
  '/site-health',
  '/taxonomy',
  '/roles',
  '/design-system',
  '/platform-map',
]

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const PAGE_METHODS = new Set(['GET', 'HEAD'])
const PUBLIC_AUTH_API_PATHS = new Set(['/api/login', '/api/logout', '/api/session', '/api/analytics/collect'])

export function isAdminRoutePath(pathname = '') {
  return ADMIN_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function onRequest(context) {
  const url = new URL(context.request.url)

  if (url.hostname.toLowerCase() === 'www.sabot.media') {
    url.hostname = 'sabot.media'
    return Response.redirect(url.toString(), 308)
  }

  const pathname = url.pathname
  const method = String(context.request.method || 'GET').toUpperCase()
  const isAdminRoute = isAdminRoutePath(pathname)
  const isApiWrite = pathname.startsWith('/api/') && WRITE_METHODS.has(method)

  if (PUBLIC_AUTH_API_PATHS.has(pathname)) {
    return context.next()
  }

  if (method === 'GET' && isPublicPostPath(pathname)) {
    return renderPublicPost(context, url)
  }

  if (!isAdminRoute && !isApiWrite) {
    return context.next()
  }

  const permission = await resolvePublicSitePermission(context)
  if (permission.canEdit) {
    if (isAdminRoute && PAGE_METHODS.has(method) && context.env?.ASSETS?.fetch) {
      const indexUrl = new URL('/index.html', url.origin)
      return context.env.ASSETS.fetch(new Request(indexUrl.toString(), context.request))
    }

    return context.next()
  }

  if (isApiWrite) {
    return new Response(JSON.stringify({ ok: false, canEdit: false, error: permission.reason || 'authentication required', authMode: permission.mode || 'locked' }, null, 2), {
      status: 403,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  const loginUrl = new URL('/login', url.origin)
  loginUrl.searchParams.set('returnTo', `${url.pathname}${url.search || ''}${url.hash || ''}`)
  return Response.redirect(loginUrl.toString(), 302)
}

function isPublicPostPath(pathname) {
  return /^\/(?:post|piece)\/[^/]+\/?$/.test(pathname)
}

async function renderPublicPost(context, url) {
  const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '')
  let post = null

  if (context.env?.BF_DB) {
    try {
      post = await getNativeEntry(context.env.BF_DB, slug)
    } catch {
      // The route must still return the SPA when content storage is unavailable.
    }
  }

  const title = cleanText(post?.seoTitle || post?.title || titleFromSlug(slug)) || 'Sabot Media'
  const description = truncate(
    cleanText(post?.seoDescription || post?.excerpt || post?.body || ''),
    240,
  ) || 'Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media.'
  const image = absoluteUrl(
    post?.featuredImage || post?.heroImage || post?.imageUrl || '/sabot-logo.png',
    url.origin,
  )
  const canonical = `${url.origin}/post/${encodeURIComponent(slug)}`
  const indexUrl = new URL('/', url.origin)
  const response = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(new Request(indexUrl, {
        method: 'GET',
        headers: { accept: 'text/html' },
      }))
    : await context.next()

  if (!response.ok || !String(response.headers.get('content-type') || '').includes('text/html')) {
    return response
  }

  const html = await response.text()
  const pageTitle = title === 'Sabot Media' ? title : `${title} | Sabot Media`
  const replacements = {
    '<title>Sabot Media</title>': `<title>${escapeHtml(pageTitle)}</title>`,
    '<meta name="description" content="Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media." />': `<meta name="description" content="${escapeHtml(description)}" />`,
    '<meta property="og:title" content="Sabot Media" />': `<meta property="og:title" content="${escapeHtml(title)}" />`,
    '<meta property="og:description" content="Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media." />': `<meta property="og:description" content="${escapeHtml(description)}" />`,
    '<meta property="og:type" content="website" />': '<meta property="og:type" content="article" />',
    '<meta property="og:image" content="/sabot-logo.png" />': `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:title" content="Sabot Media" />': `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    '<meta name="twitter:description" content="Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media." />': `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    '<meta name="twitter:image" content="/sabot-logo.png" />': `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  }

  let rendered = html
  for (const [from, to] of Object.entries(replacements)) rendered = rendered.replace(from, to)
  rendered = rendered.replace(
    '</head>',
    `    <meta property="og:url" content="${escapeHtml(canonical)}" />\n    <link rel="canonical" href="${escapeHtml(canonical)}" />\n  </head>`,
  )

  const headers = new Headers(response.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=60, s-maxage=300')
  headers.delete('content-length')
  return new Response(rendered, { status: 200, headers })
}

function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value, length) {
  const text = String(value || '')
  return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`
}

function absoluteUrl(value, origin) {
  try {
    return new URL(String(value || ''), origin).toString()
  } catch {
    return `${origin}/sabot-logo.png`
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
