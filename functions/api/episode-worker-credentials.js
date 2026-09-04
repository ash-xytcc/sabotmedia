import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { readPeerTubeSession, readYouTubeRefreshToken, storePeerTubeSession } from './_lib/episodeCredentials.js'

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
      const session = await readPeerTubeSession(db, context.env || {})
      if (!session.accessToken && !session.refreshToken) return json({ ok: false, error: 'PeerTube is not connected on the site' }, 409)
      const requestedBase = normalizeOrigin(body?.baseUrl)
      const sessionBase = normalizeOrigin(session.baseUrl)
      if (requestedBase && sessionBase && requestedBase !== sessionBase) {
        return json({ ok: false, error: 'PeerTube credential belongs to a different instance' }, 409)
      }
      if (session.environmentManaged || accessTokenStillFresh(session.accessTokenExpiresAt) || !session.refreshToken) {
        return json({ ok: true, destination, accessToken: session.accessToken })
      }

      const baseUrl = requestedBase || sessionBase
      if (!baseUrl) return json({ ok: false, error: 'PeerTube instance URL is missing from the saved connection' }, 409)
      if (tokenExpired(session.refreshTokenExpiresAt)) return json({ ok: false, error: 'PeerTube refresh token expired; reconnect PeerTube in Publishing Connections' }, 409)

      const refreshed = await refreshPeerTubeSession(baseUrl, session.refreshToken)
      await storePeerTubeSession(db, context.env || {}, {
        baseUrl,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || session.refreshToken,
        expiresIn: refreshed.expires_in,
        refreshTokenExpiresIn: refreshed.refresh_token_expires_in,
      })
      return json({ ok: true, destination, accessToken: refreshed.access_token, expiresIn: Number(refreshed.expires_in || 0) || 0 })
    }

    return json({ ok: false, error: `unsupported destination: ${destination || 'missing'}` }, 400)
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

async function refreshPeerTubeSession(baseUrl, refreshToken) {
  const clientResponse = await fetch(`${baseUrl}/api/v1/oauth-clients/local`, {
    headers: { accept: 'application/json' },
    redirect: 'error',
  })
  const client = await clientResponse.json().catch(() => null)
  if (!clientResponse.ok || !client?.client_id || !client?.client_secret) {
    throw new Error(`Could not read PeerTube OAuth client: ${clientResponse.status}`)
  }

  const response = await fetch(`${baseUrl}/api/v1/users/token`, {
    method: 'POST',
    redirect: 'error',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: String(client.client_id),
      client_secret: String(client.client_secret),
      grant_type: 'refresh_token',
      refresh_token: String(refreshToken),
    }),
  })
  const token = await response.json().catch(() => null)
  if (!response.ok || !token?.access_token) {
    throw new Error(token?.detail || token?.error_description || token?.error || `PeerTube token refresh failed: ${response.status}`)
  }
  return token
}

function accessTokenStillFresh(value) {
  const expires = new Date(String(value || '')).getTime()
  return Number.isFinite(expires) && expires > Date.now() + 60_000
}

function tokenExpired(value) {
  const expires = new Date(String(value || '')).getTime()
  return Number.isFinite(expires) && expires <= Date.now()
}

function normalizeOrigin(value) {
  try {
    const parsed = new URL(String(value || '').trim())
    return parsed.protocol === 'https:' ? parsed.origin : ''
  } catch {
    return ''
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
