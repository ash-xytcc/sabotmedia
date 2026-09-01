import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { getBoundDb, databaseUnavailable } from './_lib/database.js'
import { getCampaign } from './_lib/campaigns.js'
import { contributorFromRequest, createContributor, createMessage, createQuestion, deleteMessage, listContributors, listMessages, listQuestions, patchMessage, patchQuestion, revokeContributor } from './_lib/campaignCorrespondence.js'
import { inferActorFromRequest, writeAuditLog } from './_lib/auditLog.js'

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign correspondence')
    const url = new URL(context.request.url)
    const campaign = await getCampaign(db, url.searchParams.get('campaign') || '')
    if (!campaign) return json({ ok: false, error: 'campaign not found' }, 404)
    const permission = await resolvePublicSitePermission(context)
    const contributor = await contributorFromRequest(db, context.request)
    const contributorSessionSupplied = Boolean(context.request.headers.get('x-sabot-contributor-session') || /^Bearer\s+/i.test(String(context.request.headers.get('authorization') || '')))
    if (permission.canEdit) return json({ ok: true, campaign: publicCampaign(campaign), contributors: await listContributors(db, campaign.id), messages: await listMessages(db, campaign.id), questions: await listQuestions(db, campaign.id) })
    if (contributor?.campaignId === campaign.id) return json({ ok: true, campaign: publicCampaign(campaign), contributor, messages: await listMessages(db, campaign.id) })
    if (contributorSessionSupplied) return json({ ok: false, error: 'Contributor session expired or is invalid. Enter the PIN again.' }, 401)
    return json({ ok: true, campaign: publicCampaign(campaign), messages: await listMessages(db, campaign.id, { publicOnly: true }) })
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 500) }
}

export async function onRequestPost(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign correspondence')
    const body = await context.request.json()
    const campaign = await getCampaign(db, body.campaign || '')
    if (!campaign) return json({ ok: false, error: 'campaign not found' }, 404)
    const permission = await resolvePublicSitePermission(context)
    const contributor = await contributorFromRequest(db, context.request)
    if (body.action === 'question') return json({ ok: true, item: await createQuestion(db, campaign.id, body) }, 201)
    if (body.action === 'contributor') {
      if (!permission.canEdit) return json({ ok: false, error: 'editor access required' }, 403)
      return json({ ok: true, ...(await createContributor(db, campaign.id, body)) }, 201)
    }
    if (body.action === 'message') {
      if (!permission.canEdit && contributor?.campaignId !== campaign.id) return json({ ok: false, error: 'contributor access required' }, 403)
      const item = await createMessage(db, campaign.id, body, permission.canEdit ? { isEditor: true } : { contributorId: contributor.id, permissions: contributor.permissions })
      return json({ ok: true, item }, 201)
    }
    return json({ ok: false, error: 'unsupported action' }, 400)
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, Number(error?.status) || 400) }
}

export async function onRequestPatch(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign correspondence')
    const body = await context.request.json()
    const permission = await resolvePublicSitePermission(context)
    const contributor = await contributorFromRequest(db, context.request)
    if (body.action === 'revoke') {
      if (!permission.canEdit) return json({ ok: false, error: 'editor access required' }, 403)
      return json({ ok: true, item: await revokeContributor(db, body.id, body.revoked !== false) })
    }
    if (body.action === 'question') {
      if (!permission.canEdit) return json({ ok: false, error: 'editor access required' }, 403)
      return json({ ok: true, item: await patchQuestion(db, body.id, body) })
    }
    if (body.action === 'message') {
      if (!permission.canEdit && !contributor) return json({ ok: false, error: 'contributor access required' }, 403)
      const item = await patchMessage(db, body.id, body, permission.canEdit ? { isEditor: true } : { contributorId: contributor.id, permissions: contributor.permissions })
      if (permission.canEdit) await writeAuditLog(db, { action: 'campaign_correspondence.message.update', entityType: 'campaign_message', entityId: item.id, actor: inferActorFromRequest(context.request), detail: { campaignId: item.campaignId, visibility: item.visibility } })
      return json({ ok: true, item })
    }
    return json({ ok: false, error: 'unsupported action' }, 400)
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, Number(error?.status) || 400) }
}

export async function onRequestDelete(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign correspondence')
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: 'editor access required' }, 403)
    const body = await context.request.json()
    if (body.action !== 'message' || !body.id) return json({ ok: false, error: 'unsupported action' }, 400)
    const item = await deleteMessage(db, body.id)
    await writeAuditLog(db, { action: 'campaign_correspondence.message.delete', entityType: 'campaign_message', entityId: item.id, actor: inferActorFromRequest(context.request), detail: { campaignId: item.campaignId, senderRole: item.senderRole, visibility: item.visibility, hadMedia: Boolean(item.mediaUrl) } })
    return json({ ok: true, item })
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, Number(error?.status) || 400) }
}

function publicCampaign(campaign) { return { id: campaign.id, slug: campaign.slug, title: campaign.title, shortTitle: campaign.shortTitle, correspondence: campaign.correspondence || {} } }
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } }) }
