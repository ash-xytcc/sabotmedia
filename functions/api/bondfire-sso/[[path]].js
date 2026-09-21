import { createAdminSessionCookie, resolvePublicSitePermission } from '../_lib/publicSiteAuth.js'
import { canAccessAdmin, getAdminUserByEmail, getAdminUserById, markAdminUserLogin, publicUser } from '../_lib/adminUsers.js'

const BONDFIRE_ORIGIN = 'https://bondfireapp.org'
const SABOT_ORIGIN = 'https://sabot.media'
const SABOT_BONDFIRE_ORG_ID = '397ffb25-cf4a-4fa2-b364-e506764a20c4'
const CODE_TTL_MS = 90 * 1000

export async function onRequest(context) {
  const route = Array.isArray(context.params?.path)
    ? context.params.path.join('/')
    : String(context.params?.path || '').replace(/^\/+|\/+$/g, '')

  if (route === 'start' && context.request.method === 'GET') return start(context)
  if (route === 'redeem' && context.request.method === 'POST') return redeem(context)
  if (route === 'consume' && context.request.method === 'GET') return consume(context)
  return json({ ok: false, error: 'NOT_FOUND' }, 404)
}

async function start(context) {
  if (!sameSiteNavigation(context.request)) return json({ ok: false, error: 'SAME_SITE_REQUIRED' }, 403)

  const permission = await resolvePublicSitePermission(context)
  const user = permission?.user
  if (!permission?.canAccessAdmin || !user?.id || !user?.email) {
    return json({ ok: false, error: 'A provisioned Sabot editor account is required for Bondfire handoff.' }, 403)
  }

  const db = context.env?.BF_DB
  if (!db) return json({ ok: false, error: 'BF_DB_MISSING' }, 503)
  await ensureSchema(db)

  const url = new URL(context.request.url)
  const returnTo = safeSabotPath(url.searchParams.get('returnTo'), '/wp-admin')
  const code = randomCode()
  const codeHash = await sha256Hex(code)
  const now = Date.now()
  await prune(db, now)
  await db.prepare(`
    INSERT INTO bondfire_sso_codes
      (code_hash, subject, email, display_name, role, return_to, expires_at, consumed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
  `).bind(
    codeHash,
    String(user.id),
    String(user.email).toLowerCase(),
    String(user.displayName || ''),
    String(user.role || permission.role || ''),
    returnTo,
    now + CODE_TTL_MS,
  ).run()

  const target = new URL('/api/integrations/sabot/consume', BONDFIRE_ORIGIN)
  target.searchParams.set('code', code)
  return redirect(target.toString())
}

async function redeem(context) {
  const db = context.env?.BF_DB
  if (!db) return json({ ok: false, error: 'BF_DB_MISSING' }, 503)
  await ensureSchema(db)

  const body = await context.request.json().catch(() => ({}))
  const code = String(body?.code || '').trim()
  if (!code) return json({ ok: false, error: 'CODE_REQUIRED' }, 400)

  const row = await consumeCode(db, code)
  if (!row) return json({ ok: false, error: 'INVALID_OR_EXPIRED_CODE' }, 401)

  return json({
    ok: true,
    subject: String(row.subject || ''),
    email: String(row.email || '').toLowerCase(),
    displayName: String(row.display_name || ''),
    role: String(row.role || ''),
    returnTo: safeSabotPath(row.return_to, '/wp-admin'),
    orgId: SABOT_BONDFIRE_ORG_ID,
    issuer: SABOT_ORIGIN,
  })
}

