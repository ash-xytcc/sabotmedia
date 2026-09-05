(() => {
  const body = document.body
  const toast = document.getElementById('toast')
  const receiptsToggle = document.getElementById('receipts-toggle')
  const localDocuments = {
    'govinfo-transcript': './documents/white-house-antifa-roundtable-transcript.pdf',
    'senate-shideler': './documents/shideler-senate-testimony.pdf',
    'ofac-notice': './documents/ofac-2026-17724.pdf',
  }
  const proxyPdf = (source, page) => `${localDocuments[source]}#page=${page}&zoom=page-width`

  const enhancementSheet = document.createElement('link')
  enhancementSheet.rel = 'stylesheet'
  enhancementSheet.href = './investigation-enhancements.css'
  document.head.appendChild(enhancementSheet)

  const contextSheet = document.createElement('link')
  contextSheet.rel = 'stylesheet'
  contextSheet.href = './investigation-context.css'
  document.head.appendChild(contextSheet)

  function loadPdfHighlights() {
    if (document.querySelector('script[src="./pdf-highlights.js"]')) return
    const pdfScript = document.createElement('script')
    pdfScript.src = './pdf-highlights.js'
    pdfScript.async = false
    document.head.appendChild(pdfScript)
  }

  if (!document.querySelector('script[src="./public-updates.js"]')) {
    const publicUpdatesScript = document.createElement('script')
    publicUpdatesScript.src = './public-updates.js'
    publicUpdatesScript.async = false
    publicUpdatesScript.addEventListener('load', loadPdfHighlights, { once: true })
    publicUpdatesScript.addEventListener('error', loadPdfHighlights, { once: true })
    document.head.appendChild(publicUpdatesScript)
  } else {
    loadPdfHighlights()
  }

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
    const context = document.createElement('section')
    context.className = 'investigation-context'
    context.id = 'read-first'
    context.innerHTML = `
      <div class="wrap">
        <div class="section-head investigation-context__intro">
          <div>
            <p class="eyebrow">READ THIS FIRST</p>
            <h2>Four distinctions that keep the evidence straight.</h2>
          </div>
          <p class="section-intro">The campaign page does not need a second copy of this investigation. This reader is the place where the legal distinctions, source lineage and policy sequence are explained in full.</p>
        </div>
        <div class="investigation-context__basics" aria-label="Four important distinctions">
          <article><span>01 · DESIGNATION</span><h3>A/I is an SDGT, not an FTO</h3><p>A/I was sanctioned under Executive Order 13224 as a Specially Designated Global Terrorist. It was not itself designated as a Foreign Terrorist Organization. The distinction matters because foreign-group designations can still become predicates in a later support case.</p></article>
          <article><span>02 · LEGAL HOOK</span><h3>The public theory is services</h3><p>The government’s public case focuses on hosting, communications and other infrastructure or support. The public finding does not say A/I itself carried out a shooting, bombing or sabotage.</p></article>
          <article><span>03 · SOURCE LANGUAGE</span><h3>“Antifa” is their framing</h3><p>This page tracks how officials and outside advocates use the term because their definitions shaped the policy process. Reporting their framing is not the same as adopting it as our own factual category.</p></article>
          <article><span>04 · CAUSATION</span><h3>Sequence is not proof of cause</h3><p>Some handoffs are documented directly. Others are chronological or inferential. Where the public record does not show that one event caused another, the page labels that gap instead of quietly upgrading it into fact.</p></article>
        </div>
        <p class="investigation-context__note"><strong>What we are not claiming:</strong> the public record does not currently prove a secret agreement among the people named here or identify who made the decisive internal referral to OFAC. That missing bureaucratic handoff is the central unresolved question.</p>
        <div class="investigation-context__actions"><a href="#chain">Follow the documented chain ↓</a><a href="#claim-ledger">See what is proven / not proven</a></div>
      </div>`
    quickRead.insertAdjacentElement('beforebegin', context)

    const upstream = document.createElement('section')
    upstream.className = 'investigation-upstream'
    upstream.id = 'upstream-context'
    upstream.innerHTML = `
      <div class="wrap">
        <div class="section-head">
          <div><p class="eyebrow">BEFORE A/I APPEARS BY NAME</p><h2>The upstream policy context</h2></div>
          <p class="section-intro">The existing chain below starts with the administration’s formal policy shift. These four earlier or adjacent events explain why that shift did not appear in a vacuum, without pretending they prove a direct causal line to the August 2026 sanction.</p>
        </div>
        <div class="investigation-upstream__events">
          <article><time>SEP 10, 2025</time><h3>Charlie Kirk is assassinated</h3><p>The killing becomes an explicit reference point in the administration’s later counterterrorism framing of political violence.</p></article>
          <article><time>SEP 16</time><h3>Shideler attributes the killing to “Antifa”</h3><p>Shideler publishes an article making that argument. It is his characterization, not an independently established finding of organizational responsibility.</p><a href="https://thefederalist.com/2025/09/16/antifa-is-responsible-for-charlie-kirks-assassination/" target="_blank" rel="noreferrer">Read the article ↗</a></article>
          <article><time>SEP 17</time><h3>A dismantlement roadmap appears</h3><p>Shideler proposes intelligence work, foreign designations, Treasury sanctions and international cooperation against far-left networks, including a piecemeal designation strategy.</p><a href="https://americanmind.org/memo/how-to-dismantle-far-left-extremist-networks/" target="_blank" rel="noreferrer">Read the roadmap ↗</a></article>
          <article><time>OCT 9</time><h3>Schmitt writes Rubio</h3><p>One day after the White House roundtable, Sen. Eric Schmitt formally urges Rubio to pursue foreign designations of networks, organizations and financiers alleged to enable Antifa operations.</p><a href="https://www.schmitt.senate.gov/wp-content/uploads/2025/10/10.9.2025-Letter-to-Sec.-Rubio.pdf" target="_blank" rel="noreferrer">Read the letter ↗</a></article>
        </div>
      </div>`
    quickRead.insertAdjacentElement('afterend', upstream)

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
            <img loading="lazy" src="https://www.whitehouse.gov/wp-content/uploads/2025/06/President-Donald-Trump-Official-Presidential-Portrait.png" alt="Official presidential portrait of Donald Trump." />
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

  const claimLedger = document.getElementById('claim-ledger')
  if (claimLedger) {
    const lineage = document.createElement('aside')
    lineage.className = 'source-lineage wrap'
    lineage.id = 'source-lineage'
    lineage.innerHTML = `
      <p>SOURCE LINEAGE</p>
      <h2>The Crozier → Shideler → Congress feedback loop</h2>
      <p>On October 16, Hudson Crozier’s Daily Caller investigation quoted Kyle Shideler as an expert explaining the legal importance of foreign terrorist designations for reaching service providers such as A/I. Twelve days later, Shideler named A/I and NoBlogs in Senate testimony and cited Crozier’s article.</p>
      <p>That does not show Crozier’s reporting was fabricated, and his article contained evidence beyond Shideler. It does mean the apparent layers of corroboration are not fully independent. A source helped interpret reporting, then cited the resulting reporting when presenting the same target to Congress.</p>
      <div class="source-lineage__links"><a href="https://dailycaller.com/2025/10/16/foreign-tech-group-police-antifa/" target="_blank" rel="noreferrer">Crozier report ↗</a><a href="https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf" target="_blank" rel="noreferrer">Shideler testimony ↗</a></div>`
    claimLedger.insertAdjacentElement('afterend', lineage)
  }

  const peopleScript = document.createElement('script')
  peopleScript.src = './people-dossiers.js'
  document.head.appendChild(peopleScript)

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
        <p class="section-intro">These readers use preservation copies hosted by Sabot so an agency outage cannot leave a dead box. The original government PDF is always linked directly.</p>
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
