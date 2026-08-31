import { inferActorFromRequest, writeAuditLog } from './_lib/auditLog.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { readPodcastSettings, writePodcastSettings } from './_lib/podcastSettings.js'

export async function onRequestGet(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permission.canAccessAdmin) return json({ ok: false, error: permission.reason || 'authentication required' }, 403)
  if (!context.env?.BF_DB) return json({ ok: false, error: 'podcast settings unavailable: BF_DB is not bound' }, 503)

  try {
    const result = await readPodcastSettings(context.env.BF_DB)
    return json({ ok: true, mode: 'd1', ...result })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permissionHasCapability(permission, 'publishing:write')) {
    return json({ ok: false, error: 'publishing permission required' }, 403)
  }
  if (!context.env?.BF_DB) return json({ ok: false, error: 'podcast settings unavailable: BF_DB is not bound' }, 503)

  try {
    const body = await context.request.json()
    const result = await writePodcastSettings(context.env.BF_DB, body?.settings || body || {})
    await writeAuditLog(context.env.BF_DB, {
      action: 'podcasts.settings.update',
      entityType: 'site_setting',
      entityId: 'podcast-settings-v1',
      actor: inferActorFromRequest(context.request),
      detail: { updatedAt: result.updatedAt, feedUrl: result.settings.rssFeedUrl },
    })
    return json({ ok: true, mode: 'd1', ...result })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
