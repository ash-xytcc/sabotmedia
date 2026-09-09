import fs from 'node:fs/promises'
import vm from 'node:vm'
import { parseHTML } from 'linkedom'
import { readingDocument, readableBody, escapeHtml as e, paragraphs, link } from '../functions/api/_lib/readableHtml.js'

// Compile repository-owned editorial scripts into HTML at build time. No network,
// credentials, browser state, or submissions are used in this projection.
const root = new URL('../public/', import.meta.url)
const strip = html => html.replace(/<!-- start readable document -->[\s\S]*?<!-- end readable document -->/g, '')
function append(html, title, body, hide) {
  return strip(html).replace('</body>', `<!-- start readable document --><noscript><style>${hide}{display:none!important}</style></noscript>${readingDocument(title,body)}<!-- end readable document --></body>`)
}
const dir = new URL('investigations/autistici-inventati/',root)
let html = strip(await fs.readFile(new URL('index.html',dir),'utf8'))
const {document,Event} = parseHTML(html)
const location = new URL('https://sabot.media/investigations/autistici-inventati/')
const scope = vm.createContext({document,URL,console,location,IntersectionObserver:class {observe(){}},localStorage:{getItem(){return null}},fetch:async()=>({ok:false}),window:{location,addEventListener(){},setTimeout(){},clearTimeout(){}},setTimeout(){},clearTimeout(){}})
for (const file of ['investigation.js','people-dossiers.js','public-updates-base.js','antifawatch-update.js']) {
  vm.runInContext(await fs.readFile(new URL(file,dir),'utf8'),scope,{filename:file,timeout:5000})
}
document.dispatchEvent(new Event('DOMContentLoaded'))
await Promise.resolve()
for (const node of document.querySelectorAll('script,button,dialog')) node.remove()
for (const node of document.querySelectorAll('[href],[src]')) {
  for (const attr of ['href','src']) {
    const value=node.getAttribute(attr)
    if (value && !value.startsWith('#')) node.setAttribute(attr,new URL(value,location).href.replace(location.origin,''))
  }
}
const main = document.querySelector('main')
if (!main || !document.getElementById('update-2026-09-08-antifawatch-trail') || !document.getElementById('people')) throw Error('Investigation reading projection is incomplete')
const note='<p>Document links open full PDFs at the cited page where supported. The JavaScript highlight overlay is unavailable in this reading view.</p>'
if (!html.includes('<base ')) html=html.replace('<head>','<head>\n  <base href="/investigations/autistici-inventati/">')
const investigationHtml = append(html,document.title, note+readableBody(main.innerHTML),'body > main,body > header,body > footer,body > .story-nav')
await fs.writeFile(new URL('index.html',dir),investigationHtml)
// A flat asset avoids directory redirects when fetched through the Pages binding.
await fs.mkdir(new URL('_reading/',root), {recursive:true})
await fs.writeFile(new URL('_reading/autistici-inventati.html',root),investigationHtml)

const courseFile=new URL('guides/become-the-thousand-servers/index.html',root)
const courseHtml=strip(await fs.readFile(courseFile,'utf8'))
const start=courseHtml.indexOf('const L=['),end=courseHtml.indexOf('const def=',start)
if(start<0||end<0) throw Error('Course lesson data not found')
const {L,tasks,G}=vm.runInNewContext(`${courseHtml.slice(start,end)};({L,tasks,G})`,{},{timeout:1000})
if(L.length!==12) throw Error('Expected twelve course lessons')
const inline=t=>e(t).replace(/`([^`]+)`/g,'<code>$1</code>')
const list=items=>`<ul>${items.map(t=>`<li>${inline(t)}</li>`).join('')}</ul>`
const lessonLink=n=>link(`#lesson-${n}`,`Lesson ${n}: ${L[n-1][1]}`)
const courseDoc=parseHTML(courseHtml).document
let courseBody=`${readableBody(courseDoc.querySelector('.hero .prose')?.innerHTML || '')}${readableBody(courseDoc.querySelector('.note')?.innerHTML || '')}<h1>Become the Thousand Servers</h1><p>Unlisted working draft. All twelve lessons are readable here. Progress tracking and notes require JavaScript.</p>${list([])}<nav>${L.map((_,i)=>lessonLink(i+1)).join(' ')}</nav>`
courseBody+=`<h2>I need to…</h2>${tasks.map(([label,nums])=>`<p>${e(label)}: ${nums.map(lessonLink).join(' · ')}</p>`).join('')}`
for(const [i,x] of L.entries()) courseBody+=`<article id="lesson-${i+1}"><h2>${i+1}. ${e(x[1])}</h2><p>${e(x.slice(2,5).join(' · '))}</p><h3>What you will learn</h3>${list(x[5])}<h3>Learn</h3>${x[6].map(t=>`<p>${inline(t)}</p>`).join('')}<h3>Do</h3>${list(x[7])}<h3>Test</h3>${paragraphs(x[8])}${list(x[10])}<h3>Teach</h3>${paragraphs(x[9])}<h3>Resources</h3>${x[11].map(([title,url,note])=>`<p>${link(url,title)} ${e(note)}</p>`).join('')}</article>`
courseBody+=`<h2>Glossary</h2><dl>${Object.entries(G).map(([term,text])=>`<dt>${e(term)}</dt><dd>${e(text)}</dd>`).join('')}</dl>`
await fs.writeFile(courseFile,append(courseHtml,'Become the Thousand Servers',courseBody,'body > main,body > header'))
console.log('Prepared full investigation and twelve-lesson course HTML reading views.')
