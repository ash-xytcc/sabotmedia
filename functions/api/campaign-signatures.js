import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { getCampaign } from './_lib/campaigns.js'
import { extractAiLetterSignatories } from './_lib/aiCampaignPublic.js'
import {
  bulkModerateSignatures,
  ensureSignatureForm,
  exportSignaturesCsv,
  getManagedSignature,
  getSignatureForm,
  importManualSignatories,
  listModerationQueue,
  listPublicSignatures,
  moderateSignature,
  sendSignatureEmail,
  submitSignature,
  updateManagedSignature,
  verifySignature,
} from './_lib/campaignSignatures.js'
import { ensureCampaignSignatureRuntimeSchema } from './_lib/campaignSignatureRuntimeSchema.js'
import { getNativeEntry } from './_lib/nativePublicContent.js'
import { signatureSeedsForCampaign } from './_lib/bundledCampaignSignatureSeeds.js'

const AI_SLUG = 'autistici-inventati'

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: baseHeaders() })
}

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign signatures')
    await ensureCampaignSignatureRuntimeSchema(db)
    const url = new URL(context.request.url)
    const action = String(url.searchParams.get('action') || 'public')

    if (action === 'verify') return handleVerify(context, db, url)
    if (action === 'manage') return handleManageGet(db, url)

    const campaign = await resolveCampaign(db, url.searchParams.get('campaign'))
    if (!campaign) return json({ ok: false, error: 'campaign not found' }, 404)
    await bootstrapCampaign(db, campaign)

    if (action === 'public') {
      const form = await getSignatureForm(db, campaign.id)
      const signatures = await listPublicSignatures(db, campaign.id)
      return json({ ok: true, form, ...signatures })
    }

    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: 'authentication required' }, 403)

    if (action === 'queue') {
      const status = String(url.searchParams.get('status') || 'all')
      const items = await listModerationQueue(db, campaign.id, status)
      return json({ ok: true, items })
    }
    if (action === 'export') {
      const csv = await exportSignaturesCsv(db, campaign.id)
      return new Response(csv, { status: 200, headers: { ...baseHeaders(), 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${campaign.slug}-signatures.csv"` } })
    }
    return json({ ok: false, error: 'unknown action' }, 400)
  } catch (error) {
    return json({ ok: false, error: publicError(error) }, Number(error?.status || 500))
  }
}

export async function onRequestPost(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign signatures')
    await ensureCampaignSignatureRuntimeSchema(db)
    const url = new URL(context.request.url)
    const action = String(url.searchParams.get('action') || 'submit')
    const body = await context.request.json().catch(() => ({}))

    if (action === 'manage') return handleManagePost(db, body)

    const campaign = await resolveCampaign(db, body.campaign || url.searchParams.get('campaign'))
    if (!campaign) return json({ ok: false, error: 'campaign not found' }, 404)
    await bootstrapCampaign(db, campaign)

    if (action === 'submit') {
      if (!sameOrigin(context.request)) return json({ ok: false, error: 'invalid request origin' }, 403)
      const result = await submitSignature(db, campaign, body, {
        ip: context.request.headers.get('cf-connecting-ip') || '',
        rateSalt: String(context.env.SIGNATURE_RATE_SALT || context.env.PUBLIC_SITE_SECRET || 'sabot-signatures'),
      })
      if (!result.suppressed) {
        const origin = new URL(context.request.url).origin
        const verifyUrl = `${origin}/api/campaign-signatures?action=verify&token=${encodeURIComponent(result.verificationToken)}`
        try {
          await deliverSignatureEmail(context.env, {
            to: result.email,
            subject: `Verify your signature: ${campaign.shortTitle || campaign.title}`,
            text: `Thanks for signing. Verify control of this email address here:\n\n${verifyUrl}\n\nVerification does not publish your signature. After verification it goes to the Sabot moderation queue.`,
          })
        } catch (emailError) {
          await db.prepare(`DELETE FROM campaign_signatures WHERE id = ? AND status = 'pending_email'`).bind(result.id).run().catch(() => {})
          throw serviceError('We could not send the verification email. Please try again shortly.', emailError)
        }
      }
      return json({ ok: true, message: 'Check the email address you submitted for a verification link.' }, 202)
    }

    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: 'authentication required' }, 403)
    if (!sameOrigin(context.request)) return json({ ok: false, error: 'invalid request origin' }, 403)

    if (action === 'moderate') {
      const item = await moderateSignature(db, String(body.id || ''), String(body.moderationAction || ''), body.patch || {})
      if (body.moderationAction === 'approve' && item.email) {
        const origin = new URL(context.request.url).origin
        await deliverSignatureEmail(context.env, {
          to: item.email,
          subject: `Your signature is published: ${campaign.shortTitle || campaign.title}`,
          text: `Your signature has been approved and added to the open letter.\n\n${origin}/campaigns/${campaign.slug}#signatories`,
        }).catch(() => {})
      }
      return json({ ok: true, item })
    }
    if (action === 'bulk') {
      const results = await bulkModerateSignatures(db, Array.isArray(body.ids) ? body.ids : [], String(body.moderationAction || ''))
      return json({ ok: true, results })
    }
    if (action === 'resend') {
      await resendVerificationSafely(context, db, campaign, String(body.id || ''))
      return json({ ok: true })
    }
    if (action === 'configure') {
      const form = await ensureSignatureForm(db, campaign, body.form || {})
      return json({ ok: true, form })
    }
    return json({ ok: false, error: 'unknown action' }, 400)
  } catch (error) {
    return json({ ok: false, error: publicError(error) }, Number(error?.status || 500))
  }
}

