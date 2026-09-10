import test from 'node:test'
import assert from 'node:assert/strict'
import { seed, normalizeCourse, publicCourse } from '../public/guides/become-the-thousand-servers/lms/model.js'
import { blank, attemptFeedback, activityPassed } from '../public/guides/become-the-thousand-servers/lms/progress.js'
import { encryptProgress, decryptProgress, writeToken } from '../public/guides/become-the-thousand-servers/lms/recovery.js'
import { renderOfflineEdition } from '../public/guides/become-the-thousand-servers/lms/offline.js'
import { createAdminSessionCookie } from '../functions/api/_lib/publicSiteAuth.js'
import { onRequest as contributors } from '../functions/api/course-contributors.js'
import { onRequest as recovery } from '../functions/api/course-recovery.js'
import { onRequest as coursePage } from '../functions/guides/become-the-thousand-servers/[[path]].js'
import { testDb } from './helpers/course-db.mjs'

const origin='https://sabot.test'
async function fixture(){const env={BF_DB:testDb(),SABOT_SESSION_SECRET:'phase-two-local-test-secret'};const ctx={env,request:new Request(origin)};const cookie=(await createAdminSessionCookie(ctx,'phase-two-editor')).split(';')[0];return{env,cookie}}
function context(f,path,body,cookie='',method=body?'POST':'GET',ip='203.0.113.9'){return{env:f.env,request:new Request(origin+path,{method,headers:{origin,'content-type':'application/json',cookie,'cf-connecting-ip':ip},...(body?{body:JSON.stringify(body)}:{})}),next:()=>new Response('asset')}}
async function req(f,path,body,cookie='',handler=contributors,method,ip){const r=await handler(context(f,path,body,cookie,method,ip));let data=null;try{data=await r.json()}catch{}return{r,data}}
async function unlock(f,id='puscii'){await req(f,'/api/course-contributors',{action:'credentials',id,editPassword:'phase-two-contributor-password-123'},f.cookie);const login=await req(f,'/api/course-contributors',{action:'login',id,password:'phase-two-contributor-password-123'});return login.r.headers.get('set-cookie').split(';')[0]}

async function submit(f,cookie,id,revision,sharedAnswer,extra={}){return req(f,'/api/course-contributors',{id,revision,item:{sharedAnswer,questions:extra.questions||[],exercise:extra.exercise||'',suggestedExercise:extra.suggestedExercise||'',status:'published'}},cookie)}

test('review dashboard gets exact pending content while ordinary editor list and public API do not',async()=>{
  const f=await fixture(),cookie=await unlock(f)
  assert.equal((await submit(f,cookie,'puscii',0,'PENDING_CANARY')).r.status,200)
  const ordinary=await req(f,'/api/course-contributors',null,f.cookie)
  assert.ok(!JSON.stringify(ordinary.data).includes('PENDING_CANARY'))
  const review=await req(f,'/api/course-contributors?reviews=1',null,f.cookie)
  assert.ok(JSON.stringify(review.data).includes('PENDING_CANARY'))
  const publicRead=await req(f,'/api/course-contributors?id=puscii')
  assert.ok(!JSON.stringify(publicRead.data).includes('PENDING_CANARY'))
})

test('approve publishes exact current submission with note and strips editorial status',async()=>{
  const f=await fixture(),cookie=await unlock(f)
  await submit(f,cookie,'puscii',0,'APPROVE_ME',{questions:[{question:'What changed?',answer:'This.'}],exercise:'Teach it.'})
  const review=await req(f,'/api/course-contributors?reviews=1',null,f.cookie)
  const submission=review.data.items.find((x)=>x.id==='puscii').pending[0]
  assert.ok(submission.comparison.some((x)=>x.kind==='added'))
  assert.equal((await req(f,'/api/course-contributors',{action:'review-decision',submissionId:submission.id,decision:'approved',reviewerNote:'Checked against the proposed text.'},f.cookie)).r.status,200)
  const publicRead=await req(f,'/api/course-contributors?id=puscii')
  assert.equal(publicRead.data.item.sharedAnswer,'APPROVE_ME')
  assert.equal(publicRead.data.item.status,undefined)
  const contributor=await req(f,'/api/course-contributors?id=puscii',null,cookie)
  assert.equal(contributor.data.submissions[0].decision,'approved')
  assert.equal(contributor.data.submissions[0].reviewerNote,'Checked against the proposed text.')
  assert.equal(contributor.data.submissions[0].reviewerId,undefined)
})

