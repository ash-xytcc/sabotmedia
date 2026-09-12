import { getExistingNativeEntry } from './_lib/nativePublicContent.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import {
  ensureTaxonomyTables,
  listLinksForNativeContent,
  replaceLinksForNativeContent,
} from './_lib/taxonomy.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)

  return json({
    ok: true,
    canEdit: permissionHasCapability(permission, 'content:write'),
    authMode: permission.mode,
    authReason: permission.reason,
    mode: hasDb(context) ? 'd1' : 'scaffold',
  })
}

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'content:write')) return json({ ok: false, error: 'content write permission required', canEdit: false }, 403)

    const url = new URL(context.request.url)
    const nativeContentId = url.searchParams.get('nativeContentId') || ''
    if (!nativeContentId) return json({ ok: false, error: 'missing nativeContentId' }, 400)

    if (!hasDb(context)) return json({ ok: true, mode: 'scaffold', items: [] })
    if (!await canAccessNativeContent(context.env.BF_DB, nativeContentId, permission)) return json({ ok: false, error: 'contributors can only access taxonomy links for their own work' }, 403)

    await ensureTaxonomyTables(context.env.BF_DB)
    const items = await listLinksForNativeContent(context.env.BF_DB, nativeContentId)

    return json({ ok: true, mode: 'd1', items })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'content:write')) return json({ ok: false, error: 'content write permission required', canEdit: false }, 403)

    const body = await context.request.json()
    const nativeContentId = String(body?.nativeContentId || '')
    const termIds = Array.isArray(body?.termIds) ? body.termIds : []
    if (!nativeContentId) return json({ ok: false, error: 'missing nativeContentId' }, 400)

    if (!hasDb(context)) return json({ ok: true, mode: 'scaffold', items: [] })
    if (!await canAccessNativeContent(context.env.BF_DB, nativeContentId, permission)) return json({ ok: false, error: 'contributors can only edit taxonomy links for their own work' }, 403)

    const items = await replaceLinksForNativeContent(context.env.BF_DB, nativeContentId, termIds)

    return json({ ok: true, mode: 'd1', items })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

async function canAccessNativeContent(db, nativeContentId, permission) {
  if (permission.role !== 'contributor') return true
  const item = await getExistingNativeEntry(db, nativeContentId)
  return Boolean(item?.createdByUserId && item.createdByUserId === permission.user?.id)
}

function hasDb(context) {
  return Boolean(context?.env?.BF_DB)
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
