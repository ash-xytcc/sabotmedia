import {defineConfig} from 'vite'
import {testDb} from './helpers/course-db.mjs'
import {onRequest as course} from '../functions/guides/become-the-thousand-servers/[[path]].js'
import {onRequest as api} from '../functions/api/course-content.js'
import {onRequest as contributors} from '../functions/api/course-contributors.js'
import {onRequest as recovery} from '../functions/api/course-recovery.js'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
const publicRoot=fileURLToPath(new URL('../public/',import.meta.url))
export default defineConfig({server:{host:true,port:4173,allowedHosts:['terminal.local']},plugins:[{
 name:'isolated-course-preview',configureServer(server){
 const env={BF_DB:testDb(),SABOT_SESSION_SECRET:'isolated-preview-only-not-production'}
 server.middlewares.use(async(req,res,next)=>{
  if(req.url.startsWith('/@'))return next()
  try {
   const url=new URL(req.url,'http://terminal.local:4173'),path=url.pathname
   if(path==='/__course-preview') {res.setHeader('content-type','text/html');res.end('<!doctype html><html><body><h1>Isolated course preview</h1><p><a href="/guides/become-the-thousand-servers/">Open course</a></p><p><a href="/__course-preview/mobile">Mobile layout</a></p><p><a href="/__course-preview/nojs">Without JavaScript</a></p></body></html>');return}
   if(path==='/__course-preview/mobile'||path==='/__course-preview/nojs'){res.setHeader('content-type','text/html');res.end(`<!doctype html><html><body style="margin:0"><iframe title="Course ${path==='/__course-preview/mobile'?'mobile':'no-JavaScript'} preview" style="border:0;width:${path==='/__course-preview/mobile'?'390px':'100%'};height:844px" ${path==='/__course-preview/nojs'?'sandbox="allow-same-origin"':''} src="/guides/become-the-thousand-servers/"></iframe></body></html>`);return}
   if(!path.startsWith('/guides/become-the-thousand-servers')&&!path.startsWith('/api/course-'))return next()
   const chunks=[];for await(const chunk of req)chunks.push(chunk)
   const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})})
   const asset=async()=>{const body=await readFile(publicRoot+path);return new Response(body,{headers:{'content-type':path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':'text/html'}})}
   const handler=path==='/api/course-content'?api:path==='/api/course-contributors'?contributors:path==='/api/course-recovery'?recovery:course
   const response=await handler({env,request,next:asset});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))
  }catch(e){res.writeHead(500);res.end(String(e))}
 })
 }}]})
