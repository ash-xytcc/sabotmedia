const CAMPAIGN_ADMIN_PATHS = new Set(['/wp-admin/campaigns', '/campaigns-admin'])
const TOOLBAR_ID = 'campaign-admin-section-tabs'
let selectedKey = ''
let scheduled = false

function isCampaignAdminRoute() {
  if (typeof window === 'undefined') return false
  return CAMPAIGN_ADMIN_PATHS.has(window.location.pathname)
}

function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function shortLabel(label = '') {
  const exact = {
    'Campaign Identity': 'Identity',
    'Build Your Campaign': 'Sections',
    'Status + Countdown': 'Status',
    'Donation Destination': 'Donate',
    'Correspondence + Dispatches': 'Correspondence',
    'Action Center': 'Actions',
    'Letters + Reporting Resources': 'Resources',
    'Campaign Graphics': 'Graphics',
    'Campaign Updates': 'Updates',
    'Manual Press + Coverage': 'Coverage',
    'Primary Sources': 'Sources',
    'Campaign Timeline': 'Timeline',
    'Social Feed': 'Social',
    'Revision History': 'Revisions',
  }
  return exact[label] || label.replace(/^Campaign\s+/i, '').trim() || 'Section'
}

function editorPanels(layout) {
  const seen = new Map()
  return [...layout.children]
    .filter((node) => node instanceof HTMLElement && node.matches('.wp-meta-box'))
    .map((panel, index) => {
      const heading = panel.querySelector('h2, h3')
      const label = String(heading?.textContent || `Section ${index + 1}`).trim()
      const base = slugify(label) || `section-${index + 1}`
      const count = (seen.get(base) || 0) + 1
      seen.set(base, count)
      const key = count === 1 ? base : `${base}-${count}`
      if (!panel.id) panel.id = `campaign-editor-${key}`
      return { panel, label, key }
    })
}

function restorePanels() {
  document.querySelectorAll('.campaign-admin-layout > .wp-meta-box[hidden]').forEach((panel) => { panel.hidden = false })
}

function removeToolbar() {
  document.getElementById(TOOLBAR_ID)?.remove()
  restorePanels()
}

function selectPanel(key, { moveToEditor = false } = {}) {
  selectedKey = key
  const layout = document.querySelector('.campaign-admin-layout')
  if (!layout) return
  const panels = editorPanels(layout)
  if (!panels.length) return
  const selected = panels.find((item) => item.key === selectedKey) || panels[0]
  selectedKey = selected.key

  for (const item of panels) item.panel.hidden = item.key !== selectedKey

  const toolbar = document.getElementById(TOOLBAR_ID)
  if (toolbar) {
    for (const button of toolbar.querySelectorAll('[data-campaign-section-key]')) {
      const active = button.dataset.campaignSectionKey === selectedKey
      button.className = active ? 'button button--primary' : 'button'
      button.setAttribute('aria-pressed', active ? 'true' : 'false')
    }
  }

  if (moveToEditor) {
    const top = layout.getBoundingClientRect().top + window.scrollY - 12
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
  }
}

function buildToolbar(layout, panels) {
  const actions = document.querySelector('.campaign-admin-page .wp-screen-header__actions')
  if (!actions) return null

  let toolbar = document.getElementById(TOOLBAR_ID)
  if (!toolbar) {
    toolbar = document.createElement('span')
    toolbar.id = TOOLBAR_ID
    toolbar.className = 'campaign-admin-section-tabs'
    toolbar.setAttribute('role', 'group')
    toolbar.setAttribute('aria-label', 'Edit campaign section')
    actions.prepend(toolbar)
  }

  const signature = panels.map((item) => `${item.key}:${item.label}`).join('|')
  if (toolbar.dataset.signature !== signature) {
    toolbar.dataset.signature = signature
    toolbar.replaceChildren(...panels.map((item) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'button'
      button.dataset.campaignSectionKey = item.key
      button.setAttribute('aria-controls', item.panel.id)
      button.setAttribute('aria-pressed', 'false')
      button.title = `Edit ${item.label}`
      button.textContent = shortLabel(item.label)
      button.addEventListener('click', () => selectPanel(item.key, { moveToEditor: true }))
      return button
    }))
  }

  toolbar.onkeydown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const buttons = [...toolbar.querySelectorAll('[data-campaign-section-key]')]
    if (!buttons.length) return
    const current = Math.max(0, buttons.indexOf(document.activeElement))
    let next = current
    if (event.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length
    if (event.key === 'ArrowRight') next = (current + 1) % buttons.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = buttons.length - 1
    event.preventDefault()
    buttons[next].focus()
    buttons[next].click()
  }

  return toolbar
}

function syncCampaignAdminTabs() {
  scheduled = false
  if (!isCampaignAdminRoute()) {
    removeToolbar()
    return
  }

  const layout = document.querySelector('.campaign-admin-layout')
  if (!layout) {
    removeToolbar()
    return
  }

  const panels = editorPanels(layout)
  if (!panels.length) {
    removeToolbar()
    return
  }

  if (!panels.some((item) => item.key === selectedKey)) selectedKey = panels[0].key
  buildToolbar(layout, panels)
  selectPanel(selectedKey)
}

function scheduleSync() {
  if (scheduled) return
  scheduled = true
  window.requestAnimationFrame(syncCampaignAdminTabs)
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver(scheduleSync)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', scheduleSync)
  window.addEventListener('hashchange', scheduleSync)
  scheduleSync()
}
