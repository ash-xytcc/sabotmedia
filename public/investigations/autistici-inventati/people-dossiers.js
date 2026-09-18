(() => {
  const target = document.querySelector('.media-dossier')
  if (!target) return

  const stylesheet = document.createElement('link')
  stylesheet.rel = 'stylesheet'
  stylesheet.href = './people-dossiers.css'
  document.head.appendChild(stylesheet)

  const people = [
    {
      initials: 'DT',
      name: 'Donald Trump',
      role: 'President of the United States',
      label: 'POLICY DIRECTION',
      image: 'https://www.whitehouse.gov/wp-content/uploads/2025/06/President-Donald-Trump-Official-Presidential-Portrait.png',
      alt: 'Official presidential portrait of Donald Trump.',
      why: 'Trump set the top-level policy direction that moved the administration’s anti-antifa campaign into a counterterrorism framework aimed not only at alleged attackers but also at networks, entities, funders and support structures.',
      bio: 'This dossier stays deliberately narrow. The relevant issue is not Trump’s general biography; it is the executive policy architecture that preceded A/I’s designation and the White House forum in which an international terrorism designation was proposed.',
      events: [
        ['SEP 22, 2025', 'Issued the order titled “Designating Antifa as a Domestic Terrorist Organization.”'],
        ['SEP 25, 2025', 'NSPM-7 broadened the administration’s strategy toward networks, entities, organizations and support structures, bringing State, Treasury, Justice, DHS and Joint Terrorism Task Forces into the policy frame.'],
        ['OCT 8, 2025', 'Hosted the White House Antifa roundtable where Andy Ngo urged the State Department to designate what he called Antifa’s “international arm” as a Foreign Terrorist Organization.'],
      ],
      proves: 'The executive policy direction, support-network framing and White House discussion of an international terrorism designation are documented in official records.',
      unknown: 'The public record does not establish that Trump personally knew A/I by name before August 2026 or personally directed officials to target it.',
      receipts: [
        ['White House Antifa roundtable video', 'https://www.whitehouse.gov/videos/president-trump-participates-in-a-roundtable-on-antifa/'],
        ['GovInfo presidential transcript', 'https://www.govinfo.gov/content/pkg/DCPD-202500989/html/DCPD-202500989.htm'],
        ['NSPM-7', 'https://www.whitehouse.gov/presidential-actions/2025/09/countering-domestic-terrorism-and-organized-political-violence/'],
      ],
      open: false,
    },
    {
      initials: 'MR',
      name: 'Marco Rubio',
      role: 'Secretary of State',
      label: 'STATE DEPARTMENT',
      image: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Official%20Portrait%20of%20Secretary%20Rubio%20Headshot.jpg?width=800',
      alt: 'Official portrait of U.S. Secretary of State Marco Rubio.',
      why: 'Rubio led the department that created key November 2025 predicate designations and later supplied part of the public factual framing around A/I. Treasury and OFAC, not Rubio acting alone, carried out the operative August 26 sanctions designation.',
      bio: 'State’s role matters because the August 2026 action did not appear from nowhere. The November 2025 designations created named terrorist predicates later cited in the A/I case, while Rubio publicly signaled interest in additional left-wing designations.',
      events: [
        ['NOV 13, 2025', 'State designated Antifa Ost, FAI/FRI, Armed Proletarian Justice and Revolutionary Class Self-Defense as Specially Designated Global Terrorists and announced FTO designations effective November 20.'],
        ['DEC 19, 2025', 'Asked by Hudson Crozier whether more left-wing groups could be designated, Rubio said he was open to more and invited Crozier to send groups for consideration.'],
        ['JUL 16, 2026', 'Convened officials from more than 60 countries at a ministerial as the administration elevated “far-left terror” as an international counterterrorism priority.'],
        ['AUG 26, 2026', 'State publicly set out allegations used to frame the A/I case while Treasury/OFAC placed A/I on the SDN List under Executive Order 13224.'],
      ],
      proves: 'State created predicate designations later connected to the A/I case, Rubio publicly invited Crozier to suggest additional groups, and State participated in the public case announced on August 26.',
      unknown: 'Whether Rubio personally approved an A/I referral, received a private A/I recommendation or participated in the specific evidentiary handoff into OFAC targeting remains undocumented publicly.',
      receipts: [
        ['Daily Caller: Rubio press Q&A, Dec. 19, 2025', 'https://dailycaller.com/2025/12/19/marco-rubio-left-wing-terrorists-worldwide-state-department/'],
        ['State Department terrorism designations, Nov. 13, 2025', 'https://www.state.gov/releases/office-of-the-spokesperson/2025/11/terrorist-designations-of-four-antifa-groups'],
      ],
      open: false,
    },
    {
      initials: 'AN',
      name: 'Andy Ngo',
      role: 'Senior Editor, The Post Millennial',
      label: 'WHITE HOUSE PROPOSAL',
      image: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Andy%20Ngo%20by%20Gage%20Skidmore.jpg?width=900',
      alt: 'Andy Ngo speaking at a public event.',
      why: 'Ngo appears early in the public transmission chain. At the October 8 White House roundtable he explicitly proposed an international terrorism designation for Antifa, then amplified a Portland-area NoBlogs post that became part of the public support-network narrative.',
      bio: 'Ngo is a Portland-focused right-wing journalist and commentator who built a national profile covering antifascist groups and street conflict. His reporting and framing have been sharply disputed by other journalists and critics. For this investigation, the relevant question is narrower: what he publicly asked the administration to do and what material he amplified before A/I was named in the policy debate.',
      events: [
        ['OCT 8, 2025', 'At the White House Antifa roundtable, urged State to designate Antifa’s “international arm” as a Foreign Terrorist Organization.'],
        ['OCT 2025', 'Amplified screenshots from Rose City Counter-Info’s “YOU’RE INVITED: LASER TAG!” post. The site was hosted through NoBlogs, creating a technical breadcrumb later followed publicly to A/I.'],
        ['OCT 16, 2025', 'Crozier’s DCNF story explicitly connected NoBlogs to A/I and asked how government could legally reach the provider.'],
      ],
      proves: 'Ngo publicly proposed an international terrorist designation framework at the White House and amplified material that became part of the NoBlogs/A/I infrastructure narrative.',
      unknown: 'There is no public evidence yet that Ngo named A/I at the White House, privately asked officials to designate A/I, or communicated with State, Treasury, DHS, FBI or the White House about targeting A/I specifically.',
      receipts: [
        ['GovInfo presidential transcript', 'https://www.govinfo.gov/content/pkg/DCPD-202500989/html/DCPD-202500989.htm'],
        ['White House Antifa roundtable video', 'https://www.whitehouse.gov/videos/president-trump-participates-in-a-roundtable-on-antifa/'],
        ['The Post Millennial: Andy Ngo author page', 'https://thepostmillennial.com/author/andyngo'],
        ['Reason: dispute over Ngo’s Portland coverage', 'https://reason.com/2019/09/03/andy-ngo-video-antifa-patriot-prayer-attack-media/'],
      ],
      open: true,
    },
    {
      initials: 'HC',
      name: 'Hudson Crozier',
      role: 'Investigative reporter, Washington Examiner; formerly Daily Caller News Foundation',
      label: 'REPORTING PATH',
      why: 'Crozier is the clearest public bridge from NoBlogs to A/I. His October 16, 2025 article named the provider, asked how the government could legally reach it and obtained an A/I-specific response from the State Department.',
      bio: 'Crozier is an investigative reporter whose work has focused on crime, terrorism and extreme politics. In 2025 he reported for the Daily Caller News Foundation. His October article matters less for its editorial framing than for the paper trail it creates: A/I is named, a legal theory is solicited, and State responds to an A/I-specific press inquiry.',
      events: [
        ['OCT 16, 2025', 'Published “Shadowy Foreign Tech Group Keeps Police Off Antifa’s Trail,” tracing Rose City Counter-Info and other sites through NoBlogs to A/I.'],
        ['OCT 16, 2025', 'Asked Kyle Shideler how the U.S. government could legally reach A/I. Shideler said that with an FTO designation, pursuing material-support providers “would be job one”; without it, the services were “otherwise lawful.”'],
        ['OCT 16, 2025', 'Obtained a State Department response to his A/I reporting, establishing an A/I-specific press inquiry inside State and therefore a concrete FOIA trail.'],
        ['NOV 27, 2025', 'Published a follow-up about how Antifa FTO sanctions could reach international support and propaganda networks.'],
        ['DEC 19, 2025', 'Asked Rubio whether more left-wing groups could be designated. Rubio publicly invited him to submit groups for consideration.'],
      ],
      proves: 'Crozier publicly identified A/I, elicited a legal theory for reaching infrastructure providers, contacted State about A/I, continued reporting on support-network sanctions and received a public invitation from Rubio to suggest additional groups.',
      unknown: 'The public record does not show whether Crozier later suggested A/I to Rubio or anyone else, had private targeting discussions with officials, or whether his October article entered OFAC’s administrative record.',
      receipts: [
        ['DCNF: Oct. 16 A/I / NoBlogs investigation', 'https://dailycaller.com/2025/10/16/foreign-tech-group-police-antifa/'],
        ['Daily Caller: Nov. 27 sanctions follow-up', 'https://dailycaller.com/2025/11/27/trump-antifa-foreign-terrorist-organization-al-qaeda-material-support/'],
        ['Daily Caller: Dec. 19 Rubio Q&A', 'https://dailycaller.com/2025/12/19/marco-rubio-left-wing-terrorists-worldwide-state-department/'],
        ['Washington Examiner: Hudson Crozier author page', 'https://www.washingtonexaminer.com/author/hudson-crozier/'],
        ['The College Fix: alumni directory', 'https://www.thecollegefix.com/about/alumni/'],
      ],
      open: true,
    },
    {
      initials: 'KS',
      name: 'Kyle Shideler',
      role: 'Director and Senior Analyst for Homeland Security and Counterterrorism, Center for Security Policy',
      label: 'LEGAL THEORY',
      why: 'Shideler supplied the clearest public legal theory for converting A/I’s otherwise lawful infrastructure services into a material-support target. He then carried A/I by name into Senate testimony and publicly praised the government after it sanctioned the collective.',
      bio: 'Shideler directs homeland security and counterterrorism work at the Center for Security Policy. CSP says he has briefed government officials, Congress and law enforcement and testified before legislative bodies. The significance here is unusually direct: his public argument appears before, during and after A/I enters the federal terrorism-policy record.',
      events: [
        ['OCT 16, 2025', 'Told Crozier that if the administration obtained an FTO designation, pursuing organizations that provide material support “would be job one,” while noting that without such a designation the services could be “otherwise lawful.”'],
        ['OCT 28, 2025', 'Testified before a Senate Judiciary subcommittee. His written testimony explicitly named NoBlogs and A/I while discussing online platforms and services as material support, and cited Crozier’s October 16 reporting.'],
        ['AUG 28, 2026', 'Published a CSP article praising the State and Treasury actions against A/I and arguing that the administration had recognized the importance of targeting infrastructure used by militant networks.'],
      ],
      proves: 'Before the designation, Shideler publicly articulated the material-support route, then placed A/I by name in a Senate terrorism-policy record. After the designation, he publicly endorsed an action operating under a closely related infrastructure-support theory.',
      unknown: 'Nothing public yet establishes that Shideler privately advised State, Treasury, DHS, FBI or White House officials on the A/I designation, supplied evidence to OFAC, or caused the final targeting decision.',
      receipts: [
        ['Center for Security Policy: Kyle Shideler bio', 'https://centerforsecuritypolicy.org/author/kshideler/'],
        ['Senate Judiciary hearing, Oct. 28, 2025', 'https://www.judiciary.senate.gov/committee-activity/hearings/politically-violent-attacks-a-threat-to-our-constitutional-order'],
        ['CSP: Aug. 28, 2026 A/I article', 'https://centerforsecuritypolicy.org/antifa-networks-panic-after-trump-administration-sanctions-their-secret-tech-collective/'],
        ['Center for Security Policy: organization background', 'https://centerforsecuritypolicy.org/about-the-center/'],
      ],
      open: true,
    },
  ]

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]))

  const portrait = (person) => person.image
    ? `<div class="person-dossier__portrait"><img loading="lazy" src="${esc(person.image)}" alt="${esc(person.alt || '')}" /></div>`
    : `<div class="person-dossier__portrait" aria-hidden="true">${esc(person.initials)}</div>`

  const card = (person, index) => `
    <article class="person-dossier${index === 4 ? ' person-dossier--wide' : ''}">
      <div class="person-dossier__top">
        ${portrait(person)}
        <div class="person-dossier__identity">
          <span>DOSSIER ${String(index + 1).padStart(2, '0')} · ${esc(person.label)}</span>
          <h3>${esc(person.name)}</h3>
          <p>${esc(person.role)}</p>
        </div>
      </div>
      <div class="person-dossier__why"><strong>Why this person matters</strong><p>${esc(person.why)}</p></div>
      <details${person.open ? ' open' : ''}>
        <summary>${person.open ? 'Full dossier' : 'Open dossier'}</summary>
        <div class="person-dossier__body">
          <p class="person-dossier__bio">${esc(person.bio)}</p>
          <ul class="person-dossier__timeline">${person.events.map(([date, text]) => `<li><time>${esc(date)}</time><span>${esc(text)}</span></li>`).join('')}</ul>
          <div class="person-dossier__record">
            <div><h4>What the record proves</h4><p>${esc(person.proves)}</p></div>
            <div><h4>What remains unknown</h4><p>${esc(person.unknown)}</p></div>
          </div>
          <details class="person-dossier__receipts"><summary>Receipts</summary><ul>${person.receipts.map(([label, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)} ↗</a></li>`).join('')}</ul></details>
        </div>
      </details>
    </article>`

  target.className = 'people-dossiers'
  target.id = 'people'
  target.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div><p class="eyebrow">THE PEOPLE IN THE CHAIN</p><h2>Who shaped the case?</h2></div>
        <p class="section-intro">Five people repeatedly appear in the public record leading to the August 26 designation. Their roles were not equal, and the evidence does not show that they secretly coordinated the outcome.</p>
      </div>
      <p class="people-chain-note">What the record does show is a transmission chain: an administration seeking a terrorism framework, a journalist proposing one, a reporter identifying the infrastructure provider, a counterterrorism analyst supplying the legal theory, and senior officials ultimately acting under a closely related theory. The missing question is who carried A/I across the final gap into the government’s targeting process.</p>
      <div class="people-chain-map" aria-label="Public transmission chain">
        <div><span>01 · Policy direction</span><strong>Trump: executive counterterrorism framework</strong></div>
        <div><span>02 · FTO proposal</span><strong>Ngo: designation route urged at White House</strong></div>
        <div><span>03 · Provider identified</span><strong>Crozier: NoBlogs traced to A/I</strong></div>
        <div><span>04 · Legal theory</span><strong>Shideler: material-support route articulated</strong></div>
        <div><span>05 · Government action</span><strong>State predicates + Treasury/OFAC designation</strong></div>
      </div>
      <div class="people-dossier-grid">${people.map(card).join('')}</div>
      <p class="people-method-note"><strong>Method note:</strong> Inclusion here means a person’s public statements or official role appears in the documented chronology. It does not mean Sabot has established secret coordination or personal responsibility for the final designation. “What remains unknown” marks questions for the administrative record and FOIA process.</p>
    </div>`

  const topNav = document.querySelector('.site-bar nav')
  if (topNav && !topNav.querySelector('a[href="#people"]')) {
    const link = document.createElement('a')
    link.href = '#people'
    link.textContent = 'People'
    const sources = topNav.querySelector('a[href="#source-library"]')
    if (sources) topNav.insertBefore(link, sources)
    else topNav.appendChild(link)
  }

  const storyNav = document.querySelector('.story-nav')
  if (storyNav && !storyNav.querySelector('a[href="#people"]')) {
    const link = document.createElement('a')
    link.href = '#people'
    link.textContent = 'People · Dossiers'
    storyNav.appendChild(link)
  }
})()
