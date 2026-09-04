import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const route = fs.readFileSync(new URL('../functions/api/campaign-signatures.js', import.meta.url), 'utf8')
const schema = fs.readFileSync(new URL('../functions/api/_lib/campaignSignatureRuntimeSchema.js', import.meta.url), 'utf8')

test('verification resend preserves the previous token until delivery succeeds', () => {
  const sendAt = route.indexOf('await deliverSignatureEmail(context.env', route.indexOf('async function resendVerificationSafely'))
  const updateAt = route.indexOf('UPDATE campaign_signatures SET verification_token_hash', route.indexOf('async function resendVerificationSafely'))
  assert.ok(sendAt > -1)
  assert.ok(updateAt > sendAt)
  assert.match(route, /Your previous verification link is still valid\./)
})

test('management delivery has an in-browser private fallback', () => {
  assert.match(route, /managementDelivered = await deliverSignatureEmail/)
  assert.match(route, /#manage-signature=\$\{encodeURIComponent\(item\.managementToken\)\}/)
  assert.match(route, /management=shown/)
})

test('signature mail requires explicit provider and sender configuration', () => {
  assert.match(route, /env\.RESEND_API_KEY/)
  assert.match(route, /env\.SIGNATURE_EMAIL_FROM/)
  assert.match(route, /SIGNATURE_EMAIL_ALLOW_SKIP/)
  assert.doesNotMatch(route, /console\.(info|log).*signature/i)
})

test('managed identity fields cannot be explicitly blanked', () => {
  assert.match(route, /display name is required/)
  assert.match(route, /organization name is required/)
})

test('runtime signature migration covers canonical lifecycle columns and indexes', () => {
  for (const column of [
    'signer_type', 'display_name', 'organization_name', 'public_statement', 'email_hash', 'status',
    'verification_token_hash', 'verification_expires_at', 'verified_at', 'management_token_hash',
    'management_created_at', 'published_at', 'revoked_at', 'moderation_note', 'duplicate_flags_json',
    'abuse_flags_json', 'website_domain_match', 'created_at', 'updated_at',
  ]) assert.match(schema, new RegExp(`\\['${column}'`))
  assert.match(schema, /PRAGMA table_info\(campaign_signatures\)/)
  assert.match(schema, /CREATE INDEX IF NOT EXISTS idx_campaign_signatures_verify/)
  assert.match(schema, /CREATE INDEX IF NOT EXISTS idx_campaign_signatures_manage/)
})
