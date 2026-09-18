import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import {
  clearEpisodeCredential,
  readEpisodeCredentialFlags,
  storePeerTubeAccessToken,
  storePeerTubeSession,
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

    if (action === 'connectPeerTube') {
      await connectPeerTube(db, context.env || {}, body)
    } else if (action === 'setPeerTubeToken') {
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

async function connectPeerTube(db, env, body = {}) {
  const baseUrl = peerTubeBaseUrl(body.baseUrl)
  const username = String(body.username || '').trim()
  const password = String(body.password || '')
  const otp = String(body.otp || '').trim()
  if (!baseUrl) throw new Error('PeerTube instance URL must be a public https URL')
  if (!username) throw new Error('PeerTube username is required')
  if (!password) throw new Error('PeerTube password is required')

  const clientResponse = await fetch(`${baseUrl}/api/v1/oauth-clients/local`, {
    headers: { accept: 'application/json' },
    redirect: 'error',
  })
  const client = await clientResponse.json().catch(() => null)
  if (!clientResponse.ok || !client?.client_id || !client?.client_secret) {
    throw new Error(`Could not read the PeerTube OAuth client from ${baseUrl}`)
  }

  const headers = {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
  }
  if (otp) headers['x-peertube-otp'] = otp
  const tokenResponse = await fetch(`${baseUrl}/api/v1/users/token`, {
    method: 'POST',
    headers,
    redirect: 'error',
    body: new URLSearchParams({
      client_id: String(client.client_id),
      client_secret: String(client.client_secret),
      grant_type: 'password',
      username,
      password,
    }),
  })
  const token = await tokenResponse.json().catch(() => null)
  if (!tokenResponse.ok || !token?.access_token || !token?.refresh_token) {
    const detail = token?.detail || token?.error_description || token?.error
    throw new Error(detail || `PeerTube login failed: ${tokenResponse.status}`)
  }

  await storePeerTubeSession(db, env, {
    baseUrl,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresIn: token.expires_in,
    refreshTokenExpiresIn: token.refresh_token_expires_in,
  })
}

function peerTubeBaseUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim())
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return ''
    const host = parsed.hostname.toLowerCase()
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return ''
    if (isPrivateIpv4(host) || isPrivateIpv6(host)) return ''
    return parsed.origin
  } catch {
    return ''
  }
}

function isPrivateIpv4(host) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false
  const parts = host.split('.').map(Number)
  if (parts.some((part) => part < 0 || part > 255)) return true
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0
}

function isPrivateIpv6(host) {
  const clean = host.replace(/^\[|\]$/g, '')
  return clean === '::1' || clean === '::' || /^f[cd][0-9a-f]{2}:/i.test(clean) || /^fe[89ab][0-9a-f]:/i.test(clean)
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
