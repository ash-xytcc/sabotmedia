const AI_CAMPAIGN_PATH = '/campaigns/autistici-inventati'
const PEOPLE_SECTION_ID = 'people'
const NAV_ATTR = 'data-ai-people-nav'

const PEOPLE = [
  {
    initials: 'DT',
    name: 'Donald Trump',
    role: 'President of the United States',
    depth: 'brief',
    why: 'Trump set the top-level policy direction that moved the administration’s anti-antifa campaign into an executive counterterrorism framework aimed not only at named groups but also at networks, entities, funders and support structures.',
    bio: 'This dossier is intentionally narrow. The relevant question here is not Trump’s biography; it is the executive policy architecture that preceded the A/I designation and the public forum in which an international terrorism designation was proposed.',
    events: [
      ['SEP 22, 2025', 'Issued the order titled “Designating Antifa as a Domestic Terrorist Organization.”'],
      ['SEP 25, 2025', 'NSPM-7 broadened the administration’s strategy toward networks, entities, organizations and support structures, bringing State, Treasury, Justice, DHS and Joint Terrorism Task Forces into the policy frame.'],
      ['OCT 8, 2025', 'Hosted a White House roundtable on Antifa. During the event Andy Ngo urged the State Department to designate what he called Antifa’s “international arm” as a Foreign Terrorist Organization.'],
    ],
    proves: 'The public record establishes the executive policy direction, the network-and-support framing, and the White House roundtable where an international terrorism designation was explicitly proposed.',
    unknown: 'The public record does not establish that Trump personally knew Autistici/Inventati by name before the August 2026 designation or personally directed officials to target it.',
    receipts: [
      ['White House: Antifa roundtable video', 'https://www.whitehouse.gov/videos/president-trump-participates-in-a-roundtable-on-antifa/'],
      ['American Presidency Project: roundtable transcript', 'https://www.presidency.ucsb.edu/documents/remarks-roundtable-discussion-the-antifa-organization-and-exchange-with-reporters'],
    ],
  },
  {
    initials: 'MR',
    name: 'Marco Rubio',
    role: 'Secretary of State',
    depth: 'brief',
    why: 'Rubio led the department that created key November 2025 predicate designations and later supplied the public factual framing tied to the A/I case. Treasury and OFAC, not Rubio alone, carried out the operative August 26 sanctions designation.',
    bio: 'The State Department’s role matters because the August 2026 action did not appear from nowhere. The November 2025 designations created named terrorist predicates later cited in the A/I case, while Rubio publicly signaled interest in additional left-wing designations.',
    events: [
      ['NOV 13, 2025', 'State designated Antifa Ost, FAI/FRI, Armed Proletarian Justice and Revolutionary Class Self-Defense as Specially Designated Global Terrorists and announced Foreign Terrorist Organization designations effective November 20.'],
      ['DEC 19, 2025', 'Asked by Hudson Crozier whether more left-wing groups could be designated, Rubio said he was open to more and told Crozier that if he had groups to suggest, Rubio would look at them.'],
      ['JUL 16, 2026', 'Convened officials from more than 60 countries at a ministerial focused on political terrorism as the administration elevated “far-left terror” as an international counterterrorism priority.'],
      ['AUG 26, 2026', 'State publicly set out allegations used to frame the A/I case. Treasury/OFAC placed Autistici Inventati on the SDN List under Executive Order 13224.'],
    ],
    proves: 'State created predicate designations later connected to the A/I case, Rubio publicly invited Crozier to suggest additional groups, and State participated in the public case announced on August 26.',
    unknown: 'Whether Rubio personally approved an A/I referral, received a private A/I recommendation, or participated in the specific evidentiary process that moved A/I into Treasury/OFAC targeting remains undocumented publicly.',
    receipts: [
      ['Daily Caller: Rubio press Q&A, Dec. 19, 2025', 'https://dailycaller.com/2025/12/19/marco-rubio-left-wing-terrorists-worldwide-state-department/'],
    ],
  },
  {
    initials: 'AN',
    name: 'Andy Ngo',
    role: 'Senior Editor, The Post Millennial',
    depth: 'deep',
    why: 'Ngo appears early in the public transmission chain. At the October 8 White House roundtable he explicitly proposed an international terrorism designation for Antifa, then amplified a Portland-area NoBlogs post that helped turn a local incident into a story about an international support network.',
    bio: 'Ngo is a Portland-focused right-wing journalist and commentator who built a national profile covering antifascist groups and street conflict. His reporting and framing have been strongly contested by other journalists and critics, but the issue relevant here is narrower: what he publicly asked the administration to do and which material he amplified before A/I was named in the policy debate.',
    events: [
      ['OCT 8, 2025', 'At the White House Antifa roundtable, Ngo urged the State Department to designate Antifa’s “international arm” as a Foreign Terrorist Organization.'],
      ['OCT 2025', 'Amplified screenshots from Rose City Counter-Info’s “YOU’RE INVITED: LASER TAG!” post, framing the episode as an Antifa operation. The site was hosted through NoBlogs, creating a technical breadcrumb later followed to A/I.'],
      ['OCT 16, 2025', 'Hudson Crozier’s Daily Caller News Foundation story then explicitly connected NoBlogs to Autistici/Inventati and asked how government could legally reach the provider.'],
    ],
    proves: 'Ngo publicly proposed an international terrorist designation framework at the White House and amplified material that became part of the public narrative about NoBlogs-hosted infrastructure.',
    unknown: 'There is no public evidence yet that Ngo named A/I at the White House, privately asked officials to designate A/I, or communicated with State, Treasury, DHS, FBI or the White House about targeting A/I specifically.',
    receipts: [
      ['White House: Antifa roundtable video', 'https://www.whitehouse.gov/videos/president-trump-participates-in-a-roundtable-on-antifa/'],
      ['American Presidency Project: roundtable transcript', 'https://www.presidency.ucsb.edu/documents/remarks-roundtable-discussion-the-antifa-organization-and-exchange-with-reporters'],
      ['The Post Millennial: Andy Ngo author page', 'https://thepostmillennial.com/author/andyngo'],
      ['Reason: reporting on disputes over Ngo’s Portland coverage', 'https://reason.com/2019/09/03/andy-ngo-video-antifa-patriot-prayer-attack-media/'],
    ],
  },
  {
    initials: 'HC',
    name: 'Hudson Crozier',
    role: 'Investigative reporter, Washington Examiner; formerly Daily Caller News Foundation',
    depth: 'deep',
    why: 'Crozier is the clearest public bridge from NoBlogs to A/I. His October 16, 2025 article named the provider, asked a counterterrorism analyst how the government could legally reach it, and obtained an A/I-specific response from the State Department.',
    bio: 'Crozier is an investigative reporter whose work has focused on crime, terrorism and extreme politics. In 2025 he reported for the Daily Caller News Foundation. His October article is important less because of its editorial framing than because it put A/I by name into a concrete sanctions-and-material-support discussion and generated a State Department press response.',
    events: [
      ['OCT 16, 2025', 'Published “Shadowy Foreign Tech Group Keeps Police Off Antifa’s Trail,” tracing Rose City Counter-Info and other sites through NoBlogs to Autistici/Inventati.'],
      ['OCT 16, 2025', 'Asked Kyle Shideler how the U.S. government could legally reach A/I. Shideler answered that with an FTO designation, going after material-support providers “would be job one”; without it, the services were “otherwise lawful.”'],
      ['OCT 16, 2025', 'Obtained a State Department response to his A/I reporting. That means an A/I-specific press inquiry was routed inside State, creating a concrete records trail for FOIA.'],
      ['NOV 27, 2025', 'Published a follow-up about how Antifa FTO sanctions could reach international support and propaganda networks, again quoting Shideler on support services.'],
      ['DEC 19, 2025', 'Asked Rubio whether more left-wing groups could be designated. Rubio publicly invited Crozier to send him groups to consider.'],
    ],
    proves: 'Crozier publicly identified A/I, elicited a legal theory for reaching infrastructure providers, contacted State about A/I, continued reporting on support-network sanctions, and received a public invitation from Rubio to suggest additional groups.',
    unknown: 'The public record does not show whether Crozier subsequently suggested A/I to Rubio or anyone else, whether he had private targeting discussions with officials, or whether his October article entered OFAC’s administrative record.',
    receipts: [
      ['Daily Caller: Oct. 16 A/I / NoBlogs investigation', 'https://dailycaller.com/2025/10/16/foreign-tech-group-police-antifa/'],
      ['Daily Caller: Nov. 27 sanctions follow-up', 'https://dailycaller.com/2025/11/27/trump-antifa-foreign-terrorist-organization-al-qaeda-material-support/'],
      ['Daily Caller: Dec. 19 Rubio Q&A', 'https://dailycaller.com/2025/12/19/marco-rubio-left-wing-terrorists-worldwide-state-department/'],
      ['Washington Examiner: Hudson Crozier author page', 'https://www.washingtonexaminer.com/author/hudson-crozier/'],
      ['The College Fix: alumni directory', 'https://www.thecollegefix.com/about/alumni/'],
    ],
  },
  {
    initials: 'KS',
    name: 'Kyle Shideler',
    role: 'Director and Senior Analyst for Homeland Security and Counterterrorism, Center for Security Policy',
    depth: 'deep',
    why: 'Shideler supplied the clearest public legal theory for converting A/I’s otherwise lawful infrastructure services into a material-support target. He then carried A/I by name into Senate testimony and praised the government after it sanctioned the collective.',
    bio: 'Shideler directs homeland security and counterterrorism work at the Center for Security Policy. His organization says he has briefed government officials, Congress and law enforcement and testified before legislative bodies. The significance here is unusually direct: his public argument appears before, during and after A/I enters the federal terrorism-policy record.',
    events: [
      ['OCT 16, 2025', 'Told Crozier that if the administration obtained an FTO designation, pursuing organizations that provide material support “would be job one,” while noting that without such a designation the services at issue could be “otherwise lawful.”'],
      ['OCT 28, 2025', 'Testified before a Senate Judiciary subcommittee. His written testimony explicitly named NoBlogs and Autistici/Inventati while discussing online platforms and services as material support, and cited Crozier’s October 16 reporting.'],
      ['AUG 28, 2026', 'Published a Center for Security Policy article praising the State and Treasury actions against A/I and arguing that the administration had recognized the importance of targeting infrastructure used by militant networks.'],
    ],
    proves: 'Before the designation, Shideler publicly articulated the material-support route, then placed A/I by name in a Senate terrorism-policy record. After the designation, he publicly endorsed an action operating under a closely related infrastructure-support theory.',
    unknown: 'Nothing public yet establishes that Shideler privately advised State, Treasury, DHS, FBI or White House officials on the A/I designation, supplied evidence to OFAC, or caused the final targeting decision.',
    receipts: [
      ['Center for Security Policy: Kyle Shideler bio', 'https://centerforsecuritypolicy.org/author/kshideler/'],
      ['Senate Judiciary: Oct. 28, 2025 hearing', 'https://www.judiciary.senate.gov/committee-activity/hearings/politically-violent-attacks-a-threat-to-our-constitutional-order'],
      ['Center for Security Policy: Aug. 28, 2026 A/I article', 'https://centerforsecuritypolicy.org/antifa-networks-panic-after-trump-administration-sanctions-their-secret-tech-collective/'],
      ['Center for Security Policy: organization background', 'https://centerforsecuritypolicy.org/about-the-center/'],
    ],
  },
]

