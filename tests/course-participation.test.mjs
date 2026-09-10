import test from 'node:test'
import assert from 'node:assert/strict'
import {seed,normalizeCourse,publicCourse,contributorNames} from '../public/guides/become-the-thousand-servers/lms/model.js'
import {renderCourse} from '../public/guides/become-the-thousand-servers/lms/render.js'
import {renderOfflineEdition} from '../public/guides/become-the-thousand-servers/lms/offline.js'
import {ensureContributors,listContributors} from '../functions/api/_lib/courseContributors.js'
import {ensureCourseTables,readCourse} from '../functions/api/_lib/courseStore.js'
import {onRequest as api} from '../functions/api/course-contributors.js'
import {onRequest as page} from '../functions/guides/become-the-thousand-servers/[[path]].js'
import {createAdminSessionCookie} from '../functions/api/_lib/publicSiteAuth.js'
import {sessionCookie} from '../functions/api/_lib/courseSecurity.js'
import {testDb} from './helpers/course-db.mjs'
const origin='https://sabot.test'
async function fixture(){
 const env={BF_DB:testDb(),SABOT_SESSION_SECRET:'opt-out-test-only'};await ensureContributors(env.BF_DB)
 for(const [id,name] of [['autistici-inventati','Autistici/Inventati'],['systemli','Systemli']])await env.BF_DB.prepare('INSERT INTO course_contributors(id,name,draft_json,published_json,private_text,enabled) VALUES(?,?,?,?,?,?)').bind(id,name,JSON.stringify({questions:[],exercise:'PRESERVED EXERCISE',status:'review'}),JSON.stringify({sharedAnswer:'WITHDRAWN-PUBLIC-CANARY',questions:[],exercise:'WITHDRAWN-EXERCISE-CANARY'}),'PRIVATE-PRESERVED',1).run()
 return env
}
function ctx(env,path,body,cookie=''){return{env,request:new Request(origin+path,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})}),next:()=>new Response('asset')}}
test('opted-out groups are no longer seeded or assigned; lesson work is unchanged',()=>{
 assert.ok(!contributorNames.includes('Autistici/Inventati'));assert.ok(!contributorNames.includes('Systemli'))
 const c=structuredClone(seed);c.sections[1].contributors=['systemli','autistici-inventati','riseup','systemli.org']
 const normalized=normalizeCourse(c);assert.deepEqual(normalized.sections[1].contributors,['riseup'])
 assert.deepEqual(publicCourse(c).lessons,publicCourse(seed).lessons)
 const html=renderCourse(c,[{id:'systemli',name:'Systemli'},{id:'autistici-inventati',name:'Autistici/Inventati'},{id:'riseup',name:'Riseup'}])
 assert.doesNotMatch(html,/contributors\/(?:systemli|autistici-inventati)/);assert.match(html,/contributors\/riseup/)
 assert.match(html,/Its shutdown is the historical catalyst/)
})
test('saved contributor rows are excluded without deleting drafts or private history',async()=>{
 const env=await fixture(),db=env.BF_DB
 const names=await listContributors(db);assert.ok(!names.some((p)=>['systemli','autistici-inventati'].includes(p.id)))
 const r=await db.prepare('SELECT * FROM course_contributors WHERE id=?').bind('systemli').first()
 assert.equal(r.private_text,'PRIVATE-PRESERVED');assert.match(r.draft_json,/PRESERVED EXERCISE/);assert.match(r.published_json,/WITHDRAWN-PUBLIC-CANARY/)
 const publicList=await (await api(ctx(env,'/api/course-contributors'))).json();assert.ok(!publicList.items.some((p)=>p.id==='systemli'))
})
test('old contributor links, public API, login and previously issued sessions cannot expose opted-out content',async()=>{
 const env=await fixture()
 for(const id of ['systemli','autistici-inventati']){
  const cookie=(await sessionCookie(env,id,'edit',0)).split(';')[0]
  for(const suffix of ['', '&scope=private','&revisions=1'])assert.equal((await api(ctx(env,'/api/course-contributors?id='+id+suffix,null,cookie))).status,404)
  assert.equal((await api(ctx(env,'/api/course-contributors',{action:'login',id,password:'irrelevant'}))).status,404)
  for(const suffix of ['', '/private'])assert.equal((await page(ctx(env,'/guides/become-the-thousand-servers/contributors/'+id+suffix))).status,404)
 }
 const html=await (await page(ctx(env,'/guides/become-the-thousand-servers/'))).text();assert.doesNotMatch(html,/contributors\/(?:systemli|autistici-inventati)/)
 const offline=await (await page(ctx(env,'/guides/become-the-thousand-servers/offline'))).text();assert.doesNotMatch(offline,/WITHDRAWN-(?:PUBLIC|EXERCISE)-CANARY|PRIVATE-PRESERVED/)
})
test('staff cannot recreate or publish withdrawn participation via old submissions',async()=>{
 const env=await fixture(),cookie=(await createAdminSessionCookie(ctx(env,'/'),'staff')).split(';')[0]
 assert.equal((await api(ctx(env,'/api/course-contributors',{action:'create',id:'systemli-org',name:'Systemli.org'},cookie))).status,404)
 await env.BF_DB.prepare('INSERT INTO course_contributor_submissions(id,project,revision,content_json,status) VALUES(?,?,?,?,?)').bind('old-submission','systemli',0,'{}','pending').run()
 const r=await api(ctx(env,'/api/course-contributors',{action:'review-decision',submissionId:'old-submission',decision:'approved',reviewerNote:'old review'},cookie));assert.equal(r.status,403)
 const list=await (await api(ctx(env,'/api/course-contributors',null,cookie))).json();assert.ok(!JSON.stringify(list).includes('old-submission'))
})
test('stored publication assignment cleanup is read-only and offline projections reject opted-out identities',async()=>{
 const env=await fixture(),db=env.BF_DB;await ensureCourseTables(db)
 const c=structuredClone(seed);c.sections[0].contributors=['systemli','autistici-inventati','riseup'];const bytes=JSON.stringify(c)
 await db.prepare('INSERT INTO course_publications(slug,content_json) VALUES(?,?)').bind(c.slug,bytes).run()
 const read=await readCourse(db);assert.deepEqual(read.sections[0].contributors,['riseup']);assert.deepEqual(read.lessons,c.lessons)
 assert.equal((await db.prepare('SELECT content_json FROM course_publications WHERE slug=?').bind(c.slug).first()).content_json,bytes)
 const offline=renderOfflineEdition(publicCourse(seed),[{id:'systemli',name:'Systemli',item:{sharedAnswer:'OPTED-OUT',questions:[]}},{id:'riseup',name:'Riseup',item:{sharedAnswer:'STILL-PARTICIPATING',questions:[]}}])
 assert.ok(!offline.includes('OPTED-OUT'));assert.ok(offline.includes('STILL-PARTICIPATING'))
})
