(() => {
  const UPDATE_ID = 'update-2026-09-08-antifawatch-trail'
  const EVIDENCE_URL = './log/antifawatch/'

  function makeParallelTrail() {
    if (document.getElementById(UPDATE_ID)) return
    const chain = document.getElementById('chain')
    if (!chain) return

    const section = document.createElement('section')
    section.className = 'investigation-live-update'
    section.id = UPDATE_ID
    section.setAttribute('aria-labelledby', `${UPDATE_ID}-title`)
    section.innerHTML = `
      <div class="wrap investigation-live-update__grid">
        <div>
          <p class="eyebrow">NEW EVIDENCE · SEPTEMBER 8, 2026</p>
          <h2 id="${UPDATE_ID}-title">An earlier public A/I trail: AntifaWatch was naming the infrastructure by July 2025.</h2>
        </div>
        <div class="investigation-live-update__copy">
          <p>Preserved social posts add an earlier public node to the chronology. On July 16, 2025, AntifaWatch publicly identified Autistici/Inventati as the web-services provider behind projects it was tracking. That was roughly three months before Hudson Crozier's October 16 Daily Caller investigation identified A/I/NoBlogs as infrastructure used by several anarchist and antifascist publications.</p>
          <p>A separate preserved AntifaWatch post used the same infrastructure frame around Rose City Counter-Info, Abolition Media, Scenes from Stop Cop City and other projects, arguing that foreign technical infrastructure was a place to start if the administration pursued foreign-terrorist designations.</p>

          <div class="investigation-source-trail" aria-label="Earlier public A/I research trail">
            <article>
              <time>JULY 16 · 2025 · ANTIFAWATCH</time>
              <h3>A/I is publicly identified as shared technical infrastructure.</h3>
              <p>AntifaWatch tells its audience that web services supporting projects it is tracking are provided by A/I / Autistici/Inventati. This predates the later Crozier/Shideler A/I reporting.</p>
            </article>
            <article>
              <time>OCTOBER 16 · 2025 · CROZIER / SHIDELER</time>
              <h3>The infrastructure theory appears in a major published investigation.</h3>
              <p>Crozier's Daily Caller News Foundation report identifies A/I and NoBlogs as infrastructure used by several projects and quotes Kyle Shideler discussing foreign-terrorist designation and material-support authorities as a route to infrastructure providers.</p>
            </article>
            <article>
              <time>AUGUST 30 · 2026 · CROZIER / ANTIFAWATCH</time>
              <h3>Crozier publicly says he contacted AntifaWatch and asks for more A/I research.</h3>
              <p>In a preserved public reply, Crozier says he sent AntifaWatch an email and DM, says he had been covering A/I since before it became major news, and expresses interest in more of the account's research.</p>
            </article>
          </div>

          <p><strong>What the record establishes:</strong> AntifaWatch was publicly targeting A/I's role as shared infrastructure before Crozier's October 2025 reporting, and Crozier later directly solicited additional A/I research from AntifaWatch.</p>
          <p class="investigation-live-update__note"><strong>What it does not establish:</strong> the available record does not show that AntifaWatch supplied Crozier's original 2025 reporting, that any particular Crozier claim came from AntifaWatch, or that AntifaWatch influenced the federal designation. The sequence is relevant evidence of an overlapping public research ecosystem, not proof of transmission or causation.</p>
          <div class="investigation-live-update__actions">
            <a href="${EVIDENCE_URL}">Open preserved screenshots and evidence note →</a>
            <a href="https://dailycaller.com/2025/10/16/foreign-tech-group-police-antifa/" target="_blank" rel="noreferrer">Open Crozier's Oct. 16 article ↗</a>
          </div>
        </div>
      </div>`
    chain.insertAdjacentElement('beforebegin', section)
  }

  function addLedgerRow(claim, status, statusClass, basis) {
    const table = document.querySelector('#claim-ledger .ledger-table')
    if (!table || [...table.querySelectorAll('.ledger-row > span:first-child')].some((el) => el.textContent === claim)) return
    const row = document.createElement('div')
    row.className = 'ledger-row'
    row.setAttribute('role', 'row')
    row.innerHTML = `<span>${claim}</span><span><b class="status ${statusClass}">${status}</b></span><span>${basis}</span>`
    table.appendChild(row)
  }

  function updateLedger() {
    addLedgerRow(
      'AntifaWatch publicly identified A/I as shared infrastructure by July 16, 2025.',
      'DOCUMENTED',
      'status-documented',
      'Preserved July 16, 2025 social post.'
    )
    addLedgerRow(
      'Crozier publicly said on Aug. 30, 2026 that he had emailed and DMed AntifaWatch and wanted more A/I research.',
      'DOCUMENTED',
      'status-documented',
      'Preserved public reply from @Hudson_Crozier.'
    )
    addLedgerRow(
      'AntifaWatch supplied Crozier’s original October 2025 A/I reporting.',
      'NOT PROVEN',
      'status-open',
      'The chronology and later contact do not establish source transmission.'
    )
  }

  function updateNavigation() {
    const nav = document.querySelector('.story-nav')
    if (nav && !nav.querySelector(`a[href="#${UPDATE_ID}"]`)) {
      const link = document.createElement('a')
      link.href = `#${UPDATE_ID}`
      link.textContent = 'NEW · Earlier AntifaWatch trail'
      nav.insertBefore(link, nav.querySelector('a[href="#policy-shift"]') || null)
    }

    const updated = document.querySelector('.intro .updated')
    if (updated) updated.textContent = 'Published as an open investigation · Last updated September 8, 2026'
  }

  function updateLog() {
    const list = document.querySelector('#updates .update-list')
    if (!list) return
    const text = 'Added the preserved AntifaWatch/Crozier trail: AntifaWatch was publicly identifying A/I as shared infrastructure by July 2025, and Crozier later said he had emailed and DMed the account seeking more A/I research. The investigation does not treat this as proof that AntifaWatch supplied Crozier’s original reporting.'
    if ([...list.querySelectorAll('p')].some((p) => p.textContent === text)) return
    const item = document.createElement('div')
    item.innerHTML = `<time datetime="2026-09-08">SEP 8 · 2026</time><p>${text}</p>`
    list.prepend(item)
  }

  function addSource() {
    const grid = document.querySelector('#source-library .source-grid')
    if (!grid || grid.querySelector(`a[href="${EVIDENCE_URL}"]`)) return
    const link = document.createElement('a')
    link.href = EVIDENCE_URL
    link.innerHTML = '<span>JUL 2025–AUG 2026</span><strong>AntifaWatch / Crozier preserved social trail</strong><small>Sabot Media preservation record</small>'
    grid.prepend(link)
  }

  function addMissingFileNote() {
    const section = document.getElementById('missing-file')
    if (!section || section.querySelector('[data-antifawatch-note]')) return
    const note = document.createElement('div')
    note.className = 'unknown-card'
    note.dataset.antifawatchNote = '2026-09-08'
    note.innerHTML = `<p class="eyebrow">NEW LEAD · SEPTEMBER 8</p><h3>The earlier AntifaWatch trail widens the source map. It does not close the missing file.</h3><p>The public record now shows A/I's infrastructure role being highlighted by AntifaWatch in July 2025 and Crozier later directly seeking more of that project's A/I research. Records that could establish whether any of this material moved into government channels, or into Crozier's earlier sourcing, remain missing.</p><p><a href="#${UPDATE_ID}">Read the evidence summary ↑</a> · <a href="${EVIDENCE_URL}">Open preservation record →</a></p>`
    const evidence = section.querySelector('.evidence-line')
    if (evidence) evidence.insertAdjacentElement('beforebegin', note)
    else section.appendChild(note)
  }

  function init() {
    makeParallelTrail()
    updateLedger()
    updateNavigation()
    updateLog()
    addSource()
    addMissingFileNote()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true })
  else init()
})()
