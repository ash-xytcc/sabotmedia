import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'

export async function onRequestGet(context) {
  const permission = await resolvePublicSitePermission(context)
  return json({
    ok: true,
    authenticated: permission.canEdit,
    canEdit: permission.canEdit,
    authMode: permission.mode,
    authReason: permission.reason,
    actor: permission.actor,
    sessionExpiresAt: permission.sessionExpiresAt || '',
  })
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
