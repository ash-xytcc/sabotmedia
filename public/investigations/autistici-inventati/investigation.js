(() => {
  const body = document.body
  const toast = document.getElementById('toast')
  const receiptsToggle = document.getElementById('receipts-toggle')

  const enhancementSheet = document.createElement('link')
  enhancementSheet.rel = 'stylesheet'
  enhancementSheet.href = './investigation-enhancements.css'
  document.head.appendChild(enhancementSheet)

  const introActions = document.querySelector('.intro-actions')
  if (introActions) {
    const pdfButton = document.createElement('button')
    pdfButton.type = 'button'
    pdfButton.className = 'button button-secondary pdf-button'
    pdfButton.textContent = 'Download / save PDF'
    pdfButton.addEventListener('click', () => window.print())
    introActions.appendChild(pdfButton)
  }

  const quickRead = document.querySelector('.quick-read')
  if (quickRead) {
    const dossier = document.createElement('section')
    dossier.className = 'media-dossier'
    dossier.id = 'people-and-documents'
    dossier.innerHTML = `
      <div class="wrap">
        <div class="section-head">
          <div>
            <p class="eyebrow">PEOPLE IN THE CHAIN</p>
            <h2>Who moved the idea, the reporting and the policy.</h2>
          </div>
          <p class="section-intro">These are people whose public statements or official roles appear in the documented chronology. Inclusion here does not imply that any one of them caused A/I's designation.</p>
        </div>
        <div class="media-dossier__grid">
          <figure class="person-card">
            <img loading="lazy" src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Andy%20Ngo%20%26%20Dan%20Crenshaw%20%2848514167051%29.jpg?width=1100" alt="Andy Ngo standing with Dan Crenshaw at a public event." />
            <figcaption class="person-card__copy">
              <span>WHITE HOUSE PROPOSAL</span>
              <h3>Andy Ngo</h3>
              <p>Proposed a foreign-terrorist designation route during the October 8, 2025 White House roundtable.</p>
              <a href="#white-house">Go to the evidence →</a>
            </figcaption>
          </figure>
          <figure class="person-card">
            <img loading="lazy" src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Official%20Portrait%20of%20Secretary%20Rubio%20Headshot.jpg?width=800" alt="Official portrait of U.S. Secretary of State Marco Rubio." />
            <figcaption class="person-card__copy">
              <span>STATE DEPARTMENT</span>
              <h3>Marco Rubio</h3>
              <p>The president said Rubio would handle the international-designation issue; State later created the foreign predicates in the chain.</p>
              <a href="#predicates">Go to the evidence →</a>
            </figcaption>
          </figure>
          <figure class="person-card">
            <img loading="lazy" src="https://www.whitehouse.gov/wp-content/uploads/2025/09/P20250925JB-0568.jpg?w=1200" alt="President Donald Trump in the Oval Office on September 25, 2025." />
            <figcaption class="person-card__copy">
              <span>POLICY SHIFT</span>
              <h3>Donald Trump</h3>
              <p>The administration's September 2025 policy expanded the target set toward networks, services and support infrastructure.</p>
              <a href="#policy-shift">Go to the evidence →</a>
            </figcaption>
          </figure>
        </div>
      </div>`
    quickRead.insertAdjacentElement('afterend', dossier)
  }

  const senateSection = document.getElementById('senate')
  if (senateSection) {
    const wall = document.createElement('div')
    wall.className = 'document-wall'
    wall.innerHTML = `
      <article class="document-peek">
        <div class="document-peek__bar"><span>Senate testimony · Oct. 28, 2025</span><a href="https://www.judiciary.senate.gov/download/11/26/2025/2025-10-28-pm_testimony_shidelerpdf" target="_blank" rel="noreferrer">Open PDF ↗</a></div>
        <iframe loading="lazy" title="Kyle Shideler Senate testimony PDF" src="https://www.judiciary.senate.gov/download/11/26/2025/2025-10-28-pm_testimony_shidelerpdf#page=1&view=FitH"></iframe>
      </article>
      <article class="document-peek">
        <div class="document-peek__bar"><span>OFAC notice · Aug. 26, 2026</span><a href="https://public-inspection.federalregister.gov/2026-17724.pdf" target="_blank" rel="noreferrer">Open PDF ↗</a></div>
        <iframe loading="lazy" title="Federal Register OFAC notice PDF" src="https://public-inspection.federalregister.gov/2026-17724.pdf#page=1&view=FitH"></iframe>
      </article>`
    senateSection.querySelector('.receipt')?.insertAdjacentElement('beforebegin', wall)
  }

  const tools = document.createElement('div')
  tools.className = 'reader-tools'
  tools.setAttribute('aria-label', 'Reader tools')
  tools.innerHTML = `
    <button type="button" data-reader="receipts">Receipts</button>
    <button type="button" data-reader="chain">Focus chain</button>
    <button type="button" data-reader="pdf">PDF / Print</button>`
  document.body.appendChild(tools)

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
    const tool = tools.querySelector('[data-reader="receipts"]')
    tool?.setAttribute('aria-pressed', String(enabled))
    try { localStorage.setItem('sabot-ai-receipts', enabled ? '1' : '0') } catch {}
  }

  function setFocusChain(enabled) {
    body.classList.toggle('focus-chain', enabled)
    const button = tools.querySelector('[data-reader="chain"]')
    button?.setAttribute('aria-pressed', String(enabled))
    if (enabled) document.getElementById('chain')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (receiptsToggle) receiptsToggle.addEventListener('click', () => setReceiptsMode(!body.classList.contains('receipts-mode')))
  try {
    if (localStorage.getItem('sabot-ai-receipts') === '1') setReceiptsMode(true)
  } catch {}

  tools.querySelector('[data-reader="receipts"]')?.addEventListener('click', () => setReceiptsMode(!body.classList.contains('receipts-mode')))
  tools.querySelector('[data-reader="chain"]')?.addEventListener('click', () => setFocusChain(!body.classList.contains('focus-chain')))
  tools.querySelector('[data-reader="pdf"]')?.addEventListener('click', () => window.print())

  let printReceiptState = []
  window.addEventListener('beforeprint', () => {
    printReceiptState = receipts.map((item) => item.open)
    receipts.forEach((item) => { item.open = true })
  })
  window.addEventListener('afterprint', () => {
    receipts.forEach((item, index) => { item.open = Boolean(printReceiptState[index]) })
  })

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

  if (window.location.hash) {
    window.setTimeout(() => {
      const target = document.querySelector(window.location.hash)
      if (target) target.scrollIntoView({ block: 'start' })
    }, 80)
  }
})()
