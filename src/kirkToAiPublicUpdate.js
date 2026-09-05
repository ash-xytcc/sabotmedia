const ARTICLE_PATH = '/post/kirk-to-ai'
const UPDATE_ID = 'update-2026-09-05-source-trail'
const BANK_UPDATE_ID = 'update-2026-09-05-banca-etica'
const LEGACY_X_IDS = ['2095927734664847775', '2095928475731325130']

function onTargetArticle() {
  return window.location.pathname.replace(/\/+$/, '') === ARTICLE_PATH
}

function ensureStyles() {
  if (document.getElementById('kirk-to-ai-update-styles')) return
  const style = document.createElement('style')
  style.id = 'kirk-to-ai-update-styles'
  style.textContent = `
    #${UPDATE_ID}, #${BANK_UPDATE_ID} { margin:58px 0 24px; padding:32px 0 8px; border-top:5px solid #a51d20; color:#151310 !important; }
    #${UPDATE_ID} *, #${BANK_UPDATE_ID} * { box-sizing:border-box; }
    #${UPDATE_ID} p, #${UPDATE_ID} li, #${UPDATE_ID} h2, #${UPDATE_ID} h3, #${UPDATE_ID} strong,
    #${BANK_UPDATE_ID} p, #${BANK_UPDATE_ID} li, #${BANK_UPDATE_ID} h2, #${BANK_UPDATE_ID} h3, #${BANK_UPDATE_ID} strong { color:#151310 !important; }
    #${UPDATE_ID} .sabot-update-eyebrow, #${BANK_UPDATE_ID} .sabot-update-eyebrow { margin:0 0 8px; color:#a51d20 !important; font:900 10px/1 Arial,Helvetica,sans-serif; letter-spacing:.1em; text-transform:uppercase; }
    #${UPDATE_ID} h2, #${BANK_UPDATE_ID} h2 { margin:0 0 18px; font:900 clamp(30px,4vw,46px)/.98 Arial,Helvetica,sans-serif; letter-spacing:-.04em; text-transform:uppercase; }
    #${UPDATE_ID} > p, #${BANK_UPDATE_ID} > p { font-size:1.05em; }
    #${UPDATE_ID} .sabot-update-trail { display:grid; gap:14px; margin:26px 0; }
    #${UPDATE_ID} .sabot-update-card, #${BANK_UPDATE_ID} .sabot-update-card { padding:17px 18px; border:1px solid #b8ac99; background:#f5eee1; color:#151310 !important; }
    #${UPDATE_ID} .sabot-update-card time, #${BANK_UPDATE_ID} .sabot-update-card time { display:block; margin-bottom:6px; color:#a51d20 !important; font:900 9px/1 Arial,Helvetica,sans-serif; letter-spacing:.08em; text-transform:uppercase; }
    #${UPDATE_ID} .sabot-update-card h3, #${BANK_UPDATE_ID} .sabot-update-card h3 { margin:0 0 8px; font:900 19px/1.08 Arial,Helvetica,sans-serif; text-transform:uppercase; }
    #${UPDATE_ID} .sabot-update-card p, #${BANK_UPDATE_ID} .sabot-update-card p { margin:0 0 10px; color:#151310 !important; }
    #${UPDATE_ID} a, #${BANK_UPDATE_ID} a { color:#6e1115 !important; font-weight:800; text-underline-offset:3px; }
    #${UPDATE_ID} blockquote.sabot-update-quote, #${BANK_UPDATE_ID} blockquote.sabot-update-quote { margin:15px 0; padding:14px 17px; border-left:6px solid #a51d20; background:#eee3d4; color:#151310 !important; }
    #${UPDATE_ID} blockquote.sabot-update-quote p, #${BANK_UPDATE_ID} blockquote.sabot-update-quote p { margin:0; color:#151310 !important; font:900 18px/1.35 Arial,Helvetica,sans-serif; }
    #${UPDATE_ID} .sabot-update-note, #${BANK_UPDATE_ID} .sabot-update-note { padding:13px 15px; border:1px solid #c99d91; background:#f3dfda; color:#151310 !important; font-size:.9em; }
    #${UPDATE_ID} .sabot-update-actions, #${BANK_UPDATE_ID} .sabot-update-actions { display:flex; flex-wrap:wrap; gap:10px; margin:22px 0 8px; }
    #${UPDATE_ID} .sabot-update-actions a, #${BANK_UPDATE_ID} .sabot-update-actions a { display:inline-block; padding:9px 11px; background:#151310; color:#fff !important; font:900 10px/1.2 Arial,Helvetica,sans-serif; text-transform:uppercase; }
    #${UPDATE_ID} .twitter-tweet { margin:14px 0 !important; }
  `
  document.head.appendChild(style)
}

