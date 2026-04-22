import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { ensureAuditLogTable, listAuditLog } from './_lib/auditLog.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)

  return json({
    ok: true,
    canEdit: permission.canEdit,
    authMode: permission.mode,
    authReason: permission.reason,
    mode: hasDb(context) ? 'd1' : 'scaffold',
  })
}

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) {
      return json({ ok: false, error: permission.reason, canEdit: false }, 403)
    }

    const url = new URL(context.request.url)
    const entityType = url.searchParams.get('entityType') || ''
    const entityId = url.searchParams.get('entityId') || ''

    if (!hasDb(context)) {
      return json({ ok: true, mode: 'scaffold', items: [] })
    }

    await ensureAuditLogTable(context.env.BF_DB)
    const items = await listAuditLog(context.env.BF_DB, {
      entityType: entityType || undefined,
      entityId: entityId || undefined,
    })

    return json({ ok: true, mode: 'd1', items })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
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
