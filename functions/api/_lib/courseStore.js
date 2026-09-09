import {
  normalizeCourse,
  publicCourse,
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
export async function readCourse(db, slug = SLUG, editor = false) {
  await ensureCourseTables(db)
  const row = await db
    .prepare(`SELECT content_json FROM ${editor ? 'course_content' : 'course_publications'} WHERE slug=?`)
    .bind(slug)
    .first()
  if (row) return editor ? normalizeCourse(JSON.parse(row.content_json)) : JSON.parse(row.content_json)
  if (!editor) {
    const old = await db.prepare('SELECT content_json FROM course_content WHERE slug=?').bind(slug).first()
    if (old) {
      const c = JSON.parse(old.content_json)
      if (c.schemaVersion !== 2 && c.status === 'published') return publicCourse(normalizeCourse(c))
    }
  }
  return slug === SLUG ? structuredClone(seed) : null
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
        'editor',
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
