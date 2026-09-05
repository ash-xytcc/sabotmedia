import { resolvePublicSitePermission } from '../api/_lib/publicSiteAuth.js'
import { getBoundDb } from '../api/_lib/database.js'
import { ensurePublicRecordsSchema } from '../api/_lib/publicRecordsRuntimeSchema.js'
import { onRequestGet as renderDesk } from '../wp-admin/foia.js'

export async function onRequestGet(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permission.canEdit) {
    const url = new URL(context.request.url)
    const login = new URL('/login', url.origin)
    login.searchParams.set('returnTo', `${url.pathname}${url.search || ''}`)
    return Response.redirect(login.toString(), 302)
  }

  const db = getBoundDb(context)
  if (db) await ensurePublicRecordsSchema(db)

  return renderDesk(context)
}