function loadXWidgets(scope) {
  if (window.twttr?.widgets?.load) {
    window.twttr.widgets.load(scope)
    return
  }
  if (document.querySelector('script[data-sabot-x-widgets]')) return
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://platform.twitter.com/widgets.js'
  script.charset = 'utf-8'
  script.dataset.sabotXWidgets = 'true'
  document.head.appendChild(script)
}

function removeLegacyXEmbeds() {
  const body = document.querySelector('.piece-body-wrap--public-post .piece-body__content')
  if (!body) return
  LEGACY_X_IDS.forEach((id) => {
    body.querySelectorAll(`a[href*="${id}"]`).forEach((anchor) => {
      if (anchor.closest(`#${UPDATE_ID}`) || anchor.closest(`#${BANK_UPDATE_ID}`)) return
      const block = anchor.closest('blockquote.twitter-tweet') || anchor.closest('figure') || anchor.closest('.twitter-tweet')
      if (block) block.remove()
    })
    body.querySelectorAll(`iframe[src*="${id}"]`).forEach((iframe) => {
      if (iframe.closest(`#${UPDATE_ID}`) || iframe.closest(`#${BANK_UPDATE_ID}`)) return
      const wrapper = iframe.closest('.twitter-tweet-rendered') || iframe.parentElement
      if (wrapper && !wrapper.closest(`#${UPDATE_ID}`) && !wrapper.closest(`#${BANK_UPDATE_ID}`)) wrapper.remove()
      else iframe.remove()
    })
  })
}

