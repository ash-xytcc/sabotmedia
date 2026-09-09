const root = document.querySelector('[data-contributor]'),
  id = root.dataset.contributor,
  scope = root.dataset.scope
const $ = (s) => root.querySelector(s)
const status = (t) => {
  $('[data-message]').textContent = t
}
let current = null
async function api(body = null, extra = '') {
  const url =
    '/api/course-contributors' + (body ? '' : `?id=${encodeURIComponent(id)}&scope=${scope}${extra}`)
  const r = await fetch(url, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body ? { 'content-type': 'application/json' } : {},
      ...(body ? { body: JSON.stringify({ id, scope, ...body }) } : {}),
    }),
    data = await r.json()
  if (!r.ok) throw Error(data.error || 'Workspace unavailable')
  return data
}
function field(name, value, rows = 5) {
  const label = document.createElement('label')
  label.textContent = name
  const input = document.createElement('textarea')
  input.rows = rows
  input.maxLength = 30000
  input.value = value || ''
  label.append(input)
  return { label, input }
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
      f.input.dataset.private = ''
      f.input.maxLength = 60000
      form.append(f.label)
    } else {
      const shared = field(
        'If your project disappeared tomorrow, what would survive without you?',
        current.item?.sharedAnswer,
      )
      shared.input.dataset.shared = ''
      form.append(shared.label)
      for (const q of current.item?.questions || []) {
        const box = document.createElement('div')
        box.dataset.question = ''
        const question = field('Project-specific question', q.question, 2),
          answer = field('Response', q.answer)
        box.append(question.label, answer.label)
        form.append(box)
      }
      const add = document.createElement('button')
      add.type = 'button'
      add.textContent = 'Add a project-specific question'
      add.onclick = () => {
        if (form.querySelectorAll('[data-question]').length >= 8) return
        const box = document.createElement('div')
        box.dataset.question = ''
        box.append(field('Project-specific question', '', 2).label, field('Response', '').label)
        add.before(box)
      }
      form.append(add)
      if (current.item?.suggestedExercise) {
        const suggestion = document.createElement('p')
        suggestion.textContent =
          'Suggested exercise (use, adapt, or replace): ' + current.item.suggestedExercise
        form.append(suggestion)
      }
      const exercise = field(
        'Each One, Teach One: use, modify, or replace the suggested practical exercise',
        current.item?.exercise,
      )
      exercise.input.dataset.exercise = ''
      form.append(exercise.label)
      if (current.editor) {
        const label = document.createElement('label')
        label.textContent = 'Editorial status'
        const select = document.createElement('select')
        select.dataset.editorialStatus = ''
        for (const s of ['draft', 'reporting needed', 'testing', 'review', 'published', 'archived']) {
          const o = document.createElement('option')
          o.value = s
          o.textContent = s
          select.append(o)
        }
        select.value = current.item?.status || 'draft'
        label.append(select)
        form.append(label)
      }
    }
    $('[data-admin]').hidden = !current.admin
    status(
      scope === 'private'
        ? 'Private workspace unlocked.'
        : 'Editing contribution. Contributor changes go to editorial review.',
    )
  } catch (e) {
    $('[data-login]').hidden = false
    $('[data-edit-form]').hidden = true
    status(scope === 'private' ? 'Enter the separate Private Comms password to continue.' : e.message)
  }
}
$('[data-login]').hidden = false
$('[data-login]').onsubmit = async (e) => {
  e.preventDefault()
  try {
    await api({ action: 'login', password: $('[data-password]').value })
    $('[data-password]').value = ''
    await load()
  } catch (e) {
    status(e.message)
  }
}
$('[data-edit-form]').onsubmit = async (e) => {
  e.preventDefault()
  try {
    const body = { revision: current.revision }
    if (scope === 'private') body.text = $('[data-private]').value
    else
      body.item = {
        sharedAnswer: $('[data-shared]').value,
        exercise: $('[data-exercise]').value,
        suggestedExercise: current.item?.suggestedExercise || '',
        questions: [...root.querySelectorAll('[data-question]')].map((q) => ({
          question: q.querySelectorAll('textarea')[0].value,
          answer: q.querySelectorAll('textarea')[1].value,
        })),
        status: $('[data-editorial-status]')?.value || 'review',
      }
    await api(body)
    await load()
    status('Saved.')
  } catch (e) {
    status(e.message)
  }
}
$('[data-logout]').onclick = async () => {
  try {
    await api({ action: 'logout' })
    location.reload()
  } catch (e) {
    status(e.message)
  }
}
$('[data-history]').onclick = async () => {
  try {
    const data = await api(null, '&revisions=1'),
      history = $('[data-revisions]')
    history.replaceChildren()
    for (const r of data.items) {
      const details = document.createElement('details'),
        summary = document.createElement('summary'),
        pre = document.createElement('pre')
      summary.textContent = `Version ${r.version} · ${r.created_at} · ${r.actor_type}: ${r.actor_id} · ${r.status}`
      pre.textContent = JSON.stringify(JSON.parse(r.content_json), null, 2)
      details.append(summary, pre)
      history.append(details)
    }
  } catch (e) {
    status(e.message)
  }
}
$('[data-credentials]').onclick = async () => {
  try {
    await api({
      action: 'credentials',
      editPassword: $('[data-edit-password]').value,
      privatePassword: $('[data-private-password]').value,
    })
    $('[data-edit-password]').value = ''
    $('[data-private-password]').value = ''
    status('Separate credentials set; older contributor sessions revoked.')
  } catch (e) {
    status(e.message)
  }
}
$('[data-disable]').onclick = async () => {
  if (!confirm('Disable this contributor’s access and revoke sessions?')) return
  try {
    await api({ action: 'credentials', disabled: true })
    status('Contributor access disabled.')
  } catch (e) {
    status(e.message)
  }
}
load()
