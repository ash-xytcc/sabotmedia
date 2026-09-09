import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequest } from '../functions/_middleware.js'
import { readableBody, safeUrl } from '../functions/api/_lib/readableHtml.js'
import { publicRead } from '../functions/api/_lib/readablePage.js'

function context(path, records = [], extras = {}) {
  const db = { prepare(sql) {
    const statement = { bind(...args) { return query(args) }, ...query([]) }
    function query(args) { return {
      async run() { return {success:true} },
      async all() { return {results:sql.includes('native_public_content_translations') ? [] : sql.includes('native_public_content') ? records : []} },
      async first() { return sql.includes('native_public_content') ? records.find(r => r.slug === args[0] || r.id === args[0]) || null : null },
    } }
    return statement
  } }
  return { request:new Request(`https://sabot.media${path}`),env:{BF_DB:db,ASSETS:{fetch:async()=>new Response('<html><head><title>Sabot Media</title></head><body><div id="root"></div><noscript data-sabot-static-noscript>STALE PRIVATE SNAPSHOT</noscript></body></html>',{headers:{'content-type':'text/html'}})}},next(){throw Error('Unexpected fallthrough')}, ...extras }
}
function row(slug, props={}) { const item={id:slug,slug,title:`Title ${slug}`,status:'published',workflowState:'published',body:'<h2>Section</h2><p>A <a href="/about">working link</a>.</p><img src="/image.png" alt="Useful image">',...props};return {id:slug,slug,status:item.status,target:'general',content_type:'article',published_at:'2026-01-01',content_json:JSON.stringify(item)} }

test('archive includes older posts beyond both former limits and omits private content', async()=>{
 const records=Array.from({length:125},(_,i)=>row(`entry-${i}`,{showOnHomepage:false})); records.push(row('draft',{status:'draft'}),row('private',{workflowState:'draft'}))
 const response=await onRequest(context('/archive',records)); const html=await response.text()
 assert.equal(response.status,200); assert.match(html,/Title entry-124/); assert.doesNotMatch(html,/Title draft|Title private|STALE PRIVATE/)
 const home=await (await onRequest(context('/',records))).text(); assert.doesNotMatch(home,/Title entry-124/)
})
test('article aliases preserve semantic body, links, images and privacy',async()=>{
 for(const path of ['/post/example','/piece/example','/print/example','/zine/example','/updates/example','/post/example/print']) {
  const response=await onRequest(context(path,[row('example')]))
  assert.equal(response.status,200,path); const html=await response.text(); assert.match(html,/<h2>Section<\/h2>/); assert.match(html,/href="\/about"/); assert.match(html,/alt="Useful image"/); assert.doesNotMatch(html,/STALE PRIVATE/)
 }
 const response=await onRequest(context('/post/private',[row('private',{workflowState:'draft'})])); assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/Title private|STALE PRIVATE/)
})
test('search and HEAD work without browser scripts',async()=>{
 const ctx=context('/archive?q=second',[row('first'),row('second')]); const html=await (await onRequest(ctx)).text();assert.match(html,/Title second/);assert.doesNotMatch(html,/Title first/)
 ctx.request=new Request(ctx.request.url,{method:'HEAD'});const head=await onRequest(ctx);assert.equal(head.status,200);assert.equal(await head.text(),'')
})
test('database failures return an explicit unavailable response, not withdrawn snapshots',async()=>{
 const ctx=context('/post/withdrawn');ctx.env.BF_DB={prepare(){throw Error('offline')}};const response=await onRequest(ctx);assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/STALE PRIVATE/);assert.equal(response.headers.get('cache-control'),'no-store')
})
test('direct generated index aliases cannot bypass current publication checks',async()=>{
 const response=await onRequest(context('/post/withdrawn/index.html'));assert.equal(response.status,308);assert.equal(response.headers.get('location'),'https://sabot.media/post/withdrawn')
})
test('public API projections discard credentials and admin query switches',async()=>{
 const ctx=context('/collections?includeDrafts=1');ctx.request=new Request(ctx.request.url,{headers:{cookie:'session=secret',authorization:'Bearer private','x-sabot-contributor-session':'secret'}})
 await publicRead(async c=>{assert.equal(c.request.headers.get('cookie'),null);assert.equal(c.request.headers.get('authorization'),null);assert.equal(c.request.headers.get('x-sabot-contributor-session'),null);assert.equal(new URL(c.request.url).search,'?slug=example');return Response.json({ok:true})},ctx,'/api/collections?slug=example')
})
test('HTML projection removes executable markup and retains readable embedded-file links',()=>{
 const html=readableBody('<script>alert(1)</script><p onclick="bad()">Text</p><a href="java&#x73;cript:bad()">bad</a><iframe src="/file.pdf" title="Evidence"></iframe><audio src="/clip.mp3"></audio>')
 assert.doesNotMatch(html,/script:|onclick|<script|<iframe/);assert.match(html,/href="\/file.pdf"/);assert.match(html,/<audio[^>]*controls/)
 assert.equal(safeUrl('java&Tab;script:bad()'),'');assert.equal(safeUrl('/#/post/example'),'/post/example')
})

