import { legacySeed } from './seed.js'
export const SLUG = 'become-the-thousand-servers'
export const STATUSES = ['draft','reporting needed','testing','review','published','archived']
export const TYPES = ['multiple-choice','multiple-select','true-false','ordered-sequence','matching','short-reflection','checklist','practical','troubleshooting','teach-back']
export const sectionMap = [
  ['WHY BECOME THE THOUSAND SERVERS?',[]],['A SERVER IS NOT JUST A MACHINE',[1]],
  ['LEARN WHAT IS ACTUALLY HAPPENING',[2,3]],["YOUR FIRST SERVER DOESN’T NEED TO SERVE ANYONE",[4,5]],
  ['“I HAVE A SERVER” IS NOT RESILIENCE',[6,7,8]],['TECHNICALLY DECENTRALIZED, SOCIALLY CENTRALIZED',[9]],
  ['PUBLISH FOR DISAPPEARANCE',[10]],['THE INTERNET IS NOT THE ONLY NETWORK',[11,12]],
  ['THIS IS NOT A SERVER GUIDE',[]],['THE HUMAN INFRASTRUCTURE',[]],['THE WEB OF PARTIAL KNOWLEDGE',[]],
  ['WHAT SURVIVES WITHOUT YOU?',[]],['EACH ONE, TEACH ONE',[]]
]
export const contributorNames = ['Autistici/Inventati','Riseup','May First Movement Technology','Systemli','Immerda','SinDominio','CHATONS','Koumbit','Electric Embers','Aktivix','Anarchaserver','PUSCII','BASH','Rhizomatica','Detroit Community Technology Project','Sutty','Distributed Press','Indymedia NL','The Final Straw Radio',"It’s Going Down",'CrimethInc.','subMedia','Kolektiva']
export const id = v => String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,120)
export const sharedQuestion = 'If your project disappeared tomorrow, what would survive without you?'
export const seed = {
  slug:SLUG,schemaVersion:2,revision:0,contentVersion:'2026.09-lms-1',status:'published',
  title:'Become the Thousand Servers',subtitle:'A self-paced field course in autonomous infrastructure',
  deck:'Learn it. Break it. Rebuild it. Teach someone else.',intro:legacySeed.intro,
  taskHeading:'Start with the problem you are trying to solve',taskIntro:'',
  lessons:legacySeed.lessons,
  sections:sectionMap.map(([title,nums],i)=>({id:`G${String(i+1).padStart(2,'0')}`,title,body:'',status:'published',lessonSlugs:nums.map(n=>legacySeed.lessons[n-1].slug),activities:[],sources:[],contributors:[],completion:{manual:true,activities:[]},prerequisites:[]})),
  activities:[],documents:[{id:'open-questions',title:'Open Questions + Disagreements',body:'',status:'draft'}, {id:'sources',title:'Sources + Technical References',body:'',status:'draft'}, {id:'exercise-testing',title:'Exercise Testing',body:'',status:'draft'}],testing:[]
}
const str = (v,max=30000) => String(v ?? '').slice(0,max)
const list = (v,max=100) => Array.isArray(v)?v.slice(0,max):[]
const strings = v => list(v).map(x=>str(x,500))
const status = v => STATUSES.includes(v)?v:'draft'
const resources = v => list(v).map(r=>({title:str(r.title,220),url:/^https?:\/\//i.test(r.url||'')?str(r.url,2000):'',note:str(r.note,1000)}))
const rules = v => ({manual:v?.manual!==false,practical:v?.practical===true,viewed:v?.viewed===true,activities:strings(v?.activities)})
export function normalizeCourse(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw Error('Invalid course')
  if (JSON.stringify(input).length>1800000) throw Error('Course is too large')
  const base=input.slug===SLUG?seed:{...seed,slug:id(input.slug),lessons:[],sections:[],documents:[]}
  const legacy=input.schemaVersion!==2
  const c={...base,...input,schemaVersion:2}
  const result={slug:id(c.slug),schemaVersion:2,revision:Number.isSafeInteger(c.revision)?c.revision:0,status:status(c.status)}
  for (const key of ['contentVersion','title','subtitle','deck','intro','taskHeading','taskIntro']) result[key]=str(c[key])
  result.lessons=list(c.lessons,60).map((l,i)=>{
    const original=base.lessons.find(x=>x.slug===l.slug)
    const merged=legacy&&original?{...original,...Object.fromEntries(Object.entries(l).filter(([,v])=>v!=='' && (!Array.isArray(v)||v.length)))}:l
    return {slug:id(l.slug),number:i+1,title:str(merged.title,220),difficulty:str(merged.difficulty,80),time:str(merged.time,80),status:status(legacy?'published':merged.status),...Object.fromEntries(['learn','do','test','teach'].map(k=>[k,str(merged[k])])),objectives:strings(merged.objectives),checks:strings(merged.checks),resources:resources(merged.resources),prerequisites:strings(merged.prerequisites),enforcePrerequisites:merged.enforcePrerequisites===true,completion:rules(merged.completion)}
  })
  result.sections=list(c.sections,60).map(s=>({id:str(s.id,120),title:str(s.title,220),body:str(s.body),status:status(s.status),lessonSlugs:strings(s.lessonSlugs),activities:strings(s.activities),sources:resources(s.sources),contributors:strings(s.contributors),prerequisites:strings(s.prerequisites),completion:rules(s.completion)}))
  if(result.slug===SLUG) {
    if(result.sections.length!==13 || result.sections.some((s,i)=>s.id!==seed.sections[i].id || JSON.stringify(s.lessonSlugs)!==JSON.stringify(seed.sections[i].lessonSlugs))) throw Error('Keep G01–G13 and their locked lesson mapping')
    if(result.lessons.length!==12 || result.lessons.some((l,i)=>l.slug!==seed.lessons[i].slug)) throw Error('Keep the twelve established lesson identifiers and order')
  }
  result.activities=list(c.activities,200).map(a=>{
    if(!TYPES.includes(a.type))throw Error('Unknown activity type')
    const options=list(a.options,30).map(o=>({id:id(o.id),label:str(o.label,1000)}))
    return {id:id(a.id),type:a.type,version:Math.max(1,Number(a.version)||1),title:str(a.title,220),prompt:str(a.prompt,5000),status:status(a.status),options,answer:strings(a.answer),pairs:list(a.pairs,30).map(p=>({left:str(p.left,1000),right:str(p.right,1000)})),feedback:str(a.feedback,5000),sources:resources(a.sources)}
  })
  for(const key of ['lessons','sections','activities']) {const keys=result[key].map(v=>v.id||v.slug);if(keys.some(v=>!v)||new Set(keys).size!==keys.length)throw Error(`Duplicate or missing ${key} identifier`)}
  result.documents=list(c.documents,30).map(d=>({id:id(d.id),title:str(d.title,220),body:str(d.body),status:status(d.status),sources:resources(d.sources)}))
  result.testing=list(c.testing,300).map(t=>Object.fromEntries(['id','exercise','tester','environment','date','state','assumptions','worked','broke','unclear','hiddenAssumptions','concerns','changes','retest'].map(k=>[k,str(t[k],5000)])))
  return result
}
export function publicCourse(c) {
  const out=normalizeCourse(c)
  for(const key of ['lessons','sections','activities','documents']) out[key]=out[key].filter(x=>x.status==='published')
  out.testing=[]
  return out
}
export { legacySeed }
