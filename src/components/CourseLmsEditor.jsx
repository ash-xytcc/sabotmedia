import { useEffect, useMemo, useState } from 'react'
import { STATUSES, TYPES } from '../../public/guides/become-the-thousand-servers/lms/model.js'

const testStates = ['NOT TESTED', 'READ ONLY', 'PARTIAL', 'PASS', 'PASS WITH REVISIONS', 'FAIL', 'RETEST NEEDED']
const severities = ['none', 'low', 'medium', 'high', 'blocking']
const findingStatuses = ['open', 'in progress', 'corrected', 'retest needed', 'resolved']
const title = (s) => s.replace(/([A-Z])/g, ' $1').replace(/^./, (x) => x.toUpperCase())
const box = { border: '1px solid #999', padding: 12, margin: '12px 0', borderRadius: 4 }
const beforeAfter = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }

export function CourseLmsEditor({ course, onChange }) {
  const [tab, setTab] = useState('sections')
  const [contributors, setContributors] = useState([])
  const [admin, setAdmin] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState([])
  const [reviewNotes, setReviewNotes] = useState({})
  const [name, setName] = useState('')
  const [id, setId] = useState('')
  const [days, setDays] = useState(365)

  const update = (key, index, field, value) =>
    onChange({ ...course, [key]: course[key].map((v, i) => (i === index ? { ...v, [field]: value } : v)) })
  const field = (key, i, record, name, rows = 3) => (
    <label key={name} style={{ display: 'block', margin: '12px 0' }}>
      {title(name)}
      <textarea className="large-text" rows={rows} value={record[name] || ''} onChange={(e) => update(key, i, name, e.target.value)} />
    </label>
  )
  const status = (key, i, r) => (
    <label>Editorial status{' '}<select value={r.status} onChange={(e) => update(key, i, 'status', e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
  )
  async function request(url, body) {
    const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...(body ? { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) } : {}) })
    const d = await r.json()
    if (!r.ok) throw Error(d.error || 'Request failed')
    return d
  }
  async function loadContributors() {
    try {
      const d = await request('/api/course-contributors')
      setContributors(d.items); setAdmin(d.admin)
    } catch (e) { setMessage(e.message) }
  }
  useEffect(() => { loadContributors() }, [])

  const pending = useMemo(() => contributors.flatMap((p) => (p.pending || []).map((s) => ({...s,projectName:p.name}))), [contributors])
  const readiness = useMemo(() => {
    const cfg = course.readinessConfig || {requireTechnicalReview:true,requirePracticalTest:true,blockingSeverities:['blocking','high']}
    const tests = course.testing || []
    const rows = (course.lessons || []).map((lesson) => {
      const ids = [lesson.slug, ...(lesson.activities || [])]
      const related = tests.filter((t) => ids.includes(t.targetId) || ids.includes(t.exercise))
      const technical = related.some((t) => t.reviewKind === 'technical-review' || (t.state && t.state !== 'NOT TESTED'))
      const performed = related.some((t) => t.reviewKind === 'practical-test' && ['PASS','PASS WITH REVISIONS'].includes(t.state))
      const blockers = related.filter((t) => cfg.blockingSeverities?.includes((t.severity || '').toLowerCase()) && !['resolved','corrected'].includes((t.status || '').toLowerCase()))
      const stale = related.filter((t) => t.contentVersion && t.contentVersion !== course.contentVersion)
      return {lesson,technical,performed,blockers,stale}
    })
    return {cfg,rows,missingTechnical:rows.filter((r)=>cfg.requireTechnicalReview&&!r.technical),untested:rows.filter((r)=>cfg.requirePracticalTest&&!r.performed),blockers:rows.flatMap((r)=>r.blockers),stale:rows.flatMap((r)=>r.stale)}
  }, [course])

  async function decide(submission, decision) {
    const reviewerNote = (reviewNotes[submission.id] || '').trim()
    if (!reviewerNote) { setMessage('Add a reviewer note before recording a decision.'); return }
    try {
      await request('/api/course-contributors', {action:'review-decision',submissionId:submission.id,decision,reviewerNote})
      setReviewNotes((n) => ({...n,[submission.id]:''})); await loadContributors()
      setMessage(decision === 'approved' ? 'Approved and published that exact revision.' : decision === 'changes-requested' ? 'Changes requested. The submission remains in history.' : 'Submission rejected. Existing publication was left unchanged.')
    } catch (e) { setMessage(e.message); await loadContributors() }
  }

  return <section className="wp-meta-box">
    <h2>Course workspace</h2>
    <nav aria-label="Course workspace sections" style={{display:'flex',flexWrap:'wrap',gap:8}}>
      {['sections','activities','documents','testing','readiness','reviews','contributors','revisions','recovery'].map((t)=><button className="button" type="button" key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{title(t)}{t==='reviews'&&pending.length?` (${pending.length})`:''}</button>)}
    </nav>
    <p role="status">{message}</p>

    {tab==='sections' && (course.sections||[]).map((s,i)=><details key={s.id}><summary>{s.id}. {s.title}</summary>{field('sections',i,s,'title')}{status('sections',i,s)}{field('sections',i,s,'body',12)}<p>Practical lessons: {s.lessonSlugs.join(', ') || 'None'}</p><Lines label="Activities (IDs, one per line)" value={s.activities} onChange={(v)=>update('sections',i,'activities',v)}/><Lines label="Contributor IDs (one per line)" value={s.contributors} onChange={(v)=>update('sections',i,'contributors',v)}/><Resources value={s.sources} onChange={(v)=>update('sections',i,'sources',v)}/><Completion value={s.completion} onChange={(v)=>update('sections',i,'completion',v)}/></details>)}

    {tab==='activities' && <><button type="button" className="button" onClick={()=>onChange({...course,activities:[...(course.activities||[]),{id:'activity-'+Date.now(),title:'New activity',type:'multiple-choice',version:1,status:'draft',prompt:'',options:[],answer:[],pairs:[],feedback:'',feedbackCorrect:'',feedbackIncorrect:'',feedbackByAnswer:{},completionHelp:'',sources:[]}]})}>Add activity</button>{(course.activities||[]).map((a,i)=><details key={a.id}><summary>{a.title} · {a.type} · v{a.version} · {a.status}</summary><p>ID: {a.id}</p>{field('activities',i,a,'title')}{status('activities',i,a)}<p><label>Type{' '}<select value={a.type} onChange={(e)=>update('activities',i,'type',e.target.value)}>{TYPES.map((t)=><option key={t}>{t}</option>)}</select></label>{' '}<label>Activity version{' '}<input type="number" min="1" value={a.version} onChange={(e)=>update('activities',i,'version',Number(e.target.value))}/></label></p><p>Increase the version when a material change should require a fresh attempt. Older attempts remain in learner history.</p>{field('activities',i,a,'prompt',5)}<label>Options: ID | label, one per line<textarea className="large-text" rows={5} value={(a.options||[]).map((o)=>o.id+' | '+o.label).join('\n')} onChange={(e)=>update('activities',i,'options',e.target.value.split('\n').filter(Boolean).map((line)=>{const [oid,...label]=line.split('|');return{id:oid.trim(),label:label.join('|').trim()}}))}/></label><Lines label="Correct answer IDs (in sequence for ordered activities)" value={a.answer} onChange={(v)=>update('activities',i,'answer',v)}/><label>Matching: left | right, one per line<textarea className="large-text" rows={5} value={(a.pairs||[]).map((p)=>p.left+' | '+p.right).join('\n')} onChange={(e)=>update('activities',i,'pairs',e.target.value.split('\n').filter(Boolean).map((line)=>{const [left,...right]=line.split('|');return{left:left.trim(),right:right.join('|').trim()}}))}/></label>{field('activities',i,a,'completionHelp')}{field('activities',i,a,'feedback')}{field('activities',i,a,'feedbackCorrect')}{field('activities',i,a,'feedbackIncorrect')}<label>Answer-specific feedback: option ID | explanation, one per line<textarea className="large-text" rows={5} value={Object.entries(a.feedbackByAnswer||{}).map(([k,v])=>`${k} | ${v}`).join('\n')} onChange={(e)=>update('activities',i,'feedbackByAnswer',Object.fromEntries(e.target.value.split('\n').filter(Boolean).map((line)=>{const [k,...v]=line.split('|');return[k.trim(),v.join('|').trim()]})))}/></label><Resources value={a.sources} onChange={(v)=>update('activities',i,'sources',v)}/></details>)}</>}

    {tab==='documents' && (course.documents||[]).map((d,i)=><details key={d.id}><summary>{d.title} · {d.status}</summary>{field('documents',i,d,'title')}{status('documents',i,d)}{field('documents',i,d,'body',15)}<Resources value={d.sources} onChange={(v)=>update('documents',i,'sources',v)}/></details>)}

    {tab==='testing' && <><p>Reading a procedure and successfully performing it are recorded separately. Testing records remain editorial; only an appropriate last-tested date/environment is published on a lesson.</p><button type="button" className="button" onClick={()=>onChange({...course,testing:[...(course.testing||[]),{id:'test-'+Date.now(),targetType:'lesson',targetId:'',reviewKind:'technical-review',contentVersion:course.contentVersion||'',state:'NOT TESTED',severity:'none',status:'open'}]})}>Add review / exercise test</button>{(course.testing||[]).map((r,i)=><details key={r.id}><summary>{r.targetId || r.exercise || 'New review'} · {r.reviewKind || 'unclassified'} · {r.state || 'NOT TESTED'}</summary><p><label>Review kind{' '}<select value={r.reviewKind||''} onChange={(e)=>update('testing',i,'reviewKind',e.target.value)}><option value="technical-review">Technical review (read/inspect)</option><option value="practical-test">Practical test (performed)</option></select></label>{' '}<label>State{' '}<select value={r.state||'NOT TESTED'} onChange={(e)=>update('testing',i,'state',e.target.value)}>{testStates.map((s)=><option key={s}>{s}</option>)}</select></label></p><p><label>Severity{' '}<select value={r.severity||'none'} onChange={(e)=>update('testing',i,'severity',e.target.value)}>{severities.map((s)=><option key={s}>{s}</option>)}</select></label>{' '}<label>Finding status{' '}<select value={r.status||'open'} onChange={(e)=>update('testing',i,'status',e.target.value)}>{findingStatuses.map((s)=><option key={s}>{s}</option>)}</select></label></p>{['targetType','targetId','exercise','contentVersion','activityVersion','technicalReviewer','practicalTester','operatingSystem','softwareVersions','equipment','startingConditions','date','steps','expected','actual','confusing','failedCommands','missingAssumptions','safetyConcerns','recoveryFailures','responsible','requiredCorrection','retestOutcome'].map((k)=>field('testing',i,r,k,k==='steps'||k==='actual'||k==='requiredCorrection'?6:3))}</details>)}</>}

    {tab==='readiness' && <><h3>Pre-launch readiness</h3><p>This is advisory, not an automatic publication gate. Existing published material stays published until an editor changes it.</p><fieldset><legend>Readiness rules</legend><label><input type="checkbox" checked={readiness.cfg.requireTechnicalReview} onChange={(e)=>onChange({...course,readinessConfig:{...readiness.cfg,requireTechnicalReview:e.target.checked}})}/> Require a technical review</label>{' '}<label><input type="checkbox" checked={readiness.cfg.requirePracticalTest} onChange={(e)=>onChange({...course,readinessConfig:{...readiness.cfg,requirePracticalTest:e.target.checked}})}/> Require successful practical performance</label><Lines label="Blocking severities" value={readiness.cfg.blockingSeverities||[]} onChange={(v)=>onChange({...course,readinessConfig:{...readiness.cfg,blockingSeverities:v}})}/></fieldset><p><strong>{readiness.missingTechnical.length}</strong> lessons missing technical review · <strong>{readiness.untested.length}</strong> missing successful practical test · <strong>{readiness.blockers.length}</strong> unresolved blocking findings · <strong>{readiness.stale.length}</strong> reviews against an older content version.</p>{readiness.rows.map(({lesson,technical,performed,blockers,stale})=><div key={lesson.slug} style={box}><h4>Lesson {lesson.number}: {lesson.title}</h4><p>Technical review: {technical?'recorded':'MISSING'} · Practical performance: {performed?'successful':'UNTESTED'} · Blocking findings: {blockers.length} · Needs revisit after content change: {stale.length?'YES':'no'}</p><label>Published last tested date <input value={lesson.lastTestedDate||''} placeholder="YYYY-MM-DD" onChange={(e)=>update('lessons',lesson.number-1,'lastTestedDate',e.target.value)}/></label>{' '}<label>Published environment <input value={lesson.lastTestedEnvironment||''} onChange={(e)=>update('lessons',lesson.number-1,'lastTestedEnvironment',e.target.value)}/></label></div>)}</>}

    {tab==='reviews' && <><h3>Contributor submissions</h3><p>Private Comms never appear here. Decisions apply to the exact submitted revision, not whatever draft happens to be newest.</p><button type="button" className="button" onClick={loadContributors}>Refresh submissions</button>{!pending.length&&<p>No pending contributor submissions.</p>}{pending.map((s)=><article key={s.id} style={box}><h4>{s.projectName} · revision {s.revision}</h4><p>Submitted {s.submittedAt} · status {s.status}</p>{(s.comparison||[]).length===0?<p>No public-content difference from the current publication.</p>:(s.comparison||[]).map((change,n)=><div key={n} style={box}><strong>{change.kind.toUpperCase()} · {change.field}{change.index!==undefined?` ${change.index+1}`:''}</strong><div style={beforeAfter}><section><h5>Currently published</h5><pre style={{whiteSpace:'pre-wrap'}}>{typeof change.before==='object'?JSON.stringify(change.before,null,2):(change.before||'(empty)')}</pre></section><section><h5>Proposed revision</h5><pre style={{whiteSpace:'pre-wrap'}}>{typeof change.after==='object'?JSON.stringify(change.after,null,2):(change.after||'(empty)')}</pre></section></div></div>)}<label>Reviewer note (required)<textarea className="large-text" rows="4" value={reviewNotes[s.id]||''} onChange={(e)=>setReviewNotes((n)=>({...n,[s.id]:e.target.value}))}/></label><div style={{display:'flex',flexWrap:'wrap',gap:8}}><button type="button" className="button button-primary" onClick={()=>decide(s,'approved')}>Approve and publish</button><button type="button" className="button" onClick={()=>decide(s,'changes-requested')}>Request changes</button><button type="button" className="button" onClick={()=>decide(s,'rejected')}>Reject submission</button></div></article>)}</>}

    {tab==='contributors' && <><p><strong>{pending.length} submissions awaiting review.</strong></p><button type="button" className="button" onClick={loadContributors}>Refresh review status</button><ul>{contributors.map((p)=><li key={p.id}>{p.pendingCount>0&&<strong>{p.pendingCount} PENDING · </strong>}<a href={`/guides/become-the-thousand-servers/contributors/${p.id}`} target="_blank" rel="noreferrer">{p.name}: contribution / edit / access controls</a>{' · '}<a href={`/guides/become-the-thousand-servers/contributors/${p.id}/private`} target="_blank" rel="noreferrer">Private Comms</a></li>)}</ul>{admin&&<div><label>New contributor name <input value={name} onChange={(e)=>setName(e.target.value)}/></label><label>URL identifier <input value={id} onChange={(e)=>setId(e.target.value)}/></label><button type="button" className="button" onClick={async()=>{try{await request('/api/course-contributors',{action:'create',name,id});await loadContributors();setName('');setId('')}catch(e){setMessage(e.message)}}}>Create contributor</button></div>}</>}

    {tab==='revisions' && <><button type="button" className="button" onClick={async()=>{try{const d=await request(`/api/course-content?slug=${encodeURIComponent(course.slug)}&revisions=1`);setHistory(d.items)}catch(e){setMessage(e.message)}}}>Load revision history</button>{history.map((r)=><details key={r.id}><summary>Version {r.version} · {r.created_at} · {r.actor_id} · {r.status}</summary><pre style={{whiteSpace:'pre-wrap',maxHeight:400,overflow:'auto'}}>{JSON.stringify(JSON.parse(r.content_json),null,2)}</pre><button type="button" className="button" onClick={()=>{if(confirm('Load this revision into the editor as a draft? Nothing will publish until you save it explicitly.'))onChange({...JSON.parse(r.content_json),revision:course.revision,status:'draft'})}}>Load as draft</button></details>)}</>}

    {tab==='recovery' && <><p>Only encrypted learner blobs are stored. Successful updates renew retention. A printed card cannot restore an expired server blob unless another surviving copy exists.</p>{admin&&<><label>Retention days <input type="number" min={1} max={365} value={days} onChange={(e)=>setDays(Number(e.target.value))}/></label><button type="button" className="button" onClick={async()=>{try{const d=await request('/api/course-recovery',{action:'settings'});setDays(d.days);setMessage('Loaded retention setting')}catch(e){setMessage(e.message)}}}>Load</button><button type="button" className="button" onClick={async()=>{try{await request('/api/course-recovery',{action:'settings',days});setMessage('Retention saved')}catch(e){setMessage(e.message)}}}>Save retention</button></>}<p>Authorized backup updates are limited per recovery card; new-card creation and failed recovery attempts remain network-limited for abuse control.</p><p>Manage SabotPress editor roles through the existing Users screen.</p></>}
  </section>
}

