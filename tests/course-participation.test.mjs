import test from 'node:test'
import assert from 'node:assert/strict'
import {seed,normalizeCourse,publicCourse,contributorNames} from '../public/guides/become-the-thousand-servers/lms/model.js'
import {renderCourse} from '../public/guides/become-the-thousand-servers/lms/render.js'
import {renderOfflineEdition} from '../public/guides/become-the-thousand-servers/lms/offline.js'
import {ensureContributors,listContributors,listPublishedContributors} from '../functions/api/_lib/courseContributors.js'
import {ensureCourseTables,readCourse} from '../functions/api/_lib/courseStore.js'
import {onRequest as api} from '../functions/api/course-contributors.js'
import {onRequest as page} from '../functions/guides/become-the-thousand-servers/[[path]].js'
import {createAdminSessionCookie} from '../functions/api/_lib/publicSiteAuth.js'
import {sessionCookie} from '../functions/api/_lib/courseSecurity.js'
import {testDb} from './helpers/course-db.mjs'
const origin='https://sabot.test'
async function fixture(){
 const env={BF_DB:testDb(),SABOT_SESSION_SECRET:'opt-out-test-only'};await ensureContributors(env.BF_DB)
 for(const [id,name] of [['autistici-inventati','Autistici/Inventati'],['systemli','Systemli'],['respondent-alpha','Respondent Alpha']])await env.BF_DB.prepare('INSERT INTO course_contributors(id,name,draft_json,published_json,private_text,enabled) VALUES(?,?,?,?,?,?)').bind(id,name,JSON.stringify({questions:[],exercise:'PRESERVED EXERCISE',status:'review'}),id==='respondent-alpha'?null:JSON.stringify({sharedAnswer:'WITHDRAWN-PUBLIC-CANARY',questions:[],exercise:'WITHDRAWN-EXERCISE-CANARY'}),id==='respondent-alpha'?'':'PRIVATE-PRESERVED',1).run()
 return env
}
function ctx(env,path,body,cookie=''){return{env,request:new Request(origin+path,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})}),next:()=>new Response('asset')}}
test('opted-out groups are no longer seeded or assigned; lesson work is unchanged',()=>{
 assert.ok(!contributorNames.includes('Autistici/Inventati'));assert.ok(!contributorNames.includes('Systemli'))
 const c=structuredClone(seed);c.sections[1].contributors=['systemli','autistici-inventati','respondent-alpha','systemli.org']
 const normalized=normalizeCourse(c);assert.deepEqual(normalized.sections[1].contributors,['respondent-alpha'])
 assert.deepEqual(publicCourse(c).lessons,publicCourse(seed).lessons)
 const html=renderCourse(c,[{id:'systemli',name:'Systemli'},{id:'autistici-inventati',name:'Autistici/Inventati'},{id:'respondent-alpha',name:'Respondent Alpha'}])
 assert.doesNotMatch(html,/contributors\/(?:systemli|autistici-inventati)/);assert.match(html,/contributors\/respondent-alpha/)
 assert.match(html,/shutdown is the historical catalyst/)
})
test('legacy BASH workspace is moved from the CrimethInc slug without touching a real CrimethInc workspace',async()=>{
 const db=testDb();await ensureContributors(db)
 const draft=JSON.stringify({sharedAnswer:'',questions:[],exercise:'',status:'reporting needed'})
 await db.prepare('INSERT INTO course_contributors(id,name,draft_json,private_text,enabled) VALUES(?,?,?,?,?)').bind('crimethinc','BASH - Boise Autonomous Solidarity Hub',draft,'BASH PRIVATE',1).run()
 await db.prepare('INSERT INTO course_contributor_revisions(id,project,version,actor_type,actor_id,scope,status,content_json) VALUES(?,?,?,?,?,?,?,?)').bind('bash-rev','crimethinc',0,'editor','editor','edit','draft',draft).run()
 await db.prepare('INSERT INTO course_contributor_submissions(id,project,revision,content_json,status) VALUES(?,?,?,?,?)').bind('bash-submission','crimethinc',1,draft,'pending').run()
 await ensureContributors(db)
 assert.equal(await db.prepare('SELECT id FROM course_contributors WHERE id=?').bind('crimethinc').first(),null)
 const migrated=await db.prepare('SELECT * FROM course_contributors WHERE id=?').bind('bash').first()
 assert.equal(migrated.name,'BASH - Boise Autonomous Solidarity Hub');assert.equal(migrated.private_text,'BASH PRIVATE')
 assert.equal((await db.prepare('SELECT project FROM course_contributor_revisions WHERE id=?').bind('bash-rev').first()).project,'bash')
 assert.equal((await db.prepare('SELECT project FROM course_contributor_submissions WHERE id=?').bind('bash-submission').first()).project,'bash')
 const realDb=testDb();await ensureContributors(realDb)
 await realDb.prepare('INSERT INTO course_contributors(id,name,draft_json) VALUES(?,?,?)').bind('crimethinc','CrimethInc.',draft).run()
 await ensureContributors(realDb)
 assert.ok(await realDb.prepare('SELECT id FROM course_contributors WHERE id=?').bind('crimethinc').first())
 assert.equal(await realDb.prepare('SELECT id FROM course_contributors WHERE id=?').bind('bash').first(),null)
})
test('saved contributor rows are excluded without deleting drafts or private history',async()=>{
 const env=await fixture(),db=env.BF_DB
 const names=await listContributors(db);assert.ok(!names.some((p)=>['systemli','autistici-inventati'].includes(p.id)))
 const r=await db.prepare('SELECT * FROM course_contributors WHERE id=?').bind('systemli').first()
 assert.equal(r.private_text,'PRIVATE-PRESERVED');assert.match(r.draft_json,/PRESERVED EXERCISE/);assert.match(r.published_json,/WITHDRAWN-PUBLIC-CANARY/)
 const publicList=await (await api(ctx(env,'/api/course-contributors'))).json();assert.ok(!publicList.items.some((p)=>p.id==='systemli'))
})
test('pending outreach stays private until a response is published',async()=>{
 const env=await fixture(),db=env.BF_DB
 const roster=await listContributors(db);assert.ok(roster.some((p)=>p.id==='respondent-alpha'))
 assert.deepEqual(await listPublishedContributors(db),[])
 const before=await (await api(ctx(env,'/api/course-contributors'))).json();assert.deepEqual(before.items,[]);assert.doesNotMatch(JSON.stringify(before),/Respondent Alpha|respondent-alpha/i)
 await ensureCourseTables(db)
 await db.prepare('INSERT OR REPLACE INTO course_publications(slug,content_json) VALUES(?,?)').bind(seed.slug,JSON.stringify(publicCourse(seed))).run()
 const beforeHtml=await (await page(ctx(env,'/guides/become-the-thousand-servers/'))).text();assert.doesNotMatch(beforeHtml,/<h2>Published contributor responses<\/h2>|contributors\/respondent-alpha/)
 await db.prepare('UPDATE course_contributors SET published_json=? WHERE id=?').bind(JSON.stringify({sharedAnswer:'PUBLISHED RESPONSE',questions:[],exercise:'PUBLISHED EXERCISE'}),'respondent-alpha').run()
 const after=await (await api(ctx(env,'/api/course-contributors'))).json();assert.deepEqual(after.items,[{id:'respondent-alpha',name:'Respondent Alpha'}])
 const afterHtml=await (await page(ctx(env,'/guides/become-the-thousand-servers/'))).text();assert.match(afterHtml,/<h2>Published contributor responses<\/h2>/);assert.match(afterHtml,/contributors\/respondent-alpha/)
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
test('editors cannot recreate or publish withdrawn participation via old submissions',async()=>{
 const env=await fixture(),cookie=(await createAdminSessionCookie(ctx(env,'/'),'editor')).split(';')[0]
 assert.equal((await api(ctx(env,'/api/course-contributors',{action:'create',id:'systemli-org',name:'Systemli.org'},cookie))).status,404)
 await env.BF_DB.prepare('INSERT INTO course_contributor_submissions(id,project,revision,content_json,status) VALUES(?,?,?,?,?)').bind('old-submission','systemli',0,'{}','pending').run()
 const r=await api(ctx(env,'/api/course-contributors',{action:'review-decision',submissionId:'old-submission',decision:'approved',reviewerNote:'old review'},cookie));assert.equal(r.status,403)
 const list=await (await api(ctx(env,'/api/course-contributors',null,cookie))).json();assert.ok(!JSON.stringify(list).includes('old-submission'))
})
test('stored publication assignment cleanup is read-only and offline projections reject opted-out identities',async()=>{
 const env=await fixture(),db=env.BF_DB;await ensureCourseTables(db)
 const c=structuredClone(seed);c.sections[0].contributors=['systemli','autistici-inventati','respondent-alpha'];const bytes=JSON.stringify(c)
 await db.prepare('INSERT INTO course_publications(slug,content_json) VALUES(?,?)').bind(c.slug,bytes).run()
 const read=await readCourse(db);assert.deepEqual(read.sections[0].contributors,['respondent-alpha']);assert.deepEqual(read.lessons,c.lessons)
 assert.equal((await db.prepare('SELECT content_json FROM course_publications WHERE slug=?').bind(c.slug).first()).content_json,bytes)
 const offline=renderOfflineEdition(publicCourse(seed),[{id:'systemli',name:'Systemli',item:{sharedAnswer:'OPTED-OUT',questions:[]}},{id:'respondent-alpha',name:'Respondent Alpha',item:{sharedAnswer:'STILL-PARTICIPATING',questions:[]}}])
 assert.ok(!offline.includes('OPTED-OUT'));assert.ok(offline.includes('STILL-PARTICIPATING'))
})
