const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const DEFAULT_ZOOM = 1

let cleanupTimer = 0
let activePinch = null

function isAudioLabRoute() {
  return typeof window !== 'undefined' && /\/wp-admin\/audiolab(?:\/|$)/.test(window.location.pathname)
}

function page() {
  return document.querySelector('.audio-lab-page')
}

function clamp(value, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

function currentZoom() {
  const node = page()
  return clamp(node?.dataset.audiolabZoom || DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM)
}

function setZoom(next, { centerX = null, source = 'Zoom' } = {}) {
  const node = page()
  if (!node) return false
  const oldZoom = currentZoom()
  const zoom = clamp(next, MIN_ZOOM, MAX_ZOOM)
  const scroll = document.querySelector('.audio-lab-page .audio-lab-multitrack-scroll')

  if (scroll && centerX != null) {
    const rect = scroll.getBoundingClientRect()
    const localX = Math.max(0, centerX - rect.left)
    const before = (scroll.scrollLeft + localX) / Math.max(0.001, oldZoom)
    node.dataset.audiolabZoom = String(zoom)
    node.style.setProperty('--audiolab-zoom-scale', String(zoom))
    node.style.setProperty('--audiolab-overview-zoom', String(Math.min(1.35, Math.max(1, zoom * 0.72))))
    window.requestAnimationFrame(() => {
      scroll.scrollLeft = Math.max(0, before * zoom - localX)
    })
  } else {
    node.dataset.audiolabZoom = String(zoom)
    node.style.setProperty('--audiolab-zoom-scale', String(zoom))
    node.style.setProperty('--audiolab-overview-zoom', String(Math.min(1.35, Math.max(1, zoom * 0.72))))
  }

  showZoom(`${source}: ${Math.round(zoom * 100)}%`)
  return true
}

function showZoom(label) {
  const node = page()
  if (!node) return
  let toast = node.querySelector('.audio-lab-zoom-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'audio-lab-zoom-toast'
    toast.setAttribute('role', 'status')
    node.appendChild(toast)
  }
  toast.textContent = label
  toast.classList.add('is-visible')
  window.clearTimeout(showZoom.timer)
  showZoom.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 900)
}

function isTimelineTarget(target) {
  return Boolean(target?.closest?.('.audio-lab-timeline-shell, .audio-lab-waveform, .audio-lab-multitrack-scroll, .audio-lab-multitrack'))
}

function handleWheel(event) {
  if (!isAudioLabRoute() || !isTimelineTarget(event.target)) return

  const pinchWheel = event.ctrlKey || event.metaKey
  const altWheelZoom = event.altKey
  if (!pinchWheel && !altWheelZoom) return

  event.preventDefault()
  event.stopPropagation()
  const factor = Math.exp(-event.deltaY * 0.0025)
  setZoom(currentZoom() * factor, { centerX: event.clientX, source: pinchWheel ? 'Pinch zoom' : 'Wheel zoom' })
}

function distance(touches) {
  const [a, b] = touches
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function midpoint(touches) {
  const [a, b] = touches
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
}

function handleTouchStart(event) {
  if (!isAudioLabRoute() || !isTimelineTarget(event.target) || event.touches.length !== 2) return
  activePinch = { startDistance: distance(event.touches), startZoom: currentZoom() }
}

function handleTouchMove(event) {
  if (!activePinch || event.touches.length !== 2 || !isTimelineTarget(event.target)) return
  event.preventDefault()
  const nextDistance = distance(event.touches)
  const center = midpoint(event.touches)
  const ratio = nextDistance / Math.max(1, activePinch.startDistance)
  setZoom(activePinch.startZoom * ratio, { centerX: center.x, source: 'Pinch zoom' })
}

function handleTouchEnd(event) {
  if (event.touches.length < 2) activePinch = null
}

function ensureCloseButton(container, className, label, onClick) {
  let button = document.querySelector(`.${className}`)
  if (!button) {
    button = document.createElement('button')
    button.type = 'button'
    button.className = className
    button.textContent = label
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      onClick()
    })
    document.body.appendChild(button)
  }
  return button
}

function removeCloseButton(className) {
  document.querySelector(`.${className}`)?.remove()
}

