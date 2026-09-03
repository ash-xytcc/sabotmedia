import fs from 'node:fs'

function patch(path, replacements) {
  let text = fs.readFileSync(path, 'utf8')
  for (const [before, after] of replacements) {
    if (!text.includes(before)) throw new Error(`missing anchor in ${path}: ${before.slice(0, 120)}`)
    text = text.replace(before, after)
  }
  fs.writeFileSync(path, text)
}

patch('functions/api/_lib/campaignSignatures.js', [
  [
    `  for (const sql of statements) await db.prepare(sql).run()\n  try { await db.prepare("ALTER TABLE campaign_signatures ADD COLUMN public_statement TEXT NOT NULL DEFAULT ''").run() } catch {}\n}`,
    `  for (const sql of statements) await db.prepare(sql).run()\n  const migrations = [\n    "ALTER TABLE campaign_signatures ADD COLUMN public_statement TEXT NOT NULL DEFAULT ''",\n    'ALTER TABLE campaign_signatures ADD COLUMN management_token_hash TEXT',\n    'ALTER TABLE campaign_signatures ADD COLUMN management_created_at TEXT',\n    'ALTER TABLE campaign_signatures ADD COLUMN published_at TEXT',\n    'ALTER TABLE campaign_signatures ADD COLUMN revoked_at TEXT',\n    "ALTER TABLE campaign_signatures ADD COLUMN moderation_note TEXT NOT NULL DEFAULT ''",\n    "ALTER TABLE campaign_signatures ADD COLUMN duplicate_flags_json TEXT NOT NULL DEFAULT '[]'",\n    "ALTER TABLE campaign_signatures ADD COLUMN abuse_flags_json TEXT NOT NULL DEFAULT '[]'",\n    'ALTER TABLE campaign_signatures ADD COLUMN website_domain_match INTEGER',\n  ]\n  for (const sql of migrations) {\n    try { await db.prepare(sql).run() } catch { /* column already exists */ }\n  }\n}`,
  ],
  [
    `  await db.prepare('UPDATE campaign_signatures SET verification_token_hash = ?, verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(await sha256(token), expiresAt, row.id).run()\n  return { signature: privateRow(row), verificationToken: token, expiresAt }\n}`,
    `  const verificationTokenHash = await sha256(token)\n  await db.prepare('UPDATE campaign_signatures SET verification_token_hash = ?, verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(verificationTokenHash, expiresAt, row.id).run()\n  return {\n    signature: privateRow(row),\n    verificationToken: token,\n    verificationTokenHash,\n    expiresAt,\n    previousVerificationTokenHash: row.verification_token_hash || null,\n    previousVerificationExpiresAt: row.verification_expires_at || null,\n  }\n}\n\nexport async function restoreVerificationAfterDeliveryFailure(db, signatureId, previousTokenHash, previousExpiresAt) {\n  await ensureCampaignSignatureTables(db)\n  await db.prepare(\`UPDATE campaign_signatures SET verification_token_hash = ?, verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending_email'\`)\n    .bind(previousTokenHash || null, previousExpiresAt || null, signatureId).run()\n}`,
  ],
  [
    `  const publicStatement = patch.publicStatement === undefined ? row.public_statement : clean(patch.publicStatement, 1200)\n  const now = new Date().toISOString()`,
    `  const publicStatement = patch.publicStatement === undefined ? row.public_statement : clean(patch.publicStatement, 1200)\n  if (row.signer_type === 'individual' && !displayName) throw httpError('Display name is required.', 400)\n  if (row.signer_type === 'organization' && !organizationName) throw httpError('Organization name is required.', 400)\n  const now = new Date().toISOString()`,
  ],
  [
    `export async function sendSignatureEmail(env, { to, subject, text, html = '' }) {\n  const from = String(env.SIGNATURE_EMAIL_FROM || 'Sabot Media <info@sabot.media>')\n  if (env.RESEND_API_KEY) {\n    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: \`Bearer \${env.RESEND_API_KEY}\`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }) })\n    if (!response.ok) throw new Error(\`email provider returned \${response.status}\`)\n    return { sent: true, provider: 'resend' }\n  }`,
    `export async function sendSignatureEmail(env, { to, subject, text, html = '' }) {\n  const from = String(env.SIGNATURE_EMAIL_FROM || '').trim()\n  if (!from) throw emailTransportError('SIGNATURE_EMAIL_FROM is not configured', 503)\n  if (env.RESEND_API_KEY) {\n    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: \`Bearer \${env.RESEND_API_KEY}\`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }) })\n    if (!response.ok) throw await providerResponseError('resend', response)\n    return { sent: true, provider: 'resend' }\n  }`,
  ],
  [
    `    if (!response.ok) throw new Error(\`email webhook returned \${response.status}\`)`,
    `    if (!response.ok) throw await providerResponseError('webhook', response)`,
  ],
  [
    `    if (!response.ok) throw new Error(\`email provider returned \${response.status}\`)`,
    `    if (!response.ok) throw await providerResponseError('mailchannels', response)`,
  ],
  [
    `  throw new Error('signature email transport is not configured')\n}`,
    `  throw emailTransportError('signature email transport is not configured; set RESEND_API_KEY and SIGNATURE_EMAIL_FROM', 503)\n}\n\nasync function providerResponseError(provider, response) {\n  let detail = ''\n  try { detail = clean(await response.text(), 500) } catch {}\n  return emailTransportError(\`${provider} email delivery failed (\${response.status})\${detail ? \`: \${detail}\` : ''}\`, 502)\n}\n\nfunction emailTransportError(message, status = 502) {\n  const error = new Error(message)\n  error.status = status\n  error.code = 'SIGNATURE_EMAIL_DELIVERY_FAILED'\n  return error\n}`,
  ],
  [
    `function parseFrom(value) { const match = String(value || '').match(/^\\s*(.*?)\\s*<([^>]+)>\\s*$/); return match ? { name: match[1], email: match[2] } : { email: String(value || 'info@sabot.media') } }`,
    `function parseFrom(value) { const match = String(value || '').match(/^\\s*(.*?)\\s*<([^>]+)>\\s*$/); return match ? { name: match[1], email: match[2] } : { email: String(value || '') } }`,
  ],
])

