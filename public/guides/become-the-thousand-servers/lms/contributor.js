const root = document.querySelector('[data-contributor]'),
  id = root.dataset.contributor,
  scope = root.dataset.scope
const $ = (s) => root.querySelector(s)
const status = (t) => { $('[data-message]').textContent = t }
let current = null, dirty = false
root.addEventListener('input', (event) => { if (event.target.closest('[data-edit-form]')) dirty = true })
addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = '' } })

async function api(body = null, extra = '') {
  const url = '/api/course-contributors' + (body ? '' : `?id=${encodeURIComponent(id)}&scope=${scope}${extra}`)
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: body ? {'content-type':'application/json'} : {},
    ...(body ? {body:JSON.stringify({id,scope,...body})} : {}),
  })
  const data = await r.json()
  if (!r.ok) throw Error(data.error || 'Workspace unavailable')
  return data
}
function field(name, value, rows = 5) {
  const label = document.createElement('label')
  label.textContent = name
  const input = document.createElement('textarea')
  input.rows = rows; input.maxLength = 30000; input.value = value || ''
  label.append(input)
  return {label,input}
}
function renderSubmissions() {
  let panel = root.querySelector('[data-review-decisions]')
  if (!panel) {
    panel = document.createElement('section'); panel.dataset.reviewDecisions = ''
    $('[data-edit-form]').after(panel)
  }
  panel.replaceChildren()
  if (scope !== 'edit' || !current?.canEdit) return
  const heading = document.createElement('h2'); heading.textContent = 'Editorial review'
  panel.append(heading)
  const submissions = current.submissions || []
  if (!submissions.length) {
    const p = document.createElement('p'); p.textContent = 'No submitted revisions yet.'; panel.append(p); return
  }
  for (const s of submissions) {
    const article = document.createElement('article')
    article.className = 'review-decision'
    const h = document.createElement('h3')
    h.textContent = `Revision ${s.revision} · ${s.status}`
    const when = document.createElement('p')
    when.textContent = `Submitted ${s.submittedAt || 'date unavailable'}${s.decidedAt ? ` · decided ${s.decidedAt}` : ''}`
    article.append(h, when)
    if (s.reviewerNote) {
      const note = document.createElement('p')
      const strong = document.createElement('strong'); strong.textContent = s.decision === 'changes-requested' ? 'Requested changes: ' : 'Reviewer note: '
      note.append(strong, document.createTextNode(s.reviewerNote)); article.append(note)
    }
    if (s.status === 'pending') {
      const p = document.createElement('p'); p.textContent = 'Awaiting editorial review. Saving newer changes creates a newer pending revision without erasing this one.'; article.append(p)
    }
    panel.append(article)
  }
}
function fillPublicDraft(item = {}) {
  const form = $('[data-edit-fields]')
  const shared = form.querySelector('[data-shared]')
  const exercise = form.querySelector('[data-exercise]')
  if (!shared || !exercise) return
  shared.value = item.sharedAnswer || ''
  exercise.value = item.exercise || ''
  for (const box of [...form.querySelectorAll('[data-question]')]) box.remove()
  const add = [...form.querySelectorAll('button')].find((b) => b.textContent === 'Add a project-specific question')
  for (const q of item.questions || []) {
    const box = document.createElement('div'); box.dataset.question = ''
    box.append(field('Project-specific question', q.question, 2).label, field('Response', q.answer).label)
    add.before(box)
  }
  dirty = true
  status('Historical revision loaded as an unsaved draft. Review it, then save explicitly. Nothing was published.')
}
async function load() {
  try {
    current = await api()
    $('[data-login]').hidden = current.canEdit
    $('[data-edit-form]').hidden = !current.canEdit
    if (!current.canEdit) return
    const form = $('[data-edit-fields]')
    form.replaceChildren()
    if (scope === 'private') {
      const f = field('Private communications', current.text, 16)
      f.input.dataset.private = ''; f.input.maxLength = 60000; form.append(f.label)
    } else {
      const shared = field('If your project disappeared tomorrow, what would survive without you?', current.item?.sharedAnswer)
      shared.input.dataset.shared = ''; form.append(shared.label)
      for (const q of current.item?.questions || []) {
        const box = document.createElement('div'); box.dataset.question = ''
        const question = field('Project-specific question', q.question, 2), answer = field('Response', q.answer)
        box.append(question.label, answer.label); form.append(box)
      }
      const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Add a project-specific question'
      add.onclick = () => {
        if (form.querySelectorAll('[data-question]').length >= 8) return
        const box = document.createElement('div'); box.dataset.question = ''
        box.append(field('Project-specific question','',2).label, field('Response','').label); add.before(box)
      }
      form.append(add)
      if (current.item?.suggestedExercise) {
        const suggestion = document.createElement('p'); suggestion.textContent = 'Suggested exercise (use, adapt, or replace): ' + current.item.suggestedExercise; form.append(suggestion)
      }
      const exercise = field('Each One, Teach One: use, modify, or replace the suggested practical exercise', current.item?.exercise)
      exercise.input.dataset.exercise = ''; form.append(exercise.label)
      if (current.editor) {
        const label = document.createElement('label'); label.textContent = 'Editorial status'
        const select = document.createElement('select'); select.dataset.editorialStatus = ''
        for (const s of ['draft','reporting needed','testing','review','published','archived']) {
          const o = document.createElement('option'); o.value=s; o.textContent=s; select.append(o)
        }
        select.value = current.item?.status || 'draft'; label.append(select); form.append(label)
      }
    }
    $('[data-admin]').hidden = !current.admin
    if (current.editor && !root.querySelector('[data-course-admin-link]')) {
      const link = document.createElement('a'); link.dataset.courseAdminLink=''; link.href='/wp-admin/pages?course=become-the-thousand-servers'; link.textContent='Open course administration'; root.prepend(link)
    }
    renderSubmissions()
    status(scope === 'private' ? (current.editor ? 'Private to the editorial team. Your staff sign-in provides access; no extra password is needed.' : 'Private workspace unlocked.') : 'Editing contribution. Contributor saves create review submissions; the currently published version stays unchanged until an editor approves one.')
  } catch (e) {
    $('[data-login]').hidden = false; $('[data-edit-form]').hidden = true
    status(scope === 'private' ? 'Sign in with your project password to open this private conversation.' : e.message)
  }
}
$('[data-login]').hidden = false
$('[data-login]').onsubmit = async (e) => { e.preventDefault(); try { await api({action:'login',password:$('[data-password]').value}); $('[data-password]').value=''; await load() } catch(e){status(e.message)} }
$('[data-edit-form]').onsubmit = async (e) => {
  e.preventDefault()
  try {
    const body = {revision:current.revision}
    if (scope === 'private') body.text = $('[data-private]').value
    else body.item = {
      sharedAnswer:$('[data-shared]').value, exercise:$('[data-exercise]').value, suggestedExercise:current.item?.suggestedExercise || '',
      questions:[...root.querySelectorAll('[data-question]')].map((q) => ({question:q.querySelectorAll('textarea')[0].value,answer:q.querySelectorAll('textarea')[1].value})),
      status:$('[data-editorial-status]')?.value || 'review',
    }
    await api(body); dirty=false; await load(); status(scope === 'private' ? 'Private Comms saved.' : (current.editor ? 'Saved.' : 'Submitted for editorial review. The published contribution has not changed.'))
  } catch(e){status(e.message)}
}
$('[data-logout]').onclick = async () => { try { await api({action:'logout'}); location.reload() } catch(e){status(e.message)} }
$('[data-history]').onclick = async () => {
  try {
    const data = await api(null,'&revisions=1'), history = $('[data-revisions]'); history.replaceChildren()
    for (const r of data.items) {
      const details=document.createElement('details'), summary=document.createElement('summary')
      summary.textContent=`Version ${r.version} · ${r.created_at} · ${r.actor_type}: ${r.actor_id} · ${r.status}`
      details.append(summary)
      const parsed=JSON.parse(r.content_json)
      if (scope === 'private') {
        const p=document.createElement('p'); p.textContent=parsed.text || '(empty private revision)'; details.append(p)
        const load=document.createElement('button'); load.type='button'; load.textContent='Load as draft'; load.onclick=()=>{ $('[data-private]').value=parsed.text || ''; dirty=true; status('Historical Private Comms loaded as an unsaved draft. Save explicitly to keep it.') }; details.append(load)
      } else {
        const fields=[['Shared answer',parsed.sharedAnswer],['Exercise',parsed.exercise],['Suggested exercise',parsed.suggestedExercise]]
        for (const [name,value] of fields) if (value) { const h=document.createElement('h4'); h.textContent=name; const p=document.createElement('p'); p.textContent=value; details.append(h,p) }
        for (const q of parsed.questions || []) { const h=document.createElement('h4'); h.textContent=q.question || 'Question'; const p=document.createElement('p'); p.textContent=q.answer || '(no answer)'; details.append(h,p) }
        const load=document.createElement('button'); load.type='button'; load.textContent='Load as draft'; load.onclick=()=>fillPublicDraft(parsed); details.append(load)
      }
      history.append(details)
    }
  } catch(e){status(e.message)}
}
$('[data-credentials]').onclick = async () => { try { await api({action:'credentials',editPassword:$('[data-edit-password]').value}); $('[data-edit-password]').value=''; status('Contributor access updated; older contributor sessions revoked. Staff access uses your existing sign-in.') } catch(e){status(e.message)} }
$('[data-disable]').onclick = async () => { if(!confirm('Disable this contributor’s access and revoke sessions?'))return; try{await api({action:'credentials',disabled:true});status('Contributor access disabled.')}catch(e){status(e.message)} }
load()