test('request changes and rejection preserve publication and submission history',async()=>{
  const f=await fixture(),cookie=await unlock(f)
  await submit(f,cookie,'puscii',0,'FIRST')
  let review=await req(f,'/api/course-contributors?reviews=1',null,f.cookie)
  let s=review.data.items.find((x)=>x.id==='puscii').pending[0]
  await req(f,'/api/course-contributors',{action:'review-decision',submissionId:s.id,decision:'changes-requested',reviewerNote:'Clarify the recovery step.'},f.cookie)
  assert.equal((await req(f,'/api/course-contributors?id=puscii')).data.item,null)
  let own=await req(f,'/api/course-contributors?id=puscii',null,cookie)
  assert.equal(own.data.submissions[0].status,'changes-requested')
  await submit(f,cookie,'puscii',own.data.revision,'SECOND')
  review=await req(f,'/api/course-contributors?reviews=1',null,f.cookie)
  s=review.data.items.find((x)=>x.id==='puscii').pending[0]
  await req(f,'/api/course-contributors',{action:'review-decision',submissionId:s.id,decision:'rejected',reviewerNote:'Not suitable for publication.'},f.cookie)
  assert.equal((await req(f,'/api/course-contributors?id=puscii')).data.item,null)
  own=await req(f,'/api/course-contributors?id=puscii',null,cookie)
  assert.deepEqual(new Set(own.data.submissions.map((x)=>x.status)),new Set(['changes-requested','rejected']))
})

test('older submission cannot be approved after contributor saves a newer revision',async()=>{
  const f=await fixture(),cookie=await unlock(f)
  await submit(f,cookie,'puscii',0,'OLD')
  let own=await req(f,'/api/course-contributors?id=puscii',null,cookie)
  await submit(f,cookie,'puscii',own.data.revision,'NEW')
  const review=await req(f,'/api/course-contributors?reviews=1',null,f.cookie)
  const pending=review.data.items.find((x)=>x.id==='puscii').pending
  const old=pending.find((x)=>x.item.sharedAnswer==='OLD'), newer=pending.find((x)=>x.item.sharedAnswer==='NEW')
  const decision=await req(f,'/api/course-contributors',{action:'review-decision',submissionId:old.id,decision:'approved',reviewerNote:'Trying a stale approval.'},f.cookie)
  assert.equal(decision.r.status,409)
  assert.equal((await req(f,'/api/course-contributors?id=puscii')).data.item,null)
  const still=await req(f,'/api/course-contributors?reviews=1',null,f.cookie)
  assert.ok(still.data.items.find((x)=>x.id==='puscii').pending.some((x)=>x.id===newer.id))
})

test('private comms canary is absent from reviews, publication and offline edition',async()=>{
  const f=await fixture(),cookie=await unlock(f)
  await req(f,'/api/course-contributors',{id:'puscii',scope:'private',revision:0,text:'PRIVATE_PHASE2_CANARY'},cookie)
  const own=await req(f,'/api/course-contributors?id=puscii',null,cookie)
  await submit(f,cookie,'puscii',own.data.revision,'PUBLIC_PHASE2')
  const review=await req(f,'/api/course-contributors?reviews=1',null,f.cookie)
  assert.ok(!JSON.stringify(review.data).includes('PRIVATE_PHASE2_CANARY'))
  const offline=await coursePage(context(f,'/guides/become-the-thousand-servers/offline',null,''))
  const html=await offline.text()
  assert.ok(!html.includes('PRIVATE_PHASE2_CANARY'))
  assert.match(offline.headers.get('x-robots-tag'),/noindex/)
  assert.match(offline.headers.get('content-disposition'),/attachment/)
})

test('offline renderer includes only public projection and labels version/date/limitations',()=>{
  const c=structuredClone(seed);c.sections[0].body='PUBLIC_BODY';c.sections[1].status='draft';c.sections[1].body='DRAFT_BODY';c.testing=[{actual:'PRIVATE_TEST_NOTE'}]
  const html=renderOfflineEdition(publicCourse(c),[],new Date('2026-09-09T12:00:00Z'))
  assert.ok(html.includes('PUBLIC_BODY'));assert.ok(!html.includes('DRAFT_BODY'));assert.ok(!html.includes('PRIVATE_TEST_NOTE'));assert.ok(html.includes(c.contentVersion));assert.ok(html.includes('2026-09-09T12:00:00.000Z'));assert.ok(html.includes('interactive answer checking and synchronization are not included'))
})

