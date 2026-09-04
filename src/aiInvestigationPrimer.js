import './ai-investigation-primer.css'

const CAMPAIGN_PATH = '/campaigns/autistici-inventati'
const PRIMER_ID = 'ai-investigation-primer'
const NAV_ID = 'ai-investigation-nav-link'

const people = [
  {
    name: 'Kyle Shideler',
    role: 'Center for Security Policy · counterterrorism analyst',
    why: 'Six days after Charlie Kirk was killed, Shideler publicly attributed the assassination to “Antifa.” The next day he published a roadmap urging the administration to use foreign designations, Treasury sanctions, intelligence and international cooperation against far-left networks. He later named A/I and NoBlogs in Senate testimony.',
    href: 'https://americanmind.org/memo/how-to-dismantle-far-left-extremist-networks/',
    label: 'Read the Sept. 17 roadmap',
  },
  {
    name: 'Andy Ngo',
    role: 'Writer and activist-journalist',
    why: 'At an October 8 White House Antifa roundtable, Ngo urged the State Department to consider designating Antifa’s international component as a Foreign Terrorist Organization. Later in the meeting, a reporter explicitly said he was echoing Ngo’s proposal before Trump said Rubio would handle the matter.',
    href: 'https://www.presidency.ucsb.edu/documents/remarks-roundtable-discussion-the-antifa-organization-and-exchange-with-reporters',
    label: 'Read the White House transcript',
  },
  {
    name: 'Marco Rubio',
    role: 'U.S. Secretary of State',
    why: 'Rubio sits at the government end of several handoffs: Trump publicly assigned him the international-designation question, Sen. Eric Schmitt wrote him the next day, State later designated four European groups, and Rubio made transnational “far-left terrorism” an international counterterrorism priority in 2026.',
    href: 'https://www.schmitt.senate.gov/wp-content/uploads/2025/10/10.9.2025-Letter-to-Sec.-Rubio.pdf',
    label: 'Read Schmitt’s letter to Rubio',
  },
  {
    name: 'Eric Schmitt',
    role: 'U.S. senator · Senate Judiciary subcommittee chair',
    why: 'Schmitt formalized the White House discussion in an October 9 letter asking Rubio to pursue foreign Antifa designations. Later that month his subcommittee heard Shideler’s testimony naming A/I. Schmitt later said his push included several meetings with State Department officials.',
    href: 'https://www.schmitt.senate.gov/media/press-releases/senator-schmitt-hails-state-department-designation-of-foreign-antifa-networks-as-ftos/',
    label: 'Read Schmitt’s Nov. 13 statement',
  },
  {
    name: 'Hudson Crozier',
    role: 'Daily Caller News Foundation reporter',
    why: 'Crozier supplied the bridge from a Portland NoBlogs controversy to A/I. His October 16 investigation identified A/I as the infrastructure provider and quoted Shideler explaining why foreign terrorist predicates could make providers like A/I easier to target under a material-support theory.',
    href: 'https://dailycaller.com/2025/10/16/foreign-tech-group-police-antifa/',
    label: 'Read the Oct. 16 report',
  },
]

