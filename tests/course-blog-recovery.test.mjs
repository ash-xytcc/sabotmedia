import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {seed,normalizeCourse,publicCourse,sectionMap} from '../public/guides/become-the-thousand-servers/lms/model.js'
import {withRecoveryPathway} from '../public/guides/become-the-thousand-servers/lms/blog-recovery.js'
import {blank,validateProgress,activityPassed} from '../public/guides/become-the-thousand-servers/lms/progress.js'
import {pathwaySteps,pathwayComplete} from '../public/guides/become-the-thousand-servers/lms/pathways.js'
import {renderCourse} from '../public/guides/become-the-thousand-servers/lms/render.js'
import {renderOfflineEdition} from '../public/guides/become-the-thousand-servers/lms/offline.js'
import {readCourse,saveCourse,ensureCourseTables} from '../functions/api/_lib/courseStore.js'
import {onRequest} from '../functions/guides/become-the-thousand-servers/[[path]].js'
import {testDb} from './helpers/course-db.mjs'
const course=()=>publicCourse(seed)
const finish=(c,s,variant)=>{for(const m of pathwaySteps(c,c.pathways[0],variant))for(const id of m.activities){const a=c.activities.find((a)=>a.id===id);s.activities[id]=[{version:a.version,at:new Date().toISOString(),passed:true,answer:a.type==='checklist'?a.options.map((o)=>o.id):a.answer}]}}

