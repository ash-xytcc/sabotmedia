import test from 'node:test'
import assert from 'node:assert/strict'
import {
  seed,
  normalizeCourse,
  publicCourse,
  G01_PREVIOUS_BODY,
  G01_BODY,
  G02_BODY,
  G03_BODY,
  G04_BODY,
  G05_BODY,
  G06_BODY,
  G07_BODY,
  G08_BODY,
  G09_BODY,
  G10_BODY,
  G11_BODY,
  G12_BODY,
  G13_BODY,
  repositoryCourseRevisions,
  TYPES,
} from '../public/guides/become-the-thousand-servers/lms/model.js'
import {
  blank,
  validateProgress,
  evaluate,
  complete,
  unlocked,
} from '../public/guides/become-the-thousand-servers/lms/progress.js'
import {
  encryptProgress,
  decryptProgress,
  writeToken,
} from '../public/guides/become-the-thousand-servers/lms/recovery.js'
import { renderCourse } from '../public/guides/become-the-thousand-servers/lms/render.js'
import { saveCourse, readCourse } from '../functions/api/_lib/courseStore.js'
import {
  createAdminSessionCookie,
  resolvePublicSitePermission,
} from '../functions/api/_lib/publicSiteAuth.js'
import { onRequest as contributors } from '../functions/api/course-contributors.js'
import { onRequest as recovery } from '../functions/api/course-recovery.js'
import { onRequest as courseApi } from '../functions/api/course-content.js'
import { onRequest as coursePage } from '../functions/guides/become-the-thousand-servers/[[path]].js'
import { testDb } from './helpers/course-db.mjs'
const origin = 'https://sabot.test'
async function fixture() {
  const env = { BF_DB: testDb(), SABOT_SESSION_SECRET: 'only-for-local-tests-not-a-real-session-secret' }
  const ctx = { env, request: new Request(origin) }
  const cookie = (await createAdminSessionCookie(ctx, 'test-editor')).split(';')[0]
  const f = { env, cookie }
  for (const [id, name] of [['test-project-a', 'Test Project A'], ['test-project-b', 'Test Project B']]) {
    await req(f, '/api/course-contributors', { action: 'create', id, name }, cookie)
  }
  return f
}
function context(f, path, body, cookie = '', method = body ? 'POST' : 'GET') {
  return {
    env: f.env,
    request: new Request(origin + path, {
      method,
      headers: { origin, 'content-type': 'application/json', cookie },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
    next: () => new Response('asset'),
  }
}
async function req(f, path, body, cookie, handler = contributors, method) {
  const r = await handler(context(f, path, body, cookie, method))
  return { r, data: await r.json() }
}
const credentials = {
  editPassword: 'public-edit-test-passphrase-123',
  privatePassword: 'private-comms-test-passphrase-456',
}
async function unlock(f, id, scope) {
  await req(f, '/api/course-contributors', { action: 'credentials', id, ...credentials }, f.cookie)
  const { r } = await req(f, '/api/course-contributors', {
    action: 'login',
    id,
    scope,
    password: credentials.editPassword,
  })
  assert.equal(r.status, 200)
  return r.headers.get('set-cookie').split(';')[0]
}
test('locked structure and all ten activity types', () => {
  const c = normalizeCourse(seed)
  assert.equal(c.sections.length, 13)
  assert.equal(c.lessons.length, 12)
  assert.deepEqual(new Set(c.activities.map((a) => a.type)), new Set(TYPES))
  assert.throws(() => normalizeCourse({ ...seed, sections: seed.sections.slice(1) }))
  assert.deepEqual(
    c.sections[4].lessonSlugs,
    c.lessons.slice(5, 8).map((l) => l.slug),
  )
})
test('legacy progress imports without losing notes, bookmarks, completion, scroll', () => {
  const id = seed.lessons[0].slug
  const s = validateProgress({
    course: seed.slug,
    version: 1,
    completedLessons: [id],
    startedLessons: [id],
    lastLesson: id,
    notes: { [id]: 'my note' },
    scrollByLesson: { [id]: 342 },
    bookmarks: [id + ':https://example.org'],
  })
  assert.equal(s.notes[id], 'my note')
  assert.equal(s.scrollByLesson[id], 342)
  assert.equal(s.bookmarks.length, 1)
  assert.ok(complete(seed, s, seed.lessons[0]))
  assert.throws(() => validateProgress({ ...s, version: 99 }))
  assert.throws(() => validateProgress({ ...s, course: 'elsewhere' }))
})
test('each activity checks its own answer shape', () => {
  for (const a of seed.activities) {
    const answer =
      a.type === 'matching'
        ? a.pairs.map((p) => p.right)
        : a.type === 'checklist'
          ? a.options.map((o) => o.id)
          : a.type === 'practical'
            ? ['confirmed']
            : ['short-reflection', 'teach-back'].includes(a.type)
              ? (a.type === 'teach-back' ? ['I taught someone', '__teachback_confirmed__'] : ['A reflection'])
              : a.answer
    assert.ok(evaluate(a, answer), a.type)
    assert.equal(evaluate(a, []), false, a.type)
  }
})
test('completion needs explicit manual/practical/activity rules and prerequisites', () => {
  const s = blank(),
    l = {
      ...seed.lessons[0],
      completion: { manual: true, practical: true, activities: ['dependency-choice'] },
    }
  s.viewed.push(l.slug)
  assert.equal(complete(seed, s, l), false)
  s.completedLessons.push(l.slug)
  s.practical.push(l.slug)
  assert.equal(complete(seed, s, l), false)
  s.activities['dependency-choice'] = [{ version: 1, passed: true, answer: ['person'] }]
  assert.ok(complete(seed, s, l))
  assert.ok(unlocked(seed, s, { prerequisites: [l.slug] }))
  assert.equal(unlocked(seed, s, { prerequisites: ['missing'] }), false)
})
test('published projection excludes drafts and private testing records', () => {
  const c = structuredClone(seed)
  c.sections[1].status = 'draft'
  c.sections[1].body = 'DRAFT_SECRET'
  c.testing = [{ concerns: 'PRIVATE_TESTING' }]
  c.private_text = 'SECRET'
  const html = renderCourse(publicCourse(c))
  assert.ok(!html.includes('DRAFT_SECRET'))
  assert.ok(!html.includes('PRIVATE_TESTING'))
  assert.ok(!html.includes('private_text'))
  assert.ok(html.includes('Map Your Dependencies'))
  assert.ok(html.includes('Your progress belongs to you.'))
})
test('course saves atomically keep publication and revision history separate', async () => {
  const f = await fixture(),
    db = f.env.BF_DB
  const c = structuredClone(seed)
  await saveCourse(db, c, { actor: 'editor' })
  const draft = await readCourse(db, seed.slug, true)
  draft.status = 'review'
  draft.intro = 'UNPUBLISHED_DRAFT'
  await saveCourse(db, draft, { actor: 'editor' })
  assert.notEqual((await readCourse(db, seed.slug)).intro, 'UNPUBLISHED_DRAFT')
  assert.equal((await readCourse(db, seed.slug, true)).intro, 'UNPUBLISHED_DRAFT')
  await assert.rejects(() => saveCourse(db, draft, { actor: 'editor' }), /Conflict/)
  const rows = await db.prepare('SELECT * FROM course_revisions').all()
  assert.equal(rows.results.length, 2)
})
test('stale published manuscript is upgraded by content version even when old text fingerprints do not match', async () => {
  const db = testDb()
  const old = structuredClone(seed)
  old.contentVersion = '2026.09-lms-1'
  old.sections.find((section) => section.id === 'G01').body = 'VERY OLD PUBLIC G01 COPY'
  old.modules.find((module) => module.id === 'blog-finish').body = 'VERY OLD PUBLIC APPENDIX COPY'
  old.sections.find((section) => section.id === 'G01').contributors = ['respondent-alpha']

  const first = await saveCourse(db, old, { actor: 'setup' })

  const editorial = structuredClone(first)
  editorial.status = 'review'
  editorial.intro = 'UNPUBLISHED_EDITORIAL_REVIEW'
  await saveCourse(db, editorial, { actor: 'editor' })

  const published = await readCourse(db, seed.slug)
  assert.equal(published.contentVersion, seed.contentVersion)
  assert.equal(published.sections.find((section) => section.id === 'G01').body, G01_BODY)
  assert.match(published.modules.find((module) => module.id === 'blog-finish').body, /handoff defect to fix/)
  assert.deepEqual(published.sections.find((section) => section.id === 'G01').contributors, ['respondent-alpha'])
  assert.notEqual(published.intro, 'UNPUBLISHED_EDITORIAL_REVIEW')

  const storedEditorial = await readCourse(db, seed.slug, true)
  assert.equal(storedEditorial.intro, 'UNPUBLISHED_EDITORIAL_REVIEW')

  const rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  assert.equal(rows.results.filter((row) => row.actor_id === `published-manuscript:${seed.contentVersion}`).length, 1)
})

test('repository revisions update the published snapshot without exposing unrelated editorial review changes', async () => {
  const db = testDb()
  const old = structuredClone(seed)
  old.sections[0].body = G01_PREVIOUS_BODY

  const first = await saveCourse(db, old, { actor: 'setup' })
  const review = structuredClone(first)
  review.status = 'review'
  review.intro = 'UNPUBLISHED_REVIEW_COPY'
  await saveCourse(db, review, { actor: 'editor' })

  const published = await readCourse(db, seed.slug)
  assert.equal(published.sections.find((section) => section.id === 'G01').body, G01_BODY)
  assert.notEqual(published.intro, 'UNPUBLISHED_REVIEW_COPY')

  const editorial = await readCourse(db, seed.slug, true)
  assert.equal(editorial.sections.find((section) => section.id === 'G01').body, G01_BODY)
  assert.equal(editorial.intro, 'UNPUBLISHED_REVIEW_COPY')
})

test('repository course revisions apply once, preserve other sections, and enter revision history', async () => {
  const db = testDb()
  const old = structuredClone(seed)
  old.sections[0].body = G01_PREVIOUS_BODY
  old.sections[1].body = 'KEEP_THIS_SECTION'
  await saveCourse(db, old, { actor: 'setup' })

  const migrated = await readCourse(db, seed.slug, true)
  assert.equal(migrated.sections[0].body, G01_BODY)
  assert.equal(migrated.sections[1].body, 'KEEP_THIS_SECTION')

  let rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  assert.equal(rows.results.length, 1)
  assert.match(rows.results[0].actor_id, /2026-09-17-g01-revision-1/)

  await readCourse(db, seed.slug, true)
  rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  assert.equal(rows.results.length, 1)
})
test('G02 repository revision updates the dependency lesson and derived activities without clobbering unrelated content', async () => {
  const db = testDb()
  const old = structuredClone(seed)
  const revision = repositoryCourseRevisions.find((item) => item.id === '2026-09-17-g02-revision-1')
  old.sections.find((section) => section.id === 'G02').body = revision.section.from
  const lesson = old.lessons.find((item) => item.slug === revision.lesson.slug)
  Object.assign(lesson, structuredClone(revision.lesson.from))
  old.sections.find((section) => section.id === 'G03').body = 'KEEP_G03'

  for (const patch of revision.activities) {
    const activity = old.activities.find((item) => item.id === patch.id)
    Object.assign(activity, structuredClone(patch.from))
  }

  await saveCourse(db, old, { actor: 'setup' })
  const migrated = await readCourse(db, seed.slug, true)
  assert.equal(migrated.sections.find((section) => section.id === 'G02').body, G02_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G03').body, 'KEEP_G03')
  assert.match(migrated.lessons.find((item) => item.slug === 'map-your-dependencies').learn, /registrar is not normally a hop/)
  assert.match(migrated.lessons.find((item) => item.slug === 'map-your-dependencies').learn, /Recovery Point Objective/)
  assert.match(migrated.activities.find((item) => item.id === 'dependency-choice').prompt, /account and recovery method/)

  const rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  assert.equal(rows.results.filter((row) => row.actor_id.includes('2026-09-17-g02-revision-1')).length, 1)
})
test('G03 repository revision updates DNS and SSH lessons and activity versions without clobbering G04', async () => {
  const db = testDb()
  const old = structuredClone(seed)
  const revision = repositoryCourseRevisions.find((item) => item.id === '2026-09-17-g03-revision-1')
  old.sections.find((section) => section.id === 'G03').body = revision.section.from
  old.sections.find((section) => section.id === 'G04').body = 'KEEP_G04'

  for (const lessonPatch of revision.lessons) {
    const lesson = old.lessons.find((item) => item.slug === lessonPatch.slug)
    Object.assign(lesson, structuredClone(lessonPatch.from))
  }
  for (const patch of revision.activities) {
    const activity = old.activities.find((item) => item.id === patch.id)
    Object.assign(activity, structuredClone(patch.from))
  }

  await saveCourse(db, old, { actor: 'setup' })
  const migrated = await readCourse(db, seed.slug, true)

  assert.equal(migrated.sections.find((section) => section.id === 'G03').body, G03_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G04').body, 'KEEP_G04')
  assert.match(migrated.lessons.find((item) => item.slug === 'read-dns').learn, /parent zone delegates/)
  assert.match(migrated.lessons.find((item) => item.slug === 'read-dns').learn, /serve stale data|serve stale|stale data|serve stale/i)
  assert.match(migrated.lessons.find((item) => item.slug === 'ssh-disposable-linux').learn, /known_hosts/)
  assert.match(migrated.lessons.find((item) => item.slug === 'ssh-disposable-linux').do, /ssh-keygen -F/)
  assert.equal(migrated.activities.find((item) => item.id === 'read-dns-verify').version, 2)
  assert.equal(migrated.activities.find((item) => item.id === 'dns-match').version, 2)
  assert.equal(migrated.activities.find((item) => item.id === 'ssh-disposable-linux-verify').version, 2)

  const rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  assert.equal(rows.results.filter((row) => row.actor_id.includes('2026-09-17-g03-revision-1')).length, 1)
})
test('G04 and G05 repository revisions update lessons and activities without clobbering G06', async () => {
  const db = testDb()
  const old = structuredClone(seed)

  for (const revisionId of ['2026-09-17-g04-revision-1','2026-09-17-g05-revision-1']) {
    const revision = repositoryCourseRevisions.find((item) => item.id === revisionId)
    old.sections.find((section) => section.id === revision.section.id).body = revision.section.from
    for (const lessonPatch of revision.lessons) {
      const lesson = old.lessons.find((item) => item.slug === lessonPatch.slug)
      Object.assign(lesson, structuredClone(lessonPatch.from))
    }
    for (const patch of revision.activities) {
      const activity = old.activities.find((item) => item.id === patch.id)
      Object.assign(activity, structuredClone(patch.from))
    }
  }
  old.sections.find((section) => section.id === 'G06').body = 'KEEP_G06'

  await saveCourse(db, old, { actor: 'setup' })
  const migrated = await readCourse(db, seed.slug, true)

  assert.equal(migrated.sections.find((section) => section.id === 'G04').body, G04_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G05').body, G05_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G06').body, 'KEEP_G06')
  assert.match(migrated.lessons.find((item) => item.slug === 'first-disposable-page').learn, /HTTP\/3/)
  assert.match(migrated.lessons.find((item) => item.slug === 'understand-exposure').do, /curl -4/)
  assert.match(migrated.lessons.find((item) => item.slug === 'real-backup').learn, /consistent backup method/)
  assert.match(migrated.lessons.find((item) => item.slug === 'destroy-and-rebuild').learn, /changed-host-key warning/)
  assert.match(migrated.lessons.find((item) => item.slug === 'learn-to-leave').do, /curl --resolve/)
  assert.equal(migrated.activities.find((item) => item.id === 'request-sequence').version, 2)
  assert.equal(migrated.activities.find((item) => item.id === 'backup-scenario').version, 2)
  assert.equal(migrated.activities.find((item) => item.id === 'learn-to-leave-verify').version, 2)

  const rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  assert.equal(rows.results.filter((row) => row.actor_id.includes('2026-09-17-g04-revision-1')).length, 1)
  assert.equal(rows.results.filter((row) => row.actor_id.includes('2026-09-17-g05-revision-1')).length, 1)
})

test('G06 and G07 repository revisions update access and preservation lessons without clobbering G08', async () => {
  const db = testDb()
  const old = structuredClone(seed)
  for (const revisionId of ['2026-09-17-g06-revision-1','2026-09-17-g07-revision-1']) {
    const revision = repositoryCourseRevisions.find((item) => item.id === revisionId)
    old.sections.find((section) => section.id === revision.section.id).body = revision.section.from
    for (const lessonPatch of revision.lessons) {
      Object.assign(old.lessons.find((item) => item.slug === lessonPatch.slug), structuredClone(lessonPatch.from))
    }
    for (const patch of revision.activities) {
      Object.assign(old.activities.find((item) => item.id === patch.id), structuredClone(patch.from))
    }
  }
  old.sections.find((section) => section.id === 'G08').body = 'KEEP_G08'
  await saveCourse(db, old, { actor: 'setup' })
  const migrated = await readCourse(db, seed.slug, true)
  assert.equal(migrated.sections.find((section) => section.id === 'G06').body, G06_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G07').body, G07_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G08').body, 'KEEP_G08')
  assert.match(migrated.lessons.find((item) => item.slug === 'stop-being-only-admin').learn, /personal recovery codes/)
  assert.match(migrated.lessons.find((item) => item.slug === 'stop-being-only-admin').do, /non-human access/)
  assert.match(migrated.lessons.find((item) => item.slug === 'mirror-publish-survival').learn, /--warc-file/)
  assert.match(migrated.lessons.find((item) => item.slug === 'mirror-publish-survival').do, /localhost/)
  assert.equal(migrated.activities.find((item) => item.id === 'stop-being-only-admin-verify').version, 2)
  assert.equal(migrated.activities.find((item) => item.id === 'mirror-publish-survival-verify').version, 2)
  const rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  assert.equal(rows.results.filter((row) => row.actor_id.includes('2026-09-17-g06-revision-1')).length, 1)
  assert.equal(rows.results.filter((row) => row.actor_id.includes('2026-09-17-g07-revision-1')).length, 1)
})

test('G08 and G09 repository revisions update networking lessons and judgment section without clobbering G10', async () => {
  const db = testDb()
  const old = structuredClone(seed)
  for (const revisionId of ['2026-09-17-g08-revision-1','2026-09-17-g09-revision-1']) {
    const revision = repositoryCourseRevisions.find((item) => item.id === revisionId)
    old.sections.find((section) => section.id === revision.section.id).body = revision.section.from
    for (const lessonPatch of revision.lessons || []) Object.assign(old.lessons.find((item) => item.slug === lessonPatch.slug), structuredClone(lessonPatch.from))
    for (const patch of revision.activities || []) Object.assign(old.activities.find((item) => item.id === patch.id), structuredClone(patch.from))
  }
  old.sections.find((section) => section.id === 'G10').body = 'KEEP_G10'
  await saveCourse(db, old, { actor: 'setup' })
  const migrated = await readCourse(db, seed.slug, true)
  assert.equal(migrated.sections.find((section) => section.id === 'G08').body, G08_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G09').body, G09_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G10').body, 'KEEP_G10')
  assert.match(migrated.lessons.find((item) => item.slug === 'local-network').learn, /Unique Local Addresses/)
  assert.match(migrated.lessons.find((item) => item.slug === 'local-network').do, /ip route get/)
  assert.match(migrated.lessons.find((item) => item.slug === 'connect-differently-teach').learn, /16-byte \(128-bit\) hashes/)
  assert.match(migrated.lessons.find((item) => item.slug === 'connect-differently-teach').do, /ip -6 addr show scope link/)
  assert.equal(migrated.activities.find((item) => item.id === 'local-network-verify').version, 2)
  assert.equal(migrated.activities.find((item) => item.id === 'connect-differently-teach-verify').version, 2)
  const rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  assert.equal(rows.results.filter((row) => row.actor_id.includes('2026-09-17-g08-revision-1')).length, 1)
  assert.equal(rows.results.filter((row) => row.actor_id.includes('2026-09-17-g09-revision-1')).length, 1)
})

test('G10-G13 repository revisions update the human-infrastructure closing sequence and log independently', async () => {
  const db = testDb()
  const old = structuredClone(seed)
  for (const revisionId of [
    '2026-09-17-g10-revision-1',
    '2026-09-17-g11-revision-1',
    '2026-09-17-g12-revision-1',
    '2026-09-17-g13-revision-1',
  ]) {
    const revision = repositoryCourseRevisions.find((item) => item.id === revisionId)
    old.sections.find((section) => section.id === revision.section.id).body = revision.section.from
  }
  old.sections.find((section) => section.id === 'G09').body = 'KEEP_G09'

  await saveCourse(db, old, { actor: 'setup' })
  const migrated = await readCourse(db, seed.slug, true)

  assert.equal(migrated.sections.find((section) => section.id === 'G09').body, 'KEEP_G09')
  assert.equal(migrated.sections.find((section) => section.id === 'G10').body, G10_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G11').body, G11_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G12').body, G12_BODY)
  assert.equal(migrated.sections.find((section) => section.id === 'G13').body, G13_BODY)
  assert.match(G10_BODY, /maintenance debt explicitly/)
  assert.match(G11_BODY, /every critical capability has more than one route/)
  assert.match(G12_BODY, /continue, restore, preserve, transfer, or retire\/delete/)
  assert.match(G13_BODY, /The thousand servers are the distributed capacity/)

  const rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  for (const revisionId of [
    '2026-09-17-g10-revision-1',
    '2026-09-17-g11-revision-1',
    '2026-09-17-g12-revision-1',
    '2026-09-17-g13-revision-1',
  ]) {
    assert.equal(rows.results.filter((row) => row.actor_id.includes(revisionId)).length, 1)
  }
})

