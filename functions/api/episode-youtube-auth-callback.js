import { getBoundDb } from './_lib/database.js'
import { consumeYouTubeOAuthState, storeYouTubeRefreshToken } from './_lib/episodeCredentials.js'

export async function onRequestGet(context) {
  try {
    const requestUrl = new URL(context.request.url)
    const code = String(requestUrl.searchParams.get('code') || '').trim()
    const state = String(requestUrl.searchParams.get('state') || '').trim()
    const oauthError = String(requestUrl.searchParams.get('error') || '').trim()
    const db = getBoundDb(context)
    if (!db) return redirectResult(requestUrl.origin, '/wp-admin/podcasts?publishing=settings&youtube=error&reason=database')

    const consumed = await consumeYouTubeOAuthState(db, state)
    if (!consumed) return redirectResult(requestUrl.origin, '/wp-admin/podcasts?publishing=settings&youtube=error&reason=state')
    if (oauthError || !code) return redirectResult(requestUrl.origin, `${consumed.returnTo}${consumed.returnTo.includes('?') ? '&' : '?'}youtube=cancelled`)

    const clientId = String(context.env?.YOUTUBE_CLIENT_ID || '').trim()
    const clientSecret = String(context.env?.YOUTUBE_CLIENT_SECRET || '').trim()
    if (!clientId || !clientSecret) throw new Error('YouTube OAuth client is not configured on the site')

    const redirectUri = `${requestUrl.origin}/api/episode-youtube-auth-callback`
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const token = await tokenResponse.json().catch(() => null)
    if (!tokenResponse.ok || !token?.refresh_token) {
      throw new Error(token?.error_description || token?.error || `YouTube OAuth token exchange failed: ${tokenResponse.status}`)
    }

    await storeYouTubeRefreshToken(db, context.env || {}, token.refresh_token)
    const separator = consumed.returnTo.includes('?') ? '&' : '?'
    return redirectResult(requestUrl.origin, `${consumed.returnTo}${separator}youtube=connected`)
  } catch (error) {
    const requestUrl = new URL(context.request.url)
    const message = encodeURIComponent(String(error?.message || error).slice(0, 180))
    return redirectResult(requestUrl.origin, `/wp-admin/podcasts?publishing=settings&youtube=error&reason=${message}`)
  }
}

function redirectResult(origin, path) {
  return Response.redirect(new URL(path, origin).toString(), 302)
}
