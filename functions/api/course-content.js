import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { writeAuditLog, inferActorFromRequest } from './_lib/auditLog.js'

const COURSE_SLUG = 'become-the-thousand-servers'
const DEFAULT_COURSE = {
  slug: COURSE_SLUG,
  schemaVersion: 1,
  contentVersion: '2026.09-working-1',
  title: 'Become the Thousand Servers',
  subtitle: 'A self-paced field course in autonomous infrastructure',
  deck: 'Learn it. Break it. Rebuild it. Teach someone else.',
  intro: 'Autonomous infrastructure is not a demand that every collective become an ISP. It is a demand that movements understand the systems they depend on well enough to map them, maintain them, back them up, move them, reproduce them, distribute knowledge about them, and survive the disappearance of individual services or administrators.',
  taskHeading: 'Start with the problem you are trying to solve',
  taskIntro: 'You do not have to take the course in order. Pick the thing that is currently broken, mysterious, fragile, or keeping you awake and jump to the lessons that deal with it.',
  lessons: [
    ['map-your-dependencies','Map Your Dependencies','Beginner','45–90 min'],
    ['read-dns','Read DNS and Investigate Your Domain','Beginner','60–90 min'],
    ['ssh-disposable-linux','SSH Into a Disposable Linux Machine','Beginner','60–90 min'],
    ['first-disposable-page','Put Your First Disposable Page Online','Beginner','60–120 min'],
    ['understand-exposure','Understand What You Just Exposed','Beginner','60–90 min'],
    ['real-backup','Make a Real Backup','Beginner','60–120 min'],
    ['destroy-and-rebuild','Destroy It and Rebuild It','Intermediate','90–180 min'],
    ['learn-to-leave','Learn to Leave: Migrate to Another Host','Intermediate','90–180 min'],
    ['stop-being-only-admin','Stop Being the Only Administrator','Beginner','60–90 min'],
    ['publish-for-survival','Mirror and Publish for Survival','Beginner','60–120 min'],
    ['run-local-learn-network','Run Something Local and Learn the Network','Beginner','60–120 min'],
    ['connect-differently-teach','Connect Differently, Then Teach Someone Else','Intermediate','90–180 min'],
  ].map(([slug,title,difficulty,time], index) => ({
    slug, number: index + 1, title, difficulty, time, status: 'working draft',
    learn: '', do: '', test: '', teach: '', resources: []
  }))
}

async function ensureTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS course_content (
    slug TEXT PRIMARY KEY,
    content_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
}

function normalizeLesson(input = {}, number = 0) {
  const resources = Array.isArray(input.resources) ? input.resources.slice(0, 100).map((r) => ({
    title: String(r?.title || '').slice(0, 160),
    url: String(r?.url || '').slice(0, 2000),
    note: String(r?.note || '').slice(0, 500),
  })).filter((r) => r.title || r.url) : []
  return {
    slug: String(input.slug || `lesson-${number}`).slice(0, 120),
    number: Number(input.number || number),
    title: String(input.title || '').slice(0, 220),
    difficulty: String(input.difficulty || '').slice(0, 80),
    time: String(input.time || '').slice(0, 80),
    status: String(input.status || 'working draft').slice(0, 80),
    learn: String(input.learn || '').slice(0, 30000),
    do: String(input.do || '').slice(0, 30000),
    test: String(input.test || '').slice(0, 30000),
    teach: String(input.teach || '').slice(0, 30000),
    resources,
  }
}

function normalizeCourse(input = {}) {
  const sourceLessons = Array.isArray(input.lessons) ? input.lessons : DEFAULT_COURSE.lessons
  return {
    slug: COURSE_SLUG,
    schemaVersion: 1,
    contentVersion: String(input.contentVersion || DEFAULT_COURSE.contentVersion).slice(0, 80),
    title: String(input.title || DEFAULT_COURSE.title).slice(0, 220),
    subtitle: String(input.subtitle || DEFAULT_COURSE.subtitle).slice(0, 300),
    deck: String(input.deck || DEFAULT_COURSE.deck).slice(0, 500),
    intro: String(input.intro || DEFAULT_COURSE.intro).slice(0, 12000),
    taskHeading: String(input.taskHeading || DEFAULT_COURSE.taskHeading).slice(0, 220),
    taskIntro: String(input.taskIntro || DEFAULT_COURSE.taskIntro).slice(0, 2000),
    lessons: sourceLessons.slice(0, 24).map((lesson, index) => normalizeLesson(lesson, index + 1)),
  }
}

async function readCourse(db) {
  await ensureTable(db)
  const row = await db.prepare('SELECT content_json, updated_at FROM course_content WHERE slug = ? LIMIT 1').bind(COURSE_SLUG).first()
  if (!row) return { item: normalizeCourse(DEFAULT_COURSE), updatedAt: null, source: 'default' }
  let parsed = {}
  try { parsed = JSON.parse(row.content_json || '{}') } catch { parsed = {} }
  return { item: normalizeCourse(parsed), updatedAt: row.updated_at || null, source: 'd1' }
}

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('course content reads')
    const permission = await resolvePublicSitePermission(context)
    const result = await readCourse(db)
    return json({ ok: true, ...result, canEdit: permission.canEdit })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPut(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'authentication required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('course content writes')
    await ensureTable(db)
    const body = await context.request.json()
    const item = normalizeCourse(body?.item || body || {})
    await db.prepare(`INSERT INTO course_content (slug, content_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET content_json = excluded.content_json, updated_at = CURRENT_TIMESTAMP`)
      .bind(COURSE_SLUG, JSON.stringify(item)).run()
    await writeAuditLog(db, {
      action: 'course-content.update', entityType: 'course', entityId: COURSE_SLUG,
      actor: inferActorFromRequest(context.request), detail: { contentVersion: item.contentVersion, lessons: item.lessons.length }
    })
    const saved = await readCourse(db)
    return json({ ok: true, ...saved, canEdit: true })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}