function buildUpdate() {
  const section = document.createElement('section')
  section.id = UPDATE_ID
  section.setAttribute('aria-labelledby', `${UPDATE_ID}-title`)
  section.innerHTML = `
    <p class="sabot-update-eyebrow">UPDATE · SEPTEMBER 5, 2026</p>
    <h2 id="${UPDATE_ID}-title">The reporting becomes part of the story.</h2>
    <p>Since publication, several people already central to this investigation have begun referencing Sabot's own reporting about Autistici/Inventati. The sequence does not answer the investigation's missing question about who first put A/I into the government's sanctions pipeline. It does add a new, directly observable layer to the public record: our reporting itself is now being used, linked and characterized by people already present in that chronology.</p>

    <div class="sabot-update-trail">
      <article class="sabot-update-card">
        <time datetime="2026-08-28">August 28 · Kyle Shideler / The Federalist</time>
        <h3>A Sabot campaign graphic appears without Sabot being named in the adjacent text.</h3>
        <p>Shideler's Federalist article displays the same “BUILT FOR / TARGETED NOW” Plan R* graphic used in Sabot's campaign material. The article calls it a recent post circulating among “Antifa and anarchist accounts,” then discusses the same “world around it” argument and reproduces the substance of Sabot's sanctions-caution list. The adjacent text does not identify Sabot.</p>
        <p>This establishes source use and sequence. It does not establish where Shideler first encountered the material or why Sabot was not named.</p>
        <p><a href="https://thefederalist.com/2026/08/28/antifa-networks-panic-after-trump-administration-just-sanctioned-their-servers/" target="_blank" rel="noreferrer">Read the Federalist article ↗</a></p>
      </article>

      <article class="sabot-update-card">
        <time datetime="2026-08-30">August 30 · Hudson Crozier / Washington Examiner</time>
        <h3>Crozier explicitly names, links and quotes Sabot.</h3>
        <p>In a later “Surviving sanctions” section, Crozier identifies the NoBlogs website “Sabot Media,” links an archived copy of our reporting and quotes our discussion of A/I's infrastructure resilience and the wider pressure sanctions can place on banks, hosts, registrars, infrastructure providers and supporters.</p>
        <p>On September 5, Sabot also observed a non-subscriber browser rendering of the Examiner article that stopped before this section beside a subscription module, even though the later text remained present in the page source. We are recording that access quirk because it initially made the Sabot reference appear absent, not because it proves any editorial intent.</p>
        <p><a href="https://www.washingtonexaminer.com/news/investigations/4702739/leftist-network-terrorists-plain-sight/" target="_blank" rel="noreferrer">Read the Examiner article ↗</a></p>
      </article>

      <article class="sabot-update-card">
        <time datetime="2026-09-01T16:32:21Z">September 1 · Hudson Crozier on X</time>
        <h3>Crozier links Sabot again.</h3>
        <p>Crozier posted from @Hudson_Crozier at status ID 2094825698288390355. The post was supplied to Sabot as a social post linking the site. X did not return the post body to automated retrieval during preservation, so we are retaining the URL and timestamp without reconstructing text we could not independently fetch.</p>
        <blockquote class="twitter-tweet"><a href="https://x.com/Hudson_Crozier/status/2094825698288390355">View Hudson Crozier's Sept. 1 post on X</a></blockquote>
        <p><a href="https://x.com/Hudson_Crozier/status/2094825698288390355" target="_blank" rel="noreferrer">Open the X post directly ↗</a></p>
      </article>

      <article class="sabot-update-card">
        <time datetime="2026-09-05">September 5 · Kyle Shideler on X</time>
        <h3>Shideler publicly characterizes Sabot as part of an A/I support campaign.</h3>
        <p>In a post preserved contemporaneously by Sabot, Shideler described Sabot Media as a Washington-based anarchist and Antifa collective “leading the media campaign in support of” A/I. His post included images of Sabot graphics.</p>
        <blockquote class="sabot-update-quote"><p>“Sabot media, a Washington based anarchist and Antifa collective which is leading the media campaign in support of specially designated global terrorist A/I collective, blames @MrAndyNgo and myself for the tech collective's current woes.”</p></blockquote>
        <blockquote class="twitter-tweet"><a href="https://x.com/ShidelerK/status/2095927734664847775">View Kyle Shideler's Sept. 5 post on X</a></blockquote>
        <p><a href="https://x.com/ShidelerK/status/2095927734664847775" target="_blank" rel="noreferrer">Open the X post directly ↗</a></p>
      </article>

      <article class="sabot-update-card">
        <time datetime="2026-09-05">September 5 · Andy Ngo on X</time>
        <h3>Ngo alleges Sabot is “providing support” to A/I and tags State.</h3>
        <p>Ngo quote-posted Shideler, tagged the U.S. State Department and accused Sabot Media of “providing support” to A/I, calling Sabot A/I's “U.S. propaganda wing.” Sabot disputes those characterizations.</p>
        <blockquote class="sabot-update-quote"><p>“.@StateDept, here is a U.S.-based group providing support to banned international terrorist entity A/I. Sabot media is functioning as A/I's U.S. propaganda wing.”</p></blockquote>
        <blockquote class="twitter-tweet"><a href="https://x.com/MrAndyNgo/status/2095928475731325130">View Andy Ngo's Sept. 5 post on X</a></blockquote>
        <p><a href="https://x.com/MrAndyNgo/status/2095928475731325130" target="_blank" rel="noreferrer">Open the X post directly ↗</a></p>
      </article>
    </div>

    <p>The progression is now public and documentable: first Sabot material appears in or is quoted by reporting from people already in this investigation; then Sabot itself is publicly characterized as an actor in the A/I controversy; then Ngo directs an allegation about Sabot toward an executive agency.</p>
    <p class="sabot-update-note"><strong>What this does not establish:</strong> none of these publications or posts, by themselves, proves coordination among Crozier, Shideler and Ngo. Ngo tagging the State Department is not evidence that State, Treasury, DOJ, DHS, FBI or another agency has opened an inquiry or taken action against Sabot Media.</p>
    <div class="sabot-update-actions">
      <a href="/investigations/autistici-inventati/log/">Open the public evidence log →</a>
      <a href="/investigations/autistici-inventati/#update-2026-09-05-ngo-state">Open the living investigation →</a>
    </div>
  `
  return section
}

