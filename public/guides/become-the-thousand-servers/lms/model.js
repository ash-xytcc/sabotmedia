import { participatingContributor } from './participation.js'
import { withRecoveryPathway } from './blog-recovery.js'
import { legacySeed } from './seed.js'
import { initialActivities } from './activities.js'
export const SLUG = 'become-the-thousand-servers'
export const STATUSES = ['draft', 'reporting needed', 'testing', 'review', 'published', 'archived']
export const TYPES = [
  'multiple-choice',
  'multiple-select',
  'true-false',
  'ordered-sequence',
  'matching',
  'short-reflection',
  'checklist',
  'practical',
  'troubleshooting',
  'teach-back',
]
export const sectionMap = [
  ['WHY BECOME THE THOUSAND SERVERS?', []],
  ['A SERVER IS NOT JUST A MACHINE', [1]],
  ['LEARN WHAT IS ACTUALLY HAPPENING', [2, 3]],
  ['YOUR FIRST SERVER DOESN’T NEED TO SERVE ANYONE', [4, 5]],
  ['“I HAVE A SERVER” IS NOT RESILIENCE', [6, 7, 8]],
  ['TECHNICALLY DECENTRALIZED, SOCIALLY CENTRALIZED', [9]],
  ['PUBLISH FOR DISAPPEARANCE', [10]],
  ['THE INTERNET IS NOT THE ONLY NETWORK', [11, 12]],
  ['THIS IS NOT A SERVER GUIDE', []],
  ['THE HUMAN INFRASTRUCTURE', []],
  ['THE WEB OF PARTIAL KNOWLEDGE', []],
  ['WHAT SURVIVES WITHOUT YOU?', []],
  ['EACH ONE, TEACH ONE', []],
]
export const contributorNames = [
  'Riseup','May First Movement Technology','Immerda','SinDominio','CHATONS','Koumbit','Electric Embers','Aktivix','Anarchaserver','PUSCII','BASH','Rhizomatica','Detroit Community Technology Project','Sutty','Distributed Press','Indymedia NL','The Final Straw Radio','It’s Going Down','CrimethInc.','subMedia','Kolektiva',
]
export const id = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 120)
export const sharedQuestion = 'If your project disappeared tomorrow, what would survive without you?'
export const seed = {
  slug: SLUG,
  schemaVersion: 2,
  revision: 0,
  contentVersion: '2026.09-lms-1',
  status: 'published',
  title: 'Become the Thousand Servers',
  subtitle: 'A self-paced field course in autonomous infrastructure',
  deck: 'Learn it. Break it. Rebuild it. Teach someone else.',
  intro: legacySeed.intro,
  taskHeading: 'Start with the problem you are trying to solve',
  taskIntro: '',
  lessons: legacySeed.lessons,
  sections: sectionMap.map(([title, nums], i) => ({
    id: `G${String(i + 1).padStart(2, '0')}`,
    title,
    body: '',
    status: 'published',
    lessonSlugs: nums.map((n) => legacySeed.lessons[n - 1].slug),
    activities: [], sources: [], contributors: [],
    completion: { manual: true, activities: [] }, prerequisites: [],
  })),
  activities: initialActivities(legacySeed.lessons),
  documents: [
    { id: 'open-questions', title: 'Open Questions + Disagreements', body: '', status: 'draft' },
    { id: 'sources', title: 'Sources + Technical References', body: '', status: 'draft' },
    { id: 'exercise-testing', title: 'Exercise Testing', body: '', status: 'draft' },
  ],
  testing: [],
  readinessConfig: {
    requireTechnicalReview: true,
    requirePracticalTest: true,
    blockingSeverities: ['blocking', 'high'],
  },
}
const extraActivities = {1:['dependency-choice'],2:['dns-select','dns-match'],3:['ssh-true-false'],4:['request-sequence'],5:['exposure-reflection'],6:['backup-scenario','restore-practical']}
seed.lessons = seed.lessons.map((l) => ({...l,activities:[`${l.slug}-verify`,`${l.slug}-teach`,...(extraActivities[l.number] || [])]}))
seed.sections[0].body = "The Anarchist's Guide to Losing Everyone's Email Because Dave Forgot to Patch Debian."
seed.sections[5].body = 'A thousand machines maintained by twelve exhausted people is not a thousand servers. It is twelve people with a very serious problem.'
seed.sections[11].body = "The unit of resilience isn't the machine. It's the person who can reproduce the machine."
seed.sections[12].body = 'Each one, teach one.'
Object.assign(seed, withRecoveryPathway(seed))

