(() => {
  const body = document.body
  const receiptsToggle = document.getElementById('receipts-toggle')
  const toast = document.getElementById('toast')
  const receipts = Array.from(document.querySelectorAll('details.receipt'))
  const navLinks = Array.from(document.querySelectorAll('.story-nav a'))
  const sections = Array.from(document.querySelectorAll('[data-section]'))

  function showToast(message) {
    if (!toast) return
    toast.textContent = message
    toast.classList.add('show')
    window.clearTimeout(showToast.timer)
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 1800)
  }

  function setReceiptsMode(enabled) {
    body.classList.toggle('receipts-mode', enabled)
    receipts.forEach((item) => { item.open = enabled })
    if (receiptsToggle) {
      receiptsToggle.setAttribute('aria-pressed', String(enabled))
      receiptsToggle.textContent = enabled ? 'Close receipts mode' : 'Open receipts mode'
    }
    try { localStorage.setItem('sabot-ai-receipts', enabled ? '1' : '0') } catch {}
  }

  if (receiptsToggle) {
    receiptsToggle.addEventListener('click', () => setReceiptsMode(!body.classList.contains('receipts-mode')))
    try {
      if (localStorage.getItem('sabot-ai-receipts') === '1') setReceiptsMode(true)
    } catch {}
  }

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const hash = button.getAttribute('data-copy') || ''
      const url = `${window.location.origin}${window.location.pathname}${hash}`
      try {
        await navigator.clipboard.writeText(url)
        showToast('Section link copied.')
      } catch {
        window.location.hash = hash
        showToast('Link ready in the address bar.')
      }
    })
  })

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (!visible) return
    const id = visible.target.id
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${id}`))
  }, { rootMargin: '-22% 0px -58% 0px', threshold: [0, .15, .4, .7] })

  sections.forEach((section) => observer.observe(section))

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      const target = document.querySelector(link.getAttribute('href'))
      if (!target) return
      window.setTimeout(() => target.setAttribute('tabindex', '-1'), 50)
    })
  })

  // Preserve a readable deep-link state when someone arrives at a specific piece of evidence.
  if (window.location.hash) {
    window.setTimeout(() => {
      const target = document.querySelector(window.location.hash)
      if (target) target.scrollIntoView({ block: 'start' })
    }, 80)
  }
})()
