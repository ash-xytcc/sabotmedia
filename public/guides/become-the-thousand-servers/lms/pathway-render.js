const HOST_COMPARISON_MARKER = '[[HOST_COMPARISON_GRID]]'
const HOST_COMPARISON_ROWS = [
  {
    provider: '1984 Hosting',
    url: 'https://1984.hosting/product/pricelist/',
    location: 'Iceland',
    model: 'Independent commercial host. VPS from $9.66/mo; 2 GB RAM / 50 GB disk is $19.32/mo.',
    control: '3/3',
    privacy: '3/3',
    resilience: '2/3',
    accountability: '2/3',
    fit: 'Good self-hosting fit. Full-root VPS and shared WordPress hosting are available; keep an independent backup for an unmanaged VPS.',
  },
  {
    provider: 'FlokiNET',
    url: 'https://flokinet.is/',
    location: 'Iceland / Europe',
    model: 'Privacy-focused commercial host. Iceland 2 GB RAM / 50 GB VPS is about $23/mo.',
    control: '3/3',
    privacy: '3/3',
    resilience: '2/3',
    accountability: '2/3',
    fit: 'Good self-hosting fit. Full root, privacy-preserving payment options, provider VPS backups, and DDoS filtering; a severe attack can freeze a shared VPS.',
  },
  {
    provider: 'May First Movement Technology',
    url: 'https://mayfirst.coop/membership-options/plans-pricing/',
    location: 'United States',
    model: 'Movement membership organization. Shared hosting starts at $63/year; root VPS starts at $45/mo plus membership dues.',
    control: '2–3/3',
    privacy: '2/3',
    resilience: '2/3',
    accountability: '3/3',
    fit: 'Strong hosted WordPress fit. Shared hosting also supports SSH and member-run application services; root VPS is available when needed.',
  },
  {
    provider: 'Koumbit',
    url: 'https://www.koumbit.org/en/services/vps',
    location: 'Québec, Canada',
    model: 'Nonprofit collective. Solidarity shared hosting can be free if approved; VPS starts at about $11/mo, and 2 GB RAM / 60 GB is about $21/mo.',
    control: '2–3/3',
    privacy: '?',
    resilience: '2/3',
    accountability: '3/3',
    fit: 'Good shared WordPress option; root VPS is available for software that needs command-line access. VPS backups are optional and separately billed.',
  },
  {
    provider: 'La Contre-Voie',
    url: 'https://lacontrevoie.fr/en/blog/2026/fermeture-de-autistici-inventati/',
    location: 'France',
    model: 'Small nonprofit / CHATONS member. Former NoBlogs users can request 5 GB WordPress hosting free while capacity allows.',
    control: '1/3',
    privacy: '2/3',
    resilience: '?',
    accountability: '3/3',
    fit: 'Narrow NoBlogs recovery option: no comments, limited plugins, case-by-case approval, and a 5 GB limit.',
  },
]

function hostComparisonTable(esc) {
  const cells = HOST_COMPARISON_ROWS.map((row) => `<tr><th scope="row"><a href="${esc(row.url)}" rel="noreferrer">${esc(row.provider)}</a><small>${esc(row.location)}</small></th><td>${esc(row.model)}</td><td class="score">${esc(row.control)}</td><td class="score">${esc(row.privacy)}</td><td class="score">${esc(row.resilience)}</td><td class="score">${esc(row.accountability)}</td><td>${esc(row.fit)}</td></tr>`).join('')
  return `<figure class="host-comparison"><figcaption><strong>Hosting provider comparison</strong><span>3 = strong · 2 = workable with meaningful trade-offs · 1 = limited for this use · ? = not sufficiently verified</span></figcaption><div class="host-comparison__scroll" tabindex="0" role="region" aria-label="Hosting provider comparison table"><table><thead><tr><th scope="col">Provider</th><th scope="col">Model / price (USD)</th><th scope="col">Control</th><th scope="col">Privacy &amp; data minimization</th><th scope="col">Resilience &amp; recovery</th><th scope="col">Movement accountability</th><th scope="col">NoBlogs / WordPress fit</th></tr></thead><tbody>${cells}</tbody></table></div><p class="host-comparison__note">Prices are shown in U.S. dollars. FlokiNET and Koumbit amounts are approximate USD conversions checked 2026-09-25; verify the provider’s current billed amount before paying. Scores are not totals and should not be added into a winner. Different projects need different trade-offs.</p></figure>`
}

function moduleProse(m, prose, esc) {
  const body = String(m?.body || '')
  if (!body.includes(HOST_COMPARISON_MARKER)) return prose(body)
  const parts = body.split(HOST_COMPARISON_MARKER)
  return `${prose(parts.shift())}${hostComparisonTable(esc)}${prose(parts.join(HOST_COMPARISON_MARKER))}`
}