const pipeline = [
  {
    date: 'SEP 10, 2025',
    title: 'Charlie Kirk is assassinated',
    body: 'The killing becomes an explicit catalyst in the administration’s later counterterrorism framing of political violence.',
  },
  {
    date: 'SEP 16',
    title: 'Shideler attributes the killing to “Antifa”',
    body: 'Shideler publishes “Antifa Is Responsible For Charlie Kirk’s Assassination.” That is Shideler’s characterization, not an independently established finding of organizational responsibility.',
    href: 'https://thefederalist.com/2025/09/16/antifa-is-responsible-for-charlie-kirks-assassination/',
  },
  {
    date: 'SEP 17',
    title: 'A policy roadmap appears',
    body: 'Shideler proposes a whole-of-government campaign using intelligence, State Department designations, Treasury sanctions and foreign cooperation. He recommends a piecemeal designation strategy and identifies Hammerbande, Greek anarchist groups and Palestine Action as possible targets.',
    href: 'https://americanmind.org/memo/how-to-dismantle-far-left-extremist-networks/',
  },
  {
    date: 'SEP 22–25',
    title: 'The White House widens the target to networks and support structures',
    body: 'After the Antifa order, NSPM-7 directs agencies to investigate networks, organizations, funders and enabling structures around political violence and explicitly invokes Kirk’s assassination.',
    href: 'https://www.whitehouse.gov/presidential-actions/2025/09/countering-domestic-terrorism-and-organized-political-violence/',
  },
  {
    date: 'OCT 8',
    title: 'Ngo puts the international designation mechanism on the White House table',
    body: 'Ngo urges State to consider an FTO designation for Antifa’s international component. Later, a reporter says he is “echoing what Andy said” and presses Trump on an international designation. Trump says: “Let’s get it done… Marco will take care of it.”',
    href: 'https://www.presidency.ucsb.edu/documents/remarks-roundtable-discussion-the-antifa-organization-and-exchange-with-reporters',
  },
  {
    date: 'OCT 9',
    title: 'Schmitt writes Rubio',
    body: 'One day after the roundtable, Sen. Eric Schmitt formally urges Rubio to designate foreign networks, organizations and financiers alleged to enable Antifa operations.',
    href: 'https://www.schmitt.senate.gov/wp-content/uploads/2025/10/10.9.2025-Letter-to-Sec.-Rubio.pdf',
  },
  {
    date: 'OCT 10–16',
    title: 'Portland becomes the bridge to NoBlogs and A/I',
    body: 'A Rose City Counter-Info post hosted on NoBlogs is amplified by Ngo and covered nationally. Crozier then follows the hosting trail to Autistici/Inventati.',
    href: 'https://dailycaller.com/2025/10/16/foreign-tech-group-police-antifa/',
  },
  {
    date: 'OCT 16',
    title: 'Shideler publicly describes the legal bridge',
    body: 'In Crozier’s report, Shideler says that after foreign terrorist designations, going after organizations providing material support would be “job one,” while noting that the services at issue were otherwise lawful.',
    href: 'https://dailycaller.com/2025/10/16/foreign-tech-group-police-antifa/',
  },
  {
    date: 'OCT 28',
    title: 'A/I enters Senate counterterrorism testimony',
    body: 'Shideler tells the Senate that support networks may provide material support primarily through services, names A/I and NoBlogs, and cites Crozier’s October 16 article.',
    href: 'https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf',
  },
  {
    date: 'NOV 13',
    title: 'State designates four European groups',
    body: 'Four groups receive SDGT designations, with FTO designations following. Three later appear in the U.S. public case involving material carried on A/I-linked infrastructure.',
    href: 'https://www.schmitt.senate.gov/media/press-releases/senator-schmitt-hails-state-department-designation-of-foreign-antifa-networks-as-ftos/',
  },
  {
    date: 'JUL 16, 2026',
    title: '“Far-left terrorism” becomes an international U.S. priority',
    body: 'Rubio convenes officials from more than sixty countries as the administration redirects counterterrorism attention toward what it describes as transnational far-left terrorism.',
    href: 'https://www.reuters.com/legal/government/us-will-focus-counterterrorism-efforts-left-wing-groups-rubio-says-2026-07-16/',
  },
  {
    date: 'AUG 26',
    title: 'OFAC sanctions Autistici/Inventati',
    body: 'Treasury places A/I on the SDN list as an SDGT under Executive Order 13224, using a support-and-services theory rather than accusing A/I of personally carrying out an attack.',
    href: 'https://home.treasury.gov/news/press-releases/sb0616/',
  },
]

const proven = [
  'The administration adopted a strategy aimed at networks, funders and enabling structures.',
  'Shideler published a detailed foreign-designation and sanctions strategy before many later government actions.',
  'Ngo directly proposed an international/FTO designation strategy at the White House.',
  'A reporter explicitly echoed Ngo’s proposal before Trump said Rubio would handle it.',
  'Schmitt formally wrote Rubio the next day and later said he held several meetings with State officials.',
  'A NoBlogs-hosted Portland controversy led reporting to A/I.',
  'Shideler described a material-support route to providers like A/I, then named A/I and NoBlogs in Senate testimony.',
  'State designated European groups later invoked in the public narrative against A/I.',
  'OFAC ultimately sanctioned A/I under a support-and-services provision.',
]

const notProven = [
  'Who first referred A/I for designation or when the targeting file was opened.',
  'That Ngo personally asked any agency to target A/I.',
  'That Shideler or the Center for Security Policy privately asked State or Treasury to sanction A/I.',
  'That Crozier’s article or Shideler’s testimony was part of OFAC’s administrative record.',
  'That the November 2025 European designations were selected with A/I or NoBlogs in mind.',
  'What evidence came from Italian or other foreign authorities.',
  'The exact evidentiary chain supporting each attribution in the government’s public case.',
]

