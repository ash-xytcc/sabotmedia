import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { ensureEditorRolesTable, listEditorRoles, upsertEditorRole, deleteEditorRole } from './_lib/editorRoles.js'
import { writeAuditLog, inferActorFromRequest } from './_lib/auditLog.js'

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

    if (!hasDb(context)) {
      return json({ ok: true, mode: 'scaffold', items: [] })
    }

    await ensureEditorRolesTable(context.env.BF_DB)
    const items = await listEditorRoles(context.env.BF_DB)
    return json({ ok: true, mode: 'd1', items })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) {
      return json({ ok: false, error: permission.reason, canEdit: false }, 403)
    }

    const body = await context.request.json()
    const record = body?.record || body || {}

    if (!hasDb(context)) {
      return json({ ok: true, mode: 'scaffold', record })
    }

    const saved = await upsertEditorRole(context.env.BF_DB, record)

    await writeAuditLog(context.env.BF_DB, {
      action: 'editor_role.upsert',
      entityType: 'editor_role',
      entityId: saved.id,
      actor: inferActorFromRequest(context.request),
      detail: saved,
    })

    return json({ ok: true, mode: 'd1', record: saved })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

export async function onRequestDelete(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) {
      return json({ ok: false, error: permission.reason, canEdit: false }, 403)
    }

    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || ''

    if (!id) {
      return json({ ok: false, error: 'missing id' }, 400)
    }

    if (!hasDb(context)) {
      return json({ ok: true, mode: 'scaffold', deleted: id })
    }

    const result = await deleteEditorRole(context.env.BF_DB, id)

    await writeAuditLog(context.env.BF_DB, {
      action: 'editor_role.delete',
      entityType: 'editor_role',
      entityId: id,
      actor: inferActorFromRequest(context.request),
      detail: result,
    })

    return json({ ok: true, mode: 'd1', ...result })
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
