import { withoutWithdrawnAssignments } from '../../../public/guides/become-the-thousand-servers/lms/participation.js'
import { withRecoveryPathway } from '../../../public/guides/become-the-thousand-servers/lms/blog-recovery.js'
import {
  normalizeCourse,
  publicCourse,
  applyRepositoryCourseRevisions,
  seed,
  SLUG,
} from '../../../public/guides/become-the-thousand-servers/lms/model.js'
export async function ensureCourseTables(db) {
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS course_content (slug TEXT PRIMARY KEY, content_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    )
    .run()
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS course_publications (slug TEXT PRIMARY KEY, content_json TEXT NOT NULL)',
    )
    .run()
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS course_revisions (id TEXT PRIMARY KEY, slug TEXT NOT NULL, version INTEGER NOT NULL, actor_type TEXT NOT NULL, actor_id TEXT NOT NULL, status TEXT NOT NULL, content_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    )
    .run()
}
function canonicalizePublishedManuscript(current) {
  const canonical = publicCourse(structuredClone(seed))
  const next = structuredClone(current)

  for (const key of ['title','subtitle','deck','intro','taskHeading','taskIntro','contentVersion']) {
    next[key] = structuredClone(canonical[key])
  }

  const currentSections = new Map((next.sections || []).map((item) => [item.id, item]))
  next.sections = canonical.sections.map((item) => {
    const prior = currentSections.get(item.id) || {}
    return {
      ...structuredClone(item),
      contributors: structuredClone(prior.contributors || item.contributors || []),
    }
  })

  const currentLessons = new Map((next.lessons || []).map((item) => [item.slug, item]))
  next.lessons = canonical.lessons.map((item) => {
    const prior = currentLessons.get(item.slug) || {}
    return {
      ...structuredClone(item),
      contributors: structuredClone(prior.contributors || item.contributors || []),
      lastTestedDate: prior.lastTestedDate || item.lastTestedDate || '',
    }
  })

  const canonicalModules = new Map((canonical.modules || []).map((item) => [item.id, item]))
  const extraModules = (next.modules || []).filter((item) => item?.id && !canonicalModules.has(item.id))
  next.modules = [...structuredClone(canonical.modules || []), ...structuredClone(extraModules)]

  const canonicalActivities = new Map((canonical.activities || []).map((item) => [item.id, item]))
  const extraActivities = (next.activities || []).filter((item) => item?.id && !canonicalActivities.has(item.id))
  next.activities = [...structuredClone(canonical.activities || []), ...structuredClone(extraActivities)]

  return publicCourse(normalizeCourse(next))
}

