import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import {
  episodePublishingConnectionSummary,
  readEpisodePublishingSettings,
  readEpisodeWorkerHeartbeat,
  writeEpisodePublishingSettings,
} from './_lib/episodePublishingSettings.js'
import { readEpisodeCredentialFlags } from './_lib/episodeCredentials.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)
  return json({ ok: true, canEdit: permission.canEdit, authMode: permission.mode })
}

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'valid session required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('episode publishing settings')
    const result = await readEpisodePublishingSettings(db)
    const [credentialFlags, workerHeartbeat] = await Promise.all([
      readEpisodeCredentialFlags(db, context.env || {}),
      readEpisodeWorkerHeartbeat(db),
    ])
    return json({
      ok: true,
      mode: 'd1',
      ...result,
      connections: episodePublishingConnectionSummary(context.env || {}, result.settings, credentialFlags, workerHeartbeat),
    })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'valid session required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('episode publishing settings')
    const body = await context.request.json().catch(() => ({}))
    const result = await writeEpisodePublishingSettings(db, body?.settings || body || {})
    const [credentialFlags, workerHeartbeat] = await Promise.all([
      readEpisodeCredentialFlags(db, context.env || {}),
      readEpisodeWorkerHeartbeat(db),
    ])
    return json({
      ok: true,
      mode: 'd1',
      ...result,
      connections: episodePublishingConnectionSummary(context.env || {}, result.settings, credentialFlags, workerHeartbeat),
    })
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
      'x-content-type-options': 'nosniff',
    },
  })
}
