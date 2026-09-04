import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { createYouTubeOAuthState } from './_lib/episodeCredentials.js'

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
]

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return text(permission.reason || 'valid session required', 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('YouTube OAuth')

    const clientId = String(context.env?.YOUTUBE_CLIENT_ID || '').trim()
    const clientSecret = String(context.env?.YOUTUBE_CLIENT_SECRET || '').trim()
    const credentialKey = String(context.env?.EPISODE_CREDENTIALS_KEY || '').trim()
    if (!clientId || !clientSecret || !credentialKey) {
      return text('YouTube connection requires YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and EPISODE_CREDENTIALS_KEY on the site.', 503)
    }

    const requestUrl = new URL(context.request.url)
    const returnTo = requestUrl.searchParams.get('returnTo') || '/wp-admin/podcasts?publishing=settings'
    const oauthState = await createYouTubeOAuthState(db, returnTo)
    const redirectUri = `${requestUrl.origin}/api/episode-youtube-auth-callback`
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    auth.searchParams.set('client_id', clientId)
    auth.searchParams.set('redirect_uri', redirectUri)
    auth.searchParams.set('response_type', 'code')
    auth.searchParams.set('scope', YOUTUBE_SCOPES.join(' '))
    auth.searchParams.set('access_type', 'offline')
    auth.searchParams.set('prompt', 'consent')
    auth.searchParams.set('include_granted_scopes', 'true')
    auth.searchParams.set('state', oauthState.state)

    return Response.redirect(auth.toString(), 302)
  } catch (error) {
    return text(String(error?.message || error), 500)
  }
}

function text(body, status) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  })
}
