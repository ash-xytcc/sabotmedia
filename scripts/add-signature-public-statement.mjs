import fs from 'node:fs'

function rewrite(path, pattern, replacement, label) {
  const before = fs.readFileSync(path, 'utf8')
  const after = before.replace(pattern, replacement)
  if (after === before) throw new Error(`could not apply ${label} in ${path}`)
  fs.writeFileSync(path, after)
}

rewrite(
  'functions/api/_lib/campaignSignatures.js',
  /export async function ensureCampaignSignatureTables\(db\) \{[\s\S]*?\n\}\n\nexport async function ensureSignatureForm/,
  `export async function ensureCampaignSignatureTables(db) {
  const statements = [
    \`CREATE TABLE IF NOT EXISTS campaign_signature_forms (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL DEFAULT '',
      intro TEXT NOT NULL DEFAULT '',
      config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(campaign_id)
    )\`,
    \`CREATE TABLE IF NOT EXISTS campaign_signatures (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      signer_type TEXT NOT NULL DEFAULT 'individual',
      display_name TEXT NOT NULL DEFAULT '',
      affiliation TEXT NOT NULL DEFAULT '',
      organization_name TEXT NOT NULL DEFAULT '',
      contact_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      public_statement TEXT NOT NULL DEFAULT '',
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
    )\`,
    \`CREATE TABLE IF NOT EXISTS campaign_signature_rate_limits (
      key_hash TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      window_started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE INDEX IF NOT EXISTS idx_campaign_signatures_campaign_status ON campaign_signatures(campaign_id, status, created_at DESC)\`,
    \`CREATE INDEX IF NOT EXISTS idx_campaign_signatures_email_hash ON campaign_signatures(campaign_id, email_hash, created_at DESC)\`,
    \`CREATE INDEX IF NOT EXISTS idx_campaign_signatures_verify ON campaign_signatures(verification_token_hash)\`,
    \`CREATE INDEX IF NOT EXISTS idx_campaign_signatures_manage ON campaign_signatures(management_token_hash)\`,
  ]
  for (const sql of statements) await db.prepare(sql).run()
  const migrations = [
    "ALTER TABLE campaign_signatures ADD COLUMN public_statement TEXT NOT NULL DEFAULT ''",
    'ALTER TABLE campaign_signatures ADD COLUMN management_token_hash TEXT',
    'ALTER TABLE campaign_signatures ADD COLUMN management_created_at TEXT',
    'ALTER TABLE campaign_signatures ADD COLUMN published_at TEXT',
    'ALTER TABLE campaign_signatures ADD COLUMN revoked_at TEXT',
    "ALTER TABLE campaign_signatures ADD COLUMN moderation_note TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE campaign_signatures ADD COLUMN duplicate_flags_json TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE campaign_signatures ADD COLUMN abuse_flags_json TEXT NOT NULL DEFAULT '[]'",
    'ALTER TABLE campaign_signatures ADD COLUMN website_domain_match INTEGER',
  ]
  for (const sql of migrations) {
    try { await db.prepare(sql).run() } catch { /* column already exists */ }
  }
}

export async function ensureSignatureForm`,
  'signature schema migration',
)

rewrite(
  'functions/api/_lib/campaignSignatures.js',
  /export async function resendVerification\(db, signatureId\) \{[\s\S]*?\n\}\n\nexport async function getManagedSignature/,
  `export async function resendVerification(db, signatureId) {
  await ensureCampaignSignatureTables(db)
  const row = await db.prepare(\`SELECT * FROM campaign_signatures WHERE id = ? AND status = 'pending_email' LIMIT 1\`).bind(signatureId).first()
  if (!row) throw httpError('Signature is not awaiting verification.', 400)
  const token = randomSecret(32)
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString()
  const verificationTokenHash = await sha256(token)
  await db.prepare('UPDATE campaign_signatures SET verification_token_hash = ?, verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(verificationTokenHash, expiresAt, row.id).run()
  return {
    signature: privateRow(row),
    verificationToken: token,
    expiresAt,
    previousVerificationTokenHash: row.verification_token_hash || null,
    previousVerificationExpiresAt: row.verification_expires_at || null,
  }
}

export async function restoreVerificationAfterDeliveryFailure(db, signatureId, previousTokenHash, previousExpiresAt) {
  await ensureCampaignSignatureTables(db)
  await db.prepare(\`UPDATE campaign_signatures SET verification_token_hash = ?, verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending_email'\`)
    .bind(previousTokenHash || null, previousExpiresAt || null, signatureId).run()
}

export async function getManagedSignature`,
  'resend rollback',
)

