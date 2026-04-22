import {
  ensureNativePublicContentTable,
  ensureNativeRevisionTable,
  listNativeEntries,
  getNativeEntry,
  getExistingNativeEntry,
  upsertNativeEntry,
  deleteNativeEntry,
  saveRevisionSnapshot,
} from './_lib/nativePublicContent.js'
import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
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
    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || ''
    const slug = url.searchParams.get('slug') || ''
    const status = url.searchParams.get('status') || ''
    const target = url.searchParams.get('target') || ''
    const workflowState = url.searchParams.get('workflowState') || ''
    const includeFuture = permission.canEdit || url.searchParams.get('includeFuture') === '1'

    if (!hasDb(context)) {
      return json({
        ok: true,
        mode: 'scaffold',
        items: [],
      })
    }

    await ensureNativePublicContentTable(context.env.BF_DB)
    await ensureNativeRevisionTable(context.env.BF_DB)

    if (id || slug) {
      const item = await getNativeEntry(context.env.BF_DB, id || slug, { includeFuture })
      return json({
        ok: true,
        mode: 'd1',
        item,
      })
    }

    const items = await listNativeEntries(context.env.BF_DB, {
      status: status || undefined,
      target: target || undefined,
      workflowState: workflowState || undefined,
      includeFuture,
    })

    return json({
      ok: true,
      mode: 'd1',
      items,
    })
  } catch (error) {
    return json({
      ok: false,
      error: String(error?.message || error),
    }, 500)
  }
}

export async function onRequestPost(context) {
  return handleWrite(context)
}

export async function onRequestPut(context) {
  return handleWrite(context)
}

export async function onRequestDelete(context) {
  try {
    const permission = await resolvePublicSitePermission(context)

    if (!permission.canEdit) {
      return json({
        ok: false,
        error: permission.reason,
        canEdit: false,
      }, 403)
    }

    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || url.searchParams.get('slug') || ''

    if (!id) {
      return json({
        ok: false,
        error: 'missing id or slug',
      }, 400)
    }

    if (!hasDb(context)) {
      return json({
        ok: true,
        mode: 'scaffold',
        deleted: id,
      })
    }

    const existing = await getExistingNativeEntry(context.env.BF_DB, id)
    if (existing) {
      await saveRevisionSnapshot(context.env.BF_DB, existing, 'delete:before')
    }

    const result = await deleteNativeEntry(context.env.BF_DB, id)
    await writeAuditLog(context.env.BF_DB, {
      action: 'native_content.delete',
      entityType: 'native_content',
      entityId: id,
      actor: inferActorFromRequest(context.request),
      detail: result,
    })

    return json({
      ok: true,
      mode: 'd1',
      ...result,
    })
  } catch (error) {
    return json({
      ok: false,
      error: String(error?.message || error),
    }, 500)
  }
}

async function handleWrite(context) {
  try {
    const permission = await resolvePublicSitePermission(context)

    if (!permission.canEdit) {
      return json({
        ok: false,
        error: permission.reason,
        canEdit: false,
      }, 403)
    }

    const body = await context.request.json()
    const item = body?.item || body || {}
    const revisionNote = String(body?.revisionNote || item?.revisionNote || 'save')

    if (!hasDb(context)) {
      return json({
        ok: true,
        mode: 'scaffold',
        item,
      })
    }

    await ensureNativePublicContentTable(context.env.BF_DB)
    await ensureNativeRevisionTable(context.env.BF_DB)

    const existing = item?.id ? await getExistingNativeEntry(context.env.BF_DB, item.id) : null
    if (existing) {
      await saveRevisionSnapshot(context.env.BF_DB, existing, `before:${revisionNote}`)
    }

    const saved = await upsertNativeEntry(context.env.BF_DB, item)
    await saveRevisionSnapshot(context.env.BF_DB, saved, revisionNote)
    await writeAuditLog(context.env.BF_DB, {
      action: 'native_content.upsert',
      entityType: 'native_content',
      entityId: saved.id,
      actor: inferActorFromRequest(context.request),
      detail: {
        revisionNote,
        status: saved.status,
        workflowState: saved.workflowState,
        target: saved.target,
        slug: saved.slug,
      },
    })

    return json({
      ok: true,
      mode: 'd1',
      item: saved,
    })
  } catch (error) {
    return json({
      ok: false,
      error: String(error?.message || error),
    }, 400)
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
