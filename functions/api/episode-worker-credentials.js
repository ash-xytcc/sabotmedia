import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { readPeerTubeAccessToken, readYouTubeRefreshToken } from './_lib/episodeCredentials.js'

export async function onRequestPost(context) {
  try {
    const auth = authorizeWorker(context)
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('episode worker credentials')
    const body = await context.request.json().catch(() => ({}))
    const destination = String(body?.destination || '').trim()

    if (destination === 'youtube') {
      const clientId = String(context.env?.YOUTUBE_CLIENT_ID || '').trim()
      const clientSecret = String(context.env?.YOUTUBE_CLIENT_SECRET || '').trim()
      const refreshToken = await readYouTubeRefreshToken(db, context.env || {})
      if (!clientId || !clientSecret || !refreshToken) return json({ ok: false, error: 'YouTube is not connected on the site' }, 409)
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })
      const token = await response.json().catch(() => null)
      if (!response.ok || !token?.access_token) return json({ ok: false, error: token?.error_description || token?.error || `YouTube token refresh failed: ${response.status}` }, 502)
      return json({ ok: true, destination, accessToken: token.access_token, expiresIn: Number(token.expires_in || 0) || 0 })
    }

    if (destination === 'peertube') {
      const accessToken = await readPeerTubeAccessToken(db, context.env || {})
      if (!accessToken) return json({ ok: false, error: 'PeerTube is not connected on the site' }, 409)
      return json({ ok: true, destination, accessToken })
    }

    return json({ ok: false, error: `unsupported destination: ${destination || 'missing'}` }, 400)
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

function authorizeWorker(context) {
  const expected = String(context?.env?.EPISODE_WORKER_TOKEN || '').trim()
  if (!expected) return { ok: false, status: 503, error: 'EPISODE_WORKER_TOKEN is not configured' }
  const header = String(context?.request?.headers?.get('authorization') || '')
  const provided = header.replace(/^Bearer\s+/i, '').trim()
  if (!provided || !constantTimeEqual(provided, expected)) return { ok: false, status: 403, error: 'invalid episode worker token' }
  return { ok: true, status: 200, error: '' }
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