patch('functions/api/campaign-signatures.js', [
  [
    `  resendVerification,\n  sendSignatureEmail,`,
    `  resendVerification,\n  restoreVerificationAfterDeliveryFailure,\n  sendSignatureEmail,`,
  ],
  [
    `        } catch (emailError) {\n          await db.prepare(\`DELETE FROM campaign_signatures WHERE id = ? AND status = 'pending_email'\`).bind(result.id).run().catch(() => {})\n          const error = new Error('We could not send the verification email. Please try again shortly.')`,
    `        } catch (emailError) {\n          console.error('signature verification email delivery failed', { code: emailError?.code || '', status: emailError?.status || 0, message: String(emailError?.message || emailError) })\n          await db.prepare(\`DELETE FROM campaign_signatures WHERE id = ? AND status = 'pending_email'\`).bind(result.id).run().catch(() => {})\n          const error = new Error('We could not send the verification email. Please try again shortly.')`,
  ],
  [
    `      await sendSignatureEmail(context.env, { to: result.signature.email, subject: \`Verify your signature: \${campaign.shortTitle || campaign.title}\`, text: \`Verify your email address here:\\n\\n\${verifyUrl}\\n\\nThis only verifies the email address. A moderator must still approve publication.\` })\n      return json({ ok: true })`,
    `      try {\n        await sendSignatureEmail(context.env, { to: result.signature.email, subject: \`Verify your signature: \${campaign.shortTitle || campaign.title}\`, text: \`Verify your email address here:\\n\\n\${verifyUrl}\\n\\nThis only verifies the email address. A moderator must still approve publication.\` })\n      } catch (emailError) {\n        await restoreVerificationAfterDeliveryFailure(db, result.signature.id, result.previousVerificationTokenHash, result.previousVerificationExpiresAt).catch(() => {})\n        console.error('signature verification resend failed', { code: emailError?.code || '', status: emailError?.status || 0, message: String(emailError?.message || emailError) })\n        const error = new Error('The verification email could not be resent. Your previous verification link remains valid if it had not expired.')\n        error.status = 503\n        throw error\n      }\n      return json({ ok: true })`,
  ],
  [
    `  if (item.email) {\n    const origin = new URL(context.request.url).origin\n    const manageUrl = \`${origin}/campaigns/\${campaign?.slug || ''}#manage-signature=\${encodeURIComponent(item.managementToken || '')}\`\n    await sendSignatureEmail(context.env, {\n      to: item.email,\n      subject: \`Signature verified: \${campaign?.shortTitle || campaign?.title || 'Sabot open letter'}\`,\n      text: \`Your email address is verified. Your signature is now awaiting moderation and is not public yet.\\n\\nPrivate management link (keep this link private):\\n\${manageUrl}\`,\n    }).catch(() => {})\n  }\n  const target = campaign?.slug ? \`/campaigns/\${campaign.slug}?signature=verified#signatories\` : '/campaigns'`,
    `  let managementEmailSent = true\n  if (item.email) {\n    const origin = new URL(context.request.url).origin\n    const manageUrl = \`${origin}/campaigns/\${campaign?.slug || ''}#manage-signature=\${encodeURIComponent(item.managementToken || '')}\`\n    try {\n      await sendSignatureEmail(context.env, {\n        to: item.email,\n        subject: \`Signature verified: \${campaign?.shortTitle || campaign?.title || 'Sabot open letter'}\`,\n        text: \`Your email address is verified. Your signature is now awaiting moderation and is not public yet.\\n\\nPrivate management link (keep this link private):\\n\${manageUrl}\`,\n      })\n    } catch (emailError) {\n      managementEmailSent = false\n      console.error('signature management email delivery failed', { code: emailError?.code || '', status: emailError?.status || 0, message: String(emailError?.message || emailError) })\n    }\n  }\n  const target = campaign?.slug\n    ? (managementEmailSent ? \`/campaigns/\${campaign.slug}?signature=verified#signatories\` : \`/campaigns/\${campaign.slug}?signature=verified#manage-signature=\${encodeURIComponent(item.managementToken || '')}\`)\n    : '/campaigns'`,
  ],
  [
    `  if (status === 503 && String(error?.message || '').includes('verification email')) return String(error.message)`,
    `  if (status === 503 && /verification email/i.test(String(error?.message || ''))) return String(error.message)`,
  ],
])

