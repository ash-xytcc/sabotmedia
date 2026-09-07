import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { writeAuditLog, inferActorFromRequest } from './_lib/auditLog.js'

const DEFAULT_SLUG = 'become-the-thousand-servers'
const DEFAULT_COURSE = {
  slug: DEFAULT_SLUG,
  schemaVersion: 1,
  contentVersion: '2026.09-working-1',
  title: 'Become the Thousand Servers',
  subtitle: 'A self-paced field course in autonomous infrastructure',
  deck: 'Learn it. Break it. Rebuild it. Teach someone else.',
  intro: 'Autonomous infrastructure is not a demand that every collective become an ISP. It is a demand that movements understand the systems they depend on well enough to map them, maintain them, back them up, move them, reproduce them, distribute knowledge about them, and survive the disappearance of individual services or administrators.',
  taskHeading: 'Start with the problem you are trying to solve',
  taskIntro: 'You do not have to take the course in order. Pick the thing that is currently broken, mysterious, fragile, or keeping you awake and jump to the lessons that deal with it.',
  status: 'draft',
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
  ].map(([slug,title,difficulty,time], index) => ({ slug, number:index+1, title, difficulty, time, status:'working draft', learn:'', do:'', test:'', teach:'', resources:[] }))
}

async function ensureTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS course_content (
    slug TEXT PRIMARY KEY,
    content_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
}

function safeSlug(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}

function normalizeLesson(input = {}, number = 0) {
  const resources = Array.isArray(input.resources) ? input.resources.slice(0, 100).map((r) => ({
    title: String(r?.title || '').slice(0, 160), url: String(r?.url || '').slice(0, 2000), note: String(r?.note || '').slice(0, 500),
  })).filter((r) => r.title || r.url) : []
  return {
    slug: safeSlug(input.slug || `lesson-${number}`) || `lesson-${number}`, number: Number(input.number || number),
    title: String(input.title || '').slice(0, 220), difficulty: String(input.difficulty || '').slice(0, 80),
    time: String(input.time || '').slice(0, 80), status: String(input.status || 'working draft').slice(0, 80),
    learn: String(input.learn || '').slice(0, 30000), do: String(input.do || '').slice(0, 30000),
    test: String(input.test || '').slice(0, 30000), teach: String(input.teach || '').slice(0, 30000), resources,
  }
}

function normalizeCourse(input = {}, fallback = {}) {
  const base = { ...DEFAULT_COURSE, ...fallback }
  const slug = safeSlug(input.slug || base.slug || '')
  const sourceLessons = Array.isArray(input.lessons) ? input.lessons : (Array.isArray(base.lessons) ? base.lessons : [])
  return {
    slug,
    schemaVersion: 1,
    contentVersion: String(input.contentVersion || base.contentVersion || 'working-1').slice(0, 80),
    title: String(input.title || base.title || 'Untitled course').slice(0, 220),
    subtitle: String(input.subtitle || base.subtitle || '').slice(0, 300),
    deck: String(input.deck || base.deck || '').slice(0, 500),
    intro: String(input.intro || base.intro || '').slice(0, 12000),
    taskHeading: String(input.taskHeading || base.taskHeading || 'Start with the problem you are trying to solve').slice(0, 220),
    taskIntro: String(input.taskIntro || base.taskIntro || '').slice(0, 2000),
    status: ['draft','published','archived'].includes(String(input.status || base.status)) ? String(input.status || base.status) : 'draft',
    lessons: sourceLessons.slice(0, 60).map((lesson, index) => normalizeLesson(lesson, index + 1)),
  }
}

async function readCourse(db, slug = DEFAULT_SLUG) {
  await ensureTable(db)
  const wanted = safeSlug(slug) || DEFAULT_SLUG
  const row = await db.prepare('SELECT content_json, updated_at FROM course_content WHERE slug = ? LIMIT 1').bind(wanted).first()
  if (!row && wanted === DEFAULT_SLUG) return { item: normalizeCourse(DEFAULT_COURSE), updatedAt: null, source: 'default' }
  if (!row) return { item: null, updatedAt: null, source: 'missing' }
  let parsed = {}
  try { parsed = JSON.parse(row.content_json || '{}') } catch { parsed = {} }
  return { item: normalizeCourse({ ...parsed, slug: wanted }, wanted === DEFAULT_SLUG ? DEFAULT_COURSE : {}), updatedAt: row.updated_at || null, source: 'd1' }
}

