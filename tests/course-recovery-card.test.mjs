import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {build} from 'esbuild'
import {parseHTML} from 'linkedom'
import {renderCourse} from '../public/guides/become-the-thousand-servers/lms/render.js'
import {seed} from '../public/guides/become-the-thousand-servers/lms/model.js'
import {blank} from '../public/guides/become-the-thousand-servers/lms/progress.js'
import {onRequest} from '../functions/api/course-recovery.js'
import {testDb} from './helpers/course-db.mjs'
const bundle = await build({entryPoints:['public/guides/become-the-thousand-servers/lms/recovery-card.js'],bundle:true,write:false,format:'iife',globalName:'Card',platform:'browser'})
function browser(env, options = {}) {
  const {document} = parseHTML(renderCourse(seed)), storage = new Map(), timers = new Map(), delays = []
  let state = blank(), accepted = true, serial = 0
  document.querySelector('[data-recovery-code]').focus = () => {}
  const scope = {document,crypto,TextEncoder,TextDecoder,btoa,atob,console,Date,
    location:{origin:'https://sabot.test',hash:''},addEventListener(){},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    setTimeout:(f,ms)=>{delays.push(ms);timers.set(++serial,f);return serial},clearTimeout:id=>timers.delete(id),
    fetch:async(url,requestOptions)=>{if(options.fetch)return options.fetch(url,requestOptions);return onRequest({env,request:new Request('https://sabot.test'+url,{...requestOptions,headers:{...requestOptions.headers,origin:'https://sabot.test'}})})}}
  vm.runInNewContext(bundle.outputFiles[0].text,scope)
  const control = scope.Card.mountRecoveryCard(()=>state,next=>{if(!accepted)return false;state=next;return true}, options.canBackup)
  return {document,storage,control,timers,delays,get state(){return state},set accepted(v){accepted=v}}
}
test('one printed card follows automatic updates and restores latest state on a second device',async()=>{
  const env={BF_DB:testDb()}, first=browser(env)
  await first.document.querySelector('[data-backup]').onclick()
  const code=first.document.querySelector('[data-card-code]').textContent
  assert.match(code,/^sabot1\./)
  assert.equal(first.document.querySelector('[data-print-card]').hidden,false)
  first.state.notes['map-your-dependencies']='Updated after printing the card'
  first.control.changed()
  await [...first.timers.values()].at(-1)()
  assert.equal(first.document.querySelector('[data-card-code]').textContent,code)
  const second=browser(env)
  second.document.querySelector('[data-recovery-code]').value=code
  await second.document.querySelector('[data-fetch-recovery]').onclick()
  assert.equal(second.state.notes['map-your-dependencies'],'Updated after printing the card')
  assert.equal(second.document.querySelector('[data-card-code]').textContent,code)
  assert.equal(JSON.parse(second.storage.get('sabot.course.recovery-card.v1')).revision,2)
  second.accepted=false
  const before=JSON.stringify(second.state)
  second.document.querySelector('[data-recovery-code]').value=code
  await second.document.querySelector('[data-fetch-recovery]').onclick()
  assert.equal(JSON.stringify(second.state),before)
})

test('offline recovery retries are spaced out instead of hammering the server',async()=>{
  const b=browser({}, {fetch:async()=>{throw Error('offline')}})
  await b.document.querySelector('[data-backup]').onclick()
  assert.ok(b.delays.at(-1)>59000)
})
test('detaching during an upload cannot reconnect the old card after its response arrives',async()=>{
  let release, entered
  const started=new Promise(r=>entered=r)
  const b=browser({}, {fetch:async()=>{entered();return new Promise(r=>release=()=>r({ok:true,json:async()=>({revision:1,retentionDays:365})}))}})
  const upload=b.document.querySelector('[data-backup]').onclick()
  await started
  b.control.detach();release();await upload
  assert.equal(b.storage.get('sabot.course.recovery-card.v1'),'null')
  assert.equal(b.document.querySelector('[data-card]').hidden,true)
  assert.equal(b.document.querySelector('[data-backup]').textContent,'Create my recovery card')
})
test('unreadable local progress cannot overwrite an encrypted recovery copy',async()=>{
  let sent=false
  const b=browser({}, {canBackup:()=>false,fetch:async()=>{sent=true;throw Error('must not upload')}})
  await b.document.querySelector('[data-backup]').onclick()
  assert.equal(sent,false)
  assert.match(b.document.querySelector('[data-recovery-status]').textContent,/saved local progress could not be read/)
})