test('blog task exists and thirteen guide sections and twelve lesson identifiers/order stay fixed',()=>{
 const c=normalizeCourse(seed)
 assert.match(c.pathways[0].title,/NoBlogs \/ WordPress XML/)
 assert.deepEqual(c.sections.map((s)=>s.id),Array.from({length:13},(_,i)=>'G'+String(i+1).padStart(2,'0')))
 const slugs=['map-your-dependencies','read-dns','ssh-disposable-linux','first-disposable-page','understand-exposure','real-backup','destroy-and-rebuild','learn-to-leave','stop-being-only-admin','mirror-publish-survival','local-network','connect-differently-teach']
 assert.deepEqual(c.lessons.map((l)=>l.slug),slugs)
 assert.deepEqual(c.sections.map((s)=>s.lessonSlugs),sectionMap.map(([,ns])=>ns.map((n)=>slugs[n-1])))
 assert.ok(c.modules.every((m)=>c.sections.some((s)=>s.id===m.sectionId)))
})
test('hosted recovery completes without self-host steps and never completes the wider course',()=>{
 const c=course(),s=blank(),p=c.pathways[0]
 assert.equal(pathwayComplete(c,s,p,'hosted'),false)
 assert.ok(!pathwaySteps(c,p,'hosted').some((m)=>['blog-server','blog-selfhost'].includes(m.id)))
 finish(c,s,'hosted');assert.equal(pathwayComplete(c,s,p,'hosted'),true)
 assert.deepEqual(s.completedLessons,[]);assert.deepEqual(s.completedSections,[])
 assert.match(renderCourse(c),/Continue the broader course/)
 for(const id of ['blog-import-check','blog-media-check','blog-backup-check','blog-domain-check','blog-finish-check']){
  const before=s.activities[id];s.activities[id]=[];assert.equal(pathwayComplete(c,s,p,'hosted'),false,id);s.activities[id]=before
 }
})
test('self-host route adds infrastructure links and its additional practical checkpoints',()=>{
 const c=course(),p=c.pathways[0],s=blank();finish(c,s,'hosted')
 assert.equal(pathwayComplete(c,s,p,'self-hosted'),false)
 const links=pathwaySteps(c,p,'self-hosted').flatMap((m)=>m.lessonSlugs)
 for(const n of [1,2,3,4,5,6,7,8])assert.ok(links.includes(c.lessons[n-1].slug))
 finish(c,s,'self-hosted');assert.equal(pathwayComplete(c,s,p,'self-hosted'),true)
})
test('alternative destination handoff never claims recovered blog',()=>{
 const c=course(),s=blank();finish(c,s,'other');assert.equal(pathwayComplete(c,s,c.pathways[0],'other'),false)
 assert.match(c.modules.find((m)=>m.id==='blog-handoff').body,/not a claim that your blog is restored/)
})
test('old snapshots get additive content once without overwriting authored content, activity or testing history',()=>{
 const old=structuredClone(seed);delete old.pathwaySchemaVersion;delete old.pathways;delete old.modules
 old.activities=old.activities.filter((a)=>!a.id.startsWith('blog-'));old.testing=[{id:'existing',actual:'PRIVATE'}];old.sections[0].body='AUTHORED';old.revision=42
 const upgraded=withRecoveryPathway(old)
 assert.equal(upgraded.revision,42);assert.equal(upgraded.sections[0].body,'AUTHORED');assert.equal(upgraded.testing[0].actual,'PRIVATE');assert.deepEqual(upgraded.activities.slice(0,old.activities.length),old.activities)
 assert.deepEqual(withRecoveryPathway(upgraded),upgraded)
 upgraded.pathways=[];upgraded.modules=[];assert.equal(withRecoveryPathway(upgraded).modules.length,0)
 assert.equal(withRecoveryPathway(null),null)
 assert.equal(withRecoveryPathway({...old,slug:'other'}).modules,undefined)
})
test('read-time migration preserves stored bytes; editor save persists withdrawal and revision history',async()=>{
 const db=testDb();await ensureCourseTables(db)
 const old=structuredClone(seed);delete old.pathwaySchemaVersion;delete old.modules;delete old.pathways;old.activities=old.activities.filter((a)=>!a.id.startsWith('blog-'));old.testing=[]
 const text=JSON.stringify(old)
 await db.prepare('INSERT INTO course_content(slug,content_json) VALUES(?,?)').bind(old.slug,text).run()
 await db.prepare('INSERT INTO course_publications(slug,content_json) VALUES(?,?)').bind(old.slug,text).run()
 assert.equal((await readCourse(db)).pathways.length,1)
 assert.equal((await db.prepare('SELECT content_json FROM course_publications WHERE slug=?').bind(old.slug).first()).content_json,text)
 const draft=await readCourse(db,old.slug,true);draft.pathways[0].status='draft';draft.modules[0].body='EDITOR-DRAFT-CANARY';draft.modules[0].status='draft'
 await saveCourse(db,draft,{actor:'editor'})
 const pub=await readCourse(db);assert.equal(pub.pathways.length,0);assert.ok(!JSON.stringify(pub).includes('EDITOR-DRAFT-CANARY'))
 assert.ok((await db.prepare('SELECT * FROM course_revisions').all()).results.length)
})
test('draft recovery content, internal identities and learner notes do not leak into public/no-JS/offline output',()=>{
 const c=structuredClone(seed);c.modules[0].body='DRAFT-MODULE-CANARY';c.modules[0].status='draft';c.activities.find((a)=>a.id==='blog-import-check').prompt='DRAFT-ACTIVITY-CANARY';c.activities.find((a)=>a.id==='blog-import-check').status='draft';c.testing.push({id:'private',tester:'PRIVATE-TESTER-CANARY'});c.learnerNotes='LEARNER-CANARY'
 const pub=publicCourse(c),html=renderCourse(pub),offline=renderOfflineEdition(pub)
 for(const text of [JSON.stringify(pub),html,offline])for(const canary of ['DRAFT-MODULE-CANARY','DRAFT-ACTIVITY-CANARY','PRIVATE-TESTER-CANARY','LEARNER-CANARY'])assert.ok(!text.includes(canary),canary)
 assert.match(html,/Step temporarily unavailable/)
 const s=blank();finish(course(),s,'hosted');assert.equal(pathwayComplete(pub,s,pub.pathways[0],'hosted'),false)
 assert.doesNotMatch(offline,/<script|<link[^>]*stylesheet|<form/)
})
test('published recovery text is real HTML without scripts and self-contained offline with local navigation',async()=>{
 const db=testDb(),ctx={env:{BF_DB:db},request:new Request('https://sabot.test/guides/become-the-thousand-servers/'),next:()=>new Response('asset')}
 const r=await onRequest(ctx),html=await r.text();assert.equal(r.status,200)
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')
 for(const title of ['What is this XML file?','Recover and verify media','Make an independent backup'])assert.ok(text.includes(title))
 for(const flag of ['noindex','nofollow','noarchive'])assert.ok(r.headers.get('x-robots-tag').includes(flag))
 const off=await onRequest({...ctx,request:new Request('https://sabot.test/guides/become-the-thousand-servers/offline')});assert.equal(off.status,200)
 const body=await off.text();assert.match(body,/id="blog-xml"/);assert.match(body,/href="#blog-xml"/);assert.match(body,/Path version 1/);assert.match(body,/Generated:/);assert.match(body,/All instructions|record practical|Record practical/)
})
test('activity version changes invalidate completion without erasing attempts or pathway notes during transfer',()=>{
 const c=course(),s=blank();finish(c,s,'hosted');s.pathways['blog-recovery']={choice:'hosted',lastStep:'blog-backup',notes:{'blog-xml':'This stays private'}}
 const restored=validateProgress(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.pathways,s.pathways)
 const a=c.activities.find((a)=>a.id==='blog-backup-check');a.version++
 assert.equal(activityPassed(c,restored,a.id),false);assert.equal(pathwayComplete(c,restored,c.pathways[0],'hosted'),false);assert.equal(restored.activities[a.id].length,1)
})
test('withdrawn required activity prevents completion; invalid paths cannot be saved',()=>{
 const c=structuredClone(seed);c.pathways[0].variants[0].steps.push('missing-module');assert.throws(()=>normalizeCourse(c),/Pathway steps/)
 const other=structuredClone(seed);other.modules[0].activities=['missing-activity'];assert.throws(()=>normalizeCourse(other),/module activity/)
})
test('new recovery testing records explicitly await real execution',()=>{
 const c=normalizeCourse(seed),tests=c.testing.filter((t)=>t.targetId==='blog-recovery')
 assert.equal(tests.length,15);assert.ok(tests.every((t)=>t.state==='NOT TESTED'&&!t.actual))
 assert.deepEqual([...new Set(tests.map((t)=>t.reviewKind))],['technical-review','practical-test','learner-usability'])
})
test('recovery entry is not inserted into public home, archive, nav or feed sources',async()=>{
 for(const path of ['src/App.jsx','scripts/prepare-noscript-fallback.mjs']){
  const s=await readFile(path,'utf8');assert.ok(!s.includes('#blog-recovery'))
 }
 const route=await readFile('functions/guides/become-the-thousand-servers/[[path]].js','utf8');assert.match(route,/noindex, nofollow, noarchive/)
})
