(() => {
  const FALLBACK = [
    { id:'pr-ai-state-crozier-2025', publicTitle:'State Department response trail for the October 2025 A/I inquiry', whyItMatters:'This could show how an outside press inquiry about A/I was routed inside State, who reviewed it, and whether it produced any referral or follow-up beyond the published response.', recordsSought:'Incoming and outgoing records concerning Hudson Crozier/DCNF inquiries about Autistici/Inventati, NoBlogs, Rose City Counter-Info, Abolition Media, or related infrastructure, including routing, drafts, clearances, referrals, and follow-up.', agencyName:'U.S. Department of State', agencyComponentName:'Office of Information Programs and Services (A/GIS/IPS)', status:'Filed', dateFiled:'2026-09-05', trackingNumber:'', lastUpdated:'2026-09-05', requestText:'', requestTextPublic:false, documents:[] },
    { id:'pr-ai-state-roundtable-2025', publicTitle:'State follow-up after the October 8 White House Antifa roundtable', whyItMatters:'This could establish whether the White House discussion of foreign terrorist designations generated tasking at State, and when work on later foreign designations actually began.', recordsSought:'Records concerning follow-up, tasking, options, recommendations, or referrals after the October 8, 2025 White House Antifa roundtable involving foreign terrorist or SDGT designations and relevant organizations or infrastructure.', agencyName:'U.S. Department of State', agencyComponentName:'Office of Information Programs and Services (A/GIS/IPS)', status:'Filed', dateFiled:'2026-09-05', trackingNumber:'', lastUpdated:'2026-09-05', requestText:'', requestTextPublic:false, documents:[] },
    { id:'pr-ai-state-crozier-rubio-2025', publicTitle:'Any follow-up after Rubio invited suggestions for additional targets', whyItMatters:'Rubio publicly invited Crozier to suggest additional targets. Records could establish whether any follow-up was submitted and whether A/I, NoBlogs, or related projects were identified.', recordsSought:'Communications and materials following the December 19, 2025 exchange involving Hudson Crozier and Secretary Marco Rubio concerning suggested foreign terrorist designations or targets, including references to A/I or NoBlogs.', agencyName:'U.S. Department of State', agencyComponentName:'Office of Information Programs and Services (A/GIS/IPS)', status:'Filed', dateFiled:'2026-09-05', trackingNumber:'', lastUpdated:'2026-09-05', requestText:'', requestTextPublic:false, documents:[] },
    { id:'pr-ai-ofac-origin', publicTitle:'The earliest record putting A/I into the sanctions pipeline', whyItMatters:'This is the central missing bureaucratic handoff: the first record that identifies A/I as a proposed sanctions target, the originating office, and the basis for opening the targeting file.', recordsSought:'Records sufficient to identify the earliest referral, recommendation, targeting memorandum, case initiation, originating office, and evidentiary basis that proposed Autistici/Inventati for designation under Executive Order 13224.', agencyName:'U.S. Department of the Treasury', agencyComponentName:'Departmental Offices / OFAC records', status:'Filed', dateFiled:'2026-09-05', trackingNumber:'', lastUpdated:'2026-09-05', requestText:'', requestTextPublic:false, documents:[] },
    { id:'pr-ai-dhs-fbi-infrastructure', publicTitle:'FBI infrastructure research and onward referrals involving NoBlogs/A/I', whyItMatters:'Federal investigators encountered NoBlogs-linked infrastructure before the final designation. These records could show whether that investigative knowledge was later referred into the sanctions process.', recordsSought:'Records identifying NoBlogs, Autistici/Inventati, Abolition Media, or Rose City Counter-Info as infrastructure in federal investigations, and any onward referral to State, Treasury/OFAC, DOJ, or other components.', agencyName:'Federal Bureau of Investigation', agencyComponentName:'Record/Information Dissemination Section (RIDS)', status:'Filed', dateFiled:'2026-09-05', trackingNumber:'054e3e0', lastUpdated:'2026-09-05', requestText:'', requestTextPublic:false, documents:[] }
  ]

  const mountBefore = document.getElementById('help-close-gap') || document.getElementById('source-library')
  if (!mountBefore) return

  const desk = document.createElement('section')
  desk.id = 'foia-desk'
  desk.className = 'foia-desk'
  desk.innerHTML = `<div class="wrap"><div class="section-head"><div><p class="eyebrow">PUBLIC RECORDS</p><h2>FOIA Desk</h2></div><p class="section-intro">Sabot is seeking government records related to this investigation. This docket tracks what has been requested, why it matters, how agencies respond, and what records are eventually released.</p></div><div id="foia-desk-content"><p class="foia-desk__empty">Loading the records docket…</p></div></div>`
  mountBefore.insertAdjacentElement('beforebegin', desk)

  const style = document.createElement('link')
  style.rel = 'stylesheet'
  style.href = './foia-desk.css'
  document.head.appendChild(style)

  const updatedLine = document.querySelector('.intro .updated')
  if (updatedLine) updatedLine.textContent = 'Published as an open investigation · Last updated September 5, 2026'

  const updateList = document.querySelector('#updates .update-list')
  if (updateList && !document.getElementById('update-foia-filed-2026-09-05')) {
    const item = document.createElement('div')
    item.id = 'update-foia-filed-2026-09-05'
    item.innerHTML = '<time datetime="2026-09-05">SEP 5 · 2026</time><p><strong>Five federal records requests filed.</strong> Three requests were submitted to the State Department, one to Treasury/OFAC, and one to the FBI seeking the missing referral and targeting records behind the Autistici/Inventati designation.</p>'
    updateList.prepend(item)
  }

  const legacyTracker = document.querySelector('#help-close-gap .foia-tracker')
  if (legacyTracker) {
    const title = legacyTracker.querySelector('h3')
    const note = legacyTracker.querySelector('.tracker-note')
    if (title) title.textContent = 'Requests filed'
    if (note) note.textContent = 'Five federal records requests were filed September 5, 2026. This tracker will update as agencies acknowledge, process, release, deny, or otherwise respond.'
    const rows = Array.from(legacyTracker.querySelectorAll('li'))
    rows.forEach((row, index) => {
      const label = row.querySelector('span')
      const status = row.querySelector('em')
      if (label && index === 4) label.textContent = 'FBI 01'
      if (status) status.textContent = 'Filed'
    })
  }

  fetch('/api/public-records?investigation=autistici-inventati', { headers: { accept:'application/json' } })
    .then(async (r) => { if (!r.ok) throw new Error('docket unavailable'); return r.json() })
    .then((data) => render(data.requests || [], summarize(data.requests || []), false))
    .catch(() => render(FALLBACK, summarize(FALLBACK), true))

  function render(items, summary, fallback) {
    const host = document.getElementById('foia-desk-content')
    host.innerHTML = `
      <p class="foia-desk__lede">The public page is a records ledger, not a filing tool. Sabot files the canonical requests and posts the paper trail here as agencies acknowledge, process, release, deny, or otherwise respond.</p>
      <div class="foia-desk__summary" aria-label="Public records status summary">
        ${stat(summary.filed || 0,'requests filed')}${stat(summary.processing || 0,'processing')}${stat(summary.readyToFile || 0,'ready to file')}${stat(summary.recordsReleased || 0,'with records released')}
      </div>
      ${items.length ? items.map(card).join('') : '<p class="foia-desk__empty">No public requests are listed yet.</p>'}
      <div class="foia-desk__note"><strong>Why exact request text may be hidden before filing:</strong> Sabot may publish the scope while a request is still being drafted, then publish the exact text, tracking number, correspondence, and released records once appropriate. Internal editor notes are never shown here.</div>
      ${fallback ? '<p class="foia-desk__fallback-note">The live database docket is temporarily unavailable, so this page is showing the bundled filing snapshot from September 5, 2026.</p>' : ''}
      <a class="foia-admin-link" href="/records-desk/editor">Editors: open FOIA Desk →</a>`
  }

  function card(r) {
    const agency = [r.agencyName, r.agencyComponentName].filter(Boolean).join(' · ') || 'Agency/component being verified'
    const docs = (r.documents || []).filter(d => d && d.isPublic !== false)
    const requestText = r.requestTextPublic && r.requestText ? `<details><summary>Exact request text</summary><div class="foia-request__body"><div class="foia-request__text">${esc(r.requestText)}</div></div></details>` : ''
    const docBlock = docs.length ? `<details open><summary>Government correspondence & released records (${docs.length})</summary><div class="foia-request__body"><div class="foia-docs">${docs.map(docCard).join('')}</div></div></details>` : ''
    const notes = r.publicNotes ? `<details><summary>What this means for the investigation</summary><div class="foia-request__body"><p>${esc(r.publicNotes)}</p></div></details>` : ''
    return `<article class="foia-request" id="foia-${escAttr(r.id)}"><div class="foia-request__head"><div><p class="eyebrow">${esc(agency)}</p><h3>${esc(r.publicTitle || 'Public-records request')}</h3><p class="foia-request__why">${esc(r.whyItMatters || '')}</p></div><span class="foia-request__status" data-status="${escAttr(r.status || 'Drafting')}">${esc(r.status || 'Drafting')}</span></div><div class="foia-request__meta"><span><strong>Filed:</strong> ${esc(r.dateFiled || 'Not filed yet')}</span><span><strong>Tracking:</strong> ${esc(r.trackingNumber || 'Not assigned')}</span><span><strong>Updated:</strong> ${esc(formatDate(r.lastUpdated))}</span></div><details><summary>Records sought</summary><div class="foia-request__body"><div class="foia-desk__request-scope"><b>Scope</b>${esc(r.recordsSought || 'Scope being prepared.')}</div>${r.dateRange ? `<p><strong>Date range:</strong> ${esc(r.dateRange)}</p>` : ''}${r.preferredFormat ? `<p><strong>Preferred format:</strong> ${esc(r.preferredFormat)}</p>` : ''}</div></details>${requestText}${docBlock}${notes}</article>`
  }
  function docCard(d) { return `<article class="foia-doc"><strong>${esc(d.title || labelKind(d.documentKind))}</strong><small>${esc([labelKind(d.documentKind),d.receivedDate ? formatDate(d.receivedDate) : ''].filter(Boolean).join(' · '))}</small>${d.description?`<p>${esc(d.description)}</p>`:''}${d.whatWeLearned?`<div class="foia-doc__learned"><strong>What we learned</strong>${esc(d.whatWeLearned)}</div>`:''}<a href="${escAttr(d.fileUrl)}" target="_blank" rel="noreferrer">View / download ↗</a></article>` }
  function stat(n,label){return `<div class="foia-stat"><strong>${Number(n)||0}</strong><span>${esc(label)}</span></div>`}
  function summarize(items){const count=(arr)=>items.filter(x=>arr.includes(x.status)).length;return{filed:count(['Filed','Acknowledged','Processing','Clarification requested','Fee issue','Partial release','Records released','Denied','Appealed','Closed']),processing:count(['Acknowledged','Processing','Clarification requested','Fee issue']),readyToFile:count(['Ready to file']),recordsReleased:count(['Partial release','Records released'])}}
  function labelKind(v){return String(v||'record').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
  function formatDate(v){if(!v)return 'Not updated';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function escAttr(v){return esc(v).replace(/`/g,'&#96;')}
})()