function isAiCampaignPath() {
  return String(window.location.pathname || '').replace(/\/+$/, '') === AI_CAMPAIGN_PATH
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function personCard(person, index) {
  const events = person.events.map(([date, text]) => `<li><time>${escapeHtml(date)}</time><span>${escapeHtml(text)}</span></li>`).join('')
  const receipts = person.receipts.map(([label, url]) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)} ↗</a></li>`).join('')
  const cardClass = person.depth === 'deep' ? 'campaign-person-card campaign-person-card--deep' : 'campaign-person-card'

  return `<article class="${cardClass}">
    <div class="campaign-person-card__head">
      <div class="campaign-person-card__portrait" aria-hidden="true">${escapeHtml(person.initials)}</div>
      <div>
        <span class="campaign-person-card__number">DOSSIER ${String(index + 1).padStart(2, '0')}</span>
        <h3>${escapeHtml(person.name)}</h3>
        <p class="campaign-person-card__role">${escapeHtml(person.role)}</p>
      </div>
    </div>
    <div class="campaign-person-card__why">
      <span>Why this person matters</span>
      <p>${escapeHtml(person.why)}</p>
    </div>
    <details class="campaign-person-details"${person.depth === 'deep' ? ' open' : ''}>
      <summary>Open dossier</summary>
      <div class="campaign-person-details__body">
        <p class="campaign-person-bio">${escapeHtml(person.bio)}</p>
        <div class="campaign-person-block">
          <h4>Public timeline</h4>
          <ul class="campaign-person-events">${events}</ul>
        </div>
        <div class="campaign-person-record">
          <div>
            <h4>What the record proves</h4>
            <p>${escapeHtml(person.proves)}</p>
          </div>
          <div>
            <h4>What remains unknown</h4>
            <p>${escapeHtml(person.unknown)}</p>
          </div>
        </div>
        <details class="campaign-person-receipts">
          <summary>Receipts</summary>
          <ul>${receipts}</ul>
        </details>
      </div>
    </details>
  </article>`
}

function buildPeopleSection() {
  const section = document.createElement('section')
  section.id = PEOPLE_SECTION_ID
  section.className = 'campaign-section campaign-people-dossiers'
  section.setAttribute('aria-labelledby', 'campaign-people-title')
  section.innerHTML = `<div class="campaign-shell">
    <header class="campaign-section-heading">
      <p>THE PEOPLE IN THE CHAIN</p>
      <h2 id="campaign-people-title">Who shaped the case?</h2>
      <div>Five people repeatedly appear in the public record leading to the August 26 designation. Their roles were not equal, and the evidence does not show that they secretly coordinated the outcome. What it does show is a transmission chain: an administration seeking a terrorism framework, a journalist proposing one, a reporter identifying the infrastructure provider, a counterterrorism analyst supplying the legal theory, and senior officials ultimately acting under a closely related theory. The missing question is who carried A/I across the final gap into the government’s targeting process.</div>
    </header>

    <p class="campaign-people-intro">This section separates documented public acts from inference. The point is not to flatten five different roles into one conspiracy story. It is to show where ideas, names and legal theories entered the public record, then mark the places where the administrative record is still missing.</p>

    <div class="campaign-people-chain" aria-label="Public transmission chain">
      <div><span>01 / POLICY DIRECTION</span><strong>Trump: executive counterterrorism framework</strong></div>
      <div><span>02 / FTO PROPOSAL</span><strong>Ngo: international designation urged at White House</strong></div>
      <div><span>03 / PROVIDER IDENTIFIED</span><strong>Crozier: NoBlogs traced to A/I</strong></div>
      <div><span>04 / LEGAL THEORY</span><strong>Shideler: material-support route articulated</strong></div>
      <div><span>05 / GOVERNMENT ACTION</span><strong>State predicates + Treasury/OFAC designation</strong></div>
    </div>

    <div class="campaign-people-grid">${PEOPLE.map(personCard).join('')}</div>

    <p class="campaign-people-note"><strong>Method note:</strong> This section describes the public record, not a claim of secret coordination. “What the record proves” means directly supported by cited public records. “What remains unknown” identifies questions for the administrative record and FOIA process.</p>
  </div>`
  return section
}

function ensurePeopleNav() {
  const nav = document.querySelector('.campaign-local-nav .campaign-shell')
  if (!nav || nav.querySelector(`[${NAV_ATTR}]`)) return
  const link = document.createElement('a')
  link.href = '#people'
  link.textContent = 'People'
  link.setAttribute(NAV_ATTR, '')
  const reportingLink = [...nav.querySelectorAll('a')].find((item) => item.getAttribute('href') === '#reporting')
  if (reportingLink?.nextSibling) nav.insertBefore(link, reportingLink.nextSibling)
  else if (reportingLink) reportingLink.after(link)
  else nav.appendChild(link)
}

function removePeopleDossiers() {
  document.getElementById(PEOPLE_SECTION_ID)?.remove()
  document.querySelector(`[${NAV_ATTR}]`)?.remove()
}

function ensurePeopleDossiers() {
  if (!isAiCampaignPath()) {
    removePeopleDossiers()
    return
  }

  ensurePeopleNav()
  if (document.getElementById(PEOPLE_SECTION_ID)) return

  const flow = document.querySelector('.campaign-section-flow')
  const reporting = document.getElementById('reporting')
  if (!flow || !reporting || reporting.parentElement !== flow) return
  reporting.after(buildPeopleSection())
}

let queued = false
function queuePeopleDossiers() {
  if (queued) return
  queued = true
  window.requestAnimationFrame(() => {
    queued = false
    ensurePeopleDossiers()
  })
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver(queuePeopleDossiers)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', queuePeopleDossiers)
  window.addEventListener('hashchange', queuePeopleDossiers)
  window.addEventListener('pageshow', queuePeopleDossiers)
  document.addEventListener('click', () => window.setTimeout(queuePeopleDossiers, 0), true)
  ;[0, 50, 150, 400, 900, 1800].forEach((delay) => window.setTimeout(queuePeopleDossiers, delay))
}