test('last-tested environment is public but internal reviewer and testing details are not',()=>{
  const c=structuredClone(seed);c.lessons[0].lastTestedDate='2026-09-09';c.lessons[0].lastTestedEnvironment='Debian 13, Caddy 2';c.testing=[{technicalReviewer:'PRIVATE_REVIEWER',actual:'PRIVATE_NOTE'}]
  const p=publicCourse(c)
  assert.equal(p.lessons[0].lastTestedDate,'2026-09-09');assert.equal(p.lessons[0].lastTestedEnvironment,'Debian 13, Caddy 2');assert.equal(p.testing.length,0);assert.ok(!JSON.stringify(p).includes('PRIVATE_REVIEWER'))
})

test('activity feedback can be answer-specific and old attempts remain after version bump',()=>{
  const a={...seed.activities.find((x)=>x.type==='multiple-choice'),feedbackCorrect:'That follows the dependency chain.',feedbackIncorrect:'Trace who controls the dependency first.',feedbackByAnswer:{person:'A person can be an infrastructure dependency too.'}}
  const good={version:a.version,passed:true,answer:a.answer};assert.match(attemptFeedback(a,good),/dependency chain/)
  const bad={version:a.version,passed:false,answer:['person']};assert.match(attemptFeedback(a,bad),/person can be an infrastructure dependency/i)
  const state=blank();state.activities[a.id]=[{version:a.version,passed:true,answer:a.answer},{version:a.version+1,passed:false,answer:[]}]
  const c={...seed,activities:seed.activities.map((x)=>x.id===a.id?{...x,version:a.version+1}:x)}
  assert.equal(activityPassed(c,state,a.id),false);assert.equal(state.activities[a.id].length,2)
})

test('multiple learners on one simulated IP can create and update separate recovery cards',async()=>{
  const f=await fixture(),ip='198.51.100.77',cards=[]
  for(let i=0;i<40;i++){
    const s=blank();s.notes[seed.lessons[0].slug]=`learner-${i}`;const encrypted=await encryptProgress(s),token=await writeToken(encrypted.code)
    const created=await req(f,'/api/course-recovery',{action:'create',...encrypted.blob,writeToken:token},'',recovery,undefined,ip);assert.equal(created.r.status,200,`create ${i}`)
    cards.push({s,encrypted,token,revision:created.data.revision})
  }
  for(let i=0;i<cards.length;i++){
    cards[i].s.notes[seed.lessons[1].slug]='updated';const next=await encryptProgress(cards[i].s,cards[i].encrypted.code)
    const updated=await req(f,'/api/course-recovery',{action:'update',...next.blob,writeToken:cards[i].token,revision:cards[i].revision},'',recovery,undefined,ip);assert.equal(updated.r.status,200,`update ${i}`)
  }
})

test('stale recovery device cannot overwrite newer ciphertext and retention renews on success',async()=>{
  const f=await fixture(),s=blank(),first=await encryptProgress(s),token=await writeToken(first.code)
  const created=await req(f,'/api/course-recovery',{action:'create',...first.blob,writeToken:token},'',recovery);const originalExpiry=created.data.expires
  s.notes[seed.lessons[0].slug]='newer';const newer=await encryptProgress(s,first.code)
  const ok=await req(f,'/api/course-recovery',{action:'update',...newer.blob,writeToken:token,revision:1},'',recovery);assert.equal(ok.r.status,200);assert.ok(ok.data.expires>=originalExpiry)
  const staleState=blank();staleState.notes[seed.lessons[0].slug]='stale';const stale=await encryptProgress(staleState,first.code)
  const rejected=await req(f,'/api/course-recovery',{action:'update',...stale.blob,writeToken:token,revision:1},'',recovery);assert.equal(rejected.r.status,409)
  const read=await req(f,'/api/course-recovery',{action:'read',recoveryId:first.blob.recoveryId},'',recovery);assert.deepEqual(await decryptProgress(first.code,read.data.blob),s)
})

test('review model preserves locked G01-G13 map while accepting readiness/testing metadata',()=>{
  const c=structuredClone(seed);c.testing=[{id:'t1',targetType:'lesson',targetId:c.lessons[0].slug,reviewKind:'practical-test',contentVersion:c.contentVersion,operatingSystem:'Debian 13',state:'PASS',severity:'none',status:'resolved'}];c.lessons[0].lastTestedDate='2026-09-09';const n=normalizeCourse(c);assert.equal(n.sections.length,13);assert.equal(n.lessons.length,12);assert.equal(n.testing[0].reviewKind,'practical-test');assert.equal(n.lessons[0].lastTestedDate,'2026-09-09')
})
