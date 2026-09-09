import { mountInlineEditor } from './editorial.js'
import { KEY, blank, validateProgress, evaluate, complete, unlocked } from './progress.js'
import { encryptProgress, decryptProgress, parseCode } from './recovery.js'
const c = JSON.parse(document.querySelector('#course-data').textContent),
  units = [...c.sections, ...c.lessons]
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)]
let state = blank(),
  storageBlocked = false
try {
  const saved = localStorage.getItem(KEY)
  if (saved) state = validateProgress(JSON.parse(saved))
} catch {
  storageBlocked = true
}
const message = (t) => {
  $('[data-message]').textContent = t
}
function save() {
  state.contentVersion = c.contentVersion
  if (storageBlocked) {
    message(
      'Existing browser data could not be read. Export your current session before leaving; stored data has not been overwritten.',
    )
    return
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    message('This browser could not save progress. Export a copy before leaving.')
  }
}
function toggle(list, id) {
  const i = list.indexOf(id)
  i < 0 ? list.push(id) : list.splice(i, 1)
}
function refresh() {
  const nl = c.lessons.filter((u) => complete(c, state, u)).length,
    ns = c.sections.filter((u) => complete(c, state, u)).length,
    total = c.lessons.length + c.sections.length
  $$('[data-progress]').forEach(
    (n) =>
      (n.textContent = `${nl}/${c.lessons.length} lessons · ${ns}/${c.sections.length} sections complete`),
  )
  $('progress').value = total ? Math.round(((nl + ns) / total) * 100) : 0
  $$('[data-status]').forEach((n) => {
    const u = units.find((u) => (u.slug || u.id) === n.dataset.status)
    n.textContent = u
      ? complete(c, state, u)
        ? 'Completed'
        : state.viewed.includes(n.dataset.status)
          ? 'Started'
          : 'Not started'
      : ''
  })
  for (const u of units) {
    const key = u.slug || u.id,
      el = document.getElementById(key),
      done = complete(c, state, u),
      locked = u.enforcePrerequisites && !unlocked(c, state, u)
    el.querySelector('[data-unit-status]').textContent = done
      ? 'Completed'
      : locked
        ? 'Complete the prerequisites to unlock completion and activities. You can still read this lesson.'
        : 'In progress / ready to begin'
    const button = el.querySelector('[data-complete]')
    button.textContent = (u.slug ? state.completedLessons : state.completedSections).includes(key)
      ? 'Mark incomplete'
      : 'Mark complete'
    button.disabled = locked
    el.querySelector('[data-bookmark]').textContent = state.bookmarks.includes(key)
      ? 'Bookmarked · remove'
      : 'Bookmark'
    el.querySelectorAll('fieldset').forEach((f) => (f.disabled = locked))
  }
  const resume = $('[data-resume]')
  resume.href = '#' + (state.lastUnit || 'G01')
  resume.textContent = state.lastUnit ? 'Resume Course' : 'Start course'
  const notebook = $('[data-notebook]')
  notebook.replaceChildren()
  for (const u of units) {
    const key = u.slug || u.id
    if (state.bookmarks.includes(key) || state.notes[key]) {
      const p = document.createElement('p'),
        a = document.createElement('a')
      a.href = '#' + key
      a.textContent = u.title
      p.append(a)
      if (state.notes[key]) p.append(document.createTextNode(' — ' + state.notes[key].slice(0, 150)))
      notebook.append(p)
    }
  }
  for (const b of state.bookmarks.filter((b) => b.includes(':https'))) {
    const p = document.createElement('p')
    p.textContent = 'Saved resource: ' + b
    notebook.append(p)
  }
}
$$('.learner-controls').forEach((n) => (n.hidden = false))
for (const u of units) {
  const key = u.slug || u.id,
    el = document.getElementById(key)
  const notes = el.querySelector('[data-notes]')
  notes.value = state.notes[key] || ''
  notes.oninput = () => {
    state.notes[key] = notes.value
    save()
  }
  const practical = el.querySelector('[data-practical]')
  if (practical) {
    practical.checked = state.practical.includes(key)
    practical.onchange = () => {
      toggle(state.practical, key)
      save()
      refresh()
    }
  }
  el.querySelector('[data-complete]').onclick = () => {
    toggle(u.slug ? state.completedLessons : state.completedSections, key)
    save()
    refresh()
  }
  el.querySelector('[data-bookmark]').onclick = () => {
    toggle(state.bookmarks, key)
    save()
    refresh()
  }
}
$$('[data-activity]').forEach((form) => {
  const a = c.activities.find((a) => a.id === form.dataset.activity),
    last = state.activities[a.id]?.filter((t) => t.version === a.version).at(-1)
  if (last) {
    ;[...form.elements]
      .filter((el) => el.name === 'answer')
      .forEach((el, i) => {
        if (['checkbox', 'radio'].includes(el.type)) el.checked = last.answer.includes(el.value)
        else el.value = last.answer[i] || ''
      })
    form.querySelector('[data-feedback]').textContent = last.passed
      ? 'Completed on a previous attempt.'
      : 'Needs another attempt.'
  }
  const attempt = (passed) => {
    const answer = new FormData(form).getAll('answer').map(String)
    state.activities[a.id] = [
      ...(state.activities[a.id] || []),
      { version: a.version, at: new Date().toISOString(), passed: passed ?? evaluate(a, answer), answer },
    ].slice(-20)
    save()
    refresh()
    form.querySelector('[data-feedback]').textContent =
      (state.activities[a.id].at(-1).passed ? 'Completed. ' : 'Needs another attempt. ') + (a.feedback || '')
  }
  form.onsubmit = (e) => {
    e.preventDefault()
    attempt()
  }
  form.querySelector('[data-retry]').onclick = () => attempt(false)
})
let active = '',
  routing = false
