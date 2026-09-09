import { json } from './courseStore.js'
const enc = new TextEncoder()
export const b64 = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
export const random = () => b64(crypto.getRandomValues(new Uint8Array(32)))
export async function hashPassword(password, salt = random()) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 },
    key,
    256,
  )
  return { salt, hash: b64(new Uint8Array(hash)) }
}
export function equal(a, b) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}
export async function sign(secret, value) {
  if (!secret) throw Error('Contributor sessions unavailable')
  const k = await crypto.subtle.importKey(
    'raw',
    enc.encode('course-contributor:' + secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(value))))
}
export async function sessionCookie(env, id, scope, epoch) {
  const payload = b64(
    enc.encode(
      JSON.stringify({
        purpose: 'course-contributor',
        id,
        scope,
        epoch,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ),
  )
  return `sabot_course_${scope}=${payload}.${await sign(env.SABOT_SESSION_SECRET, payload)}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Strict`
}
export async function verifySession(context, id, scope, epoch) {
  try {
    const cookie =
      (context.request.headers.get('cookie') || '')
        .split(';')
        .map((x) => x.trim())
        .find((x) => x.startsWith(`sabot_course_${scope}=`))
        ?.split('=')[1] || ''
    const [p, s, ...extra] = cookie.split('.')
    if (!p || !s || extra.length || !equal(s, await sign(context.env.SABOT_SESSION_SECRET, p))) return false
    const v = JSON.parse(new TextDecoder().decode(unb64(p)))
    return (
      v.purpose === 'course-contributor' &&
      v.id === id &&
      v.scope === scope &&
      v.epoch === epoch &&
      v.exp > Math.floor(Date.now() / 1000) &&
      v.exp <= Math.floor(Date.now() / 1000) + 3600
    )
  } catch {
    return false
  }
}
export async function rateLimit(context, db, scope, limit = 10) {
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS course_rate_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)',
    )
    .run()
  const now = Math.floor(Date.now() / 1000),
    window = Math.floor(now / 900),
    ip = context.request.headers.get('cf-connecting-ip') || 'local'
  const digest = b64(
    new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${scope}:${ip}:${window}`))),
  )
  await db.prepare('DELETE FROM course_rate_limits WHERE expires < ?').bind(now).run()
  const row = await db
    .prepare(
      'INSERT INTO course_rate_limits(bucket,attempts,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts',
    )
    .bind(digest, now + 900)
    .first()
  return row?.attempts <= limit
}
export const denied = () => json({ ok: false, error: 'Invalid credential or access unavailable' }, 403)