function openInspector() {
  const dock = document.querySelector('.audio-lab-page .audio-lab-project-sidebar')
  if (!dock) return false
  dock.classList.add('is-open')
  dock.setAttribute('aria-expanded', 'true')
  ensureCloseButton(dock, 'audio-lab-dock-close', 'Close dock', closeInspector)
  return true
}

function closeInspector() {
  const dock = document.querySelector('.audio-lab-page .audio-lab-project-sidebar')
  if (!dock) return false
  dock.classList.remove('is-open')
  dock.setAttribute('aria-expanded', 'false')
  removeCloseButton('audio-lab-dock-close')
  return true
}

function toggleInspector() {
  const dock = document.querySelector('.audio-lab-page .audio-lab-project-sidebar')
  if (!dock) return false
  return dock.classList.contains('is-open') ? closeInspector() : openInspector()
}

function openProjects() {
  const drawer = document.querySelector('.audio-lab-page .audio-lab-sidebar')
  if (!drawer) return false
  drawer.classList.add('is-open')
  drawer.setAttribute('aria-expanded', 'true')
  ensureCloseButton(drawer, 'audio-lab-project-close', 'Close projects', closeProjects)
  return true
}

function closeProjects() {
  const drawer = document.querySelector('.audio-lab-page .audio-lab-sidebar')
  if (!drawer) return false
  drawer.classList.remove('is-open')
  drawer.setAttribute('aria-expanded', 'false')
  removeCloseButton('audio-lab-project-close')
  return true
}

function toggleProjects() {
  const drawer = document.querySelector('.audio-lab-page .audio-lab-sidebar')
  if (!drawer) return false
  return drawer.classList.contains('is-open') ? closeProjects() : openProjects()
}

function handleClick(event) {
  if (!isAudioLabRoute()) return
  const dock = event.target.closest?.('.audio-lab-project-sidebar')
  if (dock && !dock.classList.contains('is-open')) {
    event.preventDefault()
    toggleInspector()
    return
  }

  const projects = event.target.closest?.('.audio-lab-sidebar')
  if (projects && !projects.classList.contains('is-open')) {
    event.preventDefault()
    toggleProjects()
  }
}

function handleKeydown(event) {
  if (!isAudioLabRoute()) return
  const key = String(event.key || '').toLowerCase()
  if (key === 'escape') {
    closeInspector()
    closeProjects()
    return
  }
  if (!event.ctrlKey && !event.metaKey && key === 'i') {
    event.preventDefault()
    toggleInspector()
  }
  if (!event.ctrlKey && !event.metaKey && key === 'b') {
    event.preventDefault()
    toggleProjects()
  }
  if ((event.ctrlKey || event.metaKey) && key === '0') {
    event.preventDefault()
    setZoom(DEFAULT_ZOOM, { source: 'Fit zoom' })
  }
}

function markControlsReady() {
  const node = page()
  if (!node) return
  node.dataset.audiolabWorkspaceControls = 'true'
  node.style.setProperty('--audiolab-zoom-scale', String(currentZoom()))
  node.style.setProperty('--audiolab-overview-zoom', String(Math.min(1.35, Math.max(1, currentZoom() * 0.72))))

  const dock = document.querySelector('.audio-lab-page .audio-lab-project-sidebar')
  if (dock && !dock.hasAttribute('aria-expanded')) dock.setAttribute('aria-expanded', 'false')
  const projects = document.querySelector('.audio-lab-page .audio-lab-sidebar')
  if (projects && !projects.hasAttribute('aria-expanded')) projects.setAttribute('aria-expanded', 'false')
}

function start() {
  if (!isAudioLabRoute()) return
  markControlsReady()
  window.clearInterval(cleanupTimer)
  cleanupTimer = window.setInterval(markControlsReady, 1000)
}

window.addEventListener('wheel', handleWheel, { capture: true, passive: false })
window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true })
window.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false })
window.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true })
window.addEventListener('touchcancel', handleTouchEnd, { capture: true, passive: true })
window.addEventListener('click', handleClick, true)
window.addEventListener('keydown', handleKeydown, true)
window.addEventListener('load', start)
window.addEventListener('popstate', () => window.setTimeout(start, 80))
window.setTimeout(start, 150)