export function Lines({label,value=[],onChange}) { return <label style={{display:'block',margin:'12px 0'}}>{label}<textarea className="large-text" rows="3" value={value.join('\n')} onChange={(e)=>onChange(e.target.value.split('\n').map((x)=>x.trim()).filter(Boolean))}/></label> }
export function Resources({value=[],onChange}) { return <label style={{display:'block',margin:'12px 0'}}>Sources: title | HTTPS URL | note, one per line<textarea className="large-text" rows="4" value={value.map((r)=>[r.title,r.url,r.note].join(' | ')).join('\n')} onChange={(e)=>onChange(e.target.value.split('\n').filter(Boolean).map((line)=>{const [t='',url='',...note]=line.split('|');return{title:t.trim(),url:url.trim(),note:note.join('|').trim()}}))}/></label> }
export function Completion({value={},onChange}) { return <fieldset><legend>Completion rules</legend>{['manual','practical','viewed'].map((k)=><label key={k} style={{marginRight:12}}><input type="checkbox" checked={!!value[k]} onChange={(e)=>onChange({...value,[k]:e.target.checked})}/>{title(k)}</label>)}<Lines label="Required activity IDs (one per line)" value={value.activities||[]} onChange={(v)=>onChange({...value,activities:v})}/></fieldset> }
