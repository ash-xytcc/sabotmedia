import { getExistingNativeEntry } from './_lib/nativePublicContent.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { writeAuditLog } from './_lib/auditLog.js'

async function ensureEditorialCommentsTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS editorial_comments (
    id TEXT PRIMARY KEY,
    native_content_id TEXT NOT NULL,
    author_user_id TEXT NOT NULL DEFAULT '',
    author_email TEXT NOT NULL DEFAULT '',
    author_display_name TEXT NOT NULL DEFAULT '',
    author_role TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'comment',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_editorial_comments_native_content ON editorial_comments(native_content_id, created_at)').run()
}

export async function onRequestGet(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permission.canAccessAdmin) return json({ ok: false, error: permission.reason || 'authentication required' }, 403)

  const url = new URL(context.request.url)
  const nativeId = String(url.searchParams.get('nativeId') || '')
  if (!nativeId) return json({ ok: false, error: 'nativeId is required' }, 400)

  const db = getBoundDb(context)
  if (!db) return databaseUnavailable('editorial comments')
  await ensureEditorialCommentsTable(db)

  const item = await getExistingNativeEntry(db, nativeId)
  if (!item) return json({ ok: false, error: 'content not found' }, 404)
  if (permission.role === 'contributor' && item.createdByUserId !== permission.user?.id) {
    return json({ ok: false, error: 'contributors can only read discussion on their own work' }, 403)
  }

  const result = await db.prepare(`SELECT id, native_content_id, author_user_id, author_email, author_display_name,
    author_role, body, kind, created_at FROM editorial_comments WHERE native_content_id = ? ORDER BY datetime(created_at) ASC`)
    .bind(nativeId).all()

  return json({ ok: true, mode: 'd1', items: (result?.results || []).map(publicComment) })
}

export async function onRequestPost(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permissionHasCapability(permission, 'review:comment')) {
    return json({ ok: false, error: 'editorial comment permission required' }, 403)
  }

  const body = await context.request.json()
  const nativeId = String(body?.nativeId || body?.native_content_id || '')
  const text = String(body?.body || '').trim()
  const kind = ['comment', 'change_request', 'decision'].includes(String(body?.kind || '')) ? String(body.kind) : 'comment'
  if (!nativeId) return json({ ok: false, error: 'nativeId is required' }, 400)
  if (!text) return json({ ok: false, error: 'comment body is required' }, 400)
  if (text.length > 12000) return json({ ok: false, error: 'comment is too long' }, 400)

  const db = getBoundDb(context)
  if (!db) return databaseUnavailable('editorial comments')
  await ensureEditorialCommentsTable(db)

  const item = await getExistingNativeEntry(db, nativeId)
  if (!item) return json({ ok: false, error: 'content not found' }, 404)
  if (permission.role === 'contributor' && item.createdByUserId !== permission.user?.id) {
    return json({ ok: false, error: 'contributors can only comment on their own work' }, 403)
  }
  if (kind !== 'comment' && !permissionHasCapability(permission, 'review:manage')) {
    return json({ ok: false, error: 'only editors can create review decisions or change requests' }, 403)
  }

  const comment = {
    id: `comment-${crypto.randomUUID?.() || Math.random().toString(36).slice(2, 12)}`,
    nativeId,
    authorUserId: permission.user?.id || '',
    authorEmail: permission.user?.email || permission.actor || '',
    authorDisplayName: permission.user?.displayName || '',
    authorRole: permission.role || '',
    body: text,
    kind,
    createdAt: new Date().toISOString(),
  }

  await db.prepare(`INSERT INTO editorial_comments (
    id, native_content_id, author_user_id, author_email, author_display_name, author_role, body, kind, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    comment.id,
    comment.nativeId,
    comment.authorUserId,
    comment.authorEmail,
    comment.authorDisplayName,
    comment.authorRole,
    comment.body,
    comment.kind,
    comment.createdAt,
  ).run()

  await writeAuditLog(db, {
    action: 'editorial_comment.create',
    entityType: 'native_content',
    entityId: nativeId,
    actor: permission.actor || comment.authorEmail,
    detail: { commentId: comment.id, kind: comment.kind },
  })

  return json({ ok: true, mode: 'd1', item: comment }, 201)
}

function publicComment(row) {
  return {
    id: String(row.id || ''),
    nativeId: String(row.native_content_id || row.nativeId || ''),
    authorUserId: String(row.author_user_id || row.authorUserId || ''),
    authorEmail: String(row.author_email || row.authorEmail || ''),
    authorDisplayName: String(row.author_display_name || row.authorDisplayName || ''),
    authorRole: String(row.author_role || row.authorRole || ''),
    body: String(row.body || ''),
    kind: String(row.kind || 'comment'),
    createdAt: String(row.created_at || row.createdAt || ''),
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