async function listCourses(db) {
  await ensureTable(db)
  const result = await db.prepare('SELECT slug, content_json, updated_at FROM course_content ORDER BY updated_at DESC').all()
  const items = (result?.results || []).map((row) => {
    let parsed = {}
    try { parsed = JSON.parse(row.content_json || '{}') } catch { parsed = {} }
    const item = normalizeCourse({ ...parsed, slug: row.slug }, row.slug === DEFAULT_SLUG ? DEFAULT_COURSE : {})
    return { slug:item.slug, title:item.title, subtitle:item.subtitle, status:item.status, lessons:item.lessons.length, updatedAt:row.updated_at || null }
  })
  if (!items.some((item) => item.slug === DEFAULT_SLUG)) items.unshift({ slug:DEFAULT_SLUG, title:DEFAULT_COURSE.title, subtitle:DEFAULT_COURSE.subtitle, status:'draft', lessons:DEFAULT_COURSE.lessons.length, updatedAt:null, source:'default' })
  return items
}

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('course content reads')
    const permission = await resolvePublicSitePermission(context)
    const url = new URL(context.request.url)
    if (url.searchParams.get('list') === '1') return json({ ok:true, items:await listCourses(db), canEdit:permission.canEdit })
    const slug = url.searchParams.get('slug') || DEFAULT_SLUG
    const result = await readCourse(db, slug)
    if (!result.item) return json({ ok:false, error:'course not found' }, 404)
    return json({ ok:true, ...result, canEdit:permission.canEdit })
  } catch (error) { return json({ ok:false, error:String(error?.message || error) }, 500) }
}

export async function onRequestPost(context) { return saveCourse(context, true) }
export async function onRequestPut(context) { return saveCourse(context, false) }

async function saveCourse(context, creating) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok:false, error:permission.reason || 'authentication required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('course content writes')
    await ensureTable(db)
    const body = await context.request.json()
    const incoming = body?.item || body || {}
    const slug = safeSlug(incoming.slug)
    if (!slug) return json({ ok:false, error:'course slug is required' }, 400)
    if (creating) {
      const existing = await db.prepare('SELECT slug FROM course_content WHERE slug = ? LIMIT 1').bind(slug).first()
      if (existing) return json({ ok:false, error:'a course with that slug already exists' }, 409)
    }
    const item = normalizeCourse({ ...incoming, slug }, slug === DEFAULT_SLUG ? DEFAULT_COURSE : {})
    await db.prepare(`INSERT INTO course_content (slug, content_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET content_json = excluded.content_json, updated_at = CURRENT_TIMESTAMP`)
      .bind(slug, JSON.stringify(item)).run()
    await writeAuditLog(db, {
      action: creating ? 'course-content.create' : 'course-content.update', entityType:'course', entityId:slug,
      actor: inferActorFromRequest(context.request), detail:{ contentVersion:item.contentVersion, lessons:item.lessons.length, status:item.status }
    })
    const saved = await readCourse(db, slug)
    return json({ ok:true, ...saved, canEdit:true })
  } catch (error) { return json({ ok:false, error:String(error?.message || error) }, 400) }
}

export async function onRequestDelete(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok:false, error:permission.reason || 'authentication required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('course content deletes')
    await ensureTable(db)
    const body = await context.request.json().catch(() => ({}))
    const slug = safeSlug(body?.slug)
    if (!slug) return json({ ok:false, error:'course slug is required' }, 400)
    if (slug === DEFAULT_SLUG) return json({ ok:false, error:'the seeded Thousand Servers course cannot be deleted' }, 400)
    await db.prepare('DELETE FROM course_content WHERE slug = ?').bind(slug).run()
    await writeAuditLog(db, { action:'course-content.delete', entityType:'course', entityId:slug, actor:inferActorFromRequest(context.request) })
    return json({ ok:true, removed:{ slug } })
  } catch (error) { return json({ ok:false, error:String(error?.message || error) }, 400) }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers:{ 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' } })
}
