import {
  ensureNativeRevisionTable,
  getExistingNativeEntry,
  listRevisionSnapshots,
  restoreRevisionSnapshot,
} from './_lib/nativePublicContent.js'
import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'

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

    const url = new URL(context.request.url)
    const nativeId = url.searchParams.get('nativeId') || ''
    const slug = url.searchParams.get('slug') || ''

    let resolvedId = nativeId
    if (!resolvedId && slug) {
      const item = await getExistingNativeEntry(context.env.BF_DB, slug)
      resolvedId = item?.id || ''
    }

    if (!resolvedId) {
      return json({ ok: false, error: 'missing nativeId or slug' }, 400)
    }

    await ensureNativeRevisionTable(context.env.BF_DB)
    const items = await listRevisionSnapshots(context.env.BF_DB, resolvedId)

    return json({
      ok: true,
      mode: 'd1',
      items,
    })
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

    if (!hasDb(context)) {
      return json({ ok: true, mode: 'scaffold' })
    }

    const body = await context.request.json()
    const revisionId = String(body?.revisionId || '')

    if (!revisionId) {
      return json({ ok: false, error: 'missing revisionId' }, 400)
    }

    const restored = await restoreRevisionSnapshot(context.env.BF_DB, revisionId)

    return json({
      ok: true,
      mode: 'd1',
      item: restored,
    })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
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