const str = (v, max = 30000) => String(v ?? '').slice(0, max)
const list = (v, max = 100) => (Array.isArray(v) ? v.slice(0, max) : [])
const strings = (v) => list(v).map((x) => str(x, 500)).filter((x) => x.trim())
const status = (v) => (STATUSES.includes(v) ? v : 'draft')
const resources = (v) => list(v).map((r) => ({title:str(r.title,220),url:/^https?:\/\//i.test(r.url || '') ? str(r.url,2000) : '',note:str(r.note,1000)}))
const rules = (v) => ({manual:v?.manual !== false, practical:v?.practical === true, viewed:v?.viewed === true, activities:strings(v?.activities)})
const invalid = (message) => Object.assign(new Error(message), {name:'CourseValidationError'})
const feedbackMap = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).slice(0,60).map(([k,v]) => [id(k),str(v,3000)]).filter(([k,v]) => k && v.trim()))
}

export function normalizeCourse(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('Invalid course')
  if (JSON.stringify(input).length > 1800000) throw invalid('Course is too large')
  input = withRecoveryPathway(input)
  const base = input.slug === SLUG ? seed : {...seed,slug:id(input.slug),lessons:[],sections:[],activities:[],documents:[],testing:[],pathways:[],modules:[]}
  const legacy = input.schemaVersion !== 2
  const c = {...base,...input,schemaVersion:2}
  const result = {slug:id(c.slug),schemaVersion:2,revision:Number.isSafeInteger(c.revision)?c.revision:0,status:status(c.status)}
  for (const key of ['contentVersion','title','subtitle','deck','intro','taskHeading','taskIntro']) result[key] = str(c[key])
  result.readinessConfig = {
    requireTechnicalReview: c.readinessConfig?.requireTechnicalReview !== false,
    requirePracticalTest: c.readinessConfig?.requirePracticalTest !== false,
    blockingSeverities: strings(c.readinessConfig?.blockingSeverities || ['blocking','high']).map((x) => x.toLowerCase()),
  }
  result.lessons = list(c.lessons,60).map((l,i) => {
    const aliases = {'publish-for-survival':'mirror-publish-survival','run-local-learn-network':'local-network'}
    const slug = legacy && input.slug === SLUG ? aliases[l.slug] || l.slug : l.slug
    const original = base.lessons.find((x) => x.slug === slug)
    const merged = legacy && original ? {...original,...Object.fromEntries(Object.entries(l).filter(([,v]) => v !== '' && (!Array.isArray(v) || v.length)))} : l
    return {
      slug:id(slug), number:i+1, title:str(merged.title,220), difficulty:str(merged.difficulty,80), time:str(merged.time,80),
      status:status(legacy ? 'published' : merged.status),
      ...Object.fromEntries(['learn','do','test','teach'].map((k) => [k,str(merged[k])])),
      objectives:strings(merged.objectives), checks:strings(merged.checks), resources:resources(merged.resources), activities:strings(merged.activities), prerequisites:strings(merged.prerequisites), enforcePrerequisites:merged.enforcePrerequisites === true, completion:rules(merged.completion),
      lastTestedDate:str(merged.lastTestedDate,40), lastTestedEnvironment:str(merged.lastTestedEnvironment,1000),
    }
  })
  result.sections = list(c.sections,60).map((s) => ({id:str(s.id,120),title:str(s.title,220),body:str(s.body),status:status(s.status),lessonSlugs:strings(s.lessonSlugs),activities:strings(s.activities),sources:resources(s.sources),contributors:strings(s.contributors).filter(participatingContributor),prerequisites:strings(s.prerequisites),completion:rules(s.completion)}))
  if (result.slug === SLUG) {
    if (result.sections.length !== 13 || result.sections.some((s,i) => s.id !== seed.sections[i].id || JSON.stringify(s.lessonSlugs) !== JSON.stringify(seed.sections[i].lessonSlugs))) throw invalid('Keep G01–G13 and their locked lesson mapping')
    if (result.lessons.length !== 12 || result.lessons.some((l,i) => l.slug !== seed.lessons[i].slug)) throw invalid('Keep the twelve established lesson identifiers and order')
  }
  result.activities = list(c.activities,200).map((a) => {
    if (!TYPES.includes(a.type)) throw invalid('Unknown activity type')
    const options = list(a.options,30).map((o) => ({id:id(o.id),label:str(o.label,1000)}))
    return {id:id(a.id),type:a.type,version:Math.max(1,Number(a.version)||1),title:str(a.title,220),prompt:str(a.prompt,5000),status:status(a.status),options,answer:strings(a.answer),pairs:list(a.pairs,30).map((p) => ({left:str(p.left,1000),right:str(p.right,1000)})),feedback:str(a.feedback,5000),feedbackCorrect:str(a.feedbackCorrect,3000),feedbackIncorrect:str(a.feedbackIncorrect,3000),feedbackByAnswer:feedbackMap(a.feedbackByAnswer),completionHelp:str(a.completionHelp,3000),sources:resources(a.sources)}
  })
  for (const a of result.activities.filter((a) => a.status === 'published')) {
    if (!a.title.trim() || !a.prompt.trim()) throw invalid('Published activities need a title and prompt')
    if (a.options.some((o) => !o.id || !o.label.trim()) || new Set(a.options.map((o) => o.id)).size !== a.options.length) throw invalid('Activity options need distinct IDs and labels')
    if (['multiple-choice','multiple-select','true-false','ordered-sequence','troubleshooting'].includes(a.type)) {
      if (!a.answer.length || a.answer.some((key) => !a.options.some((o) => o.id === key)) || new Set(a.answer).size !== a.answer.length) throw invalid('Correct answers must reference distinct option IDs')
      if (['multiple-choice','true-false','troubleshooting'].includes(a.type) && a.answer.length !== 1) throw invalid('This activity needs one correct answer')
      if (a.type === 'ordered-sequence' && a.answer.length !== a.options.length) throw invalid('An ordered activity needs every option in the answer')
    }
    if (a.type === 'checklist' && !a.options.length) throw invalid('A checklist needs at least one item')
    if (a.type === 'matching' && (!a.pairs.length || a.pairs.some((p) => !p.left.trim() || !p.right.trim()))) throw invalid('Matching pairs cannot be empty')
  }
  for (const key of ['lessons','sections','activities']) {
    const keys = result[key].map((v) => v.id || v.slug)
    if (keys.some((v) => !v) || new Set(keys).size !== keys.length) throw invalid(`Duplicate or missing ${key} identifier`)
  }
  const units = [...result.sections,...result.lessons]
  const byId = new Map(units.map((u) => [u.id || u.slug,u]))
  const activities = new Map(result.activities.map((a) => [a.id,a]))
  for (const u of units) {
    const required = u.completion.activities
    for (const key of [...u.activities,...required]) {
      if (!activities.has(key)) throw invalid('Referenced activity does not exist: ' + key)
      if (result.status === 'published' && u.status === 'published' && required.includes(key) && activities.get(key).status !== 'published') throw invalid('Required activities must be published: ' + key)
    }
    if (required.some((key) => !u.activities.includes(key))) throw invalid('A required activity must also be attached to its lesson or section')
    for (const key of u.prerequisites) {
      if (!byId.has(key)) throw invalid('Prerequisite does not exist: ' + key)
      if (result.status === 'published' && u.status === 'published' && u.enforcePrerequisites && byId.get(key).status !== 'published') throw invalid('Enforced prerequisites must be published: ' + key)
    }
  }
  const visiting = new Set(), visited = new Set()
  function visit(u) {
    const key = u.id || u.slug
    if (visiting.has(key)) throw invalid('Enforced prerequisites cannot form a cycle')
    if (visited.has(key)) return
    visiting.add(key)
    if (u.enforcePrerequisites) u.prerequisites.forEach((key) => visit(byId.get(key)))
    visiting.delete(key); visited.add(key)
  }
  units.forEach(visit)
  result.pathwaySchemaVersion = 1
  result.modules = list(c.modules,100).map((m)=>({id:id(m.id),title:str(m.title,220),body:str(m.body),sectionId:str(m.sectionId,120),status:status(m.status),version:Math.max(1,Number(m.version)||1),activities:strings(m.activities),lessonSlugs:strings(m.lessonSlugs),sources:resources(m.sources)}))
  result.pathways = list(c.pathways,30).map((p)=>({id:id(p.id),title:str(p.title,220),intro:str(p.intro),status:status(p.status),version:Math.max(1,Number(p.version)||1),completionTitle:str(p.completionTitle,220),completionBody:str(p.completionBody),continueBody:str(p.continueBody),sources:resources(p.sources),variants:list(p.variants,10).map((v)=>({id:id(v.id),title:str(v.title,220),steps:strings(v.steps),outcome:v.outcome==='recovery'?'recovery':'handoff'}))}))
  for(const key of ['pathways','modules']) {
    if(result[key].some((x)=>!x.id)||new Set(result[key].map((x)=>x.id)).size!==result[key].length) throw invalid('Duplicate or missing '+key+' identifier')
  }
  for(const m of result.modules) {
    if(!result.sections.some((s)=>s.id===m.sectionId)) throw invalid('Supporting module needs a guide section')
    if(m.lessonSlugs.some((id)=>!result.lessons.some((l)=>l.slug===id))) throw invalid('Supporting module lesson does not exist')
    if(m.activities.some((id)=>!activities.has(id))) throw invalid('Supporting module activity does not exist')
    if(m.status==='published'&&(!m.title.trim()||!m.body.trim()||!m.activities.length)) throw invalid('Published supporting module needs content and a checkpoint')
  }
  for(const p of result.pathways) {
    if(!p.variants.length||new Set(p.variants.map((v)=>v.id)).size!==p.variants.length) throw invalid('Pathway needs distinct destination variants')
    for(const v of p.variants) if(!v.id||!v.steps.length||new Set(v.steps).size!==v.steps.length||v.steps.some((id)=>!result.modules.some((m)=>m.id===id))) throw invalid('Pathway steps must reference distinct supporting modules')
  }
  result.documents = list(c.documents,30).map((d) => ({id:id(d.id),title:str(d.title,220),body:str(d.body),status:status(d.status),sources:resources(d.sources)}))
  const testingFields = ['id','targetType','targetId','exercise','contentVersion','activityVersion','reviewKind','technicalReviewer','practicalTester','operatingSystem','softwareVersions','equipment','startingConditions','steps','expected','actual','confusing','failedCommands','missingAssumptions','safetyConcerns','recoveryFailures','severity','responsible','status','requiredCorrection','retestOutcome','date','state','tester','environment','assumptions','worked','broke','unclear','hiddenAssumptions','concerns','changes','retest']
  result.testing = list(c.testing,500).map((t) => Object.fromEntries(testingFields.map((k) => [k,str(t[k],5000)])))
  return result
}

export function publicCourse(c) {
  const out = normalizeCourse(c)
  for (const key of ['lessons','sections','activities','documents','pathways','modules']) out[key] = out[key].filter((x) => x.status === 'published')
  out.modules = out.modules.map((m)=>({...m,lessonSlugs:m.lessonSlugs.filter((slug)=>out.lessons.some((l)=>l.slug===slug))}))
  out.testing = []
  delete out.readinessConfig
  return out
}
export { legacySeed }
