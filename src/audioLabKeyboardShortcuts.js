function isAudioLabRoute() {
  return typeof window !== 'undefined' && /\/wp-admin\/audiolab(?:\/|$)/.test(window.location.pathname)
}

function isTypingTarget(target) {
  if (!target) return false
  const tag = String(target.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function buttons() {
  return Array.from(document.querySelectorAll('.audio-lab-page button, .audio-lab-page .button'))
}

function clickButtonByText(labels = []) {
  const wanted = labels.map(normalizeText)
  const button = buttons().find((node) => {
    if (node.disabled || node.getAttribute('aria-disabled') === 'true') return false
    const text = normalizeText(node.textContent || node.getAttribute('aria-label') || node.title || '')
    return wanted.some((label) => text === label || text.includes(label))
  })
  if (!button) return false
  button.click()
  flashShortcut(button.textContent || labels[0])
  return true
}

function clickFileInput() {
  const input = document.querySelector('.audio-lab-page .audio-lab-file-input')
  if (!input) return false
  input.click()
  flashShortcut('Import audio')
  return true
}

function flashShortcut(label) {
  const page = document.querySelector('.audio-lab-page')
  if (!page) return
  page.dataset.audiolabShortcutsReady = 'true'
  let node = page.querySelector('.audio-lab-shortcut-toast')
  if (!node) {
    node = document.createElement('div')
    node.className = 'audio-lab-shortcut-toast'
    node.setAttribute('role', 'status')
    page.appendChild(node)
  }
  node.textContent = `Shortcut: ${label}`
  node.classList.add('is-visible')
  window.clearTimeout(flashShortcut.timer)
  flashShortcut.timer = window.setTimeout(() => node.classList.remove('is-visible'), 900)
}

function handleShortcut(event) {
  if (!isAudioLabRoute()) return
  const key = String(event.key || '').toLowerCase()
  const cmd = event.metaKey || event.ctrlKey
  const shift = event.shiftKey
  const typing = isTypingTarget(event.target)

  if (typing && !(cmd && ['s', 'z', 'y'].includes(key))) return

  let handled = false

  if (!cmd && key === ' ') handled = clickButtonByText(['pause', 'play'])
  else if (!cmd && key === 'r') handled = clickButtonByText(['record'])
  else if (!cmd && key === 'p') handled = clickButtonByText(['pause', 'resume'])
  else if (!cmd && key === 's') handled = clickButtonByText(['stop'])
  else if (cmd && key === 's') handled = clickButtonByText(['save project'])
  else if (cmd && (key === 'o' || key === 'i')) handled = clickFileInput()
  else if (cmd && key === 'a') handled = clickButtonByText(['select all'])
  else if ((key === 'delete' || key === 'backspace') && !typing) handled = clickButtonByText(['delete'])
  else if (cmd && key === 't') handled = clickButtonByText(['trim'])
  else if (cmd && key === 'l') handled = clickButtonByText(['silence'])
  else if (cmd && key === 'z' && !shift) handled = clickButtonByText(['undo'])
  else if ((cmd && key === 'y') || (cmd && shift && key === 'z')) handled = clickButtonByText(['redo'])
  else if (cmd && shift && key === 'e') handled = clickButtonByText(['export wav'])
  else if (cmd && key === 'e') handled = clickButtonByText(['render wav master', 'render updated wav master'])
  else if (cmd && key === 'u') handled = clickButtonByText(['upload delivery audio', 'upload wav master'])
  else if (cmd && key === '1') handled = bumpTimelineZoom(1)
  else if (cmd && key === '3') handled = bumpTimelineZoom(-1)
  else if (cmd && key === 'f') handled = fitTimeline()

  if (handled) {
    event.preventDefault()
    event.stopPropagation()
  }
}

function bumpTimelineZoom(direction) {
  const page = document.querySelector('.audio-lab-page')
  if (!page) return false
  const current = Number(page.dataset.audiolabZoom || '1') || 1
  const next = Math.max(0.75, Math.min(1.75, current + direction * 0.125))
  page.dataset.audiolabZoom = String(next)
  page.style.setProperty('--audiolab-zoom-scale', String(next))
  flashShortcut(direction > 0 ? 'Zoom in' : 'Zoom out')
  return true
}

function fitTimeline() {
  const page = document.querySelector('.audio-lab-page')
  if (!page) return false
  page.dataset.audiolabZoom = '1'
  page.style.setProperty('--audiolab-zoom-scale', '1')
  const scrolls = page.querySelectorAll('.audio-lab-multitrack-scroll')
  scrolls.forEach((node) => { node.scrollLeft = 0 })
  flashShortcut('Fit project')
  return true
}

function markReady() {
  const page = document.querySelector('.audio-lab-page')
  if (page) page.dataset.audiolabShortcutsReady = 'true'
}

if (isAudioLabRoute()) {
  window.addEventListener('keydown', handleShortcut, true)
  window.addEventListener('load', markReady)
  window.setTimeout(markReady, 250)
}