test('legacy imports remain readable, but native withdrawals suppress their old copies',async()=>{
 const {importedReadingPosts}=await import('../functions/api/_lib/readablePosts.js')
 const legacy=importedReadingPosts.find(i=>i.bodyHtml && i.slug)
 const visible=await onRequest(context(`/post/${legacy.slug}`));assert.equal(visible.status,200);assert.ok((await visible.text()).includes(legacy.title.replace(/&/g,'&amp;')))
 const hidden=await onRequest(context(`/post/${legacy.slug}`,[row(legacy.slug,{status:'draft',title:legacy.title})]));assert.equal(hidden.status,404)
})

test('published translations can be selected using ordinary language links',async()=>{
 const ctx=context('/post/example?lang=ca',[row('example')])
 const original=ctx.env.BF_DB.prepare
 ctx.env.BF_DB.prepare=sql=>{
  if(!sql.includes('SELECT * FROM native_public_content_translations'))return original(sql)
  return {bind(){return {async all(){return {results:[{id:'ca',native_content_id:'example',language_code:'ca',language_label:'Català',status:'published',translation_json:JSON.stringify({title:'Títol català',bodyHtml:'<p>Text traduït.</p>'})}]}}}}}
 }
 const response=await onRequest(ctx);assert.equal(response.status,200);const html=await response.text();assert.match(html,/Títol català/);assert.match(html,/Text traduït/);assert.match(html,/lang="ca"/);assert.match(html,/\?lang=ca/)
})

function contentDb(resolveFirst,resolveAll=()=>[]) {
 return {prepare(sql){const statement={bind(...args){return query(args)},...query([])};function query(args){return {async first(){return resolveFirst(sql,args)},async all(){return {results:resolveAll(sql,args)}},async run(){return {success:true}}}};return statement}}
}
test('publication reading includes page text and PDF links but refuses private and draft publications',async()=>{
 for(const [status,visibility,expected] of [['published','public',200],['draft','public',404],['published','private',404]]) {
  const item={id:'edition',slug:'edition',title:'Edition',status,visibility,assets:{readerPdf:'/edition.pdf'},pages:[{title:'Opening',blocks:[{text:'Readable page text'}]}]}
  const ctx=context('/reader/edition');ctx.env.BF_DB=contentDb(sql=>sql.includes('FROM publications')?{payload_json:JSON.stringify(item)}:null)
  const response=await onRequest(ctx);assert.equal(response.status,expected)
  const html=await response.text();if(expected===200){assert.match(html,/Readable page text/);assert.match(html,/href="\/edition.pdf"/)}else assert.doesNotMatch(html,/Readable page text/)
 }
})
test('gallery includes images with their captions and alt text',async()=>{
 const ctx=context('/aberdeen-local-1312-gallery');ctx.env.BF_DB=contentDb(sql=>sql.includes('FROM galleries')?{slug:'aberdeen-local-1312',title:'Gallery'}:null,sql=>sql.includes('FROM gallery_items')?[{url:'/photo.jpg',alt_text:'Alt description',caption:'Preserved caption'}]:[])
 const response=await onRequest(ctx);assert.equal(response.status,200);const html=await response.text();assert.match(html,/alt="Alt description"/);assert.match(html,/Preserved caption/)
})
test('collection pages include the full description and public pieces',async()=>{
 const collection={id:'collection',slug:'collection',title:'Collection',status:'published',description:'Full collection description',pieceSlugs:['example']}
 const ctx=context('/collections/collection');ctx.env.BF_DB=contentDb(sql=>sql.includes('FROM collections')?{...collection,collection_json:JSON.stringify(collection)}:null,sql=>sql.includes('FROM native_public_content')?[row('example')]:[])
 const response=await onRequest(ctx);assert.equal(response.status,200);const html=await response.text();assert.match(html,/Full collection description/);assert.match(html,/Title example/)
})

test('campaign reading respects hidden sections and excludes private dispatches',async()=>{
 const c={id:'campaign-test',slug:'test',title:'Test campaign',status:'published',hiddenSections:['graphics'],graphics:[{title:'Hidden graphic',imageUrl:'/hidden.png'}],updates:[{title:'Public update',body:'Update text'}],correspondence:{enabled:true}}
 const ctx=context('/campaigns/test');ctx.env.BF_DB=contentDb(sql=>sql.includes('FROM campaigns')?{...c,campaign_json:JSON.stringify(c)}:null,sql=>sql.includes('FROM campaign_messages')?[
  {id:'one',visibility:'public',status:'sent',body:'Public field report',sender_role:'editor'},
  {id:'two',visibility:'private',status:'sent',body:'Private field report',sender_role:'contributor'},
 ]:[])
 const response=await onRequest(ctx);const html=await response.text();assert.equal(response.status,200,html);assert.match(html,/Public update/);assert.match(html,/Public field report/);assert.doesNotMatch(html,/Private field report|Hidden graphic|hidden.png/)
})

test('Pages asset reads use pretty URLs instead of redirecting index.html assets',async()=>{
 const ctx=context('/archive');ctx.env.ASSETS.fetch=async request=>{
  assert.equal(new URL(request.url).pathname,'/')
  return new Response('<html><head></head><body><div id="root"></div></body></html>',{headers:{'content-type':'text/html'}})
 }
 const response=await onRequest(ctx);assert.equal(response.status,200);assert.match(await response.text(),/Plain HTML reading view/)
})