test('repository recovery-path revision upgrades matching stored modules and logs the change', async () => {
  const db = testDb()
  const old = structuredClone(seed)
  old.modules.find((module) => module.id === 'blog-finish').body = "Open the final public address while logged out. Remove staging access restrictions only after checking that drafts, private posts and personal details stay private. Verify important posts/pages, menu links, media/downloads, author credits and HTTPS again. Recheck the backup after any domain/address or reconstruction changes; keep a fresh independent copy that matches the final site and document the changes from your restore test.\n\nWrite a short handoff in your recovery folder: “The blog is at __. It runs on __. The domain is controlled through __ / not controlled by us. Backups are at __, dated __. To restore, follow __. Missing media/remaining repairs: __. The person responsible for updates is __. Access can be recovered through __.” Keep passwords out of the document; point to the agreed secure way to obtain them. Another person should be able to follow the instructions without guessing who Dave is.\n\nUse the checks below to record work actually performed. Reading this page does not restore anything. Once all checkpoints on your chosen WordPress trail are self-confirmed, the pathway will show its recovery-complete exit. With JavaScript disabled or in the offline edition, review each checklist manually; if every applicable item has been done, the same exit applies.\n\nYou do not need to complete the other twelve lessons to finish hosted blog recovery. You can come back later to learn more, with your recovery work and older activity attempts still saved."
  await saveCourse(db, old, { actor: 'setup' })

  const migrated = await readCourse(db, seed.slug, true)
  assert.match(migrated.modules.find((module) => module.id === 'blog-finish').body, /handoff defect to fix/)
  const rows = await db.prepare("SELECT * FROM course_revisions WHERE actor_type='repository'").all()
  assert.equal(rows.results.filter((row) => row.actor_id.includes('2026-09-17-blog-recovery-revision-1')).length, 1)
})