async function handleVerify(context, db, url) {
  const token = String(url.searchParams.get('token') || '')
  const item = await verifySignature(db, token)
  const campaign = await getCampaign(db, item.campaignId)
  let managementDelivered = false
  if (item.email && item.managementToken) {
    const origin = new URL(context.request.url).origin
    const manageUrl = `${origin}/campaigns/${campaign?.slug || ''}#manage-signature=${encodeURIComponent(item.managementToken)}`
    try {
      managementDelivered = await deliverSignatureEmail(context.env, {
        to: item.email,
        subject: `Signature verified: ${campaign?.shortTitle || campaign?.title || 'Sabot open letter'}`,
        text: `Your email address is verified. Your signature is now awaiting moderation and is not public yet.\n\nPrivate management link (keep this link private):\n${manageUrl}`,
      })
    } catch {
      managementDelivered = false
    }
  }
  if (campaign?.slug && item.managementToken && !managementDelivered) {
    const target = `/campaigns/${campaign.slug}?signature=verified&management=shown#manage-signature=${encodeURIComponent(item.managementToken)}`
    return Response.redirect(new URL(target, context.request.url).toString(), 303)
  }
  const target = campaign?.slug ? `/campaigns/${campaign.slug}?signature=verified#signatories` : '/campaigns'
  return Response.redirect(new URL(target, context.request.url).toString(), 303)
}

async function handleManageGet(db, url) {
  const token = String(url.searchParams.get('token') || '')
  const item = await getManagedSignature(db, token)
  return json({ ok: true, item })
}

async function handleManagePost(db, body) {
  const patch = body.patch || {}
  if (Object.hasOwn(patch, 'displayName') && !String(patch.displayName || '').trim()) return json({ ok: false, error: 'display name is required' }, 400)
  if (Object.hasOwn(patch, 'organizationName') && !String(patch.organizationName || '').trim()) return json({ ok: false, error: 'organization name is required' }, 400)
  const item = await updateManagedSignature(db, String(body.token || ''), patch)
  return json({ ok: true, item })
}

async function resendVerificationSafely(context, db, campaign, signatureId) {
  const signature = await db.prepare(`SELECT id, email, status FROM campaign_signatures WHERE id = ? AND campaign_id = ? LIMIT 1`).bind(signatureId, campaign.id).first()
  if (!signature || signature.status !== 'pending_email' || !signature.email) {
    const error = new Error('signature is not awaiting verification')
    error.status = 400
    throw error
  }

  const verificationToken = secureToken()
  const verificationHash = await sha256(verificationToken)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const origin = new URL(context.request.url).origin
  const verifyUrl = `${origin}/api/campaign-signatures?action=verify&token=${encodeURIComponent(verificationToken)}`

  try {
    await deliverSignatureEmail(context.env, {
      to: signature.email,
      subject: `Verify your signature: ${campaign.shortTitle || campaign.title}`,
      text: `Verify your email address here:\n\n${verifyUrl}\n\nThis only verifies the email address. A moderator must still approve publication.`,
    })
  } catch (emailError) {
    throw serviceError('We could not send the verification email. Your previous verification link is still valid.', emailError)
  }

  const result = await db.prepare(`UPDATE campaign_signatures SET verification_token_hash = ?, verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND campaign_id = ? AND status = 'pending_email'`).bind(verificationHash, expiresAt, signature.id, campaign.id).run()
  if (!Number(result?.meta?.changes || 0)) throw serviceError('The new verification link was sent, but the signature changed before it could be activated. Your previous verification link remains valid.')
}

async function deliverSignatureEmail(env, message) {
  if (String(env.SIGNATURE_EMAIL_ALLOW_SKIP || '') === '1') return false
  if (!String(env.RESEND_API_KEY || '').trim()) throw serviceError('Signature email delivery is not configured.')
  if (!String(env.SIGNATURE_EMAIL_FROM || '').trim()) throw serviceError('Signature email sender is not configured.')
  const delivered = await sendSignatureEmail(env, message)
  if (!delivered) throw serviceError('Signature email delivery is not configured.')
  return true
}

function secureToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
function serviceError(message, cause) {
  const error = new Error(message)
  error.status = 503
  if (cause) error.cause = cause
  return error
}
async function resolveCampaign(db, value) {
  const key = String(value || AI_SLUG).trim()
  return getCampaign(db, key)
}

async function bootstrapCampaign(db, campaign) {
  if (campaign.slug !== AI_SLUG) return
  await ensureSignatureForm(db, campaign, {
    enabled: true,
    title: 'Sign the open letter',
    intro: 'Email verification confirms control of your address. Every verified signature is reviewed by Sabot before publication.',
    config: { allowIndividuals: true, allowOrganizations: true, showAffiliation: true },
  })
  await importManualSignatories(db, campaign.id, signatureSeedsForCampaign(campaign.slug))
  try {
    const letter = await getNativeEntry(db, 'open-letter-ai')
    const legacy = extractAiLetterSignatories(letter?.bodyHtml || letter?.body || '')
    if (legacy.length) await importManualSignatories(db, campaign.id, legacy)
  } catch { /* the bundled manual approvals are already preserved */ }
}

function sameOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try { return new URL(origin).origin === new URL(request.url).origin } catch { return false }
}
function publicError(error) {
  const status = Number(error?.status || 500)
  if (status === 503 && String(error?.message || '').includes('verification email')) return String(error.message)
  if (status === 503 && String(error?.message || '').includes('Signature email')) return String(error.message)
  if (status >= 500) return 'The signing service is temporarily unavailable.'
  return String(error?.message || error)
}
function baseHeaders() { return { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } }
function json(data, status = 200) { return new Response(JSON.stringify(data, null, 2), { status, headers: { ...baseHeaders(), 'content-type': 'application/json; charset=utf-8' } }) }
