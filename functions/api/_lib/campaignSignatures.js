const SIGNATURE_STATUSES = new Set(['pending_email', 'awaiting_moderation', 'approved', 'rejected', 'spam', 'revoked'])
const VERIFY_TTL_MS = 72 * 60 * 60 * 1000
const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT = 8

export async function ensureCampaignSignatureTables(db) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS campaign_signature_forms (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL DEFAULT '',
      intro TEXT NOT NULL DEFAULT '',
      config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(campaign_id)
    )`,
    `CREATE TABLE IF NOT EXISTS campaign_signatures (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      signer_type TEXT NOT NULL DEFAULT 'individual',
      display_name TEXT NOT NULL DEFAULT '',
      affiliation TEXT NOT NULL DEFAULT '',
      organization_name TEXT NOT NULL DEFAULT '',
      contact_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      email_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_email',
      verification_method TEXT NOT NULL DEFAULT 'email',
      verification_token_hash TEXT,
      verification_expires_at TEXT,
      verified_at TEXT,
      management_token_hash TEXT,
      management_created_at TEXT,
      published_at TEXT,
      revoked_at TEXT,
      moderation_note TEXT NOT NULL DEFAULT '',
      duplicate_flags_json TEXT NOT NULL DEFAULT '[]',
      abuse_flags_json TEXT NOT NULL DEFAULT '[]',
      website_domain_match INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS campaign_signature_rate_limits (
      key_hash TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      window_started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_campaign_signatures_campaign_status ON campaign_signatures(campaign_id, status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_campaign_signatures_email_hash ON campaign_signatures(campaign_id, email_hash, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_campaign_signatures_verify ON campaign_signatures(verification_token_hash)`,
    `CREATE INDEX IF NOT EXISTS idx_campaign_signatures_manage ON campaign_signatures(management_token_hash)`,
  ]
  for (const sql of statements) await db.prepare(sql).run()
}

export async function ensureSignatureForm(db, campaign, input = {}) {
  await ensureCampaignSignatureTables(db)
  const campaignId = String(campaign?.id || campaign || '').trim()
  if (!campaignId) throw new Error('campaign is required')
  const now = new Date().toISOString()
  const existing = await db.prepare('SELECT * FROM campaign_signature_forms WHERE campaign_id = ? LIMIT 1').bind(campaignId).first()
  const config = {
    allowIndividuals: input.allowIndividuals !== false,
    allowOrganizations: input.allowOrganizations !== false,
    showAffiliation: input.showAffiliation !== false,
    ...(safeJson(existing?.config_json, {})),
    ...(input.config && typeof input.config === 'object' ? input.config : {}),
  }
  await db.prepare(`INSERT INTO campaign_signature_forms (id, campaign_id, enabled, title, intro, config_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(campaign_id) DO UPDATE SET enabled = excluded.enabled, title = excluded.title, intro = excluded.intro, config_json = excluded.config_json, updated_at = excluded.updated_at`)
    .bind(existing?.id || `signature-form-${campaignId}`, campaignId, input.enabled === false ? 0 : 1, clean(input.title || existing?.title || 'Sign the open letter', 180), clean(input.intro || existing?.intro || '', 1200), JSON.stringify(config), existing?.created_at || now, now).run()
  return getSignatureForm(db, campaignId)
}

export async function getSignatureForm(db, campaignId) {
  await ensureCampaignSignatureTables(db)
  const row = await db.prepare('SELECT * FROM campaign_signature_forms WHERE campaign_id = ? LIMIT 1').bind(campaignId).first()
  if (!row) return null
  return {
    id: row.id,
    campaignId: row.campaign_id,
    enabled: Boolean(row.enabled),
    title: row.title,
    intro: row.intro,
    config: safeJson(row.config_json, {}),
  }
}

export async function importManualSignatories(db, campaignId, signatories = []) {
  await ensureCampaignSignatureTables(db)
  let imported = 0
  for (const item of signatories) {
    const displayName = clean(item?.name, 180)
    if (!displayName) continue
    const legacyId = clean(item?.id || `legacy-${slugify(displayName)}`, 180)
    const id = `manual-${campaignId}-${legacyId}`
    const existingById = await db.prepare('SELECT id FROM campaign_signatures WHERE id = ? LIMIT 1').bind(id).first()
    const existingByName = await db.prepare(`SELECT id FROM campaign_signatures WHERE campaign_id = ? AND verification_method = 'verified_manual' AND lower(COALESCE(NULLIF(organization_name, ''), display_name)) = lower(?) LIMIT 1`).bind(campaignId, displayName).first()
    if (existingById || existingByName) continue
    const now = new Date().toISOString()
    const signerType = item?.signerType === 'individual' ? 'individual' : 'organization'
    const organizationName = signerType === 'organization' ? displayName : ''
    await db.prepare(`INSERT INTO campaign_signatures (
      id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website,
      email, email_hash, status, verification_method, verified_at, published_at, duplicate_flags_json, abuse_flags_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, '', '', ?, '', ?, 'approved', 'verified_manual', ?, ?, '[]', '[]', ?, ?)`)
      .bind(id, campaignId, signerType, displayName, clean(item?.location, 180), organizationName, safeWebsite(item?.url), await sha256(`manual:${campaignId}:${legacyId}`), now, now, now, now).run()
    imported += 1
  }
  return imported
}

export async function submitSignature(db, campaign, input = {}, requestMeta = {}) {
  await ensureCampaignSignatureTables(db)
  const campaignId = String(campaign?.id || campaign || '').trim()
  const form = await getSignatureForm(db, campaignId)
  if (!form?.enabled) throw httpError('Signing is not enabled for this campaign.', 404)

  // Honeypot: pretend success so bots do not get a useful signal.
  if (clean(input.company || input.website_confirm || '', 200)) return { accepted: true, suppressed: true }

  const signerType = input.signerType === 'organization' ? 'organization' : 'individual'
  const email = normalizeEmail(input.email)
  if (!email || !email.includes('@')) throw httpError('Enter a valid email address.', 400)
  const displayName = clean(input.displayName || input.publicName, 180)
  const organizationName = clean(input.organizationName, 220)
  const contactName = clean(input.contactName, 180)
  const role = clean(input.role, 180)
  const affiliation = clean(input.affiliation, 220)
  const website = safeWebsite(input.website)
  if (signerType === 'individual' && !displayName) throw httpError('Display name is required.', 400)
  if (signerType === 'organization' && (!organizationName || !contactName)) throw httpError('Organization and contact name are required.', 400)

  const abuseKey = await sha256(`${requestMeta.rateSalt || 'sabot'}:${String(requestMeta.ip || '')}:${campaignId}`)
  if (!(await consumeRateLimit(db, abuseKey))) throw httpError('Too many attempts. Please try again later.', 429)

  const emailHash = await sha256(email)
  const duplicateRows = await db.prepare(`SELECT id, status, created_at FROM campaign_signatures WHERE campaign_id = ? AND email_hash = ? ORDER BY created_at DESC LIMIT 8`).bind(campaignId, emailHash).all()
  const duplicateFlags = (duplicateRows.results || []).map((row) => `${row.status}:${row.id}`).slice(0, 8)
  const abuseFlags = []
  if (duplicateFlags.length) abuseFlags.push('repeat_email')
  if (Number(input.formStartedAt) && Date.now() - Number(input.formStartedAt) < 2500) abuseFlags.push('fast_completion')

  const websiteDomainMatch = signerType === 'organization' ? compareEmailAndWebsiteDomain(email, website) : null
  const id = crypto.randomUUID()
  const verificationToken = randomSecret(32)
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString()
  await db.prepare(`INSERT INTO campaign_signatures (
    id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website, email, email_hash,
    status, verification_method, verification_token_hash, verification_expires_at, management_token_hash, management_created_at,
    duplicate_flags_json, abuse_flags_json, website_domain_match, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_email', 'email', ?, ?, NULL, NULL, ?, ?, ?, ?, ?)`)
    .bind(id, campaignId, signerType, displayName, affiliation, organizationName, contactName, role, website, email, emailHash,
      await sha256(verificationToken), expiresAt, JSON.stringify(duplicateFlags), JSON.stringify(abuseFlags), websiteDomainMatch == null ? null : (websiteDomainMatch ? 1 : 0), now, now).run()

  return { accepted: true, id, email, verificationToken, expiresAt }
}

export async function verifySignature(db, token) {
  await ensureCampaignSignatureTables(db)
  const tokenHash = await sha256(String(token || ''))
  const now = new Date().toISOString()
  const row = await db.prepare(`SELECT * FROM campaign_signatures WHERE verification_token_hash = ? AND status = 'pending_email' LIMIT 1`).bind(tokenHash).first()
  if (!row || !row.verification_expires_at || Date.parse(row.verification_expires_at) <= Date.now()) throw httpError('This verification link is invalid or expired.', 400)
  const managementToken = randomSecret(32)
  await db.prepare(`UPDATE campaign_signatures SET status = 'awaiting_moderation', verification_token_hash = NULL, verification_expires_at = NULL, verified_at = ?, management_token_hash = ?, management_created_at = ?, updated_at = ? WHERE id = ? AND verification_token_hash = ?`)
    .bind(now, await sha256(managementToken), now, now, row.id, tokenHash).run()
  return { ...(await getPrivateSignature(db, row.id)), managementToken }
}

export async function resendVerification(db, signatureId) {
  await ensureCampaignSignatureTables(db)
  const row = await db.prepare(`SELECT * FROM campaign_signatures WHERE id = ? AND status = 'pending_email' LIMIT 1`).bind(signatureId).first()
  if (!row) throw httpError('Signature is not awaiting verification.', 400)
  const token = randomSecret(32)
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString()
  await db.prepare('UPDATE campaign_signatures SET verification_token_hash = ?, verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(await sha256(token), expiresAt, row.id).run()
  return { signature: privateRow(row), verificationToken: token, expiresAt }
}

export async function getManagedSignature(db, token) {
  await ensureCampaignSignatureTables(db)
  const row = await db.prepare('SELECT * FROM campaign_signatures WHERE management_token_hash = ? LIMIT 1').bind(await sha256(String(token || ''))).first()
  if (!row) throw httpError('Management link is invalid.', 404)
  return privateRow(row, { includeEmail: false })
}

export async function updateManagedSignature(db, token, patch = {}) {
  await ensureCampaignSignatureTables(db)
  const tokenHash = await sha256(String(token || ''))
  const row = await db.prepare('SELECT * FROM campaign_signatures WHERE management_token_hash = ? LIMIT 1').bind(tokenHash).first()
  if (!row) throw httpError('Management link is invalid.', 404)
  if (row.status === 'revoked') return privateRow(row, { includeEmail: false })
  const revoke = patch.revoke === true || patch.hidden === true
  const status = revoke ? 'revoked' : row.status
  const displayName = patch.displayName === undefined ? row.display_name : clean(patch.displayName, 180)
  const affiliation = patch.affiliation === undefined ? row.affiliation : clean(patch.affiliation, 220)
  const organizationName = patch.organizationName === undefined ? row.organization_name : clean(patch.organizationName, 220)
  const now = new Date().toISOString()
  await db.prepare(`UPDATE campaign_signatures SET display_name = ?, affiliation = ?, organization_name = ?, status = ?, revoked_at = ?, published_at = CASE WHEN ? = 'revoked' THEN NULL ELSE published_at END, management_token_hash = CASE WHEN ? = 'revoked' THEN NULL ELSE management_token_hash END, updated_at = ? WHERE id = ? AND management_token_hash = ?`)
    .bind(displayName, affiliation, organizationName, status, revoke ? now : row.revoked_at, status, status, now, row.id, tokenHash).run()
  return getPrivateSignature(db, row.id, { includeEmail: false })
}

export async function listPublicSignatures(db, campaignId) {
  await ensureCampaignSignatureTables(db)
  const result = await db.prepare(`SELECT id, signer_type, display_name, affiliation, organization_name, role, website, published_at, verification_method FROM campaign_signatures WHERE campaign_id = ? AND status = 'approved' ORDER BY datetime(COALESCE(published_at, created_at)) ASC`).bind(campaignId).all()
  const items = (result.results || []).map(publicRow)
  const organizations = items.filter((item) => item.signerType === 'organization')
  const individuals = items.filter((item) => item.signerType === 'individual')
  return { items, organizations, individuals, counts: { total: items.length, organizations: organizations.length, individuals: individuals.length } }
}

export async function listModerationQueue(db, campaignId, status = 'all') {
  await ensureCampaignSignatureTables(db)
  const allowed = new Set(['all', ...SIGNATURE_STATUSES])
  const selected = allowed.has(status) ? status : 'all'
  const where = selected === 'all' ? '' : 'AND status = ?'
  const statement = db.prepare(`SELECT * FROM campaign_signatures WHERE campaign_id = ? ${where} ORDER BY datetime(created_at) DESC LIMIT 1000`)
  const result = selected === 'all' ? await statement.bind(campaignId).all() : await statement.bind(campaignId, selected).all()
  const rows = result.results || []
  const rejectedHashes = new Set(rows.filter((row) => ['rejected', 'spam'].includes(row.status)).map((row) => row.email_hash))
  return rows.map((row) => ({ ...privateRow(row), priorRejectedOrSpamMatch: rejectedHashes.has(row.email_hash) && !['rejected', 'spam'].includes(row.status) }))
}

export async function moderateSignature(db, id, action, patch = {}) {
  await ensureCampaignSignatureTables(db)
  const row = await db.prepare('SELECT * FROM campaign_signatures WHERE id = ? LIMIT 1').bind(id).first()
  if (!row) throw httpError('Signature not found.', 404)
  const actions = { approve: 'approved', reject: 'rejected', spam: 'spam', revoke: 'revoked' }
  const nextStatus = actions[action]
  if (!nextStatus) throw httpError('Unsupported moderation action.', 400)
  if (action === 'approve' && !['awaiting_moderation', 'approved'].includes(row.status) && row.verification_method !== 'verified_manual') throw httpError('Email verification is required before approval.', 409)
  const now = new Date().toISOString()
  const displayName = patch.displayName === undefined ? row.display_name : clean(patch.displayName, 180)
  const affiliation = patch.affiliation === undefined ? row.affiliation : clean(patch.affiliation, 220)
  const organizationName = patch.organizationName === undefined ? row.organization_name : clean(patch.organizationName, 220)
  const role = patch.role === undefined ? row.role : clean(patch.role, 180)
  const website = patch.website === undefined ? row.website : safeWebsite(patch.website)
  await db.prepare(`UPDATE campaign_signatures SET status = ?, display_name = ?, affiliation = ?, organization_name = ?, role = ?, website = ?, moderation_note = ?, published_at = ?, revoked_at = ?, verification_token_hash = CASE WHEN ? IN ('rejected','spam','revoked') THEN NULL ELSE verification_token_hash END, updated_at = ? WHERE id = ?`)
    .bind(nextStatus, displayName, affiliation, organizationName, role, website, clean(patch.moderationNote || row.moderation_note, 2000), nextStatus === 'approved' ? (row.published_at || now) : null, nextStatus === 'revoked' ? now : null, nextStatus, now, id).run()
  return getPrivateSignature(db, id)
}

export async function bulkModerateSignatures(db, ids = [], action) {
  const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 250)
  const results = []
  for (const id of unique) {
    try { results.push({ id, ok: true, item: await moderateSignature(db, id, action) }) }
    catch (error) { results.push({ id, ok: false, error: String(error?.message || error) }) }
  }
  return results
}

export async function exportSignaturesCsv(db, campaignId) {
  const items = await listModerationQueue(db, campaignId, 'all')
  const headers = ['id','status','signer_type','display_name','affiliation','organization_name','contact_name','role','website','email','verification_method','created_at','verified_at','published_at']
  const lines = [headers.join(',')]
  for (const item of items) lines.push(headers.map((key) => csvCell(item[key] ?? item[toCamel(key)] ?? '')).join(','))
  return lines.join('\n')
}

export async function getPrivateSignature(db, id, options = {}) {
  const row = await db.prepare('SELECT * FROM campaign_signatures WHERE id = ? LIMIT 1').bind(id).first()
  return row ? privateRow(row, options) : null
}

export function compareEmailAndWebsiteDomain(email, website) {
  if (!email || !website) return null
  try {
    const emailDomain = String(email).split('@').pop().toLowerCase().replace(/^www\./, '')
    const host = new URL(website).hostname.toLowerCase().replace(/^www\./, '')
    return emailDomain === host || emailDomain.endsWith(`.${host}`) || host.endsWith(`.${emailDomain}`)
  } catch { return null }
}

export async function sendSignatureEmail(env, { to, subject, text, html = '' }) {
  const from = String(env.SIGNATURE_EMAIL_FROM || 'Sabot Media <info@sabot.media>')
  if (env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }) })
    if (!response.ok) throw new Error(`email provider returned ${response.status}`)
    return { sent: true, provider: 'resend' }
  }
  if (env.SIGNATURE_EMAIL_WEBHOOK) {
    const response = await fetch(env.SIGNATURE_EMAIL_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json', ...(env.SIGNATURE_EMAIL_WEBHOOK_TOKEN ? { authorization: `Bearer ${env.SIGNATURE_EMAIL_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify({ from, to, subject, text, html }) })
    if (!response.ok) throw new Error(`email webhook returned ${response.status}`)
    return { sent: true, provider: 'webhook' }
  }
  // MailChannels remains an optional zero-account fallback for Cloudflare deployments.
  const response = await fetch('https://api.mailchannels.net/tx/v1/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: parseFrom(from), subject, content: [{ type: 'text/plain', value: text }, ...(html ? [{ type: 'text/html', value: html }] : [])] }) })
  if (!response.ok) throw new Error(`email provider returned ${response.status}`)
  return { sent: true, provider: 'mailchannels' }
}

export function signaturePublicDisplay(item) {
  if (item.signerType === 'organization') return item.organizationName || item.displayName
  return item.displayName
}

function publicRow(row) {
  return {
    id: row.id,
    signerType: row.signer_type,
    displayName: row.display_name,
    affiliation: row.affiliation,
    organizationName: row.organization_name,
    role: row.role,
    website: row.website,
    publishedAt: row.published_at,
    verificationMethod: row.verification_method,
  }
}
function privateRow(row, { includeEmail = true } = {}) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    signerType: row.signer_type,
    displayName: row.display_name,
    affiliation: row.affiliation,
    organizationName: row.organization_name,
    contactName: row.contact_name,
    role: row.role,
    website: row.website,
    ...(includeEmail ? { email: row.email } : {}),
    status: row.status,
    verificationMethod: row.verification_method,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    revokedAt: row.revoked_at,
    duplicateFlags: safeJson(row.duplicate_flags_json, []),
    abuseFlags: safeJson(row.abuse_flags_json, []),
    websiteDomainMatch: row.website_domain_match == null ? null : Boolean(row.website_domain_match),
    moderationNote: row.moderation_note,
  }
}
function normalizeEmail(value) { return String(value || '').trim().toLowerCase().slice(0, 320) }
function clean(value, max = 500) { return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) }
function safeWebsite(value) { const raw = clean(value, 2000); if (!raw) return ''; try { const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' } }
function safeJson(value, fallback) { try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return parsed ?? fallback } catch { return fallback } }
function slugify(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'signer' }
function randomSecret(bytes = 32) { const data = crypto.getRandomValues(new Uint8Array(bytes)); return base64url(data) }
function base64url(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') }
async function sha256(value) { const data = new TextEncoder().encode(String(value || '')); return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', data))) }
async function consumeRateLimit(db, keyHash) { const now = Date.now(); const current = await db.prepare('SELECT * FROM campaign_signature_rate_limits WHERE key_hash = ? LIMIT 1').bind(keyHash).first(); const started = Date.parse(current?.window_started_at || 0); if (!current || !Number.isFinite(started) || now - started >= RATE_WINDOW_MS) { await db.prepare(`INSERT INTO campaign_signature_rate_limits (key_hash, attempts, window_started_at, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET attempts = 1, window_started_at = excluded.window_started_at, updated_at = excluded.updated_at`).bind(keyHash, new Date(now).toISOString(), new Date(now).toISOString()).run(); return true } if (Number(current.attempts || 0) >= RATE_LIMIT) return false; await db.prepare('UPDATE campaign_signature_rate_limits SET attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE key_hash = ?').bind(keyHash).run(); return true }
function parseFrom(value) { const match = String(value || '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/); return match ? { name: match[1], email: match[2] } : { email: String(value || 'info@sabot.media') } }
function httpError(message, status = 400) { const error = new Error(message); error.status = status; return error }
function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text }
function toCamel(value) { return String(value).replace(/_([a-z])/g, (_, char) => char.toUpperCase()) }
