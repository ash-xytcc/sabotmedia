import { getExistingNativeEntry } from './_lib/nativePublicContent.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import {
  ensureNativeContentSourcesTable,
  listSourcesForNativeContent,
  upsertSourceRecord,
  deleteSourceRecord,
} from './_lib/nativeContentSources.js'

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
    if (!await canAccessNativeContent(context.env.BF_DB, nativeContentId, permission)) return json({ ok: false, error: 'contributors can only access sources for their own work' }, 403)

    await ensureNativeContentSourcesTable(context.env.BF_DB)
    const items = await listSourcesForNativeContent(context.env.BF_DB, nativeContentId)

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
    const record = body?.record || body || {}
    const nativeContentId = String(record.nativeContentId || record.native_content_id || '')
    if (!nativeContentId) return json({ ok: false, error: 'nativeContentId is required' }, 400)

    if (!hasDb(context)) return json({ ok: true, mode: 'scaffold', record })
    if (!await canAccessNativeContent(context.env.BF_DB, nativeContentId, permission)) return json({ ok: false, error: 'contributors can only edit sources for their own work' }, 403)

    const saved = await upsertSourceRecord(context.env.BF_DB, record)
    return json({ ok: true, mode: 'd1', record: saved })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

export async function onRequestDelete(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'content:write')) return json({ ok: false, error: 'content write permission required', canEdit: false }, 403)

    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || ''
    if (!id) return json({ ok: false, error: 'missing id' }, 400)

    if (!hasDb(context)) return json({ ok: true, mode: 'scaffold', deleted: id })

    await ensureNativeContentSourcesTable(context.env.BF_DB)
    const source = await context.env.BF_DB.prepare('SELECT native_content_id FROM native_content_sources WHERE id = ? LIMIT 1').bind(id).first()
    if (!source) return json({ ok: false, error: 'source not found' }, 404)
    if (!await canAccessNativeContent(context.env.BF_DB, source.native_content_id, permission)) return json({ ok: false, error: 'contributors can only delete sources from their own work' }, 403)

    const result = await deleteSourceRecord(context.env.BF_DB, id)
    return json({ ok: true, mode: 'd1', ...result })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
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
