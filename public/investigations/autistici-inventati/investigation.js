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
            <img loading="lazy" src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Andy%20Ngo%20by%20Gage%20Skidmore.jpg?width=900" alt="Andy Ngo speaking at a public event." />
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
        <div class="role-strip" aria-label="Other central figures">
          <a href="#job-one"><span>LEGAL THEORY</span><strong>Kyle Shideler</strong><small>Center for Security Policy · “job one” quote and Senate testimony</small></a>
          <a href="#portland-bridge"><span>REPORTING PATH</span><strong>Hudson Crozier</strong><small>DCNF reporter who traced NoBlogs/A/I and whose article Shideler cited</small></a>
        </div>
      </div>`
    quickRead.insertAdjacentElement('afterend', dossier)
  }

  const evidenceGallery = document.createElement('section')
  evidenceGallery.className = 'evidence-gallery band'
  evidenceGallery.id = 'document-excerpts'
  evidenceGallery.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">DOCUMENT EXCERPTS</p>
          <h2>Read the pages, not just our summary.</h2>
        </div>
        <p class="section-intro">Each viewer opens the exact page where a key part of the chain appears. Use “expand” for a full-screen reader or open the original PDF directly.</p>
      </div>
      <div class="evidence-gallery__grid">
        <article class="evidence-doc" data-doc-title="Ngo proposes the FTO route" data-doc-url="https://www.govinfo.gov/content/pkg/DCPD-202500989/pdf/DCPD-202500989.pdf#page=7&view=FitH">
          <div class="evidence-doc__meta"><span>GOVINFO · PAGE 7</span><strong>Ngo proposes the FTO route</strong></div>
          <div class="evidence-doc__viewer"><iframe loading="lazy" title="GovInfo transcript page showing Andy Ngo foreign terrorist organization proposal" src="https://www.govinfo.gov/content/pkg/DCPD-202500989/pdf/DCPD-202500989.pdf#page=7&view=FitH"></iframe></div>
          <p>Near the end of Ngo’s remarks, the official transcript records his suggestion that State designate Antifa’s international arm as an FTO.</p>
          <div class="evidence-doc__actions"><button type="button" class="doc-expand">Expand</button><a href="https://www.govinfo.gov/content/pkg/DCPD-202500989/pdf/DCPD-202500989.pdf#page=7" target="_blank" rel="noreferrer">Open source ↗</a></div>
        </article>
        <article class="evidence-doc" data-doc-title="Trump says Marco will take care of it" data-doc-url="https://www.govinfo.gov/content/pkg/DCPD-202500989/pdf/DCPD-202500989.pdf#page=24&view=FitH">
          <div class="evidence-doc__meta"><span>GOVINFO · PAGE 24</span><strong>“Marco will take care of it”</strong></div>
          <div class="evidence-doc__viewer"><iframe loading="lazy" title="GovInfo transcript page with Trump response about Marco Rubio" src="https://www.govinfo.gov/content/pkg/DCPD-202500989/pdf/DCPD-202500989.pdf#page=24&view=FitH"></iframe></div>
          <p>Later in the same event, the idea is raised again and Trump says, “Let’s get it done” and that Marco would handle it.</p>
          <div class="evidence-doc__actions"><button type="button" class="doc-expand">Expand</button><a href="https://www.govinfo.gov/content/pkg/DCPD-202500989/pdf/DCPD-202500989.pdf#page=24" target="_blank" rel="noreferrer">Open source ↗</a></div>
        </article>
        <article class="evidence-doc" data-doc-title="Shideler names A/I in Senate testimony" data-doc-url="https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf#page=5&view=FitH">
          <div class="evidence-doc__meta"><span>SENATE JUDICIARY · PAGE 5</span><strong>A/I named in testimony</strong></div>
          <div class="evidence-doc__viewer"><iframe loading="lazy" title="Senate testimony page naming Autistici Inventati and citing Hudson Crozier" src="https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf#page=5&view=FitH"></iframe></div>
          <p>The page names NoBlogs and A/I directly. Footnote 11 cites Crozier’s Oct. 16 article.</p>
          <div class="evidence-doc__actions"><button type="button" class="doc-expand">Expand</button><a href="https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf#page=5" target="_blank" rel="noreferrer">Open source ↗</a></div>
        </article>
        <article class="evidence-doc" data-doc-title="OFAC support-and-services finding" data-doc-url="https://public-inspection.federalregister.gov/2026-17724.pdf#page=2&view=FitH">
          <div class="evidence-doc__meta"><span>FEDERAL REGISTER · PAGE 2</span><strong>The operative legal hook</strong></div>
          <div class="evidence-doc__viewer"><iframe loading="lazy" title="Federal Register page showing the OFAC designation basis for Autistici Inventati" src="https://public-inspection.federalregister.gov/2026-17724.pdf#page=2&view=FitH"></iframe></div>
          <p>The notice identifies A/I as “Data processing, hosting and related activities” and applies E.O. 13224’s material-support/services provision.</p>
          <div class="evidence-doc__actions"><button type="button" class="doc-expand">Expand</button><a href="https://public-inspection.federalregister.gov/2026-17724.pdf#page=2" target="_blank" rel="noreferrer">Open source ↗</a></div>
        </article>
      </div>
    </div>`
  document.getElementById('chain')?.insertAdjacentElement('afterend', evidenceGallery)

  document.querySelectorAll('.chain-node').forEach((node) => {
    const map = {
      '#policy-shift': '2 sources', '#white-house': '2 transcript pages', '#portland-bridge': '3 sources',
      '#job-one': '1 key interview', '#senate': '1 testimony + citation', '#predicates': '2 official records',
      '#missing-file': 'OPEN', '#ofac': '3 official records', '#cascade': '3 downstream records'
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
        <div class="document-peek__bar"><span>Senate testimony · exact A/I page</span><a href="https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf#page=5" target="_blank" rel="noreferrer">Open PDF ↗</a></div>
        <iframe loading="lazy" title="Kyle Shideler Senate testimony page five" src="https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf#page=5&view=FitH"></iframe>
      </article>
      <article class="document-peek">
        <div class="document-peek__bar"><span>OFAC notice · exact A/I page</span><a href="https://public-inspection.federalregister.gov/2026-17724.pdf#page=2" target="_blank" rel="noreferrer">Open PDF ↗</a></div>
        <iframe loading="lazy" title="Federal Register OFAC notice page two" src="https://public-inspection.federalregister.gov/2026-17724.pdf#page=2&view=FitH"></iframe>
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
      const frame = modal.querySelector('iframe')
      modal.querySelector('strong').textContent = card?.dataset.docTitle || 'Document'
      frame.src = card?.dataset.docUrl || ''
      modal.showModal()
    })
  })
  modal.querySelector('button')?.addEventListener('click', () => modal.close())
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.close() })
  modal.addEventListener('close', () => { modal.querySelector('iframe').src = 'about:blank' })

  const tools = document.createElement('div')
  tools.className = 'reader-tools'
  tools.setAttribute('aria-label', 'Reader tools')
  tools.innerHTML = `
    <button type="button" data-reader="receipts">Receipts</button>
    <button type="button" data-reader="chain">Focus chain</button>
    <button type="button" data-reader="docs">Documents</button>
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
})()