import { resolvePublicSitePermission, permissionHasCapability } from './_lib/publicSiteAuth.js'
import { getBoundDb } from './_lib/database.js'
import { json, sameOrigin } from './_lib/courseStore.js'
import { ensureContributors, listContributors, normalizeContribution } from './_lib/courseContributors.js'
import {
  hashPassword,
  equal,
  sessionCookie,
  verifySession,
  rateLimit,
  denied,
} from './_lib/courseSecurity.js'
import { id } from '../../public/guides/become-the-thousand-servers/lms/model.js'
export async function onRequest(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return json({ ok: false, error: 'Workspace unavailable' }, 503)
    const permission = await resolvePublicSitePermission(context),
      editor = permission.canEdit,
      admin = permissionHasCapability(permission, 'users:manage')
    const url = new URL(context.request.url),
      method = context.request.method
    if (!['GET', 'POST', 'PUT'].includes(method)) return json({ ok: false }, 405)
    if (method !== 'GET' && !sameOrigin(context.request)) return denied()
    let body = {}
    if (method !== 'GET') {
      const raw = await context.request.text()
      if (raw.length > 180000) return json({ ok: false, error: 'Too large' }, 413)
      body = JSON.parse(raw)
    }
    await ensureContributors(db)
    if (method === 'GET' && !url.searchParams.has('id'))
      return json({ ok: true, items: await listContributors(db), editor, admin })
    const project = id(body.id || url.searchParams.get('id')),
      scope = (body.scope || url.searchParams.get('scope')) === 'private' ? 'private' : 'edit'
    if (body.action === 'create') {
      if (!admin || !project || !body.name) return denied()
      await db
        .prepare('INSERT INTO course_contributors(id,name,draft_json) VALUES(?,?,?)')
        .bind(project, String(body.name).slice(0, 220), JSON.stringify(normalizeContribution()))
        .run()
      return json({ ok: true })
    }
    const row = await db.prepare('SELECT * FROM course_contributors WHERE id=?').bind(project).first()
    if (body.action === 'login') {
      if (!(await rateLimit(context, db, `contributor:${project}:${scope}`)))
        return json({ ok: false, error: 'Try again later' }, 429, { 'retry-after': '900' })
      const password = String(body.password || '').slice(0, 500),
        stored = row?.[`${scope}_hash`] || '0'.repeat(43),
        salt = row?.[`${scope}_salt`] || 'unconfigured-contributor'
      const hashed = await hashPassword(password, salt)
      if (!row?.enabled || !equal(hashed.hash, stored)) return denied()
      return json({ ok: true }, 200, {
        'set-cookie': await sessionCookie(context.env, project, scope, row.epoch),
      })
    }
    if (!row) return denied()
    const authorized =
      editor || (row.enabled === 1 && (await verifySession(context, project, scope, row.epoch)))
    if (method === 'GET') {
      if (scope === 'private' && !authorized) return denied()
      if (url.searchParams.has('revisions')) {
        if (!authorized) return denied()
        const rows = await db
          .prepare(
            'SELECT * FROM course_contributor_revisions WHERE project=? AND scope=? ORDER BY version DESC LIMIT 100',
          )
          .bind(project, scope)
          .all()
        return json({ ok: true, items: rows.results || [] })
      }
      return json({
        ok: true,
        id: project,
        name: row.name,
        canEdit: authorized,
        editor,
        admin,
        ...(authorized ? { revision: row.revision } : {}),
        ...(admin ? { enabled: !!row.enabled } : {}),
        ...(scope === 'private'
          ? { text: row.private_text }
          : { item: JSON.parse((authorized ? row.draft_json : row.published_json) || 'null') }),
      })
    }
    if (body.action === 'logout')
      return json({ ok: true }, 200, {
        'set-cookie': `sabot_course_${scope}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
      })
    if (body.action === 'credentials') {
      if (!admin) return denied()
      if (body.disabled === true) {
        await db
          .prepare('UPDATE course_contributors SET enabled=0,epoch=epoch+1 WHERE id=?')
          .bind(project)
          .run()
        return json({ ok: true })
      }
      const edit = String(body.editPassword || ''),
        privatePassword = String(body.privatePassword || '')
      if (
        edit.length < 20 ||
        privatePassword.length < 20 ||
        edit.length > 500 ||
        privatePassword.length > 500 ||
        edit === privatePassword
      )
        return json({ ok: false, error: 'Use two different passwords, each at least 20 characters.' }, 400)
      const a = await hashPassword(edit),
        b = await hashPassword(privatePassword)
      await db
        .prepare(
          'UPDATE course_contributors SET edit_hash=?,edit_salt=?,private_hash=?,private_salt=?,enabled=1,epoch=epoch+1 WHERE id=?',
        )
        .bind(a.hash, a.salt, b.hash, b.salt, project)
        .run()
      return json({ ok: true })
    }
    if (!authorized) return denied()
    if (body.revision !== row.revision)
      return json({ ok: false, error: 'Conflict: reload before saving' }, 409)
    const actor = editor ? 'editor' : 'contributor',
      actorId = editor ? permission.actor : project,
      next = scope === 'edit' ? normalizeContribution(body.item) : null
    if (next && !editor) next.status = 'review'
    const text = String(body.text || '').slice(0, 60000),
      revision = crypto.randomUUID()
    const statements = [
      db
        .prepare(
          'INSERT INTO course_contributor_revisions(id,project,version,actor_type,actor_id,scope,status,content_json) VALUES(?,?,?,?,?,?,?,?)',
        )
        .bind(
          revision,
          project,
          row.revision,
          actor,
          actorId,
          scope,
          scope === 'private' ? 'private' : JSON.parse(row.draft_json).status,
          scope === 'private' ? JSON.stringify({ text: row.private_text }) : row.draft_json,
        ),
    ]
    if (scope === 'private')
      statements.push(
        db
          .prepare(
            'UPDATE course_contributors SET private_text=CASE WHEN revision=? THEN ? ELSE NULL END,revision=revision+1 WHERE id=?',
          )
          .bind(row.revision, text, project),
      )
    else
      statements.push(
        db
          .prepare(
            'UPDATE course_contributors SET draft_json=CASE WHEN revision=? THEN ? ELSE NULL END,published_json=?,revision=revision+1 WHERE id=?',
          )
          .bind(
            row.revision,
            JSON.stringify(next),
            editor && next.status === 'published'
              ? JSON.stringify(next)
              : editor && next.status === 'archived'
                ? null
                : row.published_json,
            project,
          ),
      )
    await db.batch(statements)
    return json({ ok: true, revision: row.revision + 1 })
  } catch {
    return json({ ok: false, error: 'Workspace request failed. Reload before retrying.' }, 400)
  }
}