rewrite(
  'functions/api/_lib/campaignSignatures.js',
  /export async function updateManagedSignature\(db, token, patch = \{\}\) \{([\s\S]*?)  const now = new Date\(\)\.toISOString\(\)/,
  (match, body) => `export async function updateManagedSignature(db, token, patch = {}) {${body}  if (row.signer_type === 'individual' && !displayName) throw httpError('Display name is required.', 400)\n  if (row.signer_type === 'organization' && !organizationName) throw httpError('Organization name is required.', 400)\n  const now = new Date().toISOString()`,
  'managed signer validation',
)

rewrite(
  'functions/api/_lib/campaignSignatures.js',
  /export async function sendSignatureEmail\(env, \{ to, subject, text, html = '' \}\) \{[\s\S]*?\n\}\n\nexport function signaturePublicDisplay/,
  `export async function sendSignatureEmail(env, { to, subject, text, html = '' }) {
  const from = String(env.SIGNATURE_EMAIL_FROM || '').trim()
  if (!from) throw emailTransportError('SIGNATURE_EMAIL_FROM is not configured', 503)
  if (env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: \`Bearer \${env.RESEND_API_KEY}\`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }) })
    if (!response.ok) throw await providerResponseError('resend', response)
    return { sent: true, provider: 'resend' }
  }
  if (env.SIGNATURE_EMAIL_WEBHOOK) {
    const response = await fetch(env.SIGNATURE_EMAIL_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json', ...(env.SIGNATURE_EMAIL_WEBHOOK_TOKEN ? { authorization: \`Bearer \${env.SIGNATURE_EMAIL_WEBHOOK_TOKEN}\` } : {}) }, body: JSON.stringify({ from, to, subject, text, html }) })
    if (!response.ok) throw await providerResponseError('webhook', response)
    return { sent: true, provider: 'webhook' }
  }
  if (String(env.SIGNATURE_EMAIL_PROVIDER || '').toLowerCase() === 'mailchannels') {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: parseFrom(from), subject, content: [{ type: 'text/plain', value: text }, ...(html ? [{ type: 'text/html', value: html }] : [])] }) })
    if (!response.ok) throw await providerResponseError('mailchannels', response)
    return { sent: true, provider: 'mailchannels' }
  }
  throw emailTransportError('signature email transport is not configured; set RESEND_API_KEY and SIGNATURE_EMAIL_FROM', 503)
}

async function providerResponseError(provider, response) {
  let detail = ''
  try { detail = clean(await response.text(), 500) } catch {}
  return emailTransportError(\`${provider} email delivery failed (\${response.status})\${detail ? \`: \${detail}\` : ''}\`, 502)
}

function emailTransportError(message, status = 502) {
  const error = new Error(message)
  error.status = status
  error.code = 'SIGNATURE_EMAIL_DELIVERY_FAILED'
  return error
}

export function signaturePublicDisplay`,
  'email transport errors',
)

rewrite(
  'functions/api/campaign-signatures.js',
  /  resendVerification,\n  sendSignatureEmail,/,
  `  resendVerification,\n  restoreVerificationAfterDeliveryFailure,\n  sendSignatureEmail,`,
  'restore import',
)

rewrite(
  'functions/api/campaign-signatures.js',
  /    if \(action === 'resend'\) \{[\s\S]*?\n    \}\n    if \(action === 'configure'\)/,
  `    if (action === 'resend') {
      const result = await resendVerification(db, String(body.id || ''))
      const origin = new URL(context.request.url).origin
      const verifyUrl = \`${origin}/api/campaign-signatures?action=verify&token=\${encodeURIComponent(result.verificationToken)}\`
      try {
        await sendSignatureEmail(context.env, { to: result.signature.email, subject: \`Verify your signature: \${campaign.shortTitle || campaign.title}\`, text: \`Verify your email address here:\\n\\n\${verifyUrl}\\n\\nThis only verifies the email address. A moderator must still approve publication.\` })
      } catch (emailError) {
        await restoreVerificationAfterDeliveryFailure(db, result.signature.id, result.previousVerificationTokenHash, result.previousVerificationExpiresAt).catch(() => {})
        console.error('signature verification resend failed', { code: emailError?.code || '', status: emailError?.status || 0, message: String(emailError?.message || emailError) })
        const error = new Error('The verification email could not be resent. Your previous verification link remains valid if it had not expired.')
        error.status = 503
        throw error
      }
      return json({ ok: true })
    }
    if (action === 'configure')`,
  'resend route',
)

rewrite(
  'functions/api/campaign-signatures.js',
  /async function handleVerify\(context, db, url\) \{[\s\S]*?\n\}\n\nasync function handleManageGet/,
  `async function handleVerify(context, db, url) {
  const token = String(url.searchParams.get('token') || '')
  const item = await verifySignature(db, token)
  const campaign = await getCampaign(db, item.campaignId)
  let managementEmailSent = true
  if (item.email) {
    const origin = new URL(context.request.url).origin
    const manageUrl = \`${origin}/campaigns/\${campaign?.slug || ''}#manage-signature=\${encodeURIComponent(item.managementToken || '')}\`
    try {
      await sendSignatureEmail(context.env, {
        to: item.email,
        subject: \`Signature verified: \${campaign?.shortTitle || campaign?.title || 'Sabot open letter'}\`,
        text: \`Your email address is verified. Your signature is now awaiting moderation and is not public yet.\\n\\nPrivate management link (keep this link private):\\n\${manageUrl}\`,
      })
    } catch (emailError) {
      managementEmailSent = false
      console.error('signature management email delivery failed', { code: emailError?.code || '', status: emailError?.status || 0, message: String(emailError?.message || emailError) })
    }
  }
  const target = campaign?.slug
    ? (managementEmailSent ? \`/campaigns/\${campaign.slug}?signature=verified#signatories\` : \`/campaigns/\${campaign.slug}?signature=verified#manage-signature=\${encodeURIComponent(item.managementToken || '')}\`)
    : '/campaigns'
  return Response.redirect(new URL(target, context.request.url).toString(), 303)
}

async function handleManageGet`,
  'management fallback',
)

rewrite(
  'functions/api/campaign-signatures.js',
  /if \(status === 503 && String\(error\?\.message \|\| ''\)\.includes\('verification email'\)\)/,
  `if (status === 503 && /verification email/i.test(String(error?.message || '')))`,
  'safe 503 response',
)

rewrite(
  'tests/campaign-signatures-and-translation.test.mjs',
  /test\('organization domain comparison is only a signal and handles common host variants'/,
  `test('signature schema upgrades cover older deployed tables', () => {
  assert.match(signatureLib, /const migrations = \\[/)
  assert.match(signatureLib, /ADD COLUMN management_token_hash/)
  assert.match(signatureLib, /ADD COLUMN duplicate_flags_json/)
  assert.match(signatureLib, /ADD COLUMN website_domain_match/)
})

test('verification resend preserves the prior token if delivery fails', () => {
  assert.match(signatureLib, /previousVerificationTokenHash/)
  assert.match(signatureLib, /restoreVerificationAfterDeliveryFailure/)
  assert.match(signatureApi, /Your previous verification link remains valid/)
})

test('management token survives a post-verification mail failure in the URL fragment', () => {
  assert.match(signatureApi, /managementEmailSent/)
  assert.match(signatureApi, /signature=verified#manage-signature=/)
})

test('resend email configuration uses explicit sender configuration', () => {
  assert.match(signatureLib, /SIGNATURE_EMAIL_FROM is not configured/)
  assert.match(signatureLib, /RESEND_API_KEY and SIGNATURE_EMAIL_FROM/)
  assert.doesNotMatch(signatureLib, /Sabot Media <info@sabot.media>/)
})

test('organization domain comparison is only a signal and handles common host variants'`,
  'signature failure tests',
)

console.log('signature stabilization patch applied')
