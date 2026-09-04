import './ai-investigation-primer.css'

const CAMPAIGN_PATH = '/campaigns/autistici-inventati'
const ENTRY_ID = 'ai-investigation-entry'

function isCampaignPage() {
  return window.location.pathname.replace(/\/+$/, '') === CAMPAIGN_PATH
}

function ensureInvestigationEntry() {
  if (!isCampaignPage()) {
    document.getElementById(ENTRY_ID)?.remove()
    return false
  }

  const reporting = document.getElementById('reporting')
  const shell = reporting?.querySelector('.campaign-shell')
  if (!shell) return false
  if (document.getElementById(ENTRY_ID)) return true

  const card = document.createElement('article')
  card.id = ENTRY_ID
  card.className = 'ai-investigation-entry'
  card.innerHTML = `
    <div>
      <span>ONGOING INVESTIGATION</span>
      <h3>The Missing File: How A/I Became a U.S. Counterterrorism Target</h3>
      <p>A separate Sabot investigation reconstructs the policy, media, congressional and sanctions trail that preceded the August 26 designation, with dossiers, primary documents, a claim ledger and the unresolved internal referral we are pursuing through public records requests.</p>
    </div>
    <a href="/investigations/autistici-inventati/">Open the investigation →</a>`

  const heading = shell.querySelector('.campaign-section-heading')
  if (heading) heading.insertAdjacentElement('afterend', card)
  else shell.prepend(card)
  return true
}

let queued = false
function schedule() {
  if (queued) return
  queued = true
  window.requestAnimationFrame(() => {
    queued = false
    ensureInvestigationEntry()
  })
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver((records) => {
    const onlyEntryMutation = records.length > 0 && records.every((record) =>
      [...record.addedNodes, ...record.removedNodes].every((node) =>
        node.nodeType !== 1 || node.id === ENTRY_ID || node.closest?.(`#${ENTRY_ID}`)
      )
    )
    if (!onlyEntryMutation) schedule()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('pageshow', schedule)
  window.addEventListener('popstate', schedule)
  document.addEventListener('click', () => window.setTimeout(schedule, 0), true)
  ;[0, 100, 300, 800, 1600].forEach((delay) => window.setTimeout(schedule, delay))
}
