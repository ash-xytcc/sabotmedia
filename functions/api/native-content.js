import {
  ensureNativePublicContentTable,
  ensureNativeRevisionTable,
  listNativeEntries,
  getNativeEntry,
  getExistingNativeEntry,
  upsertNativeEntry,
  deleteNativeEntry,
  saveRevisionSnapshot,
} from './_lib/nativePublicContent.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { writeAuditLog, inferActorFromRequest } from './_lib/auditLog.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)

  return json({
    ok: true,
    canEdit: permissionHasCapability(permission, 'content:write'),
    canPublish: permissionHasCapability(permission, 'publishing:write'),
    canReview: permissionHasCapability(permission, 'review:manage'),
    authMode: permission.mode,
    authReason: permission.reason,
    role: permission.role || '',
    mode: getBoundDb(context) ? 'd1' : 'unavailable',
  })
}

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || ''
    const slug = url.searchParams.get('slug') || ''
    const status = url.searchParams.get('status') || ''
    const target = url.searchParams.get('target') || ''
    const workflowState = url.searchParams.get('workflowState') || ''
    const canWrite = permissionHasCapability(permission, 'content:write')
    const contributor = permission.role === 'contributor'
    const includeFuture = canWrite && url.searchParams.get('includeFuture') === '1'
    const db = getBoundDb(context)

    if (!db) return databaseUnavailable('native content reads')

    await ensureNativePublicContentTable(db)
    await ensureNativeRevisionTable(db)

    if (id || slug) {
      const item = await getNativeEntry(db, id || slug, { includeFuture })
      if (contributor && item && !isOwnedBy(item, permission)) {
        return json({ ok: false, error: 'contributors can only access their own newsroom drafts' }, 403)
      }
      return json({ ok: true, mode: 'd1', item: canWrite ? item : publicNativeItem(item) })
    }

    const items = await listNativeEntries(db, {
      status: status || undefined,
      target: target || undefined,
      workflowState: workflowState || undefined,
      createdByUserId: contributor ? permission.user?.id : undefined,
      includeFuture,
    })

    return json({ ok: true, mode: 'd1', items: canWrite ? items : items.map(publicNativeItem) })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  return handleWrite(context)
}

export async function onRequestPut(context) {
  return handleWrite(context)
}

export async function onRequestDelete(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'content:write')) {
      return json({ ok: false, error: permission.reason || 'content write permission required' }, 403)
    }

    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || url.searchParams.get('slug') || ''
    if (!id) return json({ ok: false, error: 'missing id or slug' }, 400)

    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('native content deletion')

    const existing = await getExistingNativeEntry(db, id)
    if (permission.role === 'contributor') {
      if (!existing || !isOwnedBy(existing, permission)) {
        return json({ ok: false, error: 'contributors can only delete their own drafts' }, 403)
      }
      if (isPublishedState(existing)) {
        return json({ ok: false, error: 'contributors cannot delete published, scheduled, archived, or trashed content' }, 403)
      }
    }

    if (existing) await saveRevisionSnapshot(db, existing, 'delete:before')

    const result = await deleteNativeEntry(db, id)
    await writeAuditLog(db, {
      action: 'native_content.delete',
      entityType: 'native_content',
      entityId: id,
      actor: permission.actor || inferActorFromRequest(context.request),
      detail: result,
    })

    return json({ ok: true, mode: 'd1', ...result })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

