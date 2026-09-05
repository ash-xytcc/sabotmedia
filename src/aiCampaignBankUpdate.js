const CAMPAIGN_PATH = '/campaigns/autistici-inventati'
const UPDATE_ID = 'ai-bank-update-2026-09-05'
const SOURCE_URL = 'https://keepitfree.ai/announcements/banca-etica-shtus-down-a/i-funds/'
const BANK_URL = 'https://www.bancaetica.it/area-stampa/autistici-inventati-banca-etica-condanna-uso-improprio-ofac-valutazioni-per-non-chiudere-il-conto/'

function onCampaign() {
  return window.location.pathname.replace(/\/+$/, '') === CAMPAIGN_PATH
}

function ensureStyles() {
  if (document.getElementById('ai-bank-update-styles')) return
  const style = document.createElement('style')
  style.id = 'ai-bank-update-styles'
  style.textContent = `
    #${UPDATE_ID} { border-top:5px solid #a51d20; border-bottom:1px solid rgba(21,19,16,.2); background:#f4eddf; color:#151310; }
    #${UPDATE_ID} .campaign-latest__inner { align-items:flex-start; }
    #${UPDATE_ID} span, #${UPDATE_ID} time { color:#a51d20 !important; }
    #${UPDATE_ID} strong, #${UPDATE_ID} p { color:#151310 !important; }
    #${UPDATE_ID} strong { font-size:clamp(22px,3vw,34px); line-height:1.02; }
    #${UPDATE_ID} .ai-bank-actions { display:flex; flex-wrap:wrap; gap:10px; }
    #${UPDATE_ID} .ai-bank-actions a { display:inline-block; padding:9px 11px; background:#151310; color:#fff !important; font-weight:900; text-transform:uppercase; font-size:10px; }
    .ai-bank-campaign-record { margin:14px 0; padding:16px 18px; border:1px solid rgba(21,19,16,.25); border-left:5px solid #a51d20; background:#f5eee1; color:#151310; }
    .ai-bank-campaign-record h3, .ai-bank-campaign-record p, .ai-bank-campaign-record strong { color:#151310 !important; }
    .ai-bank-campaign-record a { color:#6e1115 !important; font-weight:800; }
  `
  document.head.appendChild(style)
}

function addLatest(main) {
  if (document.getElementById(UPDATE_ID)) return
  const existingLatest = main.querySelector('.campaign-latest')
  const nav = main.querySelector('.campaign-local-nav')
  const section = document.createElement('section')
  section.className = 'campaign-latest'
  section.id = UPDATE_ID
  section.innerHTML = `
    <div class="campaign-shell campaign-latest__inner">
      <span>NEW DEVELOPMENT</span>
      <time datetime="2026-09-05">SEPTEMBER 5, 2026</time>
      <strong>A/I says Banca Etica will terminate its account and remaining donated funds will be unavailable.</strong>
      <p>Autistici/Inventati says Banca Etica told the AI ODV association on Sept. 4 that it will unilaterally terminate the account and that money still in it, including donations, will no longer be available to the association. A/I says this prevents it from paying service providers and meeting administrative obligations, and says it will challenge the decision legally.</p>
      <p>The bank's earlier public statement described a temporary suspension and efforts to avoid closure while warning closure was probable. The Sept. 5 A/I release reports that the situation has now escalated to a termination decision.</p>
      <div class="ai-bank-actions"><a href="${SOURCE_URL}" target="_blank" rel="noreferrer">Read A/I release ↗</a><a href="/investigations/autistici-inventati/#update-2026-09-05-banca-etica">Investigation update →</a></div>
    </div>`
  if (existingLatest) existingLatest.insertAdjacentElement('beforebegin', section)
  else if (nav) nav.insertAdjacentElement('afterend', section)
}

function addUpdate(main) {
  const list = main.querySelector('#updates .campaign-update-list')
  if (!list || list.querySelector('[data-ai-bank-record="update"]')) return
  const article = document.createElement('article')
  article.className = 'campaign-update is-pinned'
  article.dataset.aiBankRecord = 'update'
  article.innerHTML = `<div class="campaign-update__date"><time datetime="2026-09-05">SEP 5, 2026</time><span>PINNED</span></div><div><h3>Banca Etica termination reported</h3><p>A/I says Banca Etica informed it on Sept. 4 that the bank will terminate the account and make the remaining funds unavailable. A/I says it will pursue legal remedies and that the loss of access interferes with paying providers and continuing services.</p><a href="${SOURCE_URL}" target="_blank" rel="noreferrer">Source / more ↗</a></div>`
  list.prepend(article)
}

function addTimeline(main) {
  const timeline = main.querySelector('#timeline .campaign-timeline')
  if (!timeline || timeline.querySelector('[data-ai-bank-record="timeline"]')) return
  const article = document.createElement('article')
  article.dataset.aiBankRecord = 'timeline'
  article.innerHTML = `<time>SEP 5, 2026</time><div><h3>A/I says Banca Etica will terminate the account</h3><p>The collective says a Sept. 4 meeting ended with the bank announcing unilateral termination and loss of access to remaining funds, escalating the financial consequences of the designation.</p></div>`
  const deadline = [...timeline.querySelectorAll('article')].find((item) => /SEP 25|September 25/i.test(item.textContent || ''))
  if (deadline) deadline.insertAdjacentElement('beforebegin', article)
  else timeline.appendChild(article)
}

function addSource(main) {
  const shell = main.querySelector('#sources .campaign-shell')
  if (!shell || shell.querySelector('[data-ai-bank-record="source"]')) return
  const article = document.createElement('article')
  article.className = 'ai-bank-campaign-record'
  article.dataset.aiBankRecord = 'source'
  article.innerHTML = `<h3>Sept. 5 A/I press release: Banca Etica account termination</h3><p>Primary-source statement from Autistici/Inventati reporting the outcome of its Sept. 4 meeting with Banca Etica, alongside the bank's earlier public statement describing suspension and efforts to avoid closure.</p><p><a href="${SOURCE_URL}" target="_blank" rel="noreferrer">A/I press release ↗</a> · <a href="${BANK_URL}" target="_blank" rel="noreferrer">Banca Etica earlier statement ↗</a></p>`
  shell.appendChild(article)
}

function mount() {
  if (!onCampaign()) return false
  const main = document.querySelector('main[data-campaign="autistici-inventati"]')
  if (!main) return false
  ensureStyles()
  addLatest(main)
  addUpdate(main)
  addTimeline(main)
  addSource(main)
  return true
}

const observer = new MutationObserver(mount)
function boot() {
  mount()
  observer.observe(document.documentElement, { childList:true, subtree:true })
  window.addEventListener('popstate', mount)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true })
else boot()
