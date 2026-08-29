import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { writeAuditLog, inferActorFromRequest } from './_lib/auditLog.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { decorateAiCampaignForPublic, extractAiLetterSignatories } from './_lib/aiCampaignPublic.js'
import { getNativeEntry } from './_lib/nativePublicContent.js'
import {
  AI_CAMPAIGN_SLUG,
  ensureAiCampaign,
  getCampaign,
  listCampaigns,
  normalizeCampaign,
  upsertCampaign,
} from './_lib/campaigns.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)
  return json({
    ok: true,
    canEdit: permission.canEdit,
    authMode: permission.mode,
    mode: getBoundDb(context) ? 'd1' : 'unavailable',
  })
}

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign reads')

    const permission = await resolvePublicSitePermission(context)
    const url = new URL(context.request.url)
    const slug = String(url.searchParams.get('slug') || '')
    const id = String(url.searchParams.get('id') || '')
    const includeDrafts = permission.canEdit && url.searchParams.get('includeDrafts') === '1'

    await ensureAiCampaign(db)

    if (slug || id) {
      const item = await getCampaign(db, slug || id)
      if (!item || (!includeDrafts && item.status !== 'published')) return json({ ok: true, mode: 'd1', item: null })
      // Public reads get live social + the bundled campaign art pack. Admin reads
      // stay persistence-only so transient network content can never be saved back
      // into D1 by accident.
      let signatories = []
      if (!includeDrafts && item.slug === AI_CAMPAIGN_SLUG) {
        try {
          const letter = await getNativeEntry(db, 'open-letter-ai')
          signatories = extractAiLetterSignatories(letter?.bodyHtml || letter?.body || '')
        } catch { /* the bundled public snapshot remains available */ }
      }
      const output = includeDrafts ? item : await decorateAiCampaignForPublic(item, context.request.url, { signatories })
      return json({ ok: true, mode: 'd1', item: output })
    }

    const items = await listCampaigns(db, { includeDrafts })
    return json({ ok: true, mode: 'd1', items })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) { return handleWrite(context) }
export async function onRequestPut(context) { return handleWrite(context) }

async function handleWrite(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'authentication required', canEdit: false }, 403)

    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign writes')

    const body = await context.request.json()
    const incoming = body?.item || body || {}
    const item = normalizeCampaign({
      ...incoming,
      slug: incoming.slug || AI_CAMPAIGN_SLUG,
    })

    if (!item.title || !item.slug) return json({ ok: false, error: 'missing campaign title or slug' }, 400)

    const saved = await upsertCampaign(db, item)
    await writeAuditLog(db, {
      action: 'campaigns.upsert',
      entityType: 'campaign',
      entityId: saved.id,
      actor: inferActorFromRequest(context.request),
      detail: {
        slug: saved.slug,
        status: saved.status,
        campaignStatus: saved.campaignStatus,
        updates: saved.updates.length,
        resources: saved.resources.length,
        social: saved.social.length,
        graphics: saved.graphics.length,
      },
    })

    return json({ ok: true, mode: 'd1', item: saved })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
