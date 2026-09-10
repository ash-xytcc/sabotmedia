import { participatingContributor } from '../../public/guides/become-the-thousand-servers/lms/participation.js'
import { resolvePublicSitePermission, permissionHasCapability } from './_lib/publicSiteAuth.js'
import { getBoundDb } from './_lib/database.js'
import { json, sameOrigin } from './_lib/courseStore.js'
import {
  compareContribution,
  ensureContributors,
  listContributors,
  normalizeContribution,
  publicContribution,
} from './_lib/courseContributors.js'
import {
  hashPassword,
  equal,
  sessionCookie,
  verifySession,
  rateLimit,
  denied,
} from './_lib/courseSecurity.js'
import { id } from '../../public/guides/become-the-thousand-servers/lms/model.js'

const decisionStatuses = new Set(['approved', 'changes-requested', 'rejected'])

function submissionView(row, editor = false) {
  const item = normalizeContribution(JSON.parse(row.content_json || '{}'))
  const out = {
    id: row.id,
    project: row.project,
    revision: row.revision,
    status: row.status,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
    decision: row.decision,
    reviewerNote: row.reviewer_note || '',
    item,
  }
  if (editor) out.reviewerId = row.reviewer_id || ''
  return out
}

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

    if (body.action === 'review-decision') {
      if (!editor) return denied()
      const submissionId = String(body.submissionId || '').slice(0, 120)
      const decision = String(body.decision || '')
      const reviewerNote = String(body.reviewerNote || '').trim().slice(0, 10000)
      if (!decisionStatuses.has(decision)) return json({ ok: false, error: 'Invalid review decision' }, 400)
      if (!reviewerNote) return json({ ok: false, error: 'A reviewer note is required' }, 400)
      const submission = await db.prepare('SELECT * FROM course_contributor_submissions WHERE id=?').bind(submissionId).first()
      if (!submission || submission.status !== 'pending') return json({ ok: false, error: 'This submission already has a decision' }, 409)
      const row = await db.prepare('SELECT * FROM course_contributors WHERE id=?').bind(submission.project).first()
      if (!row || !participatingContributor(row)) return denied()
      const now = new Date().toISOString()
      const statements = []
      if (decision === 'approved') {
        const published = JSON.stringify(publicContribution(JSON.parse(submission.content_json)))
        statements.push(
          db.prepare(`UPDATE course_contributors SET published_json=?, revision=revision+1 WHERE id=? AND revision=? AND draft_json=?`).bind(published, submission.project, submission.revision, submission.content_json),
          db.prepare(`UPDATE course_contributor_submissions SET status='approved',decision='approved',decided_at=?,reviewer_id=?,reviewer_note=? WHERE id=? AND status='pending' AND changes()=1`).bind(now, permission.actor, reviewerNote, submissionId),
          db.prepare(`INSERT INTO course_contributor_revisions(id,project,version,actor_type,actor_id,scope,status,content_json,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM course_contributor_submissions WHERE id=? AND status='approved')`).bind(crypto.randomUUID(), submission.project, submission.revision, 'editor', permission.actor, 'edit', 'published', submission.content_json, now, submissionId),
        )
      } else {
        statements.push(
          db.prepare(`UPDATE course_contributor_submissions SET status=?,decision=?,decided_at=?,reviewer_id=?,reviewer_note=? WHERE id=? AND status='pending'`).bind(decision, decision, now, permission.actor, reviewerNote, submissionId),
          db.prepare(`INSERT INTO course_contributor_revisions(id,project,version,actor_type,actor_id,scope,status,content_json,created_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), submission.project, submission.revision, 'editor', permission.actor, 'edit', decision, submission.content_json, now),
        )
      }
      await db.batch(statements)
      const decided = await db.prepare('SELECT * FROM course_contributor_submissions WHERE id=?').bind(submissionId).first()
      if (decision === 'approved' && decided?.status !== 'approved') return json({ ok: false, error: 'Conflict: this submission is older than the contributor’s current draft. Review the newer submission instead.' }, 409)
      return json({ ok: true, submission: submissionView(decided, true) })
    }

    if (method === 'GET' && !url.searchParams.has('id')) {
      let items = await listContributors(db)
      if (editor) {
        const rows = await db.prepare('SELECT id,draft_json,revision,published_json FROM course_contributors').all()
        const pending = await db.prepare("SELECT * FROM course_contributor_submissions WHERE status='pending' ORDER BY submitted_at ASC").all()
        items = items.map((item) => {
          const row = rows.results.find((r) => r.id === item.id)
          const submissions = (pending.results || []).filter((s) => s.project === item.id)
          return {
            ...item,
            status: JSON.parse(row.draft_json).status,
            revision: row.revision,
            pendingCount: submissions.length,
            pending: submissions.map((s) => ({
              ...submissionView(s, true),
              comparison: compareContribution(row.published_json ? JSON.parse(row.published_json) : {}, JSON.parse(s.content_json)),
            })),
          }
        })
      }
      return json({ ok: true, items, editor, admin })
    }

    const project = id(body.id || url.searchParams.get('id')),
      scope = (body.scope || url.searchParams.get('scope')) === 'private' ? 'private' : 'edit'
    if (!participatingContributor(project) || (body.name && !participatingContributor(body.name))) return json({ok:false,error:'Contributor not available'},404)
    if (body.action === 'create') {
      if (!admin || !project || !body.name) return denied()
      await db.prepare('INSERT INTO course_contributors(id,name,draft_json) VALUES(?,?,?)').bind(project, String(body.name).slice(0, 220), JSON.stringify(normalizeContribution())).run()
      return json({ ok: true })
    }
    const row = await db.prepare('SELECT * FROM course_contributors WHERE id=?').bind(project).first()
    if (row && !participatingContributor(row)) return json({ok:false,error:'Contributor not available'},404)
    if (body.action === 'login') {
      if (!(await rateLimit(context, db, `contributor:${project}:edit`))) return json({ ok: false, error: 'Try again later' }, 429, { 'retry-after': '900' })
      const loginScope = scope === 'private' ? 'edit' : scope
      const password = String(body.password || '').slice(0, 500), stored = row?.[`${loginScope}_hash`] || '0'.repeat(43), salt = row?.[`${loginScope}_salt`] || 'unconfigured-contributor'
      const hashed = await hashPassword(password, salt)
      if (!row?.enabled || !equal(hashed.hash, stored)) return denied()
      return json({ ok: true }, 200, { 'set-cookie': await sessionCookie(context.env, project, loginScope, row.epoch) })
    }
    if (!row) return denied()
    const authorized = editor || (row.enabled === 1 && (await verifySession(context, project, 'edit', row.epoch)))
    if (method === 'GET') {
      if (scope === 'private' && !authorized) return denied()
      if (url.searchParams.has('revisions')) {
        if (!authorized) return denied()
        const rows = await db.prepare('SELECT * FROM course_contributor_revisions WHERE project=? AND scope=? ORDER BY version DESC, created_at DESC LIMIT 100').bind(project, scope).all()
        return json({ ok: true, items: rows.results || [] })
      }
      let submissions = []
      if (scope === 'edit' && authorized) {
        const result = await db.prepare('SELECT * FROM course_contributor_submissions WHERE project=? ORDER BY submitted_at DESC LIMIT 100').bind(project).all()
        submissions = (result.results || []).map((s) => submissionView(s, editor))
      }
      return json({
        ok: true, id: project, name: row.name, canEdit: authorized, editor, admin,
        ...(authorized ? { revision: row.revision } : {}), ...(admin ? { enabled: !!row.enabled } : {}),
        ...(scope === 'private' ? { text: row.private_text } : { item: JSON.parse((authorized ? row.draft_json : row.published_json) || 'null'), ...(authorized ? { submissions } : {}) }),
      })
    }
    if (body.action === 'logout') {
      const response = json({ ok: true })
      for (const name of ['edit', 'private']) response.headers.append('set-cookie', `sabot_course_${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`)
      return response
    }
    if (body.action === 'credentials') {
      if (!admin) return denied()
      if (body.disabled === true) {
        await db.prepare('UPDATE course_contributors SET enabled=0,epoch=epoch+1 WHERE id=?').bind(project).run()
        return json({ ok: true })
      }
      const edit = String(body.editPassword || '')
      if (edit.length < 20 || edit.length > 500) return json({ ok: false, error: 'Use a project password with at least 20 characters.' }, 400)
      const a = await hashPassword(edit)
      await db.prepare('UPDATE course_contributors SET edit_hash=?,edit_salt=?,private_hash=NULL,private_salt=NULL,enabled=1,epoch=epoch+1 WHERE id=?').bind(a.hash, a.salt, project).run()
      return json({ ok: true })
    }
    if (!authorized) return denied()
    if (body.revision !== row.revision) return json({ ok: false, error: 'Conflict: reload before saving' }, 409)
    const actor = editor ? 'editor' : 'contributor', actorId = editor ? permission.actor : project, next = scope === 'edit' ? normalizeContribution(body.item) : null
    if (next && !editor) next.status = 'review'
    const text = String(body.text || '').slice(0, 60000), revisionId = crypto.randomUUID(), nextRevision = row.revision + 1
    const statements = [db.prepare('INSERT INTO course_contributor_revisions(id,project,version,actor_type,actor_id,scope,status,content_json) VALUES(?,?,?,?,?,?,?,?)').bind(revisionId, project, row.revision, actor, actorId, scope, scope === 'private' ? 'private' : JSON.parse(row.draft_json).status, scope === 'private' ? JSON.stringify({ text: row.private_text }) : row.draft_json)]
    if (scope === 'private') {
      statements.push(db.prepare('UPDATE course_contributors SET private_text=CASE WHEN revision=? THEN ? ELSE NULL END,revision=revision+1 WHERE id=?').bind(row.revision, text, project))
    } else {
      const nextJson = JSON.stringify(next)
      statements.push(db.prepare('UPDATE course_contributors SET draft_json=CASE WHEN revision=? THEN ? ELSE NULL END,revision=revision+1 WHERE id=?').bind(row.revision, nextJson, project))
      if (!editor && next.status === 'review') statements.push(db.prepare(`INSERT INTO course_contributor_submissions(id,project,revision,content_json,status) VALUES(?,?,?,?, 'pending')`).bind(crypto.randomUUID(), project, nextRevision, nextJson))
      if (editor && next.status === 'published') statements.push(db.prepare('UPDATE course_contributors SET published_json=? WHERE id=?').bind(JSON.stringify(publicContribution(next)), project))
      else if (editor && next.status === 'archived') statements.push(db.prepare('UPDATE course_contributors SET published_json=NULL WHERE id=?').bind(project))
    }
    await db.batch(statements)
    return json({ ok: true, revision: nextRevision })
  } catch (error) {
    return json({ ok: false, error: error?.message?.startsWith('UNIQUE') ? 'Conflict: reload before saving' : 'Workspace request failed. Reload before retrying.' }, 400)
  }
}