async function applyRepositoryRevisions(db, slug) {
  if (slug !== SLUG) return

  const stored = await db.prepare('SELECT content_json FROM course_content WHERE slug=?').bind(slug).first()
  if (stored?.content_json) {
    const current = normalizeCourse(JSON.parse(stored.content_json))
    const { course, applied } = applyRepositoryCourseRevisions(current)
    if (applied.length) {
      try {
        await saveCourse(db, course, { actorType: 'repository', actor: applied.join(',') })
      } catch (error) {
        if (!String(error?.message || '').startsWith('Conflict')) throw error
      }
    }
  }

  // Repository-approved manuscript revisions must also reach the already-published
  // snapshot. The editorial row may currently be draft/review, in which case
  // saveCourse intentionally leaves course_publications untouched. Apply the same
  // exact-match revisions to the published snapshot itself so public readers do
  // not remain pinned to an older manuscript, without exposing unrelated draft work.
  const published = await db
    .prepare('SELECT content_json FROM course_publications WHERE slug=?')
    .bind(slug)
    .first()
  if (!published?.content_json || published.content_json === 'null') return

  const currentPublished = normalizeCourse(JSON.parse(published.content_json))
  const { course: exactRevisedPublished, applied: publishedApplied } =
    applyRepositoryCourseRevisions(currentPublished)

  const needsReviewedManuscript = exactRevisedPublished.contentVersion !== seed.contentVersion
  const revisedPublished = needsReviewedManuscript
    ? canonicalizePublishedManuscript(exactRevisedPublished)
    : exactRevisedPublished

  if (!publishedApplied.length && !needsReviewedManuscript) return

  const updated = await db
    .prepare(
      'UPDATE course_publications SET content_json=? WHERE slug=? AND content_json=?',
    )
    .bind(
      JSON.stringify(publicCourse(revisedPublished)),
      slug,
      published.content_json,
    )
    .run()

  if (needsReviewedManuscript && Number(updated?.meta?.changes || 0) > 0) {
    const prior = await db
      .prepare('SELECT COALESCE(MAX(version),0) AS version FROM course_revisions WHERE slug=?')
      .bind(slug)
      .first()
    await db
      .prepare(
        'INSERT INTO course_revisions(id,slug,version,actor_type,actor_id,status,content_json) VALUES(?,?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        slug,
        Number(prior?.version || 0) + 1,
        'repository',
        `published-manuscript:${seed.contentVersion}`,
        'published',
        JSON.stringify(revisedPublished),
      )
      .run()
  }
}
export async function readCourse(db, slug = SLUG, editor = false) {
  await ensureCourseTables(db)
  await applyRepositoryRevisions(db, slug)
  const row = await db
    .prepare(`SELECT content_json FROM ${editor ? 'course_content' : 'course_publications'} WHERE slug=?`)
    .bind(slug)
    .first()
  if (row) return editor ? normalizeCourse(JSON.parse(row.content_json)) : withoutWithdrawnAssignments(withRecoveryPathway(JSON.parse(row.content_json), {publicOnly:true}))
  if (!editor) {
    const old = await db.prepare('SELECT content_json FROM course_content WHERE slug=?').bind(slug).first()
    if (old) {
      const c = JSON.parse(old.content_json)
      if (c.status === 'archived') return null
      if (c.schemaVersion !== 2 && c.status === 'published') return publicCourse(normalizeCourse(c))
    }
  }
  return slug === SLUG ? (editor ? structuredClone(seed) : publicCourse(seed)) : null
}
export async function saveCourse(db, input, permission) {
  await ensureCourseTables(db)
  const stored = await db
    .prepare('SELECT content_json FROM course_content WHERE slug=?')
    .bind(input.slug)
    .first()
  const current = stored
    ? normalizeCourse(JSON.parse(stored.content_json))
    : input.slug === SLUG
      ? structuredClone(seed)
      : null
  const revision = current?.revision || 0
  if (Number(input.revision || 0) !== revision)
    throw Error('Conflict: reload the latest course before saving')
  const next = normalizeCourse({ ...input, revision: revision + 1 })
  const statements = [
    db
      .prepare(
        'INSERT INTO course_revisions(id,slug,version,actor_type,actor_id,status,content_json) VALUES(?,?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        next.slug,
        revision,
        permission.actorType || 'editor',
        permission.actor || 'editor',
        current?.status || 'draft',
        JSON.stringify(current || next),
      ),
  ]
  // A failed compare-and-swap deliberately violates NOT NULL, rolling back the batch.
  statements.push(
    db
      .prepare(
        `INSERT INTO course_content(slug,content_json) VALUES(?,?) ON CONFLICT(slug) DO UPDATE SET content_json=CASE WHEN course_content.content_json=? THEN excluded.content_json ELSE NULL END,updated_at=CURRENT_TIMESTAMP`,
      )
      .bind(next.slug, JSON.stringify(next), stored?.content_json || ''),
  )
  if (next.status === 'published')
    statements.push(
      db
        .prepare(
          'INSERT INTO course_publications(slug,content_json) VALUES(?,?) ON CONFLICT(slug) DO UPDATE SET content_json=excluded.content_json',
        )
        .bind(next.slug, JSON.stringify(publicCourse(next))),
    )
  if (next.status === 'archived')
    statements.push(
      db
        .prepare(
          'INSERT INTO course_publications(slug,content_json) VALUES(?,?) ON CONFLICT(slug) DO UPDATE SET content_json=excluded.content_json',
        )
        .bind(next.slug, 'null'),
    )
  await db.batch(statements)
  return next
}
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, noarchive',
      ...extra,
    },
  })
}
export function sameOrigin(request) {
  return (
    request.headers.get('origin') === new URL(request.url).origin &&
    /^application\/json\b/i.test(request.headers.get('content-type') || '')
  )
}
