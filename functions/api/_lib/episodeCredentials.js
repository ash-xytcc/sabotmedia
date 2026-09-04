const CREDENTIALS_KEY = 'episode-publishing-credentials-v1'
const YOUTUBE_STATE_KEY = 'episode-youtube-oauth-state-v1'

export async function ensureEpisodeCredentialStore(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS site_settings (
    setting_key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
}

export async function readEpisodeCredentialFlags(db, env = {}) {
  await ensureEpisodeCredentialStore(db)
  const stored = await readStoredCredentials(db)
  return {
    encryptionConfigured: Boolean(credentialSecret(env)),
    youtube: Boolean(String(env.YOUTUBE_REFRESH_TOKEN || '').trim() || stored.youtubeRefreshToken),
    peertube: Boolean(String(env.PEERTUBE_ACCESS_TOKEN || '').trim() || stored.peertubeAccessToken),
  }
}

export async function storeYouTubeRefreshToken(db, env, refreshToken) {
  const token = String(refreshToken || '').trim()
  if (!token) throw new Error('YouTube refresh token is empty')
  const stored = await readStoredCredentials(db)
  stored.youtubeRefreshToken = await encryptSecret(token, requiredCredentialSecret(env))
  stored.updatedAt = new Date().toISOString()
  await writeStoredCredentials(db, stored)
}

export async function storePeerTubeAccessToken(db, env, accessToken) {
  const token = String(accessToken || '').trim()
  if (!token) throw new Error('PeerTube access token is empty')
  const stored = await readStoredCredentials(db)
  stored.peertubeAccessToken = await encryptSecret(token, requiredCredentialSecret(env))
  stored.updatedAt = new Date().toISOString()
  await writeStoredCredentials(db, stored)
}

export async function clearEpisodeCredential(db, field) {
  const stored = await readStoredCredentials(db)
  if (field === 'youtube') stored.youtubeRefreshToken = ''
  if (field === 'peertube') stored.peertubeAccessToken = ''
  stored.updatedAt = new Date().toISOString()
  await writeStoredCredentials(db, stored)
}

export async function readYouTubeRefreshToken(db, env = {}) {
  const fromEnv = String(env.YOUTUBE_REFRESH_TOKEN || '').trim()
  if (fromEnv) return fromEnv
  const stored = await readStoredCredentials(db)
  if (!stored.youtubeRefreshToken) return ''
  return decryptSecret(stored.youtubeRefreshToken, requiredCredentialSecret(env))
}

export async function readPeerTubeAccessToken(db, env = {}) {
  const fromEnv = String(env.PEERTUBE_ACCESS_TOKEN || '').trim()
  if (fromEnv) return fromEnv
  const stored = await readStoredCredentials(db)
  if (!stored.peertubeAccessToken) return ''
  return decryptSecret(stored.peertubeAccessToken, requiredCredentialSecret(env))
}

export async function createYouTubeOAuthState(db, returnTo = '') {
  await ensureEpisodeCredentialStore(db)
  const state = randomToken()
  const value = {
    state,
    returnTo: safeReturnPath(returnTo) || '/wp-admin/podcasts?publishing=settings',
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  }
  await writeSetting(db, YOUTUBE_STATE_KEY, value)
  return value
}

export async function consumeYouTubeOAuthState(db, state) {
  await ensureEpisodeCredentialStore(db)
  const row = await db.prepare('SELECT value_json FROM site_settings WHERE setting_key = ? LIMIT 1').bind(YOUTUBE_STATE_KEY).first()
  const value = parseObject(row?.value_json)
  await db.prepare('DELETE FROM site_settings WHERE setting_key = ?').bind(YOUTUBE_STATE_KEY).run()
  if (!value?.state || !state || !constantTimeEqual(String(value.state), String(state))) return null
  const expiresAt = new Date(String(value.expiresAt || '')).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null
  return {
    returnTo: safeReturnPath(value.returnTo) || '/wp-admin/podcasts?publishing=settings',
  }
}

async function readStoredCredentials(db) {
  await ensureEpisodeCredentialStore(db)
  const row = await db.prepare('SELECT value_json FROM site_settings WHERE setting_key = ? LIMIT 1').bind(CREDENTIALS_KEY).first()
  const value = parseObject(row?.value_json)
  return {
    youtubeRefreshToken: String(value?.youtubeRefreshToken || ''),
    peertubeAccessToken: String(value?.peertubeAccessToken || ''),
    updatedAt: String(value?.updatedAt || ''),
  }
}

async function writeStoredCredentials(db, value) {
  await writeSetting(db, CREDENTIALS_KEY, value)
}

async function writeSetting(db, key, value) {
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO site_settings (setting_key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`)
    .bind(key, JSON.stringify(value || {}), now)
    .run()
}

async function encryptSecret(value, secret) {
  const key = await encryptionKey(secret, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const bytes = new TextEncoder().encode(String(value || ''))
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes))
  return `v1.${toBase64(iv)}.${toBase64(encrypted)}`
}

async function decryptSecret(value, secret) {
  const parts = String(value || '').split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('stored episode credential has an unsupported format')
  const iv = fromBase64(parts[1])
  const encrypted = fromBase64(parts[2])
  const key = await encryptionKey(secret, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}

async function encryptionKey(secret, usages) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(secret || '')))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, usages)
}

function credentialSecret(env = {}) {
  return String(env.EPISODE_CREDENTIALS_KEY || '').trim()
}

function requiredCredentialSecret(env = {}) {
  const value = credentialSecret(env)
  if (!value) throw new Error('EPISODE_CREDENTIALS_KEY is required for credentials saved through Sabot settings')
  return value
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return toBase64(bytes).replace(/[+/=]/g, (value) => ({ '+': '-', '/': '_', '=': '' }[value]))
}

function toBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value) {
  const binary = atob(String(value || ''))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

function safeReturnPath(value) {
  const raw = String(value || '').trim()
  return raw.startsWith('/') && !raw.startsWith('//') ? raw.slice(0, 1000) : ''
}

function parseObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(String(value || 'null'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}