export function renderPathways(c,{esc,prose,resources,activity},offline=false) {
  return (c.pathways||[]).filter((p)=>p.status==='published').map((p)=>{
    const ids=[...new Set(p.variants.flatMap((v)=>v.steps))]
    const link=(id)=>`#${esc(id)}`
    return `<section class="section pathway" id="${esc(p.id)}" data-pathway="${esc(p.id)}"><h2 tabindex="-1">${esc(p.title)}</h2>${prose(p.intro)}<p>Path version ${p.version}. Practical and beginner usability tests are still pending; check each real result. Keep your XML and credentials on your own device.</p>${resources(p.sources)}${offline?'<p>This reading edition saves no progress. Choose a trail below and work through its numbered steps manually.</p>':'<noscript><p>All instructions and destination trails are readable below. JavaScript is needed only to remember a choice or check answers. Follow your chosen trail and record completed work in your recovery notebook.</p></noscript><div class="learner-controls" hidden><p data-path-status role="status"></p><div class="actions">'+p.variants.map((v)=>`<button type="button" data-path-choice="${esc(v.id)}" aria-pressed="false">${esc(v.title)}</button>`).join('')+'</div><p data-path-position></p></div>'}<details><summary>Routes through this recovery path</summary>${p.variants.map((v)=>`<h3>${esc(v.title)}</h3><ol>${v.steps.map((id)=>{const m=c.modules?.find((m)=>m.id===id);return `<li>${m?`<a href="${link(id)}">${esc(m.title)}</a>`:'Step temporarily unavailable; completion waits for editorial restoration.'}</li>`}).join('')}</ol>`).join('')}</details><nav aria-label="Recovery steps"><ol>${ids.map((id)=>{const m=c.modules?.find((m)=>m.id===id);return `<li><a href="${link(id)}" data-path-step="${esc(id)}">${esc(m?.title||'Step unavailable')}<span data-step-status></span></a></li>`}).join('')}</ol></nav>${ids.map((id)=>{const m=c.modules?.find((m)=>m.id===id&&m.status==='published');return `<article class="path-module" id="${esc(id)}" data-path-module="${esc(id)}"><h3 tabindex="-1">${esc(m?.title||'Step temporarily unavailable')}</h3>${m?`<p>Supporting practical · ${esc(m.sectionId)} · version ${m.version}</p>${moduleProse(m,prose,esc)}${m.lessonSlugs.length?`<aside><h4>Use these existing lessons for this step</h4><p>Open a lesson, then use “Return to recovery path” to continue here. Hosted learners use the relevant concepts; self-hosting exercises can wait unless this is your selected route.</p><ul>${m.lessonSlugs.map((slug)=>{const l=c.lessons.find((l)=>l.slug===slug);return l?`<li><a href="#${esc(slug)}">Lesson ${l.number}: ${esc(l.title)}</a></li>`:''}).join('')}</ul></aside>`:''}${resources(m.sources)}${m.activities.map((id)=>{const a=c.activities.find((a)=>a.id===id&&a.status==='published');return a?(offline?`<aside><h4>${esc(a.title)} · version ${a.version}</h4>${prose(a.prompt)}<ul>${a.options.map((o)=>`<li>${esc(o.label)}</li>`).join('')}</ul>${prose(a.completionHelp)}<p>Record practical work yourself; use the web edition for interactive feedback.</p></aside>`:activity(a)):'<p>Required activity temporarily unavailable. This step cannot be completed until it is republished.</p>'}).join('')}${offline?'':`<div class="learner-controls" hidden><label>Private recovery notes (no passwords)<textarea rows="5" maxlength="20000" data-path-notes="${esc(id)}"></textarea></label><p>Saved with your local course progress; included only if you choose progress export or encrypted backup.</p></div>`}`:'<p>The editor has withdrawn this instruction. Existing work is retained; this path cannot complete while this step is unavailable.</p>'}</article>`}).join('')}${offline?'':`<noscript><h3>When every applicable checkpoint is done: ${esc(p.completionTitle)}</h3>${prose(p.completionBody)}<p>The alternative handoff alone does not mean the site is recovered.</p></noscript>`}${offline?'':'<div class="learner-controls" hidden><button type="button" data-path-next>Next step</button></div>'}<aside ${offline?'':'data-path-success hidden'}><h3>${esc(p.completionTitle)}</h3>${offline?'<p>Apply this exit only after every checkpoint in the hosted or self-hosted trail is actually done. The alternative handoff alone is not recovery completion.</p>':''}${prose(p.completionBody)}<p><a href="#course-map">Stop here — return to the dashboard</a></p><h4>Keep going</h4>${prose(p.continueBody)}<a href="#G01">Continue the broader course</a></aside></section>`
  }).join('')
}