const records = [
  'OFAC’s A/I administrative record and targeting memorandum.',
  'State and Treasury referrals mentioning A/I, NoBlogs, Rose City Counter-Info or Abolition Media.',
  'White House briefing materials and follow-up correspondence from the October 8 roundtable.',
  'State Department handling of Schmitt’s October 9 letter and records of the meetings Schmitt later referenced.',
  'Communications pairing A/I or NoBlogs with Andy Ngo, Hudson Crozier, Kyle Shideler or the Center for Security Policy.',
  'Records generated after Shideler’s October 28 testimony and around the November European designations.',
  'Interagency and foreign-government records, including U.S.–Italy counterterrorism communications, leading to the August 26 action.',
]

function isCampaignPage() {
  return window.location.pathname.replace(/\/+$/, '') === CAMPAIGN_PATH
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function link(href, label = 'Source ↗') {
  if (!href) return ''
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
}

function findInvestigationArticle() {
  const links = [...document.querySelectorAll('#reporting a[href*="/post/"]')]
  return links.find((item) => /from\s+kirk\s+to\s+a\s*\/\s*i|kirk.*autistici|kirk.*inventati/i.test(item.textContent || '')) || null
}

function articleCta() {
  const article = findInvestigationArticle()
  if (article?.getAttribute('href')) {
    return `<a class="ai-investigation-cta__button" href="${escapeHtml(article.getAttribute('href'))}">Read the full investigation →</a>`
  }
  return '<a class="ai-investigation-cta__button" href="#reporting">Read the reporting →</a><small>The full investigation will appear in the reporting section when it is published.</small>'
}

function renderPrimer() {
  const basics = [
    ['A/I is an SDGT, not an FTO', 'A/I was sanctioned under Executive Order 13224 as a Specially Designated Global Terrorist. It was not itself designated as a Foreign Terrorist Organization. The distinction matters because foreign group designations can still become predicates in a later support case.'],
    ['The legal hook is services', 'The government’s public theory is support and infrastructure: hosting, communications and other services. The public finding does not say A/I itself carried out a shooting, bombing or sabotage.'],
    ['“Antifa” is source language here', 'This page tracks how officials and outside advocates use the term because their definitions shaped the policy. Reporting their framing is not the same as adopting it.'],
    ['Sequence is not causation', 'Some handoffs are documented directly. Others are chronological or inferential. Where the public record does not show that one event caused another, we do not claim that it did.'],
  ]

  return `
    <section class="campaign-section campaign-section--investigation" id="investigation" data-ai-investigation-primer="1">
      <div class="campaign-shell ai-investigation">
        <header class="ai-investigation__intro">
          <p class="ai-investigation__eyebrow">INVESTIGATION PRIMER / READ THIS FIRST</p>
          <h2>How did a 25-year-old Italian privacy collective become a U.S. counterterrorism target?</h2>
          <p>On August 26, 2026, the U.S. Treasury Department sanctioned Autistici/Inventati. The public legal theory was not that A/I personally committed an attack. It was that the collective provided technological infrastructure or other support connected to alleged terrorism.</p>
          <p>Viewed alone, that action looks abrupt. Reconstruct the preceding eleven months and a public policy pipeline appears: post-Kirk arguments about “Antifa,” an outside dismantlement roadmap, a White House discussion of foreign terrorist designations, a formal request to Marco Rubio, a Portland NoBlogs controversy, reporting that identified A/I, Senate testimony, foreign designations, and finally the sanctions action.</p>
          <aside><strong>What this investigation does not claim:</strong> the public record does not currently prove a secret agreement among these people or show who made the decisive referral to OFAC. The unanswered internal handoff is exactly what the records requests are meant to find.</aside>
        </header>

        <div class="ai-investigation__basics" aria-label="Before you read">
          ${basics.map(([title, body]) => `<article><span>BEFORE YOU READ</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join('')}
        </div>

        <section class="ai-investigation__people" aria-labelledby="ai-people-title">
          <div class="ai-investigation__section-head"><p>THE PEOPLE</p><h3 id="ai-people-title">Who appears in the chain, and why</h3><p>These are roles in the documented public sequence, not a claim that every person coordinated with every other person.</p></div>
          <div class="ai-investigation__people-grid">
            ${people.map((person, index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><h4>${escapeHtml(person.name)}</h4><p class="ai-investigation__role">${escapeHtml(person.role)}</p><p>${escapeHtml(person.why)}</p>${link(person.href, person.label)}</article>`).join('')}
          </div>
        </section>

        <section class="ai-investigation__pipeline" aria-labelledby="ai-pipeline-title">
          <div class="ai-investigation__section-head"><p>THE POLICY PIPELINE</p><h3 id="ai-pipeline-title">From Kirk to A/I</h3><p>This timeline sits alongside the campaign’s longer A/I history below. It tracks the narrower question of how A/I entered the U.S. counterterrorism story.</p></div>
          <div class="ai-investigation__timeline">
            ${pipeline.map((item) => `<article><time>${escapeHtml(item.date)}</time><div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.body)}</p>${link(item.href)}</div></article>`).join('')}
          </div>
        </section>

        <aside class="ai-investigation__source-loop">
          <p>SOURCE LINEAGE</p>
          <h3>The Crozier → Shideler → Congress feedback loop</h3>
          <p>On October 16, Hudson Crozier’s Daily Caller investigation quoted Kyle Shideler as an expert explaining the legal importance of foreign terrorist designations for reaching service providers such as A/I. Twelve days later, Shideler named A/I and NoBlogs in Senate testimony and cited Crozier’s article.</p>
          <p>That does not show Crozier’s reporting was fabricated, and his article contained evidence beyond Shideler. It does mean the apparent layers of corroboration are not fully independent. A source helped interpret reporting, then cited the resulting reporting when presenting the same target to Congress.</p>
          <div>${link('https://dailycaller.com/2025/10/16/foreign-tech-group-police-antifa/', 'Crozier report ↗')}${link('https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf', 'Shideler testimony ↗')}</div>
        </aside>

        <section class="ai-investigation__proof" aria-labelledby="ai-proof-title">
          <div class="ai-investigation__section-head"><p>EVIDENCE CHECK</p><h3 id="ai-proof-title">What the public record proves, and what it does not</h3></div>
          <div class="ai-investigation__proof-grid">
            <article class="is-proven"><h4>Documented</h4><ul>${proven.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>
            <article class="is-open"><h4>Not yet established</h4><ul>${notProven.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>
          </div>
        </section>

        <article class="ai-investigation-cta">
          <p>THE FULL INVESTIGATION</p>
          <h3>FROM KIRK TO A/I</h3>
          <p>How a post-assassination campaign against “Antifa” moved through outside advocates, the White House, Congress and U.S. counterterrorism policy before an Italian privacy collective was sanctioned.</p>
          <div class="ai-investigation-cta__actions">${articleCta()}</div>
        </article>

        <section class="ai-investigation__records" aria-labelledby="ai-records-title">
          <div class="ai-investigation__section-head"><p>THE MISSING FILE</p><h3 id="ai-records-title">What we are trying to obtain</h3><p>The public chronology is visible. The internal referral and administrative record are not. Those records can distinguish parallel advocacy from a direct outside-to-inside policy pipeline.</p></div>
          <ol>${records.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
          <p class="ai-investigation__records-note"><strong>Living investigation:</strong> this page will be updated as records, correspondence, archived posts and corrections become available. Claims are separated from findings, and inference is labeled as inference.</p>
        </section>
      </div>
    </section>
  `
}

function ensureNavLink() {
  const nav = document.querySelector('.campaign-local-nav .campaign-shell')
  if (!nav || nav.querySelector(`#${NAV_ID}`)) return
  const anchor = document.createElement('a')
  anchor.id = NAV_ID
  anchor.href = '#investigation'
  anchor.textContent = 'Investigation'
  nav.prepend(anchor)
}

function ensurePrimer() {
  if (!isCampaignPage()) return false
  const flow = document.querySelector('.campaign-section-flow')
  if (!flow) return false

  if (!document.getElementById(PRIMER_ID)) {
    const holder = document.createElement('div')
    holder.id = PRIMER_ID
    holder.innerHTML = renderPrimer()
    flow.prepend(holder)
  }
  ensureNavLink()

  const holder = document.getElementById(PRIMER_ID)
  const cta = holder?.querySelector('.ai-investigation-cta__actions')
  const article = findInvestigationArticle()
  const desiredHref = article?.getAttribute('href') || '#reporting'
  const currentHref = cta?.querySelector('a')?.getAttribute('href') || ''
  if (cta && currentHref !== desiredHref) cta.innerHTML = articleCta()
  return true
}

let queued = false
function schedule() {
  if (queued) return
  queued = true
  window.requestAnimationFrame(() => {
    queued = false
    if (isCampaignPage()) ensurePrimer()
    else {
      document.getElementById(PRIMER_ID)?.remove()
      document.getElementById(NAV_ID)?.remove()
    }
  })
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('pageshow', schedule)
  window.addEventListener('popstate', schedule)
  document.addEventListener('click', () => window.setTimeout(schedule, 0), true)
  ;[0, 100, 300, 800, 1600, 3000].forEach((delay) => window.setTimeout(schedule, delay))
}
