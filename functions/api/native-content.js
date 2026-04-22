import {
  ensureNativePublicContentTable,
  listNativeEntries,
  getNativeEntry,
  upsertNativeEntry,
  deleteNativeEntry,
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
    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || ''
    const slug = url.searchParams.get('slug') || ''
    const status = url.searchParams.get('status') || ''
    const target = url.searchParams.get('target') || ''

    if (!hasDb(context)) {
      return json({
        ok: true,
        mode: 'scaffold',
        items: [],
      })
    }

    await ensureNativePublicContentTable(context.env.BF_DB)

    if (id || slug) {
      const item = await getNativeEntry(context.env.BF_DB, id || slug)
      return json({
        ok: true,
        mode: 'd1',
        item,
      })
    }

    const items = await listNativeEntries(context.env.BF_DB, {
      status: status || undefined,
      target: target || undefined,
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

    const result = await deleteNativeEntry(context.env.BF_DB, id)

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

    if (!hasDb(context)) {
      return json({
        ok: true,
        mode: 'scaffold',
        item,
      })
    }

    const saved = await upsertNativeEntry(context.env.BF_DB, item)

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