async function handleWrite(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'content:write')) {
      return json({ ok: false, error: permission.reason || 'content write permission required' }, 403)
    }

    const body = await context.request.json()
    const item = { ...(body?.item || body || {}) }
    const revisionNote = String(body?.revisionNote || item?.revisionNote || 'save')
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('native content writes')

    await ensureNativePublicContentTable(db)
    await ensureNativeRevisionTable(db)

    const existing = item?.id ? await getExistingNativeEntry(db, item.id) : null
    const contributor = permission.role === 'contributor'
    const canPublish = permissionHasCapability(permission, 'publishing:write')
    const canReview = permissionHasCapability(permission, 'review:manage')
    const now = new Date().toISOString()

    if (existing && contributor && !isOwnedBy(existing, permission)) {
      return json({ ok: false, error: 'contributors can only edit their own newsroom drafts' }, 403)
    }
    if (existing && contributor && isPublishedState(existing)) {
      return json({ ok: false, error: 'contributors cannot edit published, scheduled, archived, or trashed content' }, 403)
    }

    if (existing && !String(item.slug || '').trim()) item.slug = existing.slug
    if (existing && isPermanentEpisodeIdentity(existing)) {
      item.sourceExternalId = existing.sourceExternalId
      item.sourcePostId = existing.sourcePostId || existing.sourceExternalId
    }

    const owner = existing || {}
    item.createdByUserId = owner.createdByUserId || permission.user?.id || ''
    item.createdByEmail = owner.createdByEmail || permission.user?.email || ''
    item.createdByDisplayName = owner.createdByDisplayName || permission.user?.displayName || ''
    item.lastEditedByUserId = permission.user?.id || ''
    item.lastEditedByEmail = permission.user?.email || permission.actor || ''
    if (!String(item.author || '').trim() && item.createdByDisplayName) item.author = item.createdByDisplayName

    if (contributor) {
      const requestedStatus = String(item.status || 'draft')
      const requestedWorkflow = String(item.workflowState || 'draft')
      if (requestedStatus !== 'draft') {
        return json({ ok: false, error: 'contributors can save drafts and submit for review, but cannot publish or schedule' }, 403)
      }
      if (!['draft', 'in_review', 'needs_revision'].includes(requestedWorkflow)) {
        return json({ ok: false, error: 'contributors cannot approve, decline, schedule, archive, or publish submissions' }, 403)
      }
      item.status = 'draft'
      item.reviewedAt = owner.reviewedAt || ''
      item.reviewedByUserId = owner.reviewedByUserId || ''
      item.reviewedByEmail = owner.reviewedByEmail || ''
      item.reviewDecision = owner.reviewDecision || ''
      item.assignedEditorId = owner.assignedEditorId || ''
      item.assignedEditorEmail = owner.assignedEditorEmail || ''
      if (requestedWorkflow === 'in_review' && owner.workflowState !== 'in_review') item.submittedAt = now
      else item.submittedAt = owner.submittedAt || item.submittedAt || ''
    } else {
      if (['published', 'scheduled'].includes(String(item.status || '')) && !canPublish) {
        return json({ ok: false, error: 'publishing permission required' }, 403)
      }
      if (['ready', 'needs_revision', 'declined'].includes(String(item.workflowState || '')) && !canReview) {
        return json({ ok: false, error: 'editorial review permission required' }, 403)
      }
      if (canReview && ['ready', 'needs_revision', 'declined'].includes(String(item.workflowState || ''))) {
        item.reviewedAt = now
        item.reviewedByUserId = permission.user?.id || ''
        item.reviewedByEmail = permission.user?.email || permission.actor || ''
        item.reviewDecision = item.workflowState
      }
      if (canPublish && ['published', 'scheduled'].includes(String(item.status || ''))) {
        item.reviewedAt = item.reviewedAt || now
        item.reviewedByUserId = item.reviewedByUserId || permission.user?.id || ''
        item.reviewedByEmail = item.reviewedByEmail || permission.user?.email || permission.actor || ''
        item.reviewDecision = item.reviewDecision || 'approved'
      }
    }

    if (existing) await saveRevisionSnapshot(db, existing, `before:${revisionNote}`)

    const saved = await upsertNativeEntry(db, item)
    await saveRevisionSnapshot(db, saved, revisionNote)
    await writeAuditLog(db, {
      action: 'native_content.upsert',
      entityType: 'native_content',
      entityId: saved.id,
      actor: permission.actor || inferActorFromRequest(context.request),
      detail: {
        revisionNote,
        status: saved.status,
        workflowState: saved.workflowState,
        target: saved.target,
        slug: saved.slug,
        createdByUserId: saved.createdByUserId,
      },
    })

    return json({ ok: true, mode: 'd1', item: saved })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

function isOwnedBy(item, permission) {
  return Boolean(item?.createdByUserId && permission?.user?.id && item.createdByUserId === permission.user.id)
}

function isPublishedState(item) {
  return ['published', 'scheduled', 'archived', 'trash'].includes(String(item?.status || '')) ||
    ['published', 'scheduled', 'archived', 'trash'].includes(String(item?.workflowState || ''))
}

function isPermanentEpisodeIdentity(item) {
  if (String(item?.contentType || '') !== 'podcast') return false
  const guid = String(item?.sourceExternalId || '').trim()
  if (!guid) return false
  return String(item?.sourceKind || '') === 'manual-episode' || guid.startsWith('sabot-episode-')
}

export function publicNativeItem(item) {
  if (!item || typeof item !== 'object') return item || null
  const {
    sourceNotes,
    transcriptNotes,
    workflowState,
    createdByUserId,
    createdByEmail,
    createdByDisplayName,
    lastEditedByUserId,
    lastEditedByEmail,
    submittedAt,
    reviewedAt,
    reviewedByUserId,
    reviewedByEmail,
    reviewDecision,
    assignedEditorId,
    assignedEditorEmail,
    ...safe
  } = item
  return {
    ...safe,
    relatedAssets: Array.isArray(item.relatedAssets) ? item.relatedAssets.map(publicRelatedAsset) : [],
  }
}

function publicRelatedAsset(asset) {
  if (!asset || typeof asset !== 'object') return null
  const {
    storageKey,
    customMetadata,
    contributorId,
    campaignId,
    privateUrl,
    internalNotes,
    ...safe
  } = asset
  return safe
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