function buildBankUpdate() {
  const section = document.createElement('section')
  section.id = BANK_UPDATE_ID
  section.setAttribute('aria-labelledby', `${BANK_UPDATE_ID}-title`)
  section.innerHTML = `
    <p class="sabot-update-eyebrow">NEW DEVELOPMENT · SEPTEMBER 5, 2026</p>
    <h2 id="${BANK_UPDATE_ID}-title">The banking cascade becomes concrete.</h2>
    <p>Autistici/Inventati says Banca Etica told the association in a September 4 video call that the bank will unilaterally terminate the account and that money still in it, including donations from individuals, organizations and collectives, will no longer be available to A/I.</p>
    <div class="sabot-update-card">
      <time datetime="2026-09-05">September 5 · Autistici/Inventati press release</time>
      <h3>From probable closure to a reported termination decision.</h3>
      <p>This is a material escalation from the bank's own earlier public position. Banca Etica had said the account was temporarily suspended while it sought a way to avoid closure, although it warned closure was probable. A/I now says the September 4 meeting ended with a decision to terminate the relationship and leave the remaining funds unavailable to the association.</p>
      <p>A/I says the loss of access prevents it from meeting administrative obligations, paying service providers and continuing services as expected, and says the association intends to pursue legal remedies to challenge the decision and regain access to donated funds.</p>
      <p><a href="https://keepitfree.ai/announcements/banca-etica-shtus-down-a/i-funds/" target="_blank" rel="noreferrer">Read A/I's Sept. 5 press release ↗</a></p>
      <p><a href="https://www.bancaetica.it/area-stampa/autistici-inventati-banca-etica-condanna-uso-improprio-ofac-valutazioni-per-non-chiudere-il-conto/" target="_blank" rel="noreferrer">Read Banca Etica's earlier statement ↗</a></p>
    </div>
    <p>This is exactly the kind of downstream effect the sanctions story has been about: no physical server seizure is required if registries, payment systems and banks make ordinary operation impossible. The financial pressure has now moved, according to A/I, from warning and suspension to termination and loss of access to operating funds.</p>
    <p class="sabot-update-note"><strong>Source-status note:</strong> the Sept. 5 termination account is A/I's public statement about what Banca Etica told it. As of this update, the bank's public statement available to Sabot still describes temporary suspension, efforts to avoid closure and the risk of a later shutdown; it does not yet contain this Sept. 4 meeting outcome.</p>
    <div class="sabot-update-actions">
      <a href="/investigations/autistici-inventati/#update-2026-09-05-banca-etica">See the living investigation →</a>
      <a href="/investigations/autistici-inventati/log/#2026-09-05-banca-etica">Open the public evidence log →</a>
    </div>
  `
  return section
}

function mount() {
  if (!onTargetArticle()) return false
  const body = document.querySelector('.piece-body-wrap--public-post .piece-body__content')
  if (!body) return false
  ensureStyles()
  removeLegacyXEmbeds()

  let sourceUpdate = document.getElementById(UPDATE_ID)
  if (!sourceUpdate) {
    sourceUpdate = buildUpdate()
    body.appendChild(sourceUpdate)
    loadXWidgets(sourceUpdate)
  }

  if (!document.getElementById(BANK_UPDATE_ID)) body.appendChild(buildBankUpdate())
  removeLegacyXEmbeds()
  return true
}

let lastPath = window.location.pathname
const observer = new MutationObserver(() => {
  if (window.location.pathname !== lastPath) lastPath = window.location.pathname
  mount()
})

function boot() {
  mount()
  observer.observe(document.documentElement, { childList:true, subtree:true })
  window.addEventListener('popstate', mount)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true })
else boot()
