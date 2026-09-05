(() => {
  const UPDATE_ID = 'update-2026-09-05-ngo-state'
  const BANK_UPDATE_ID = 'update-2026-09-05-banca-etica'
  const EUROPE_UPDATE_ID = 'update-2026-09-05-european-response'

  function installUpdateStyles() {
    if (document.getElementById('investigation-public-update-styles')) return
    const style = document.createElement('style')
    style.id = 'investigation-public-update-styles'
    style.textContent = `
      #${UPDATE_ID} .eyebrow {
        margin-bottom: 16px;
        font-size: clamp(16px, 1.6vw, 22px);
        line-height: 1.05;
        letter-spacing: .09em;
      }

      .full-report-card--with-image {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr);
        gap: 8px 34px;
        align-items: center;
        overflow: hidden;
      }
      .full-report-card--with-image > :not(.full-report-feature__image) {
        grid-column: 1;
      }
      .full-report-card--with-image #full-report-title {
        margin: 0 0 8px;
        font: 900 clamp(30px, 4vw, 50px)/.95 Arial, Helvetica, sans-serif;
        letter-spacing: -.035em;
        text-transform: uppercase;
      }
      .full-report-feature__image {
        grid-column: 2;
        grid-row: 1 / span 4;
        display: block;
        align-self: stretch;
        min-height: 230px;
        max-height: 320px;
        overflow: hidden;
        border: 1px solid #5d5145;
        background: #28231e;
      }
      .full-report-feature__image img {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 230px;
        object-fit: cover;
        transition: transform .2s ease, filter .2s ease;
      }
      .full-report-feature__image:hover img,
      .full-report-feature__image:focus-visible img {
        transform: scale(1.02);
        filter: contrast(1.04);
      }

      @media (max-width: 760px) {
        .full-report-card--with-image {
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .full-report-card--with-image > :not(.full-report-feature__image),
        .full-report-feature__image {
          grid-column: 1;
        }
        .full-report-feature__image {
          grid-row: auto;
          min-height: 210px;
          max-height: none;
        }
        .full-report-feature__image img { min-height: 210px; }
      }
    `
    document.head.appendChild(style)
  }

  function promoteFullReport() {
    const intro = document.querySelector('.intro')
    const fullReport = document.getElementById('full-report-title')?.closest('section')
    if (!intro || !fullReport) return
    intro.insertAdjacentElement('afterend', fullReport)
  }

  async function resolveFullReportImage() {
    try {
      const response = await fetch('/api/native-content?includeFuture=1', {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      })
      if (response.ok) {
        const data = await response.json()
        const article = Array.isArray(data?.items)
          ? data.items.find((item) => String(item?.slug || '') === 'kirk-to-ai')
          : null
        const src = article?.featuredImage || article?.heroImage || article?.imageUrl || article?.image || ''
        if (src) {
          return {
            src,
            alt: article?.featuredImageAlt || article?.title || 'From Kirk to A/I',
          }
        }
      }
    } catch {
      // Try the WordPress compatibility feed below.
    }

    try {
      const response = await fetch('/wp-json/wp/v2/posts?slug=kirk-to-ai&_embed=1', {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      })
      if (!response.ok) return null
      const posts = await response.json()
      const post = Array.isArray(posts) ? posts[0] : null
      const media = post?._embedded?.['wp:featuredmedia']?.[0]
      const src = media?.source_url ||
        media?.media_details?.sizes?.large?.source_url ||
        media?.media_details?.sizes?.medium_large?.source_url ||
        media?.media_details?.sizes?.full?.source_url ||
        ''
      if (!src) return null
      return {
        src,
        alt: media?.alt_text || post?.title?.rendered || 'From Kirk to A/I',
      }
    } catch {
      return null
    }
  }

  async function addFullReportImage() {
    const title = document.getElementById('full-report-title')
    const card = title?.closest('.unknown-card')
    if (!card || card.querySelector('.full-report-feature__image')) return

    const image = await resolveFullReportImage()
    if (!image?.src) return

    const link = document.createElement('a')
    link.className = 'full-report-feature__image'
    link.href = '/post/kirk-to-ai'
    link.setAttribute('aria-label', 'Read From Kirk to A/I')

    const img = document.createElement('img')
    img.src = image.src
    img.alt = image.alt
    img.loading = 'eager'
    img.decoding = 'async'
    img.addEventListener('error', () => {
      link.remove()
      card.classList.remove('full-report-card--with-image')
    }, { once: true })

    link.appendChild(img)
    card.appendChild(link)
    card.classList.add('full-report-card--with-image')
  }

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
    const updates = document.getElementById('updates')
    if (!updates) return

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
              <a href="/post/washington-examiner-on-sabot-media-and-a-i">Open Sabot preservation copy →</a>
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
    updates.insertAdjacentElement('beforebegin', section)
  }

  function makeEuropeanResponse() {
    if (document.getElementById(EUROPE_UPDATE_ID)) return
    const updates = document.getElementById('updates')
    if (!updates) return

    const section = document.createElement('section')
    section.className = 'investigation-live-update'
    section.id = EUROPE_UPDATE_ID
    section.setAttribute('aria-labelledby', `${EUROPE_UPDATE_ID}-title`)
    section.innerHTML = `
      <div class="wrap investigation-live-update__grid">
        <div>
          <p class="eyebrow">EUROPEAN RESPONSE · SEPTEMBER 1–5, 2026</p>
          <h2 id="${EUROPE_UPDATE_ID}-title">The designation enters the European Parliament—and organized opposition widens.</h2>
        </div>
        <div class="investigation-live-update__copy">
          <h3>Twenty-one ECR lawmakers put A/I into the European Parliament's formal record.</h3>
          <p>On September 1, 21 members of the European Conservatives and Reformists group filed priority written question P-003407/2026, titled “Paolo De Rosa's links with the Autistici/Inventati hacker group and Italy's Democratic Party.” The filing asks the European Commission to respond, carrying the political campaign around A/I and a named person associated with its infrastructure into a formal EU parliamentary process.</p>
          <p class="investigation-live-update__note"><strong>What the filing proves—and what it does not:</strong> the question is an official parliamentary action by its signatories. It is not a finding by the European Parliament, an investigation result, or an endorsement of the question's framing by the European Commission. No Commission answer was posted when Sabot checked the record on September 5.</p>
          <h3>Academics and cultural workers answer the guilt-by-association campaign.</h3>
          <p>On September 5, more than 70 academics, researchers, writers and cultural workers published an appeal calling on Italy and the European Union to prevent a unilateral U.S. executive designation from automatically restricting the communications, digital services and financial relationships of an organization operating lawfully in Europe.</p>
          <p>The appeal explicitly connects the designation to the campaign against Paolo De Rosa and warns that proximity to independent digital infrastructure is being turned into insinuations of complicity, subversion or terrorism. It follows European Digital Rights' September 3 statement describing the action against A/I as an attack on independent infrastructure, EU intermediary-liability rules and European democratic sovereignty.</p>
          <p>Together, the filings show two competing attempts to define the European meaning of the U.S. action: one extends suspicion from A/I to people and political relationships around it; the other rejects treating an American administrative designation as though it were already an Italian or European judicial determination.</p>
          <div class="investigation-live-update__actions">
            <a href="https://www.europarl.europa.eu/doceo/document/P-10-2026-003407_EN.html" target="_blank" rel="noreferrer">Open Parliament question P-003407/2026 ↗</a>
            <a href="https://www.che-fare.com/articoli/lantifascismo-non-e-terrorismo" target="_blank" rel="noreferrer">Read the Sept. 5 appeal and signatories ↗</a>
            <a href="https://edri.org/our-work/edri-solidarity-statement-autistici-inventati/" target="_blank" rel="noreferrer">Read EDRi's Sept. 3 statement ↗</a>
          </div>
        </div>
      </div>`
    updates.insertAdjacentElement('beforebegin', section)
  }

  function addCascadeUpdate() {
    const cascade = document.getElementById('cascade')
    if (!cascade || cascade.querySelector('[data-bank-escalation]')) return
    const note = document.createElement('div')
    note.className = 'unknown-card'
    note.dataset.bankEscalation = '2026-09-05'
    note.innerHTML = `<p class="eyebrow">UPDATE · SEPTEMBER 5</p><h3>The banking leg escalated.</h3><p>A/I says Banca Etica told the association on Sept. 4 that it will terminate the account and that remaining donated funds will no longer be available. That moves the banking consequence from temporary suspension and probable closure to a reported termination decision with immediate operating consequences.</p><p><a href="#${BANK_UPDATE_ID}">Read the full Sept. 5 update ↑</a> · <a href="https://keepitfree.ai/announcements/banca-etica-shtus-down-a/i-funds/" target="_blank" rel="noreferrer">Primary source ↗</a></p>`
    const evidence = cascade.querySelector('.evidence-line')
    if (evidence) evidence.insertAdjacentElement('beforebegin', note)
    else cascade.appendChild(note)

    const chainDate = document.querySelector('.chain-node[href="#cascade"] .date')
    if (chainDate) chainDate.textContent = 'AUG 28–SEP 5+'
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
    if (nav && !nav.querySelector(`a[href="#${EUROPE_UPDATE_ID}"]`)) {
      const link = document.createElement('a')
      link.href = `#${EUROPE_UPDATE_ID}`
      link.textContent = 'NEW · European response'
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
    addSource('https://www.europarl.europa.eu/doceo/document/P-10-2026-003407_EN.html', 'SEP 1 · 2026', 'Priority question P-003407/2026 on Paolo De Rosa and A/I', 'European Parliament')
    addSource('https://edri.org/our-work/edri-solidarity-statement-autistici-inventati/', 'SEP 3 · 2026', 'European Digital Rights statement on the A/I designation', 'EDRi')
    addSource('https://www.che-fare.com/articoli/lantifascismo-non-e-terrorismo', 'SEP 5 · 2026', 'Academic and cultural appeal against the criminalization of antifascism', 'cheFare / original signatories')
    addSource('https://keepitfree.ai/announcements/banca-etica-shtus-down-a/i-funds/', 'SEP 5 · 2026', 'A/I says Banca Etica will terminate account and funds are unavailable', 'Autistici/Inventati')
    addSource('https://www.bancaetica.it/area-stampa/autistici-inventati-banca-etica-condanna-uso-improprio-ofac-valutazioni-per-non-chiudere-il-conto/', 'AUG 28–SEP 1 · 2026', 'Banca Etica statement on suspension and closure risk', 'Banca Etica')
    addSource('https://thefederalist.com/2026/08/28/antifa-networks-panic-after-trump-administration-just-sanctioned-their-servers/', 'AUG 28 · 2026', 'Shideler uses Sabot campaign material', 'The Federalist')
    addSource('/post/washington-examiner-on-sabot-media-and-a-i', 'AUG 30 · 2026', 'Crozier names, links and quotes Sabot', 'Sabot preservation / Washington Examiner')
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
    addLogItem('Added the European response record: 21 ECR MEPs’ priority written question P-003407/2026, the Sept. 5 academic and cultural appeal, and EDRi’s Sept. 3 statement. The parliamentary filing is identified as a question by its signatories, not a finding or Commission endorsement.')
    addLogItem('A/I reported that Banca Etica told the association on Sept. 4 it will terminate the account and that remaining donated funds will no longer be available, escalating the banking leg of the sanctions cascade from suspension and probable closure to a reported termination decision.')
    addLogItem('Published a public evidence log so preservation records, source links and social-media developments are accessible and shareable from the investigation itself.')
    addLogItem('Added the Aug. 28–Sept. 5 post-publication source trail: Shideler’s use of matching Sabot campaign material, Crozier’s Examiner attribution and X link, Shideler’s Sept. 5 post, and Ngo’s State Department tag and support allegation.')
    addLogItem('Recorded the Washington Examiner source-access discrepancy observed Sept. 5: a non-subscriber rendered view stopped before the Sabot section while the later text remained present in page source.')
    addLogItem('Preserved the Sept. 5 Ngo/Shideler post relationship with an explicit guardrail: a public tag to State is not evidence that any agency opened an inquiry or took action against Sabot.')
    addLogItem('Restored the full-width highlighted PDF reader runtime for the investigation document gallery.')
  }

  function init() {
    installUpdateStyles()
    promoteFullReport()
    addFullReportImage()
    makeBankUpdate()
    makeTrail()
    makeEuropeanResponse()
    addCascadeUpdate()
    updatePageMeta()
    addSources()
    addUpdateLog()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true })
  else init()
})()