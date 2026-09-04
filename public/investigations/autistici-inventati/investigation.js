(() => {
  const body = document.body
  const toast = document.getElementById('toast')
  const receiptsToggle = document.getElementById('receipts-toggle')
  const proxyPdf = (source, page) => `/api/investigation-document?source=${encodeURIComponent(source)}#page=${page}&zoom=page-width`

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
            <img loading="lazy" src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Andy%20Ngo%20by%20Gage%20Skidmore.jpg?width=900" alt="Andy Ngo speaking at a public event." />
            <figcaption class="person-card__copy"><span>WHITE HOUSE PROPOSAL</span><h3>Andy Ngo</h3><p>Proposed a foreign-terrorist designation route during the October 8, 2025 White House roundtable.</p><a href="#white-house">Go to the evidence →</a></figcaption>
          </figure>
          <figure class="person-card">
            <img loading="lazy" src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Official%20Portrait%20of%20Secretary%20Rubio%20Headshot.jpg?width=800" alt="Official portrait of U.S. Secretary of State Marco Rubio." />
            <figcaption class="person-card__copy"><span>STATE DEPARTMENT</span><h3>Marco Rubio</h3><p>The president said Rubio would handle the international-designation issue; State later created the foreign predicates in the chain.</p><a href="#predicates">Go to the evidence →</a></figcaption>
          </figure>
          <figure class="person-card">
            <img loading="lazy" src="https://www.whitehouse.gov/wp-content/uploads/2025/09/P20250925JB-0568.jpg?w=1200" alt="President Donald Trump in the Oval Office on September 25, 2025." />
            <figcaption class="person-card__copy"><span>POLICY SHIFT</span><h3>Donald Trump</h3><p>The administration's September 2025 policy expanded the target set toward networks, services and support infrastructure.</p><a href="#policy-shift">Go to the evidence →</a></figcaption>
          </figure>
        </div>
        <div class="role-strip" aria-label="Other central figures">
          <a href="#job-one"><span>LEGAL THEORY</span><strong>Kyle Shideler</strong><small>Center for Security Policy · “job one” quote and Senate testimony</small></a>
          <a href="#portland-bridge"><span>REPORTING PATH</span><strong>Hudson Crozier</strong><small>DCNF reporter who traced NoBlogs/A/I and whose article Shideler cited</small></a>
        </div>
      </div>`
    quickRead.insertAdjacentElement('afterend', dossier)
  }

  const docs = [
    {
      title: 'Ngo proposes the FTO route',
      meta: 'GOVINFO · PAGE 7',
      source: 'govinfo-transcript',
      page: 7,
      alt: 'GovInfo transcript page showing Andy Ngo foreign terrorist organization proposal',
      note: 'Near the end of Ngo’s remarks, the official transcript records his suggestion that State designate Antifa’s international arm as an FTO.',
      original: 'https://www.govinfo.gov/content/pkg/DCPD-202500989/pdf/DCPD-202500989.pdf#page=7',
    },
    {
      title: '“Marco will take care of it”',
      meta: 'GOVINFO · PAGE 24',
      source: 'govinfo-transcript',
      page: 24,
      alt: 'GovInfo transcript page with Trump response about Marco Rubio',
      note: 'Later in the same event, the idea is raised again and Trump says, “Let’s get it done” and that Marco would handle it.',
      original: 'https://www.govinfo.gov/content/pkg/DCPD-202500989/pdf/DCPD-202500989.pdf#page=24',
    },
    {
      title: 'A/I named in testimony',
      meta: 'SENATE JUDICIARY · PAGE 5',
      source: 'senate-shideler',
      page: 5,
      alt: 'Senate testimony page naming Autistici Inventati and citing Hudson Crozier',
      note: 'The page names NoBlogs and A/I directly. Footnote 11 cites Crozier’s Oct. 16 article.',
      original: 'https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf#page=5',
    },
    {
      title: 'The operative legal hook',
      meta: 'FEDERAL REGISTER · PAGE 2',
      source: 'ofac-notice',
      page: 2,
      alt: 'Federal Register page showing the OFAC designation basis for Autistici Inventati',
      note: 'The notice identifies A/I as “Data processing, hosting and related activities” and applies E.O. 13224’s material-support/services provision.',
      original: 'https://public-inspection.federalregister.gov/2026-17724.pdf#page=2',
    },
  ]

  const evidenceGallery = document.createElement('section')
  evidenceGallery.className = 'evidence-gallery band'
  evidenceGallery.id = 'document-excerpts'
  evidenceGallery.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div><p class="eyebrow">DOCUMENT EXCERPTS</p><h2>Read the pages, not just our summary.</h2></div>
        <p class="section-intro">These readers use a same-origin Sabot document endpoint so agencies that block third-party framing do not leave a dead box. The original government PDF is always linked directly.</p>
      </div>
      <div class="evidence-gallery__grid">
        ${docs.map((doc) => `
          <article class="evidence-doc" data-doc-title="${escapeAttr(doc.title)}" data-doc-url="${proxyPdf(doc.source, doc.page)}">
            <div class="evidence-doc__meta"><span>${escapeHtml(doc.meta)}</span><strong>${escapeHtml(doc.title)}</strong></div>
            <div class="evidence-doc__viewer"><iframe loading="lazy" title="${escapeAttr(doc.alt)}" src="${proxyPdf(doc.source, doc.page)}"></iframe></div>
            <p>${escapeHtml(doc.note)}</p>
            <div class="evidence-doc__actions"><button type="button" class="doc-expand">Expand</button><a href="${escapeAttr(doc.original)}" target="_blank" rel="noreferrer">Open source ↗</a></div>
          </article>`).join('')}
      </div>
    </div>`
  document.getElementById('chain')?.insertAdjacentElement('afterend', evidenceGallery)

  document.querySelectorAll('.chain-node').forEach((node) => {
    const map = {
      '#policy-shift': '2 sources', '#white-house': '2 transcript pages', '#portland-bridge': '3 sources',
      '#job-one': '1 key interview', '#senate': '1 testimony + citation', '#predicates': '2 official records',
      '#missing-file': 'OPEN', '#ofac': '3 official records', '#cascade': '3 downstream records',
    }
    const label = map[node.getAttribute('href')]
    if (!label) return
    const badge = document.createElement('span')
    badge.className = 'chain-node__badge'
    badge.textContent = label
    node.appendChild(badge)
  })

  const senateSection = document.getElementById('senate')
  if (senateSection) {
    const wall = document.createElement('div')
    wall.className = 'document-wall'
    wall.innerHTML = `
      <article class="document-peek">
        <div class="document-peek__bar"><span>Senate testimony · exact A/I page</span><a href="${docs[2].original}" target="_blank" rel="noreferrer">Open PDF ↗</a></div>
        <iframe loading="lazy" title="Kyle Shideler Senate testimony page five" src="${proxyPdf('senate-shideler', 5)}"></iframe>
      </article>
      <article class="document-peek">
        <div class="document-peek__bar"><span>OFAC notice · exact A/I page</span><a href="${docs[3].original}" target="_blank" rel="noreferrer">Open PDF ↗</a></div>
        <iframe loading="lazy" title="Federal Register OFAC notice page two" src="${proxyPdf('ofac-notice', 2)}"></iframe>
      </article>`
    senateSection.querySelector('.receipt')?.insertAdjacentElement('beforebegin', wall)
  }

  const modal = document.createElement('dialog')
  modal.className = 'doc-modal'
  modal.innerHTML = `<div class="doc-modal__bar"><strong></strong><button type="button" aria-label="Close document viewer">Close ×</button></div><iframe title="Expanded document viewer"></iframe>`
  document.body.appendChild(modal)

  document.querySelectorAll('.doc-expand').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.evidence-doc')
      modal.querySelector('strong').textContent = card?.dataset.docTitle || 'Document'
      modal.querySelector('iframe').src = card?.dataset.docUrl || ''
      modal.showModal()
    })
  })
  modal.querySelector('button')?.addEventListener('click', () => modal.close())
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.close() })
  modal.addEventListener('close', () => { modal.querySelector('iframe').src = 'about:blank' })

  const tools = document.createElement('div')
  tools.className = 'reader-tools'
  tools.setAttribute('aria-label', 'Reader tools')
  tools.innerHTML = `<button type="button" data-reader="receipts">Receipts</button><button type="button" data-reader="chain">Focus chain</button><button type="button" data-reader="docs">Documents</button><button type="button" data-reader="pdf">PDF / Print</button>`
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
    tools.querySelector('[data-reader="receipts"]')?.setAttribute('aria-pressed', String(enabled))
    try { localStorage.setItem('sabot-ai-receipts', enabled ? '1' : '0') } catch {}
  }

  function setFocusChain(enabled) {
    body.classList.toggle('focus-chain', enabled)
    tools.querySelector('[data-reader="chain"]')?.setAttribute('aria-pressed', String(enabled))
    if (enabled) document.getElementById('chain')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (receiptsToggle) receiptsToggle.addEventListener('click', () => setReceiptsMode(!body.classList.contains('receipts-mode')))
  try { if (localStorage.getItem('sabot-ai-receipts') === '1') setReceiptsMode(true) } catch {}

  tools.querySelector('[data-reader="receipts"]')?.addEventListener('click', () => setReceiptsMode(!body.classList.contains('receipts-mode')))
  tools.querySelector('[data-reader="chain"]')?.addEventListener('click', () => setFocusChain(!body.classList.contains('focus-chain')))
  tools.querySelector('[data-reader="docs"]')?.addEventListener('click', () => document.getElementById('document-excerpts')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  tools.querySelector('[data-reader="pdf"]')?.addEventListener('click', () => window.print())

  let printReceiptState = []
  window.addEventListener('beforeprint', () => {
    printReceiptState = receipts.map((item) => item.open)
    receipts.forEach((item) => { item.open = true })
  })
  window.addEventListener('afterprint', () => receipts.forEach((item, index) => { item.open = Boolean(printReceiptState[index]) }))

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const hash = button.getAttribute('data-copy') || ''
      const url = `${window.location.origin}${window.location.pathname}${hash}`
      try { await navigator.clipboard.writeText(url); showToast('Section link copied.') }
      catch { window.location.hash = hash; showToast('Link ready in the address bar.') }
    })
  })

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (!visible) return
    const id = visible.target.id
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${id}`))
  }, { rootMargin: '-22% 0px -58% 0px', threshold: [0, .15, .4, .7] })
  sections.forEach((section) => observer.observe(section))

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      const target = document.querySelector(link.getAttribute('href'))
      if (target) window.setTimeout(() => target.setAttribute('tabindex', '-1'), 50)
    })
  })

  if (window.location.hash) window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView({ block: 'start' }), 80)

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]))
  }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;') }
})()