test('anonymous cannot list editorial courses or history and public API cannot reveal draft', async () => {
  const f = await fixture()
  assert.equal((await req(f, '/api/course-content?list=1', null, '', courseApi)).r.status, 403)
  assert.equal((await req(f, '/api/course-content?revisions=1', null, '', courseApi)).r.status, 403)
  const c = structuredClone(seed)
  c.status = 'draft'
  c.intro = 'DO_NOT_PUBLISH'
  await saveCourse(f.env.BF_DB, c, { actor: 'editor' })
  const out = await req(f, '/api/course-content?edit=1', null, '', courseApi)
  assert.notEqual(out.data.item.intro, 'DO_NOT_PUBLISH')
})
test('one project credential opens own private comms but cannot access other projects or SabotPress', async () => {
  const f = await fixture(),
    cookie = await unlock(f, 'test-project-a', 'edit')
  const ctx = context(f, '/api/course-contributors', null, cookie)
  assert.equal((await resolvePublicSitePermission(ctx)).canEdit, false)
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a&scope=private', null, cookie)).r.status, 200)
  const other = await req(f, '/api/course-contributors?id=test-project-b', null, cookie)
  assert.equal(other.data.canEdit, false)
  const write = await req(
    f,
    '/api/course-contributors',
    { id: 'test-project-b', revision: 0, item: { sharedAnswer: 'bad' } },
    cookie,
  )
  assert.equal(write.r.status, 403)
})
test('sign-in on private page opens the same project editor and keeps other projects private', async () => {
  const f = await fixture(), cookie = await unlock(f, 'test-project-a', 'private')
  assert.equal((await req(f, '/api/course-contributors?id=test-project-b&scope=private', null, cookie)).r.status, 403)
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a', null, cookie)).data.canEdit, true)
  assert.equal((await req(f, '/api/course-contributors', { id: 'test-project-a', scope: 'private', revision: 0, text: 'Team conversation' }, cookie)).r.status, 200)
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a&scope=private', null, cookie)).data.text, 'Team conversation')
})
test('one password setup grants private workspace access and editors need no project password', async () => {
  const f = await fixture()
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a&scope=private', null, f.cookie)).r.status, 200)
  assert.equal((await req(f, '/api/course-contributors', { action: 'credentials', id: 'test-project-a', editPassword: credentials.editPassword }, f.cookie)).r.status, 200)
  const login = await req(f, '/api/course-contributors', { action: 'login', id: 'test-project-a', password: credentials.editPassword })
  const cookie = login.r.headers.get('set-cookie').split(';')[0]
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a&scope=private', null, cookie)).r.status, 200)
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a&scope=private')).r.status, 403)
  const logout = await req(f, '/api/course-contributors', {action:'logout', id:'test-project-a', scope:'private'}, cookie)
  assert.match(logout.r.headers.get('set-cookie'), /sabot_course_edit=;.*Max-Age=0/)
})
test('private communications never appear in public API or server HTML', async () => {
  const f = await fixture(),
    cookie = await unlock(f, 'test-project-a', 'private')
  assert.equal(
    (
      await req(
        f,
        '/api/course-contributors',
        { id: 'test-project-a', scope: 'private', revision: 0, text: 'PRIVATE_CANARY' },
        cookie,
      )
    ).r.status,
    200,
  )
  const pub = await req(f, '/api/course-contributors?id=test-project-a')
  assert.ok(!JSON.stringify(pub.data).includes('PRIVATE_CANARY'))
  const html = await coursePage(context(f, '/guides/become-the-thousand-servers/contributors/test-project-a/private'))
  assert.ok(!(await html.text()).includes('PRIVATE_CANARY'))
  assert.match(html.headers.get('x-robots-tag'), /noarchive/)
  const privateRead = await req(f, '/api/course-contributors?id=test-project-a&scope=private', null, cookie)
  assert.equal(privateRead.data.text, 'PRIVATE_CANARY')
})
test('contributor changes need review; editor can publish, revisions recover older content', async () => {
  const f = await fixture(),
    cookie = await unlock(f, 'test-project-a', 'edit')
  await req(
    f,
    '/api/course-contributors',
    { id: 'test-project-a', revision: 0, item: { sharedAnswer: 'REVIEW_ONLY', status: 'published' } },
    cookie,
  )
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a')).data.item, null)
  const current = (await req(f, '/api/course-contributors?id=test-project-a', null, f.cookie)).data
  assert.equal(current.item.status, 'review')
  await req(
    f,
    '/api/course-contributors',
    { id: 'test-project-a', revision: current.revision, item: { ...current.item, status: 'published' } },
    f.cookie,
  )
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a')).data.item.sharedAnswer, 'REVIEW_ONLY')
  const history = await req(f, '/api/course-contributors?id=test-project-a&revisions=1', null, cookie)
  assert.equal(history.data.items.length, 2)
})
test('credential reset and disable revoke existing sessions; cookies have secure attributes', async () => {
  const f = await fixture(),
    cookie = await unlock(f, 'test-project-a', 'edit')
  await req(f, '/api/course-contributors', { id: 'test-project-a', action: 'credentials', disabled: true }, f.cookie)
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a', null, cookie)).data.canEdit, false)
  await unlock(f, 'test-project-a', 'edit')
  assert.equal((await req(f, '/api/course-contributors?id=test-project-a', null, cookie)).data.canEdit, false)
  const { r } = await req(f, '/api/course-contributors', {
    id: 'test-project-a',
    action: 'login',
    password: credentials.editPassword,
  })
  for (const value of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=3600'])
    assert.ok(r.headers.get('set-cookie').includes(value))
})
test('login rate limiting and cross-origin writes are rejected', async () => {
  const f = await fixture()
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await req(f, '/api/course-contributors', { id: 'test-project-a', action: 'login', password: 'wrong' })).r
        .status,
      403,
    )
  assert.equal(
    (await req(f, '/api/course-contributors', { id: 'test-project-a', action: 'login', password: 'wrong' })).r.status,
    429,
  )
  const ctx = context(
    f,
    '/api/course-contributors',
    { id: 'test-project-a', action: 'credentials', ...credentials },
    f.cookie,
  )
  ctx.request.headers.set('origin', 'https://other.test')
  assert.equal((await contributors(ctx)).status, 403)
})
test('AES-GCM recovery round trips all local state without plaintext or key on server', async () => {
  const f = await fixture(),
    s = blank()
  s.notes[seed.lessons[0].slug] = 'PRIVATE_LEARNER_NOTE'
  s.activities['dependency-choice'] = [
    { version: 1, at: new Date().toISOString(), passed: true, answer: ['person'] },
  ]
  const { code, blob } = await encryptProgress(s)
  assert.ok(!JSON.stringify(blob).includes('PRIVATE_LEARNER_NOTE'))
  assert.ok(!JSON.stringify(blob).includes(code.split('.')[2]))
  assert.equal(
    (await req(f, '/api/course-recovery', { action: 'create', ...blob }, '', recovery)).r.status,
    200,
  )
  const read = await req(
    f,
    '/api/course-recovery',
    { action: 'read', recoveryId: blob.recoveryId },
    '',
    recovery,
  )
  assert.deepEqual(validateProgress(await decryptProgress(code, read.data.blob)), s)
  const bad = { ...blob, ciphertext: 'A' + blob.ciphertext.slice(1) }
  await assert.rejects(() => decryptProgress(code, bad))
  assert.equal(
    (await req(f, '/api/course-recovery', { action: 'create', ...blob }, '', recovery)).r.status,
    400,
  )
})
test('recovery expiry is enforced and settings need admin permission', async () => {
  const f = await fixture(),
    { blob } = await encryptProgress(blank())
  await req(f, '/api/course-recovery', { action: 'create', ...blob }, '', recovery)
  await f.env.BF_DB.prepare('UPDATE course_recovery SET expires=0').run()
  assert.equal(
    (await req(f, '/api/course-recovery', { action: 'read', recoveryId: blob.recoveryId }, '', recovery)).r
      .status,
    404,
  )
  assert.equal(
    (await req(f, '/api/course-recovery', { action: 'settings', days: 2 }, '', recovery)).r.status,
    403,
  )
})