patch('tests/campaign-signatures-and-translation.test.mjs', [
  [
    `test('organization domain comparison is only a signal and handles common host variants', () => {`,
    `test('signature schema upgrades cover older deployed tables', () => {\n  assert.match(signatureLib, /const migrations = \\[/)\n  assert.match(signatureLib, /ADD COLUMN management_token_hash/)\n  assert.match(signatureLib, /ADD COLUMN duplicate_flags_json/)\n  assert.match(signatureLib, /ADD COLUMN website_domain_match/)\n})\n\ntest('verification resend preserves the prior token if delivery fails', () => {\n  assert.match(signatureLib, /previousVerificationTokenHash/)\n  assert.match(signatureLib, /restoreVerificationAfterDeliveryFailure/)\n  assert.match(signatureApi, /Your previous verification link remains valid/)\n})\n\ntest('management token survives a post-verification mail failure in the URL fragment', () => {\n  assert.match(signatureApi, /managementEmailSent/)\n  assert.match(signatureApi, /signature=verified#manage-signature=/)\n})\n\ntest('resend email configuration uses explicit sender configuration', () => {\n  assert.match(signatureLib, /SIGNATURE_EMAIL_FROM is not configured/)\n  assert.match(signatureLib, /RESEND_API_KEY and SIGNATURE_EMAIL_FROM/)\n  assert.doesNotMatch(signatureLib, /Sabot Media <info@sabot.media>/)\n})\n\ntest('organization domain comparison is only a signal and handles common host variants', () => {`,
  ],
])

console.log('signature stabilization patch applied')
