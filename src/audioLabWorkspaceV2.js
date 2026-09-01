const ACTIVE_TAB_KEY = 'sabot:audiolab:inspector-tab:v3'
let observer = null
let refreshQueued = false

function isAudioLabRoute() {
  return typeof window !== 'undefined' && /\/wp-admin\/audiolab(?:\/|$)/.test(window.location.pathname)
}

function rootPage() {
  return document.querySelector('.audio-lab-page')
}

function labelForPanel(panel, index) {
  if (panel.dataset.audiolabInspectorLabel) return panel.dataset.audiolabInspectorLabel
  const text = `${panel.querySelector('.audio-lab-eyebrow')?.textContent || ''} ${panel.querySelector('h2')?.textContent || ''}`.trim()
  if (/robot voice|speech generator/i.test(text)) return 'Robot Voice'
  if (/project json|preserved source model/i.test(text)) return 'Project'
  if (/render|delivery|feed readiness/i.test(text)) return 'Publish'
  if (/project assets|source bin/i.test(text)) return 'Assets'
  if (/clip/i.test(text)) return 'Clip'
  if (/effect/i.test(text)) return 'Effects'
  if (/transcript/i.test(text)) return 'Transcript'
  if (/marker/i.test(text)) return 'Markers'
  if (/episode|metadata/i.test(text)) return 'Episode'
  if (/source/i.test(text)) return 'Assets'
  return panel.querySelector('h2')?.textContent?.trim() || `Panel ${index + 1}`
}

function slug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'panel'
}

function getStoredTab() {
  try { return window.localStorage.getItem(ACTIVE_TAB_KEY) || '' } catch { return '' }
}

function storeTab(value) {
  try { window.localStorage.setItem(ACTIVE_TAB_KEY, value) } catch { /* local workspace preference only */ }
}

function updateInspectorButton() {
  const root = rootPage()
  const button = root?.querySelector('[data-audiolab-inspector-toggle]')
  if (!button) return
  const open = root.dataset.audiolabInspectorOpen === 'true'
  button.textContent = open ? 'Close Tools' : 'Tools'
  button.setAttribute('aria-expanded', open ? 'true' : 'false')
}

function setInspectorOpen(open) {
  const root = rootPage()
  if (!root) return
  if (open) root.dataset.audiolabInspectorOpen = 'true'
  else delete root.dataset.audiolabInspectorOpen
  updateInspectorButton()
  window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
}

function activate(sidebar, id) {
  const panels = Array.from(sidebar.querySelectorAll(':scope > .audio-lab-panel'))
  let matched = false
  for (const panel of panels) {
    const active = panel.dataset.audiolabInspectorId === id
    panel.hidden = !active
    panel.classList.toggle('is-inspector-active', active)
    if (active) matched = true
  }
  if (!matched && panels[0]) {
    panels[0].hidden = false
    panels[0].classList.add('is-inspector-active')
    id = panels[0].dataset.audiolabInspectorId
  }
  sidebar.querySelectorAll(':scope > .audio-lab-inspector-tabs button').forEach((button) => {
    const active = button.dataset.inspectorTarget === id
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-selected', active ? 'true' : 'false')
    button.tabIndex = active ? 0 : -1
  })
  if (id) storeTab(id)
}

function activateByLabel(label) {
  const sidebar = document.querySelector('.audio-lab-page .audio-lab-project-sidebar')
  if (!sidebar) return false
  const panel = Array.from(sidebar.querySelectorAll(':scope > .audio-lab-panel'))
    .find((candidate, index) => labelForPanel(candidate, index).toLowerCase() === String(label || '').toLowerCase())
  if (!panel) return false
  setInspectorOpen(true)
  activate(sidebar, panel.dataset.audiolabInspectorId)
  return true
}

function buildTabs(sidebar, panels) {
  sidebar.querySelector(':scope > .audio-lab-inspector-tabs')?.remove()
  const nav = document.createElement('div')
  nav.className = 'audio-lab-inspector-tabs'
  nav.setAttribute('role', 'tablist')
  nav.setAttribute('aria-label', 'AudioLab tools')

  const usedLabels = new Map()
  panels.forEach((panel, index) => {
    let label = labelForPanel(panel, index)
    const count = (usedLabels.get(label) || 0) + 1
    usedLabels.set(label, count)
    if (count > 1) label = `${label} ${count}`

    const id = `${slug(label)}-${index}`
    panel.dataset.audiolabInspectorId = id
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('role', 'tab')
    button.dataset.inspectorTarget = id
    button.textContent = label
    button.addEventListener('click', () => activate(sidebar, id))
    nav.appendChild(button)
  })

  sidebar.insertBefore(nav, sidebar.firstChild)
  const stored = getStoredTab()
  const storedMatch = panels.find((panel) => panel.dataset.audiolabInspectorId === stored)
  const defaultPanel = storedMatch || panels.find((panel, index) => /clip/i.test(labelForPanel(panel, index))) || panels[0]
  activate(sidebar, defaultPanel?.dataset.audiolabInspectorId || '')
}

function normalizeWorkflowNav() {
  const root = rootPage()
  const nav = root?.querySelector(':scope > .audio-lab-workflow-nav')
  const header = root?.querySelector(':scope > .audio-lab-header, :scope > .wp-screen-header.audio-lab-header')
  if (!root || !nav || !header) return
  if (!root.dataset.audiolabTask) return
  if (header.nextElementSibling !== nav) header.insertAdjacentElement('afterend', nav)
  nav.removeAttribute('style')
}

