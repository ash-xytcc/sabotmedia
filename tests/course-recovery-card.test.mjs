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
function browser(env) {
  const {document} = parseHTML(renderCourse(seed)), storage = new Map(), timers = new Map()
  let state = blank(), accepted = true, serial = 0
  document.querySelector('[data-recovery-code]').focus = () => {}
  const scope = {document,crypto,TextEncoder,TextDecoder,btoa,atob,console,Date,
    location:{origin:'https://sabot.test',hash:''},addEventListener(){},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    setTimeout:f=>{timers.set(++serial,f);return serial},clearTimeout:id=>timers.delete(id),
    fetch:async(url,options)=>onRequest({env,request:new Request('https://sabot.test'+url,{...options,headers:{...options.headers,origin:'https://sabot.test'}})})}
  vm.runInNewContext(bundle.outputFiles[0].text,scope)
  const control = scope.Card.mountRecoveryCard(()=>state,next=>{if(!accepted)return false;state=next;return true})
  return {document,storage,control,timers,get state(){return state},set accepted(v){accepted=v}}
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