test('legacy stored lesson aliases preserve authored prose and restore locked mapping', () => {
  const legacy = structuredClone(seed)
  delete legacy.schemaVersion
  delete legacy.sections
  legacy.lessons[9].slug = 'publish-for-survival'
  legacy.lessons[10].slug = 'run-local-learn-network'
  legacy.lessons[9].learn = 'Author edited this lesson before the LMS migration.'
  const migrated = normalizeCourse(legacy)
  assert.equal(migrated.lessons[9].learn, legacy.lessons[9].learn)
  assert.equal(migrated.lessons[9].slug, seed.lessons[9].slug)
  assert.equal(migrated.lessons[10].slug, seed.lessons[10].slug)
})
test('fresh public course hides unpublished working documents', async () => {
  const f = await fixture()
  assert.equal((await readCourse(f.env.BF_DB, seed.slug)).documents.length, 0)
  assert.equal((await readCourse(f.env.BF_DB, seed.slug, true)).documents.length, 3)
})

test('reusable card keeps its code and updates only with write authorization and current revision', async () => {
  const f = await fixture(), initial = blank()
  const first = await encryptProgress(initial), token = await writeToken(first.code)
  const create = await req(f, '/api/course-recovery', {action:'create',...first.blob,writeToken:token}, '', recovery)
  assert.equal(create.r.status, 200)
  assert.equal(create.data.revision, 1)
  initial.notes[seed.lessons[0].slug] = 'A later lesson, same card'
  const next = await encryptProgress(initial, first.code)
  assert.equal(next.code, first.code)
  assert.notEqual(next.blob.iv, first.blob.iv)
  assert.ok(!JSON.stringify({...next.blob,writeToken:token}).includes(first.code.split('.')[2]))
  const body = {action:'update',...next.blob,writeToken:token,revision:1}
  assert.equal((await req(f, '/api/course-recovery', {...body,writeToken:'A'.repeat(43)}, '', recovery)).r.status, 403)
  const update = await req(f, '/api/course-recovery', body, '', recovery)
  assert.equal(update.r.status, 200)
  assert.equal(update.data.revision, 2)
  assert.equal((await req(f, '/api/course-recovery', body, '', recovery)).r.status, 409)
  const read = await req(f, '/api/course-recovery', {action:'read',recoveryId:first.blob.recoveryId}, '', recovery)
  assert.deepEqual(await decryptProgress(first.code, read.data.blob), initial)
  assert.equal(read.data.revision, 2)
  const stored = await f.env.BF_DB.prepare('SELECT token_hash FROM course_recovery_writers WHERE id=?').bind(first.blob.recoveryId).first()
  assert.notEqual(stored.token_hash, token)
  await f.env.BF_DB.prepare('UPDATE course_recovery SET expires=0').run()
  assert.equal((await req(f, '/api/course-recovery', {action:'read',recoveryId:first.blob.recoveryId}, '', recovery)).r.status, 404)
  assert.equal((await req(f, '/api/course-recovery', {...body,revision:2}, '', recovery)).r.status, 200)
})
test('publication rejects missing requirements and prerequisite cycles with useful validation errors', () => {
  const c = structuredClone(seed)
  c.lessons[0].completion.activities = ['not-an-activity']
  assert.throws(() => normalizeCourse(c), {name:'CourseValidationError',message:/does not exist/})
  c.lessons[0].completion.activities = [c.lessons[0].activities[0]]
  c.activities.find(a=>a.id===c.lessons[0].activities[0]).status='draft'
  assert.throws(() => normalizeCourse(c), /Required activities must be published/)
  const cycle=structuredClone(seed)
  cycle.lessons[0].enforcePrerequisites=true;cycle.lessons[1].enforcePrerequisites=true
  cycle.lessons[0].prerequisites=[cycle.lessons[1].slug];cycle.lessons[1].prerequisites=[cycle.lessons[0].slug]
  assert.throws(()=>normalizeCourse(cycle),/cycle/)
})
test('legacy archived content never falls back to the public seed', async () => {
  const f=await fixture(), old={...structuredClone(seed),schemaVersion:1,status:'archived'}
  await readCourse(f.env.BF_DB,seed.slug)
  await f.env.BF_DB.prepare('INSERT INTO course_content(slug,content_json) VALUES(?,?)').bind(seed.slug,JSON.stringify(old)).run()
  assert.equal(await readCourse(f.env.BF_DB,seed.slug),null)
})
test('editor review list includes exact pending submissions without exposing them publicly', async () => {
  const f=await fixture(),cookie=await unlock(f,'test-project-a','edit')
  await req(f,'/api/course-contributors',{id:'test-project-a',revision:0,item:{sharedAnswer:'Draft answer'}},cookie)
  const editorial=await req(f,'/api/course-contributors',null,f.cookie)
  const item=editorial.data.items.find(x=>x.id==='test-project-a')
  assert.equal(item.status,'review')
  assert.equal(item.pendingCount,1)
  assert.ok(JSON.stringify(item.pending).includes('Draft answer'))
  const publicList=await req(f,'/api/course-contributors')
  assert.equal(publicList.data.items.some(x=>x.id==='test-project-a'),false)
  assert.ok(!JSON.stringify(publicList.data).includes('Draft answer'))
})
test('teach-back needs explicit confirmation and a nonempty reflection',()=>{
  const a=seed.activities.find(x=>x.type==='teach-back')
  assert.equal(evaluate(a,['I explained it']),false)
  assert.equal(evaluate(a,['','__teachback_confirmed__']),false)
  assert.equal(evaluate(a,['I explained it','__teachback_confirmed__']),true)
})
