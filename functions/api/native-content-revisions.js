import {
  ensureNativeRevisionTable,
  getExistingNativeEntry,
  listRevisionSnapshots,
  restoreRevisionSnapshot,
} from './_lib/nativePublicContent.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)

  return json({
    ok: true,
    canEdit: permissionHasCapability(permission, 'content:write'),
    canRestore: permissionHasCapability(permission, 'review:manage'),
    authMode: permission.mode,
    authReason: permission.reason,
    mode: getBoundDb(context) ? 'd1' : 'unavailable',
  })
}

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)

    if (!permissionHasCapability(permission, 'content:write')) {
      return json({ ok: false, error: permission.reason || 'content write permission required', canEdit: false }, 403)
    }

    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('native revision reads')

    const url = new URL(context.request.url)
    const nativeId = url.searchParams.get('nativeId') || ''
    const slug = url.searchParams.get('slug') || ''

    let resolvedId = nativeId
    let item = null
    if (resolvedId) item = await getExistingNativeEntry(db, resolvedId)
    if (!resolvedId && slug) {
      item = await getExistingNativeEntry(db, slug)
      resolvedId = item?.id || ''
    }

    if (!resolvedId) return json({ ok: false, error: 'missing nativeId or slug' }, 400)
    if (!item) item = await getExistingNativeEntry(db, resolvedId)
    if (permission.role === 'contributor' && item?.createdByUserId !== permission.user?.id) {
      return json({ ok: false, error: 'contributors can only view revision history for their own work' }, 403)
    }

    await ensureNativeRevisionTable(db)
    const items = await listRevisionSnapshots(db, resolvedId)

    return json({ ok: true, mode: 'd1', items })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)

    if (!permissionHasCapability(permission, 'review:manage')) {
      return json({ ok: false, error: 'revision restore requires editor review permission', canEdit: false }, 403)
    }

    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('native revision restore')

    const body = await context.request.json()
    const revisionId = String(body?.revisionId || '')
    if (!revisionId) return json({ ok: false, error: 'missing revisionId' }, 400)

    const restored = await restoreRevisionSnapshot(db, revisionId)

    return json({ ok: true, mode: 'd1', item: restored })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
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