function route() {
  let key = decodeURIComponent(location.hash.slice(1))
  const legacy = key.match(/^lesson-(\d+)$/)
  if (legacy) key = c.lessons.find((l) => l.number === Number(legacy[1]))?.slug || ''
  const u = units.find((u) => (u.slug || u.id) === key)
  if (active) {
    state.scrollByLesson[active] = scrollY
    save()
  }
  active = u ? key : ''
  routing = true
  $$('main > *').forEach((n) => {
    if (n.matches('.course-unit')) n.hidden = !!u && n.dataset.unit !== key
    else n.hidden = !!u
  })
  if (u) {
    const started = u.slug ? state.startedLessons : state.startedSections
    if (!started.includes(key)) started.push(key)
    if (!state.viewed.includes(key)) state.viewed.push(key)
    state.lastUnit = key
    if (u.slug) state.lastLesson = key
    save()
    document.getElementById(key).querySelector('h2').focus({ preventScroll: true })
    requestAnimationFrame(() => {
      scrollTo(0, state.scrollByLesson[key] || 0)
      routing = false
    })
  } else {
    $$('.course-unit').forEach((n) => (n.hidden = true))
    const target = document.getElementById(key)
    if (target) target.scrollIntoView()
    else scrollTo(0, 0)
    routing = false
  }
  refresh()
}
addEventListener('hashchange', route)
let frame = false
addEventListener(
  'scroll',
  () => {
    if (frame || routing || !active) return
    frame = true
    requestAnimationFrame(() => {
      frame = false
      if (active && !routing) {
        state.scrollByLesson[active] = scrollY
        save()
      }
    })
  },
  { passive: true },
)
$('[data-export]').onclick = () => {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(validateProgress(state), null, 2)], { type: 'application/json' }),
    ),
    a = document.createElement('a')
  a.href = url
  a.download = 'become-the-thousand-servers-progress.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function restore(next) {
  if (!confirm('Replace progress in this browser with this backup? Export first to keep both copies.')) return
  state = validateProgress(next)
  storageBlocked = false
  active = ''
  save()
  for (const u of units) {
    const el = document.getElementById(u.slug || u.id)
    el.querySelector('[data-notes]').value = state.notes[u.slug || u.id] || ''
    const p = el.querySelector('[data-practical]')
    if (p) p.checked = state.practical.includes(u.slug || u.id)
  }
  refresh()
  message('Progress restored. Reload to show saved activity answers.')
}
$('[data-import]').onclick = () => $('[data-file]').click()
$('[data-file]').onchange = async (e) => {
  try {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 2000000) throw Error('File is too large')
    restore(validateProgress(JSON.parse(await f.text())))
  } catch (err) {
    message(err.message + ' Existing progress was not replaced.')
  }
  e.target.value = ''
}
$('[data-reset]').onclick = () => {
  if (confirm('Reset local progress? Export a copy first if you need it.')) restore(blank())
}
async function api(body) {
  const res = await fetch('/api/course-recovery', {
    method: 'POST',
    credentials: 'omit',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw Error(data.error || 'Recovery unavailable')
  return data
}
$('[data-backup]').onclick = async () => {
  try {
    if (!crypto.subtle) { message('Encrypted backup requires HTTPS. Export Progress still works here.'); return }
    message('Encrypting progress in this browser…')
    const { code, blob } = await encryptProgress(validateProgress(state))
    const result = await api({ action: 'create', ...blob })
    $('[data-recovery-panel]').hidden = false
    $('[data-recovery-code]').value = code
    message(
      `Encrypted backup saved for ${result.retentionDays} days. Keep this code somewhere safe. Each backup creates a new code.`,
    )
  } catch {
    message('Backup unavailable. Local progress is unchanged; Export Progress still works.')
  }
}
$('[data-restore]').onclick = () => {
  $('[data-recovery-panel]').hidden = false
  $('[data-recovery-code]').focus()
}
$('[data-fetch-recovery]').onclick = async () => {
  try {
    const code = $('[data-recovery-code]').value.trim(),
      { id } = parseCode(code),
      data = await api({ action: 'read', recoveryId: id })
    const next = validateProgress(await decryptProgress(code, data.blob))
    restore(next)
    $('[data-recovery-code]').value = ''
  } catch {
    message(
      'Could not restore that code. Check the code or try again later. Local progress was not replaced.',
    )
  }
}
fetch('/api/course-content?edit=1', { credentials: 'same-origin', cache: 'no-store' })
  .then((r) => r.json())
  .then((data) => {
    if (!data.canEdit) return
    mountInlineEditor(data.item)
    const p = document.createElement('p'),
      a = document.createElement('a')
    a.href = '/#/wp-admin/pages?course=' + c.slug
    a.textContent = 'Edit course / review revisions'
    p.append(a)
    $('main').prepend(p)
  })
  .catch(() => {})
refresh()
route()
if (storageBlocked)
  message(
    'Saved data could not be read. It has not been overwritten; export this session or import a known backup.',
  )
