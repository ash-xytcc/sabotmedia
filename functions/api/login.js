import { createAdminSessionCookie, validateAdminLoginToken } from './_lib/publicSiteAuth.js'

export async function onRequestPost(context) {
  let body = null
  try {
    body = await context.request.json()
  } catch {
    body = {}
  }

  const token = String(body?.token || body?.password || '').trim()
  const result = validateAdminLoginToken(context, token)

  if (!result.ok) {
    return json({
      ok: false,
      authenticated: false,
      error: result.reason,
    }, 401)
  }

  try {
    const cookie = await createAdminSessionCookie(context, 'admin')
    return json({
      ok: true,
      authenticated: true,
    }, 200, {
      'set-cookie': cookie,
    })
  } catch (error) {
    return json({
      ok: false,
      authenticated: false,
      error: String(error?.message || error),
    }, 500)
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  })
}