function projectCards() {
  return Array.from(document.querySelectorAll('.audio-lab-page .audio-lab-sidebar .audio-lab-project-card'))
}

function syncProjectSelector(select) {
  const cards = projectCards()
  const activeIndex = Math.max(0, cards.findIndex((card) => card.classList.contains('is-active')))
  const signature = cards.map((card) => card.querySelector('strong')?.textContent?.trim() || 'Untitled').join('|')
  if (select.dataset.signature !== signature) {
    select.innerHTML = ''
    cards.forEach((card, index) => {
      const option = document.createElement('option')
      option.value = String(index)
      option.textContent = card.querySelector('strong')?.textContent?.trim() || `Project ${index + 1}`
      select.appendChild(option)
    })
    if (!cards.length) {
      const option = document.createElement('option')
      option.value = ''
      option.textContent = 'No projects yet'
      select.appendChild(option)
    }
    select.dataset.signature = signature
  }
  select.value = cards.length ? String(activeIndex) : ''
  select.disabled = !cards.length
}

function ensureCompactChrome() {
  const root = rootPage()
  const header = root?.querySelector(':scope > .audio-lab-header, :scope > .wp-screen-header.audio-lab-header')
  if (!root || !header) return

  let chrome = header.querySelector(':scope > .audio-lab-compact-chrome') || root.querySelector(':scope > .audio-lab-compact-chrome')
  if (!chrome) {
    chrome = document.createElement('div')
    chrome.className = 'audio-lab-compact-chrome'
    chrome.setAttribute('aria-label', 'AudioLab project and tool controls')
    chrome.innerHTML = `
      <label class="audio-lab-compact-project">
        <span>Project</span>
        <select data-audiolab-project-select aria-label="Current AudioLab project"></select>
      </label>
      <button type="button" class="button" data-audiolab-new-project>New</button>
      <span class="audio-lab-compact-separator" aria-hidden="true"></span>
      <button type="button" class="button" data-audiolab-robot-open>Robot Voice</button>
      <button type="button" class="button" data-audiolab-inspector-toggle aria-expanded="false">Tools</button>
    `

    const actionGroup = header.querySelector(':scope > .review-card__actions')
    if (actionGroup) header.insertBefore(chrome, actionGroup)
    else header.appendChild(chrome)

    chrome.querySelector('[data-audiolab-project-select]')?.addEventListener('change', (event) => {
      const card = projectCards()[Number(event.target.value)]
      card?.click()
    })
    chrome.querySelector('[data-audiolab-new-project]')?.addEventListener('click', () => {
      document.querySelector('.audio-lab-page .audio-lab-sidebar__header .button')?.click()
    })
    chrome.querySelector('[data-audiolab-inspector-toggle]')?.addEventListener('click', () => {
      setInspectorOpen(root.dataset.audiolabInspectorOpen !== 'true')
    })
    chrome.querySelector('[data-audiolab-robot-open]')?.addEventListener('click', () => {
      if (!activateByLabel('Robot Voice')) {
        setInspectorOpen(true)
        window.setTimeout(() => activateByLabel('Robot Voice'), 80)
      }
    })
  } else if (chrome.parentElement !== header) {
    const actionGroup = header.querySelector(':scope > .review-card__actions')
    if (actionGroup) header.insertBefore(chrome, actionGroup)
    else header.appendChild(chrome)
  }

  const select = chrome.querySelector('[data-audiolab-project-select]')
  if (select) syncProjectSelector(select)
  updateInspectorButton()
}

function refresh() {
  refreshQueued = false
  if (!isAudioLabRoute()) return
  document.querySelectorAll('.audio-lab-dock-close, .audio-lab-project-close').forEach((node) => node.remove())
  ensureCompactChrome()
  normalizeWorkflowNav()

  const sidebar = document.querySelector('.audio-lab-page .audio-lab-project-sidebar')
  if (!sidebar) return
  sidebar.classList.remove('is-open')
  sidebar.removeAttribute('aria-expanded')
  const projectSidebar = document.querySelector('.audio-lab-page .audio-lab-sidebar')
  projectSidebar?.classList.remove('is-open')
  projectSidebar?.removeAttribute('aria-expanded')

  const panels = Array.from(sidebar.querySelectorAll(':scope > .audio-lab-panel'))
  if (!panels.length) return
  const existingTabs = sidebar.querySelector(':scope > .audio-lab-inspector-tabs')
  const existingButtons = existingTabs ? Array.from(existingTabs.querySelectorAll('button')) : []
  const currentLabels = panels.map((panel, index) => labelForPanel(panel, index)).join('|')
  const existingLabels = existingButtons.map((button) => button.textContent?.replace(/\s+\d+$/, '') || '').join('|')
  if (!existingTabs || currentLabels !== existingLabels) buildTabs(sidebar, panels)
}

function queueRefresh() {
  if (refreshQueued) return
  refreshQueued = true
  window.requestAnimationFrame(refresh)
}

function start() {
  if (!isAudioLabRoute()) return
  const root = rootPage()
  if (root) delete root.dataset.audiolabInspectorOpen
  refresh()
  observer?.disconnect()
  observer = new MutationObserver(queueRefresh)
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
}

window.addEventListener('sabot:audiolab-inspector-changed', queueRefresh)
window.addEventListener('load', start)
window.addEventListener('popstate', () => window.setTimeout(start, 80))
window.setTimeout(start, 220)
