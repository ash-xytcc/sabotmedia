let activeRun = 0

function campaignHashTarget() {
  if (!window.location.pathname.startsWith('/campaigns/')) return ''
  const raw = String(window.location.hash || '').slice(1)
  if (!raw || raw.startsWith('manage-signature=')) return ''
  try { return decodeURIComponent(raw) } catch { return raw }
}

function navOffset() {
  const nav = document.querySelector('.campaign-local-nav')
  const topbar = document.querySelector('.publication-topbar, .admin-bar, .wp-admin-bar')
  return Math.max(12, (nav?.getBoundingClientRect().height || 0) + (topbar?.getBoundingClientRect().height || 0) + 12)
}

function scrollTargetIntoPlace(target) {
  const desired = Math.max(0, window.scrollY + target.getBoundingClientRect().top - navOffset())
  if (Math.abs(window.scrollY - desired) > 3) window.scrollTo({ top: desired, behavior: 'auto' })
}

export function stabilizeCampaignHash() {
  const targetId = campaignHashTarget()
  if (!targetId) return

  const run = ++activeRun
  const startedAt = performance.now()
  let targetSeen = false
  let userInterrupted = false
  let queued = false

  const stopOnIntent = () => {
    if (targetSeen && performance.now() - startedAt > 400) userInterrupted = true
  }
  const intentEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown']
  intentEvents.forEach((name) => window.addEventListener(name, stopOnIntent, { passive: true, capture: true }))

  const cleanup = () => {
    mutationObserver.disconnect()
    resizeObserver?.disconnect()
    intentEvents.forEach((name) => window.removeEventListener(name, stopOnIntent, { capture: true }))
  }

  const settle = () => {
    queued = false
    if (run !== activeRun || userInterrupted || performance.now() - startedAt > 8000) {
      cleanup()
      return
    }
    if (campaignHashTarget() !== targetId) {
      cleanup()
      return
    }
    const target = document.getElementById(targetId)
    if (!target) return
    targetSeen = true
    scrollTargetIntoPlace(target)
  }

  const queue = () => {
    if (queued || run !== activeRun || userInterrupted) return
    queued = true
    window.requestAnimationFrame(settle)
  }

  const mutationObserver = new MutationObserver(queue)
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true })

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(queue) : null
  const root = document.getElementById('root')
  if (resizeObserver && root) resizeObserver.observe(root)

  ;[0, 50, 150, 300, 600, 1000, 1600, 2400, 3500, 5000, 7500].forEach((delay) => window.setTimeout(queue, delay))
  queue()
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('hashchange', stabilizeCampaignHash)
  window.addEventListener('pageshow', stabilizeCampaignHash)

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href^="#"]')
    if (!link || !window.location.pathname.startsWith('/campaigns/')) return
    window.setTimeout(stabilizeCampaignHash, 0)
  })

  const routeObserver = new MutationObserver(() => {
    if (campaignHashTarget()) stabilizeCampaignHash()
  })
  routeObserver.observe(document.documentElement, { childList: true, subtree: false })

  window.setTimeout(stabilizeCampaignHash, 0)
}
