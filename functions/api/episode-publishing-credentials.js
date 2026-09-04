import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import {
  clearEpisodeCredential,
  readEpisodeCredentialFlags,
  storePeerTubeAccessToken,
} from './_lib/episodeCredentials.js'

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'valid session required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('episode publishing credentials')
    const flags = await readEpisodeCredentialFlags(db, context.env || {})
    return json({ ok: true, flags })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'valid session required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('episode publishing credentials')
    const body = await context.request.json().catch(() => ({}))
    const action = String(body?.action || '').trim()

    if (action === 'setPeerTubeToken') {
      await storePeerTubeAccessToken(db, context.env || {}, body.accessToken)
    } else if (action === 'clearPeerTube') {
      await clearEpisodeCredential(db, 'peertube')
    } else if (action === 'clearYouTube') {
      await clearEpisodeCredential(db, 'youtube')
    } else {
      return json({ ok: false, error: `unsupported credential action: ${action || 'missing'}` }, 400)
    }

    const flags = await readEpisodeCredentialFlags(db, context.env || {})
    return json({ ok: true, flags })
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
