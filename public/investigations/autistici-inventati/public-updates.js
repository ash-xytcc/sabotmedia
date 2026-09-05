(() => {
  const UPDATE_ID = 'update-2026-09-05-ngo-state'
  const BANK_UPDATE_ID = 'update-2026-09-05-banca-etica'

  function makeBankUpdate() {
    if (document.getElementById(BANK_UPDATE_ID)) return
    const quickRead = document.querySelector('.quick-read')
    if (!quickRead) return

    const section = document.createElement('section')
    section.className = 'investigation-live-update'
    section.id = BANK_UPDATE_ID
    section.setAttribute('aria-labelledby', `${BANK_UPDATE_ID}-title`)
    section.innerHTML = `
      <div class="wrap investigation-live-update__grid">
        <div>
          <p class="eyebrow">NEW DEVELOPMENT · SEPTEMBER 5, 2026</p>
          <h2 id="${BANK_UPDATE_ID}-title">A/I says Banca Etica will close the account and make donated funds unavailable.</h2>
        </div>
        <div class="investigation-live-update__copy">
          <p>Autistici/Inventati says Banca Etica told the AI ODV association during a September 4 video call that the bank will unilaterally terminate its account and that funds still in the account, including donations from individuals, organizations and collectives, will no longer be available to the association.</p>
          <p>This is a significant escalation from Banca Etica's earlier public statement. The bank had said it temporarily suspended the account, was consulting banking associations and Italy's economy ministry, and was trying to determine whether it could avoid closure while warning that closure was probable. A/I now says that process has ended in a termination decision.</p>
          <p>A/I says the loss of access prevents it from meeting administrative obligations, paying service providers and delivering services, and that the association intends to pursue legal action to challenge the decision and regain access to donated funds.</p>
          <p>This sharpens the investigation's “cascade” finding. The U.S. action did not have to contain an instruction to physically seize A/I's servers. According to the public record, registry, payment and banking chokepoints have each transmitted the sanctions pressure into practical disruption.</p>
          <p class="investigation-live-update__note"><strong>Source-status note:</strong> the Sept. 5 termination account is A/I's public statement about the Sept. 4 meeting. The latest Banca Etica statement available to Sabot still describes temporary suspension, efforts to avoid closure and the possibility of later closure; it does not yet describe the Sept. 4 meeting outcome.</p>
          <div class="investigation-live-update__actions">
            <a href="https://keepitfree.ai/announcements/banca-etica-shtus-down-a/i-funds/" target="_blank" rel="noreferrer">Read A/I's Sept. 5 release ↗</a>
            <a href="https://www.bancaetica.it/area-stampa/autistici-inventati-banca-etica-condanna-uso-improprio-ofac-valutazioni-per-non-chiudere-il-conto/" target="_blank" rel="noreferrer">Read Banca Etica's earlier statement ↗</a>
            <a href="./log/#2026-09-05-banca-etica">Open preservation record →</a>
          </div>
        </div>
      </div>`
    quickRead.insertAdjacentElement('beforebegin', section)
  }

  function makeTrail() {
    if (document.getElementById(UPDATE_ID)) return
    const quickRead = document.querySelector('.quick-read')
    if (!quickRead) return

    const section = document.createElement('section')
    section.className = 'investigation-live-update'
    section.id = UPDATE_ID
    section.setAttribute('aria-labelledby', `${UPDATE_ID}-title`)
    section.innerHTML = `
      <div class="wrap investigation-live-update__grid">
        <div>
          <p class="eyebrow">POST-PUBLICATION TRAIL · AUG. 28–SEPT. 5, 2026</p>
          <h2 id="${UPDATE_ID}-title">They were already reading Sabot. Then they named it and tagged State.</h2>
        </div>
        <div class="investigation-live-update__copy">
          <p>The public trail now reaches back before the Sept. 5 posts. Kyle Shideler and Hudson Crozier were already using, quoting or linking Sabot's A/I reporting before Shideler and Andy Ngo publicly characterized Sabot itself as part of an A/I support campaign.</p>
          <div class="investigation-source-trail" aria-label="Post-publication source trail involving Sabot Media">
            <article>
              <time>AUGUST 28 · KYLE SHIDELER / THE FEDERALIST</time>
              <h3>A Sabot campaign graphic appears without Sabot being named in the adjacent text.</h3>
              <p>Shideler's Federalist article displays the same “BUILT FOR / TARGETED NOW” Plan R* graphic used in Sabot's A/I campaign material. The article calls it a recent post circulating among “Antifa and anarchist accounts,” then discusses the same “world around it” argument and reproduces the substance of Sabot's sanctions-caution list. The adjacent text does not identify Sabot.</p>
              <p>The limited claim here is source use and sequence. It does not establish where Shideler first encountered the material or why Sabot was not named.</p>
              <a href="https://thefederalist.com/2026/08/28/antifa-networks-panic-after-trump-administration-just-sanctioned-their-servers/" target="_blank" rel="noreferrer">Open Federalist article ↗</a>
            </article>
            <article>
              <time>AUGUST 30 · HUDSON CROZIER / WASHINGTON EXAMINER</time>
              <h3>Crozier explicitly names, links and quotes Sabot.</h3>
              <p>In the Examiner's “Surviving sanctions” section, Crozier identifies the NoBlogs website “Sabot Media,” links an archived copy of Sabot's reporting and quotes its discussion of A/I's infrastructure resilience and the pressure sanctions can place on banks, hosts, registrars, infrastructure providers and supporters.</p>
              <p><strong>Source-access note:</strong> on Sept. 5, Sabot observed a non-subscriber browser rendering of the same URL ending before this later section beside a subscription module, while the later text remained present in the page source. We record the access discrepancy without inferring editorial intent.</p>
              <a href="https://www.washingtonexaminer.com/news/investigations/4702739/leftist-network-terrorists-plain-sight/" target="_blank" rel="noreferrer">Open Examiner article ↗</a>
            </article>
            <article>
              <time>SEPTEMBER 1 · HUDSON CROZIER / X</time>
              <h3>Crozier links Sabot again on X.</h3>
              <p>Crozier posted from @Hudson_Crozier at status ID 2094825698288390355. The post was supplied to Sabot as a social post linking the site. X did not return the post body to automated retrieval during preservation, so the public record retains the URL and timestamp without reconstructing text we could not independently fetch.</p>
              <a href="https://x.com/Hudson_Crozier/status/2094825698288390355" target="_blank" rel="noreferrer">Open Crozier post on X ↗</a>
            </article>
            <article>
              <time>SEPTEMBER 5 · KYLE SHIDELER / X</time>
              <h3>Shideler publicly characterizes Sabot as part of an A/I support campaign.</h3>
              <p>In a post preserved contemporaneously by Sabot, Shideler described Sabot Media as a Washington-based anarchist and Antifa collective “leading the media campaign in support of” A/I. The post included images of Sabot graphics.</p>
              <blockquote><p>“Sabot media, a Washington based anarchist and Antifa collective which is leading the media campaign in support of specially designated global terrorist A/I collective, blames @MrAndyNgo and myself for the tech collective's current woes.”</p></blockquote>
              <a href="https://x.com/ShidelerK/status/2095927734664847775" target="_blank" rel="noreferrer">Open Shideler post on X ↗</a>
            </article>
            <article>
              <time>SEPTEMBER 5 · ANDY NGO / X</time>
              <h3>Ngo alleges Sabot is “providing support” to A/I and tags State.</h3>
              <p>Ngo quote-posted Shideler, tagged the U.S. State Department and accused Sabot Media of “providing support” to A/I, calling Sabot A/I's “U.S. propaganda wing.” Sabot disputes those characterizations.</p>
              <blockquote><p>“.@StateDept, here is a U.S.-based group providing support to banned international terrorist entity A/I. Sabot media is functioning as A/I's U.S. propaganda wing.”</p></blockquote>
              <a href="https://x.com/MrAndyNgo/status/2095928475731325130" target="_blank" rel="noreferrer">Open Ngo post on X ↗</a>
            </article>
          </div>
          <p>This progression is directly observable: Sabot material appears in or is quoted by reporting from people already in this investigation; Sabot itself is then publicly characterized as an actor in the A/I controversy; and Ngo directs an allegation about Sabot toward an executive agency.</p>
          <p class="investigation-live-update__note"><strong>What this does not establish:</strong> none of these publications or posts, by themselves, proves coordination among Crozier, Shideler and Ngo. Ngo tagging the State Department is not evidence that State, Treasury, DOJ, DHS, FBI or another agency opened an inquiry or took action against Sabot Media.</p>
          <div class="investigation-live-update__actions">
            <a href="./log/">Open public evidence log →</a>
            <a href="/post/kirk-to-ai#update-2026-09-05-source-trail">Read the article update →</a>
            <a href="#source-library">Go to source library ↓</a>
          </div>
        </div>
      </div>`
    quickRead.insertAdjacentElement('beforebegin', section)
  }

  function updatePageMeta() {
    const updated = document.querySelector('.intro .updated')
    if (updated) updated.textContent = 'Published as an open investigation · Last updated September 5, 2026'

    const nav = document.querySelector('.story-nav')
    if (nav && !nav.querySelector(`a[href="#${BANK_UPDATE_ID}"]`)) {
      const link = document.createElement('a')
      link.href = `#${BANK_UPDATE_ID}`
      link.textContent = 'NEW · Banca Etica termination'
      nav.insertBefore(link, nav.querySelector('a') || null)
    }
    if (nav && !nav.querySelector(`a[href="#${UPDATE_ID}"]`)) {
      const link = document.createElement('a')
      link.href = `#${UPDATE_ID}`
      link.textContent = 'NEW · Sabot enters the source trail'
      nav.insertBefore(link, nav.querySelector('a') || null)
    }

    const topNav = document.querySelector('.site-bar nav')
    if (topNav && !topNav.querySelector('a[href="./log/"]')) {
      const log = document.createElement('a')
      log.href = './log/'
      log.textContent = 'Evidence log'
      topNav.insertBefore(log, topNav.querySelector('a[href="#help-close-gap"]') || null)
    }
  }

  function addSource(href, date, title, source) {
    const grid = document.querySelector('#source-library .source-grid')
    if (!grid || grid.querySelector(`a[href="${href}"]`)) return
    const link = document.createElement('a')
    link.href = href
    if (/^https?:/i.test(href)) {
      link.target = '_blank'
      link.rel = 'noreferrer'
    }
    link.innerHTML = `<span>${date}</span><strong>${title}</strong><small>${source}</small>`
    grid.appendChild(link)
  }

  function addSources() {
    addSource('https://keepitfree.ai/announcements/banca-etica-shtus-down-a/i-funds/', 'SEP 5 · 2026', 'A/I says Banca Etica will terminate account and funds are unavailable', 'Autistici/Inventati')
    addSource('https://www.bancaetica.it/area-stampa/autistici-inventati-banca-etica-condanna-uso-improprio-ofac-valutazioni-per-non-chiudere-il-conto/', 'AUG 28–SEP 1 · 2026', 'Banca Etica statement on suspension and closure risk', 'Banca Etica')
    addSource('https://thefederalist.com/2026/08/28/antifa-networks-panic-after-trump-administration-just-sanctioned-their-servers/', 'AUG 28 · 2026', 'Shideler uses Sabot campaign material', 'The Federalist')
    addSource('https://www.washingtonexaminer.com/news/investigations/4702739/leftist-network-terrorists-plain-sight/', 'AUG 30 · 2026', 'Crozier names, links and quotes Sabot', 'Washington Examiner')
    addSource('https://x.com/Hudson_Crozier/status/2094825698288390355', 'SEP 1 · 2026', 'Crozier links Sabot on X', 'X / @Hudson_Crozier')
    addSource('https://x.com/ShidelerK/status/2095927734664847775', 'SEP 5 · 2026', 'Shideler post about Sabot', 'X / @ShidelerK')
    addSource('https://x.com/MrAndyNgo/status/2095928475731325130', 'SEP 5 · 2026', 'Ngo tags State and alleges Sabot support', 'X / @MrAndyNgo')
    addSource('./log/', 'SEP 5 · 2026', 'Public evidence and preservation log', 'Sabot Media')
  }

  function addLogItem(text) {
    const list = document.querySelector('#updates .update-list')
    if (!list || [...list.querySelectorAll('p')].some((p) => p.textContent === text)) return
    const item = document.createElement('div')
    item.innerHTML = `<time datetime="2026-09-05">SEP 5 · 2026</time><p>${text}</p>`
    list.prepend(item)
  }

  function addUpdateLog() {
    addLogItem('A/I reported that Banca Etica told the association on Sept. 4 it will terminate the account and that remaining donated funds will no longer be available, escalating the banking leg of the sanctions cascade from suspension and probable closure to a reported termination decision.')
    addLogItem('Published a public evidence log so preservation records, source links and social-media developments are accessible and shareable from the investigation itself.')
    addLogItem('Added the Aug. 28–Sept. 5 post-publication source trail: Shideler’s use of matching Sabot campaign material, Crozier’s Examiner attribution and X link, Shideler’s Sept. 5 post, and Ngo’s State Department tag and support allegation.')
    addLogItem('Recorded the Washington Examiner source-access discrepancy observed Sept. 5: a non-subscriber rendered view stopped before the Sabot section while the later text remained present in page source.')
    addLogItem('Preserved the Sept. 5 Ngo/Shideler post relationship with an explicit guardrail: a public tag to State is not evidence that any agency opened an inquiry or took action against Sabot.')
    addLogItem('Restored the full-width highlighted PDF reader runtime for the investigation document gallery.')
  }

  function init() {
    makeBankUpdate()
    makeTrail()
    updatePageMeta()
    addSources()
    addUpdateLog()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true })
  else init()
})()
