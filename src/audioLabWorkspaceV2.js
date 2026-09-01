const ACTIVE_TAB_KEY = 'sabot:audiolab:inspector-tab:v2'
let observer = null
let refreshQueued = false

function isAudioLabRoute() {
  return typeof window !== 'undefined' && /\/wp-admin\/audiolab(?:\/|$)/.test(window.location.pathname)
}

function labelForPanel(panel, index) {
  if (panel.dataset.audiolabInspectorLabel) return panel.dataset.audiolabInspectorLabel
  const text = `${panel.querySelector('.audio-lab-eyebrow')?.textContent || ''} ${panel.querySelector('h2')?.textContent || ''}`.trim()
  if (/render|delivery|feed readiness/i.test(text)) return 'Publish'
  if (/source/i.test(text)) return 'Sources'
  if (/clip/i.test(text)) return 'Clip'
  if (/effect/i.test(text)) return 'Effects'
  if (/transcript/i.test(text)) return 'Transcript'
  if (/marker/i.test(text)) return 'Markers'
  if (/episode|metadata/i.test(text)) return 'Episode'
  if (/project json|preserved source/i.test(text)) return 'Project'
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

function buildTabs(sidebar, panels) {
  sidebar.querySelector(':scope > .audio-lab-inspector-tabs')?.remove()
  const nav = document.createElement('div')
  nav.className = 'audio-lab-inspector-tabs'
  nav.setAttribute('role', 'tablist')
  nav.setAttribute('aria-label', 'AudioLab inspector')

  panels.forEach((panel, index) => {
    const label = labelForPanel(panel, index)
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
  const defaultPanel = storedMatch || panels.find((panel) => /robot voice/i.test(labelForPanel(panel, 0))) || panels.find((panel) => /clip/i.test(labelForPanel(panel, 0))) || panels[0]
  activate(sidebar, defaultPanel?.dataset.audiolabInspectorId || '')
}

function normalizeWorkflowNav() {
  const root = document.querySelector('.audio-lab-page')
  const nav = root?.querySelector(':scope > .audio-lab-workflow-nav')
  const header = root?.querySelector(':scope > .audio-lab-header, :scope > .wp-screen-header.audio-lab-header')
  if (!root || !nav || !header) return
  if (header.nextElementSibling !== nav) header.insertAdjacentElement('afterend', nav)
  Object.assign(nav.style, {
    position: 'relative',
    left: 'auto',
    right: 'auto',
    bottom: 'auto',
    zIndex: '1',
    width: '100%',
    height: 'auto',
    minHeight: '34px',
    margin: '0 0 8px',
    flexWrap: 'wrap',
    boxShadow: 'none',
  })
}

function refresh() {
  refreshQueued = false
  if (!isAudioLabRoute()) return
  document.querySelectorAll('.audio-lab-dock-close, .audio-lab-project-close').forEach((node) => node.remove())
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
  const existingLabels = existingButtons.map((button) => button.textContent || '').join('|')
  if (!existingTabs || currentLabels !== existingLabels) buildTabs(sidebar, panels)
}

function queueRefresh() {
  if (refreshQueued) return
  refreshQueued = true
  window.requestAnimationFrame(refresh)
}

function start() {
  if (!isAudioLabRoute()) return
  refresh()
  observer?.disconnect()
  observer = new MutationObserver(queueRefresh)
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
}

window.addEventListener('sabot:audiolab-inspector-changed', queueRefresh)
window.addEventListener('load', start)
window.addEventListener('popstate', () => window.setTimeout(start, 80))
window.setTimeout(start, 220)
