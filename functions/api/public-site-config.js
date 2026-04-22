import {
  readPublicSiteConfig,
  writePublicSiteConfig,
  normalizePublicConfig,
  PUBLIC_CONFIG_SCHEMA_VERSION,
} from './_lib/publicSiteConfig.js'
import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)

  return json({
    ok: true,
    canEdit: permission.canEdit,
    authMode: permission.mode,
    authReason: permission.reason,
    mode: hasDb(context) ? 'd1' : 'scaffold',
    schemaVersion: PUBLIC_CONFIG_SCHEMA_VERSION,
    note: hasDb(context)
      ? 'D1-backed public site config route available.'
      : 'No BF_DB binding detected. Using scaffold mode.',
  })
}

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)

    if (!hasDb(context)) {
      return json({
        ok: true,
        mode: 'scaffold',
        canEdit: permission.canEdit,
        authMode: permission.mode,
        authReason: permission.reason,
        scope: 'global',
        updatedAt: null,
        version: PUBLIC_CONFIG_SCHEMA_VERSION,
        config: normalizePublicConfig({}),
      })
    }

    const result = await readPublicSiteConfig(context.env.BF_DB, 'global')

    return json({
      ok: true,
      mode: 'd1',
      scope: result.scope,
      updatedAt: result.updatedAt,
      canEdit: permission.canEdit,
      authMode: permission.mode,
      authReason: permission.reason,
      version: result.version,
      schemaVersion: PUBLIC_CONFIG_SCHEMA_VERSION,
      config: result.config,
    })
  } catch (error) {
    return json({
      ok: false,
      error: String(error?.message || error),
    }, 500)
  }
}

export async function onRequestPut(context) {
  try {
    const permission = await resolvePublicSitePermission(context)

    if (!permission.canEdit) {
      return json({
        ok: false,
        error: permission.reason,
        canEdit: false,
        authMode: permission.mode,
      }, 403)
    }

    const body = await context.request.json()
    const incoming = body?.publicSite || body?.config || body || {}

    if (!hasDb(context)) {
      return json({
        ok: true,
        mode: 'scaffold',
        saved: true,
        received: {
          publicSite: normalizePublicConfig(incoming),
        },
        canEdit: true,
        authMode: permission.mode,
        authReason: permission.reason,
        updatedAt: new Date().toISOString(),
        version: PUBLIC_CONFIG_SCHEMA_VERSION,
        schemaVersion: PUBLIC_CONFIG_SCHEMA_VERSION,
        note: 'BF_DB binding missing. Save accepted in scaffold mode only.',
      })
    }

    const saved = await writePublicSiteConfig(context.env.BF_DB, incoming, 'global')

    return json({
      ok: true,
      mode: 'd1',
      saved: true,
      canEdit: true,
      authMode: permission.mode,
      authReason: permission.reason,
      received: {
        publicSite: saved.config,
      },
      updatedAt: saved.updatedAt,
      scope: saved.scope,
      version: saved.version,
      schemaVersion: PUBLIC_CONFIG_SCHEMA_VERSION,
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
