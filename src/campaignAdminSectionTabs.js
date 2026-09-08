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

function removeToolbar() {
  document.getElementById(TOOLBAR_ID)?.remove()
  document.body.classList.remove('campaign-admin-section-tabs-active')
  document.querySelectorAll('.campaign-admin-layout > .wp-meta-box[hidden]').forEach((panel) => { panel.hidden = false })
}

function positionToolbar(toolbar, layout) {
  const topbar = document.querySelector('.wp-admin-topbar')
  const layoutRect = layout.getBoundingClientRect()
  const topbarBottom = topbar?.getBoundingClientRect().bottom || 32
  toolbar.style.left = `${Math.max(12, layoutRect.left)}px`
  toolbar.style.width = `${Math.max(260, Math.min(layoutRect.width, window.innerWidth - Math.max(12, layoutRect.left) - 12))}px`
  toolbar.style.top = `${Math.max(8, topbarBottom + 8)}px`
}

function selectPanel(key, { focusPanel = false } = {}) {
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
    for (const button of toolbar.querySelectorAll('[role="tab"]')) {
      const active = button.dataset.sectionKey === selectedKey
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-selected', active ? 'true' : 'false')
      button.tabIndex = active ? 0 : -1
    }
  }

  if (focusPanel) {
    selected.panel.scrollIntoView({ block: 'start', behavior: 'auto' })
    window.scrollBy(0, -110)
  }
}

function buildToolbar(layout, panels) {
  let toolbar = document.getElementById(TOOLBAR_ID)
  if (!toolbar) {
    toolbar = document.createElement('nav')
    toolbar.id = TOOLBAR_ID
    toolbar.className = 'campaign-admin-section-tabs'
    toolbar.setAttribute('aria-label', 'Campaign editor sections')
    toolbar.innerHTML = '<div class="campaign-admin-section-tabs__label">Edit section</div><div class="campaign-admin-section-tabs__buttons" role="tablist" aria-label="Campaign editor sections"></div>'
    document.body.appendChild(toolbar)
  }

  const buttons = toolbar.querySelector('.campaign-admin-section-tabs__buttons')
  const signature = panels.map((item) => `${item.key}:${item.label}`).join('|')
  if (buttons.dataset.signature !== signature) {
    buttons.dataset.signature = signature
    buttons.replaceChildren(...panels.map((item) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'button campaign-admin-section-tabs__button'
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-controls', item.panel.id)
      button.dataset.sectionKey = item.key
      button.textContent = item.label
      button.addEventListener('click', () => selectPanel(item.key, { focusPanel: true }))
      return button
    }))
  }

  buttons.onkeydown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const tabs = [...buttons.querySelectorAll('[role="tab"]')]
    if (!tabs.length) return
    const current = Math.max(0, tabs.indexOf(document.activeElement))
    let next = current
    if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    event.preventDefault()
    tabs[next].focus()
    tabs[next].click()
  }

  document.body.classList.add('campaign-admin-section-tabs-active')
  positionToolbar(toolbar, layout)
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
  window.addEventListener('resize', scheduleSync)
  window.addEventListener('popstate', scheduleSync)
  window.addEventListener('hashchange', scheduleSync)
  scheduleSync()
}
