import { resolvePublicSitePermission } from '../api/_lib/publicSiteAuth.js'
import { onRequestGet as renderDesk } from '../wp-admin/foia.js'

export async function onRequestGet(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permission.canEdit) {
    const url = new URL(context.request.url)
    const login = new URL('/login', url.origin)
    login.searchParams.set('returnTo', `${url.pathname}${url.search || ''}`)
    return Response.redirect(login.toString(), 302)
  }
  return renderDesk(context)
}
