import test from 'node:test'
import assert from 'node:assert/strict'
import {
  seed,
  normalizeCourse,
  publicCourse,
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
  return { env, cookie }
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
              ? ['I taught someone']
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
    cookie = await unlock(f, 'puscii', 'edit')
  const ctx = context(f, '/api/course-contributors', null, cookie)
  assert.equal((await resolvePublicSitePermission(ctx)).canEdit, false)
  assert.equal((await req(f, '/api/course-contributors?id=puscii&scope=private', null, cookie)).r.status, 200)
  const other = await req(f, '/api/course-contributors?id=bash', null, cookie)
  assert.equal(other.data.canEdit, false)
  const write = await req(
    f,
    '/api/course-contributors',
    { id: 'bash', revision: 0, item: { sharedAnswer: 'bad' } },
    cookie,
  )
  assert.equal(write.r.status, 403)
})
test('sign-in on private page opens the same project editor and keeps other projects private', async () => {
  const f = await fixture(), cookie = await unlock(f, 'puscii', 'private')
  assert.equal((await req(f, '/api/course-contributors?id=bash&scope=private', null, cookie)).r.status, 403)
  assert.equal((await req(f, '/api/course-contributors?id=puscii', null, cookie)).data.canEdit, true)
  assert.equal((await req(f, '/api/course-contributors', { id: 'puscii', scope: 'private', revision: 0, text: 'Team conversation' }, cookie)).r.status, 200)
  assert.equal((await req(f, '/api/course-contributors?id=puscii&scope=private', null, cookie)).data.text, 'Team conversation')
})
test('one password setup grants private workspace access and staff need no project password', async () => {
  const f = await fixture()
  assert.equal((await req(f, '/api/course-contributors?id=puscii&scope=private', null, f.cookie)).r.status, 200)
  assert.equal((await req(f, '/api/course-contributors', { action: 'credentials', id: 'puscii', editPassword: credentials.editPassword }, f.cookie)).r.status, 200)
  const login = await req(f, '/api/course-contributors', { action: 'login', id: 'puscii', password: credentials.editPassword })
  const cookie = login.r.headers.get('set-cookie').split(';')[0]
  assert.equal((await req(f, '/api/course-contributors?id=puscii&scope=private', null, cookie)).r.status, 200)
  assert.equal((await req(f, '/api/course-contributors?id=puscii&scope=private')).r.status, 403)
  const logout = await req(f, '/api/course-contributors', {action:'logout', id:'puscii', scope:'private'}, cookie)
  assert.match(logout.r.headers.get('set-cookie'), /sabot_course_edit=;.*Max-Age=0/)
})
test('private communications never appear in public API or server HTML', async () => {
  const f = await fixture(),
    cookie = await unlock(f, 'puscii', 'private')
  assert.equal(
    (
      await req(
        f,
        '/api/course-contributors',
        { id: 'puscii', scope: 'private', revision: 0, text: 'PRIVATE_CANARY' },
        cookie,
      )
    ).r.status,
    200,
  )
  const pub = await req(f, '/api/course-contributors?id=puscii')
  assert.ok(!JSON.stringify(pub.data).includes('PRIVATE_CANARY'))
  const html = await coursePage(context(f, '/guides/become-the-thousand-servers/contributors/puscii/private'))
  assert.ok(!(await html.text()).includes('PRIVATE_CANARY'))
  assert.match(html.headers.get('x-robots-tag'), /noarchive/)
  const privateRead = await req(f, '/api/course-contributors?id=puscii&scope=private', null, cookie)
  assert.equal(privateRead.data.text, 'PRIVATE_CANARY')
})
test('contributor changes need review; editor can publish, revisions recover older content', async () => {
  const f = await fixture(),
    cookie = await unlock(f, 'puscii', 'edit')
  await req(
    f,
    '/api/course-contributors',
    { id: 'puscii', revision: 0, item: { sharedAnswer: 'REVIEW_ONLY', status: 'published' } },
    cookie,
  )
  assert.equal((await req(f, '/api/course-contributors?id=puscii')).data.item, null)
  const current = (await req(f, '/api/course-contributors?id=puscii', null, f.cookie)).data
  assert.equal(current.item.status, 'review')
  await req(
    f,
    '/api/course-contributors',
    { id: 'puscii', revision: current.revision, item: { ...current.item, status: 'published' } },
    f.cookie,
  )
  assert.equal((await req(f, '/api/course-contributors?id=puscii')).data.item.sharedAnswer, 'REVIEW_ONLY')
  const history = await req(f, '/api/course-contributors?id=puscii&revisions=1', null, cookie)
  assert.equal(history.data.items.length, 2)
})
test('credential reset and disable revoke existing sessions; cookies have secure attributes', async () => {
  const f = await fixture(),
    cookie = await unlock(f, 'puscii', 'edit')
  await req(f, '/api/course-contributors', { id: 'puscii', action: 'credentials', disabled: true }, f.cookie)
  assert.equal((await req(f, '/api/course-contributors?id=puscii', null, cookie)).data.canEdit, false)
  await unlock(f, 'puscii', 'edit')
  assert.equal((await req(f, '/api/course-contributors?id=puscii', null, cookie)).data.canEdit, false)
  const { r } = await req(f, '/api/course-contributors', {
    id: 'puscii',
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
      (await req(f, '/api/course-contributors', { id: 'puscii', action: 'login', password: 'wrong' })).r
        .status,
      403,
    )
  assert.equal(
    (await req(f, '/api/course-contributors', { id: 'puscii', action: 'login', password: 'wrong' })).r.status,
    429,
  )
  const ctx = context(
    f,
    '/api/course-contributors',
    { id: 'puscii', action: 'credentials', ...credentials },
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
