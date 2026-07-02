import { resolvePublicSitePermission } from './api/_lib/publicSiteAuth.js'

const ADMIN_PREFIXES = [
  '/admin',
  '/wp-admin',
  '/printlab',
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
  '/menus',
  '/sites',
  '/podcasts',
  '/draft',
  '/review',
  '/overrides',
]

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const pathname = url.pathname
  const method = String(context.request.method || 'GET').toUpperCase()
  const isAdminRoute = ADMIN_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  const isApiWrite = pathname.startsWith('/api/') && WRITE_METHODS.has(method)

  if (!isAdminRoute && !isApiWrite) {
    return context.next()
  }

  const permission = await resolvePublicSitePermission(context)
  if (permission.canEdit) {
    return context.next()
  }

  if (isApiWrite) {
    return json({
      ok: false,
      canEdit: false,
      error: permission.reason || 'authentication required',
      authMode: permission.mode || 'locked',
    }, 403)
  }

  const loginUrl = new URL('/login', url.origin)
  loginUrl.searchParams.set('returnTo', `${url.pathname}${url.search || ''}${url.hash || ''}`)
  return Response.redirect(loginUrl.toString(), 302)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