async function consume(context) {
  const db = context.env?.BF_DB
  if (!db) return errorPage('Sabot sign-in unavailable', 'Sabot storage is unavailable.', 503)
  await ensureSchema(db)

  const requestUrl = new URL(context.request.url)
  const code = String(requestUrl.searchParams.get('code') || '').trim()
  if (!code) return errorPage('Bondfire link expired', 'No one-time sign-in code was supplied.', 400)

  let handoff
  try {
    const response = await fetch(`${BONDFIRE_ORIGIN}/api/integrations/sabot/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ code }),
    })
    handoff = await response.json().catch(() => null)
    if (!response.ok || !handoff?.ok) {
      return errorPage('Bondfire link expired', 'The one-time Bondfire sign-in could not be verified. Open Bondfire again from Sabot and retry.', 401)
    }
  } catch {
    return errorPage('Bondfire unavailable', 'Sabot could not verify the Bondfire session.', 502)
  }

  if (String(handoff.orgId || '') !== SABOT_BONDFIRE_ORG_ID || !handoff.subject) {
    return errorPage('Bondfire link rejected', 'The handoff was not issued for the Sabot Media workspace.', 403)
  }

  let row = null
  const linked = await db.prepare('SELECT admin_user_id FROM bondfire_identity_links WHERE bondfire_user_id = ? LIMIT 1')
    .bind(String(handoff.subject)).first()
  if (linked?.admin_user_id) row = await getAdminUserById(db, linked.admin_user_id)

  if (!row && handoff.email) row = await getAdminUserByEmail(db, handoff.email)

  if (!row) {
    const current = await resolvePublicSitePermission(context)
    if (current?.canAccessAdmin && current?.user?.id) row = await getAdminUserById(db, current.user.id)
  }

  if (!row || !canAccessAdmin(row)) {
    return errorPage(
      'Sabot account not linked',
      'Sign in to Sabot once with the editor account you want connected, then open Colophon from Bondfire again.',
      403,
    )
  }

  const user = publicUser(row)
  await db.prepare(`
    INSERT INTO bondfire_identity_links (bondfire_user_id, admin_user_id, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(bondfire_user_id) DO UPDATE SET admin_user_id = excluded.admin_user_id
  `).bind(String(handoff.subject), String(user.id), Date.now()).run()

  const cookie = await createAdminSessionCookie(context, user)
  await markAdminUserLogin(db, user.id)
  return redirect(new URL(safeSabotPath(handoff.returnTo, '/wp-admin'), SABOT_ORIGIN).toString(), {
    'set-cookie': cookie,
  })
}

async function ensureSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS bondfire_sso_codes (
      code_hash TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      return_to TEXT NOT NULL DEFAULT '/wp-admin',
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER
    )
  `).run()
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS bondfire_identity_links (
      bondfire_user_id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run()
}

async function consumeCode(db, code) {
  const codeHash = await sha256Hex(code)
  const now = Date.now()
  const updated = await db.prepare(`
    UPDATE bondfire_sso_codes
    SET consumed_at = ?
    WHERE code_hash = ? AND consumed_at IS NULL AND expires_at >= ?
  `).bind(now, codeHash, now).run()
  if (Number(updated?.meta?.changes || 0) !== 1) return null
  return db.prepare('SELECT * FROM bondfire_sso_codes WHERE code_hash = ? LIMIT 1').bind(codeHash).first()
}

async function prune(db, now) {
  await db.prepare('DELETE FROM bondfire_sso_codes WHERE expires_at < ? OR (consumed_at IS NOT NULL AND consumed_at < ?)')
    .bind(now - 60_000, now - 10 * 60_000).run()
}

function safeSabotPath(value, fallback = '/wp-admin') {
  const candidate = String(value || '').trim()
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback
  if (/^\/api(?:\/|$)/i.test(candidate)) return fallback
  return candidate.slice(0, 2048)
}

function sameSiteNavigation(request) {
  const site = String(request.headers.get('sec-fetch-site') || '').toLowerCase()
  return !site || site === 'same-origin' || site === 'same-site' || site === 'none'
}

function randomCode() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function base64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function redirect(location, headers = {}) {
  const out = new Headers(headers)
  out.set('location', location)
  out.set('cache-control', 'no-store')
  out.set('referrer-policy', 'no-referrer')
  return new Response(null, { status: 302, headers: out })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  })
}

function errorPage(title, message, status = 400) {
  const body = `<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)}</title><main style="font:16px/1.5 system-ui;max-width:680px;margin:10vh auto;padding:24px"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="/wp-admin">Return to Sabot editor</a></p></main>`
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  })
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
