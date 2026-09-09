import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { build } from 'esbuild'
import { parseHTML } from 'linkedom'
import { renderCourse } from '../public/guides/become-the-thousand-servers/lms/render.js'
import { seed } from '../public/guides/become-the-thousand-servers/lms/model.js'
import { KEY } from '../public/guides/become-the-thousand-servers/lms/progress.js'
const bundle = await build({
  entryPoints: ['public/guides/become-the-thousand-servers/lms/learner.js'],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
})
function mount(storage = new Map(), hash = '') {
  const { document } = parseHTML(renderCourse(seed)),
    events = {},
    location = { hash }
  const scope = {
    document,
    location,
    console,
    URL,
    Blob,
    TextEncoder,
    TextDecoder,
    crypto,
    btoa,
    atob,
    structuredClone,
    setTimeout,
    clearTimeout,
    confirm: () => true,
    scrollY: 0,
    scrollTo() {},
    requestAnimationFrame: (f) => f(),
    addEventListener: (name, fn) => (events[name] = fn),
    localStorage: { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
    fetch: async () => ({ json: async () => ({ canEdit: false }) }),
    FormData: class {
      constructor(form) {
        this.form = form
      }
      getAll() {
        return [...this.form.querySelectorAll('[name="answer"]')]
          .filter((el) => !['checkbox', 'radio'].includes(el.type) || el.checked)
          .map((el) => el.value)
      }
    },
  }
  document.querySelectorAll('*').forEach((n) => {
    n.focus = () => {}
    n.scrollIntoView = () => {}
  })
  document
    .querySelectorAll('form')
    .forEach((f) =>
      Object.defineProperty(f, 'elements', { get: () => f.querySelectorAll('input,textarea,select,button') }),
    )
  vm.runInNewContext(bundle.outputFiles[0].text, scope, { timeout: 5000 })
  return { document, events, location, storage }
}
test('learner DOM initializes, routes, persists notes and practical completion through reload', () => {
  const a = mount(),
    id = seed.lessons[0].slug
  a.location.hash = '#' + id
  a.events.hashchange()
  const unit = a.document.getElementById(id)
  assert.equal(unit.hidden, false)
  const notes = unit.querySelector('[data-notes]')
  notes.value = 'kept through reload'
  notes.oninput()
  unit.querySelector('[data-practical]').onchange()
  unit.querySelector('[data-complete]').onclick()
  assert.match(unit.querySelector('[data-unit-status]').textContent, /Completed/)
  const b = mount(a.storage, '#' + id)
  assert.equal(b.document.querySelector('[data-unit="' + id + '"] [data-notes]').value, 'kept through reload')
  assert.match(b.document.querySelector('[data-progress]').textContent, /1\/12 lessons/)
})
test('activity DOM saves local attempts and renders their feedback after reload', () => {
  const a = mount(new Map(), '#map-your-dependencies'),
    form = a.document.querySelector('[data-activity="dependency-choice"]')
  form.querySelector('[value="person"]').checked = true
  form.onsubmit({ preventDefault() {} })
  assert.match(form.querySelector('[data-feedback]').textContent, /Completed/)
  const state = JSON.parse(a.storage.get(KEY))
  assert.equal(state.activities['dependency-choice'][0].passed, true)
  const b = mount(a.storage, '#map-your-dependencies')
  assert.match(
    b.document.querySelector('[data-activity="dependency-choice"] [data-feedback]').textContent,
    /Completed/,
  )
})
test('invalid import leaves stored progress intact; valid import restores all local fields', async () => {
  const a = mount(new Map(), '#map-your-dependencies'),
    notes = a.document.querySelector('[data-unit="map-your-dependencies"] [data-notes]')
  notes.value = 'do not erase'
  notes.oninput()
  const before = a.storage.get(KEY),
    input = a.document.querySelector('[data-file]')
  await input.onchange({ target: { files: [{ size: 10, text: async () => '{broken' }], value: '' } })
  assert.equal(a.storage.get(KEY), before)
  const payload = JSON.parse(before)
  payload.notes['map-your-dependencies'] = 'restored from JSON'
  await input.onchange({
    target: { files: [{ size: 100, text: async () => JSON.stringify(payload) }], value: '' },
  })
  assert.equal(
    a.document.querySelector('[data-unit="map-your-dependencies"] [data-notes]').value,
    'restored from JSON',
  )
})
test('blocked storage never overwrites corrupt saved data', () => {
  const s = new Map([[KEY, 'bad-json']]),
    a = mount(s, '#map-your-dependencies')
  a.document.querySelector('[data-unit="map-your-dependencies"] [data-complete]').onclick()
  assert.equal(s.get(KEY), 'bad-json')
  assert.match(a.document.querySelector('[data-message]').textContent, /not been overwritten/)
})
test('import refreshes quiz selections immediately, and clears answers absent from the import',async()=>{
  const a=mount(new Map(),'#map-your-dependencies')
  const form=a.document.querySelector('[data-activity="dependency-choice"]')
  form.querySelector('[value="person"]').checked=true
  form.onsubmit({preventDefault(){}})
  const data=JSON.parse(a.storage.get(KEY))
  data.activities={}
  await a.document.querySelector('[data-file]').onchange({target:{files:[{size:100,text:async()=>JSON.stringify(data)}],value:''}})
  assert.equal(form.querySelector('[value="person"]').checked,false)
  assert.equal(form.querySelector('[data-feedback]').textContent,'')
  assert.equal(form.querySelector('[data-retry]'),null)
})
test('malformed fragment does not prevent course initialization',()=>{
  const a=mount(new Map(),'#%E0%A4%A')
  assert.match(a.document.querySelector('[data-progress]').textContent,/0\/12/)
})
