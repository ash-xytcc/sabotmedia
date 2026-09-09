import { syncWeblateTranslations } from './lib/nativeTranslationsApi'

const UI_ATTR = 'data-sabot-weblate-sync-ui'
const STATUS_ATTR = 'data-sabot-weblate-sync-status'
const FALLBACK_ATTR = 'data-sabot-weblate-manual-fallback'
const SYNC_EVENT = 'sabot:weblate-sync'

let lastSync = null
let syncing = false
let installQueued = false

function translationAdminRoot() {
  return document.querySelector('.translations-admin-page')
}

function sectionByHeading(root, text) {
  return Array.from(root?.querySelectorAll('.wp-meta-box') || []).find((section) =>
    Array.from(section.querySelectorAll('h2')).some((heading) => heading.textContent?.trim() === text)
  ) || null
}

function syncSummary(detail) {
  if (!detail) return 'Automatic Weblate pull runs when this page opens. Finished languages are imported into editorial review, never published automatically.'
  if (detail.ok === false) return `Automatic Weblate pull unavailable: ${detail.error || 'unknown sync error'}`

  const imported = Array.isArray(detail.imported) ? detail.imported : []
  const changed = imported.filter((item) => item?.changed).length
  const auth = detail.authMode === 'token' ? 'authenticated API' : detail.authMode === 'public-read' ? 'public read API' : 'Weblate API'
  if (changed) return `Weblate sync complete: ${changed} new or updated translation${changed === 1 ? '' : 's'} pulled into review via ${auth}.`
  return `Automatic Weblate pull active via ${auth}. ${imported.length} translation${imported.length === 1 ? '' : 's'} checked; nothing new to import.`
}

function renderStatus(node) {
  const failed = lastSync?.ok === false
  node.className = failed ? 'notice notice-error' : 'notice notice-info'
  node.setAttribute('role', failed ? 'alert' : 'status')
  node.innerHTML = ''
  const paragraph = document.createElement('p')
  paragraph.textContent = syncSummary(lastSync)
  node.appendChild(paragraph)
}

function relabelManualImport(section) {
  const grid = section.querySelector('.form-grid')
  if (grid && !section.querySelector(`[${FALLBACK_ATTR}]`)) {
    const heading = document.createElement('h3')
    heading.setAttribute(FALLBACK_ATTR, '')
    heading.textContent = 'Manual JSON fallback'
    const note = document.createElement('p')
    note.className = 'description'
    note.setAttribute(FALLBACK_ATTR, '')
    note.textContent = 'Normally you do not need this. Use manual import only if the automatic Weblate pull is unavailable or you are importing an unusual translation file.'
    grid.before(heading, note)
  }

  const importLabel = Array.from(section.querySelectorAll('label.button')).find((label) =>
    label.textContent?.includes('Import translated JSON')
  )
  if (importLabel && !importLabel.dataset.sabotFallbackLabel) {
    const textNode = Array.from(importLabel.childNodes).find((node) => node.nodeType === Node.TEXT_NODE)
    if (textNode) textNode.textContent = 'Import translated JSON (fallback)'
    importLabel.dataset.sabotFallbackLabel = '1'
  }
}

async function runManualSync(button) {
  if (syncing) return
  syncing = true
  const original = button.textContent
  button.disabled = true
  button.textContent = 'Syncing…'
  try {
    const result = await syncWeblateTranslations()
    lastSync = result
    installSyncUi()
    button.textContent = 'Synced'
    // Reload the admin route so React's translation table reflects newly pulled D1 rows.
    window.setTimeout(() => window.location.reload(), 450)
  } catch (error) {
    lastSync = { ok: false, error: String(error?.message || error) }
    installSyncUi()
    button.textContent = 'Sync failed'
    window.setTimeout(() => {
      button.disabled = false
      button.textContent = original
      syncing = false
    }, 1500)
    return
  }
  syncing = false
}

function installSyncUi() {
  const root = translationAdminRoot()
  if (!root) return
  const section = sectionByHeading(root, 'Weblate workflow')
  if (!section) return

  const description = Array.from(section.querySelectorAll('.description')).find((node) =>
    node.closest('.wp-screen-header')
  )
  if (description) {
    description.textContent = 'Finished Weblate languages are pulled into Sabot automatically when this page opens and land in editorial review. Review and publish here; manual JSON transfer is only a fallback.'
  }

  const header = section.querySelector('.wp-screen-header')
  if (header && !header.querySelector(`[${UI_ATTR}]`)) {
    const syncButton = document.createElement('button')
    syncButton.type = 'button'
    syncButton.className = 'button button--primary'
    syncButton.setAttribute(UI_ATTR, '')
    syncButton.textContent = 'Sync from Weblate'
    syncButton.addEventListener('click', () => runManualSync(syncButton))
    const downloadButton = Array.from(header.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Download current English source')
    )
    if (downloadButton) downloadButton.before(syncButton)
    else header.appendChild(syncButton)
  }

  let status = section.querySelector(`[${STATUS_ATTR}]`)
  if (!status) {
    status = document.createElement('div')
    status.setAttribute(STATUS_ATTR, '')
    const headerNode = section.querySelector('.wp-screen-header')
    if (headerNode) headerNode.after(status)
    else section.prepend(status)
  }
  renderStatus(status)
  relabelManualImport(section)
}

function queueInstall() {
  if (installQueued) return
  installQueued = true
  window.requestAnimationFrame(() => {
    installQueued = false
    installSyncUi()
  })
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener(SYNC_EVENT, (event) => {
    lastSync = event.detail || null
    queueInstall()
  })
  const observer = new MutationObserver(queueInstall)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', queueInstall)
  queueInstall()
}
