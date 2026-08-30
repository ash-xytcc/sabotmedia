import { AI_CAMPAIGN_GRAPHICS } from './aiCampaignGraphics.js'
import { deriveAiCampaignPublicationUpdates, loadLiveAiIntelligence, mergeCampaignUpdates } from './aiCampaignIntelligence.js'

const CAMPAIGN_URL = 'https://sabot.media/campaigns/autistici-inventati'
const BLUESKY_ACTORS = [{ actor: 'sabotmedia.bsky.social', priority: 1, url: 'https://bsky.app/profile/sabotmedia.bsky.social', note: 'Sabot Media · English-language campaign posts' }]
const MASTODON_ACCOUNTS = [
  { instance: 'https://mastodon.bida.im', acct: 'cavallette', priority: 0, url: 'https://mastodon.bida.im/@cavallette', note: 'Official Autistici/Inventati account · primarily Italian, with some bilingual posts' },
  { instance: 'https://kolektiva.social', acct: 'AberdeenLocal1312', priority: 2, url: 'https://kolektiva.social/@AberdeenLocal1312', note: 'Sabot Media network account · English-language campaign posts' },
]
const CAMPAIGN_START_MS = Date.parse('2026-08-26T00:00:00Z')
const SIGNAL = /(?:autistici(?:\s*\/\s*|\s+)?inventati|\bnoblogs\b|communications infrastructure|infrastructure is not terrorism|defend autistici|#defendai)/i
const CACHE_TTL_SECONDS = 300

export async function decorateAiCampaignForPublic(campaign, requestUrl, options = {}) {
  if (!campaign || campaign.slug !== 'autistici-inventati') return campaign
  const origin = new URL(requestUrl).origin
  const graphics = AI_CAMPAIGN_GRAPHICS.map((item) => ({ ...item, imageUrl: new URL(item.imageUrl, origin).toString(), downloadUrl: new URL(item.downloadUrl, origin).toString() }))
  const [feed, intelligence] = await Promise.all([
    options.includeSocial === false
      ? Promise.resolve({ items: [], errors: [], sources: [], checkedAt: '' })
      : loadLiveAiSocial(requestUrl).catch((error) => ({ items: [], errors: [{ platform: 'social', message: String(error?.message || error) }], sources: [], checkedAt: '' })),
    loadLiveAiIntelligence(requestUrl).catch((error) => ({ updates: [], coverage: [], errors: [{ source: 'campaign intelligence', message: String(error?.message || error) }], sources: [], checkedAt: '' })),
  ])
  const letterPdf = new URL('/campaigns/autistici-inventati/resources/individual-letter-defend-autistici-inventati.pdf', origin).toString()
  const articlePdf = new URL('/campaigns/autistici-inventati/resources/the-server-called-paranoia-article.pdf', origin).toString()
  const pdfResource = { id: 'resource-individual-letter-pdf', type: 'PDF / LETTER TEMPLATE', title: 'Individual Letter: Defend Independent Communications Infrastructure', description: 'Printable three-page individual letter template with recipient guidance for the United States, European Union, Italy and other countries.', href: letterPdf, label: 'Open / download PDF' }
  const articlePdfResource = { id: 'resource-server-called-paranoia-pdf', type: 'PDF / REPORTING', title: 'The Server Called Paranoia', description: 'Downloadable twelve-page edition of Sabot Media’s investigation and campaign reporting.', href: articlePdf, label: 'Download article PDF' }
  const builtInSources = [
    { id: 'source-treasury', publisher: 'U.S. Department of the Treasury', title: 'U.S. Treasury announcement', url: 'https://home.treasury.gov/news/press-releases/sb0616/', note: 'Official Treasury announcement of the designation and sanctions action.' },
    { id: 'source-state', publisher: 'U.S. Department of State', title: 'U.S. State Department designation', url: 'https://www.state.gov/releases/office-of-the-spokesperson/2026/08/designation-of-autistici-inventati-as-a-specially-designated-global-terrorist/', note: 'Official State Department designation statement.' },
    { id: 'source-ai-manifesto', publisher: 'Autistici/Inventati', title: 'A/I manifesto', url: 'https://www.inventati.org/who/manifesto', note: 'A/I describes its political and technical principles in its own words.' },
    { id: 'source-ai-history', publisher: 'Autistici/Inventati', title: 'A/I collective history', url: 'https://www.inventati.org/who/collective', note: 'History and background of the collective.' },
    { id: 'source-ai-plan-r', publisher: 'Autistici/Inventati', title: 'A/I Plan R*', url: 'https://www.inventati.org/who/rplan/index', note: 'A/I documentation on resilience, repression and infrastructure continuity.' },
    { id: 'source-ai-kaos', publisher: 'Autistici/Inventati', title: '+KAOS: 10 Years of Hacking and Media Activism', url: 'https://www.inventati.org/static/img/book/ai-book-kaos.pdf', note: 'The collective’s book-length account of its first decade, technical practice, political context and legal cases.' },
    { id: 'source-ai-sanctions', publisher: 'Cavallette / Autistici/Inventati', title: 'A/I public statement on U.S. sanctions', url: 'https://cavallette.noblogs.org/2026/08/10076', note: 'The collective’s public response to the U.S. sanctions.' },
    { id: 'source-ai-press-release', publisher: 'Autistici/Inventati', title: 'Press Release — August 28, 2026', url: 'https://www.inventati.org/campaign/press', note: 'English-language A/I briefing on the designation, DNS disruption, reported banking pressure and cascading risks to the collective’s communications services.' },
    { id: 'source-ai-communique-aug29', publisher: 'Autistici/Inventati', title: 'A/I communiqué — August 29, 2026', url: 'https://cavallette.noblogs.org/2026/08/10093', note: 'Official follow-up reporting partial service restoration, continuing Noblogs publishing disruption, and financial-service consequences.' },
    { id: 'source-material-support', publisher: 'Material Support and OFAC primer', title: 'Material Support and OFAC primer', url: 'https://static1.squarespace.com/static/548748b1e4b083fc03ebf70e/t/67be35d745142c70ddc7430f/1740518871622/MST%2Bresource_edit-2.pdf', note: 'Background resource on material-support law and OFAC restrictions.' },
    { id: 'source-sabot-reporting', publisher: 'Sabot Media', title: 'The Server Called Paranoia: Defend Autistici/Inventati Before September 25', url: new URL('/post/the-server-called-paranoia', origin).toString(), note: 'Sabot Media’s investigation and campaign reporting.' },
    { id: 'source-open-letter', publisher: 'Sabot Media', title: 'Open Letter: Communications Infrastructure Is Not Terrorism', url: new URL('/post/open-letter-ai', origin).toString(), note: 'The organizational open letter.' },
  ]
  const builtInCoverage = [
    { id: 'coverage-ai-communique-aug29', date: '2026-08-29T17:00:51Z', outlet: 'Autistici/Inventati', language: 'Italian', languageCode: 'it', title: 'Comunicato stampa Autistici / Inventati 29.8.2026', translatedTitle: 'Autistici/Inventati press release — August 29, 2026', url: 'https://cavallette.noblogs.org/2026/08/10093', summary: 'A/I reports that mail access was restored for almost all users and Noblogs returned read-only, while also reporting actions affecting its banking and PayPal services.' },
    { id: 'coverage-crimethinc', date: '2026-08-27', outlet: 'CrimethInc.', language: 'English', languageCode: 'en', title: 'US Government Designates Host of NoBlogs.org a “Global Terrorist”', url: 'https://en.crimethinc.com/2026/08/27/us-government-designates-host-of-noblogsorg-a-global-terrorist', summary: 'A detailed response situating the designation within attacks on independent communications infrastructure and anti-fascist organizing.' },
    { id: 'coverage-repubblica', date: '2026-08-26', outlet: 'la Repubblica', language: 'Italian', languageCode: 'it', title: 'Rubio contro l’estrema sinistra, nella lista nera di Washington un gruppo di hacker italiani', translatedTitle: 'Rubio targets the far left; an Italian hacker group is placed on Washington’s blacklist', url: 'https://www.repubblica.it/esteri/2026/08/26/news/usa_rubio_annuncia_sanzioni_a_network_estrema_sinistra_autistici_inventati_gruppo_hacker_italiani-425548615/amp/', summary: 'Italian national coverage of the designation, A/I’s services and the collective’s public response.' },
    { id: 'coverage-effimera', date: '2026-08-28', outlet: 'Effimera', language: 'Italian', languageCode: 'it', title: 'Il collettivo digitale Autistici/Inventati nella lista Usa dei terroristi globali', translatedTitle: 'The digital collective Autistici/Inventati on the U.S. global-terrorist list', url: 'https://effimera.org/il-collettivo-digitale-autistici-inventati-nella-lista-usa-dei-terroristi-globali-di-effimera/', summary: 'Movement analysis connecting the sanctions to A/I’s history, autonomous technology and the projects that depend on its infrastructure.' },
    { id: 'coverage-rainews', date: '2026-08-26', outlet: 'RaiNews', language: 'Italian', languageCode: 'it', title: 'Gli USA sanzionano tre collettivi di sinistra, c’è anche un gruppo online italiano', translatedTitle: 'U.S. sanctions three left-wing collectives, including an Italian online group', url: 'https://www.rainews.it/articoli/2026/08/usa-rubio-annuncia-sanzioni-a-network-estrema-sinistra-tra-cui-gruppo-hacker-italiano-22f51a4e-e4dc-4888-b764-fab3527567e5.html', summary: 'Public-broadcaster coverage of the U.S. announcement and its accusations against Autistici/Inventati.' },
  ]
  const builtInSignatories = [
    { id: 'signer-sabot-media', name: 'Sabot Media', location: 'USA' },
    { id: 'signer-grounded-futures', name: 'Grounded Futures Podcast', location: 'USA' },
    { id: 'signer-final-straw', name: 'The Final Straw Radio', location: 'USA' },
    { id: 'signer-dirty-hands', name: 'Dirty Hands Collective', location: 'Colorado, USA' },
    { id: 'signer-bash', name: 'BASH - Boise Autonomous Solidarity Hub', location: 'Idaho, USA' },
    { id: 'signer-crman', name: 'Chehalis River Mutual Aid Network', location: 'Washington, USA' },
    { id: 'signer-blackflower', name: 'The Blackflower Collective', location: 'Washington, USA' },
    { id: 'signer-anarkism', name: 'Anarkism.info', location: 'Sweden' },
    { id: 'signer-milk-tea-alliance', name: '#MilkTeaAlliance Calendar Team', location: 'Southeast Asia', statement: 'Many of our allies and friends in Southeast Asia use Autistici/Inventati services to protect themselves from state suppression of their speech. Other platforms often comply with takedown requests from authoritarian regimes, making A/I’s platform a lifeline. These U.S. sanctions threaten that speech and unjustly target an infrastructure provider.' },
    { id: 'signer-datenpunks', name: 'Datenpunks e.V.', location: 'Germany', statement: 'Independent hosts and technology collectives like Autistici/Inventati show that privacy-preserving communication is possible. Volunteer-run collectives protect marginalized communities from surveillance capitalism and authoritarian governments. Everyone who cares about human rights should support them.' },
    { id: 'signer-eric-gallager', name: 'Eric Gallager', location: 'New Hampshire, USA' },
    { id: 'signer-jeremy-smith', name: 'Jeremy Beausoleil Smith', location: 'Oregon, USA', statement: 'This attack on freedom of speech must be undone. It sets a dangerous precedent for further censorship and erosion of civil rights. I oppose expansion of the surveillance state in Portland, across the United States and globally.' },
    { id: 'signer-haymarket-customs', name: 'Haymarket Customs', location: 'USA' },
  ]
  const builtInTimeline = [
    { id: 'timeline-founded', date: '2001-03-01', title: 'Autistici/Inventati is formed', body: 'People and collectives working on technology, privacy, cyber-rights and political activism meet in Italy and begin building free, noncommercial communications tools. The first server is called Paranoia.' },
    { id: 'timeline-first-request', date: '2003-01-01', title: 'The first demand for user data', body: 'Investigators ask A/I for identifying information about mail users. Because the collective does not retain identity data or activity logs, it has nothing useful to hand over.' },
    { id: 'timeline-trenitalia', date: '2004-01-01', title: 'Trenitalia tries to silence a hosted site', body: 'The Italian railway company targets Zenmai, an A/I-hosted satire site criticizing military transport. The site is taken down during the dispute, but A/I ultimately wins the legal case.' },
    { id: 'timeline-aruba', date: '2004-06-15', title: 'Police compromise the Aruba server', body: 'Italian postal police shut down A/I’s server at commercial provider Aruba, copy material and obtain cryptographic keys without notifying the collective. The intervention potentially exposes communications far beyond the single mailbox under investigation.' },
    { id: 'timeline-aruba-discovery', date: '2005-06-21', title: 'A/I discovers the compromise', body: 'The collective learns of the secret 2004 intervention while reviewing legal records. It publicly documents the breach and warns users that no infrastructure provider can replace personal encryption practices.' },
    { id: 'timeline-plan-r', date: '2005-10-01', title: 'The R* Plan goes public', body: 'A/I responds by distributing services across a resistant network of self-managed servers. Machines are designed to be replaceable, data is decentralized and a single seizure should no longer collapse the whole system.' },
    { id: 'timeline-norway', date: '2010-11-01', title: 'Servers in three countries are seized', body: 'An investigation seeks logs A/I does not keep and triggers international requests involving servers in Norway, the Netherlands and Switzerland. Authorities recover encrypted files but no useful identifying information.' },
    { id: 'timeline-designation', date: '2026-08-26', title: 'The United States designates A/I', body: 'The U.S. announces terrorism-related sanctions against the volunteer collective, treating shared communications infrastructure as a target because movements used the services it provided.' },
    { id: 'timeline-ai-press-release', date: '2026-08-28', title: 'A/I documents cascading service pressure', body: 'A/I publishes an English-language briefing on the designation, the autistici.org DNS serverHold, reported pressure on banking and payment services, and the resulting risks to email, mailing lists, websites and blogs. The release distinguishes established facts from unresolved questions about who ordered each intervention.' },
    { id: 'timeline-ai-restoration', date: '2026-08-29', title: 'A/I restores access while financial pressure grows', body: 'A/I reports that mail service is accessible again for almost all users and Noblogs is back online in read-only mode. The collective also reports that Banca Etica intends to close its banking relationship and that PayPal blocked its account.' },
    { id: 'timeline-deadline', date: '2026-09-25', title: 'The wind-down period ends', body: 'The temporary U.S. authorization expires at 12:01 a.m. Eastern. Banks, hosts, registrars, certificate providers and other intermediaries may face pressure to cut services or over-comply.' },
  ]
  const builtInUpdates = [
    { id: 'update-designation', date: '2026-08-26T12:00:00Z', title: 'U.S. designation announced', body: 'The Treasury and State departments announce the designation of Autistici/Inventati, beginning the sanctions wind-down period.', url: 'https://home.treasury.gov/news/press-releases/sb0616/', pinned: false },
    { id: 'update-ai-response', date: '2026-08-26T18:00:00Z', title: 'A/I responds publicly', body: 'Autistici/Inventati rejects the allegations, defends antifascism and anticapitalism, and says the collective will continue providing digital self-defense infrastructure.', url: 'https://cavallette.noblogs.org/2026/08/10076', pinned: false },
    { id: 'update-investigation', date: '2026-08-27T10:25:23.863Z', title: 'The Server Called Paranoia published', body: 'Sabot Media publishes the core investigation, historical context and source record for the campaign.', url: new URL('/post/the-server-called-paranoia', origin).toString(), pinned: false },
    { id: 'update-open-letter', date: '2026-08-28T19:41:30.548Z', title: 'Organizational open letter published', body: 'Sabot Media publishes the open letter defending independent communications infrastructure.', url: new URL('/post/open-letter-ai', origin).toString(), pinned: false },
    { id: 'update-individual-letter', date: '2026-08-28T20:15:00Z', title: 'Individual action letter released', body: 'A printable letter template and recipient guide are released for direct advocacy in the United States, European Union, Italy and elsewhere.', url: letterPdf, pinned: false },
    { id: 'update-graphics', date: '2026-08-28T21:00:00Z', title: 'Campaign media kit released', body: 'Twenty-two campaign graphics, full-resolution downloads, alt text and captions are collected for public circulation.', url: new URL('/campaigns/autistici-inventati#graphics', origin).toString(), pinned: false },
    { id: 'update-launch', date: '2026-08-28T21:30:00Z', title: 'Live campaign hub launched', body: 'Reporting, letters, primary sources, graphics, infrastructure status and public social updates are consolidated into one permanent campaign dashboard.', url: new URL('/campaigns/autistici-inventati', origin).toString(), pinned: false },
    { id: 'update-ai-press-release', date: '2026-08-28T18:21:09Z', title: 'A/I press briefing documents cascading impacts', body: 'Autistici/Inventati publishes an English-language briefing detailing the designation, the autistici.org DNS serverHold, reported banking and payment pressure, and risks to email, mailing lists, websites and blogs while separating confirmed facts from unresolved attribution.', url: 'https://www.inventati.org/campaign/press', pinned: false },
    { id: 'update-ai-communique-aug29', date: '2026-08-29T17:00:51Z', title: 'A/I reports partial restoration and financial-service pressure', body: 'A/I reports that mail access has returned for almost all users and Noblogs is online read-only while technicians continue restoration. The collective also reports banking and PayPal consequences following the designation.', url: 'https://cavallette.noblogs.org/2026/08/10093', pinned: true },
  ]
  const actions = [...(campaign.actions || [])].sort((a, b) => actionRank(a) - actionRank(b))
  const sourceSignatories = Array.isArray(options.signatories) ? options.signatories : builtInSignatories
  const signatories = dedupeSignatories([...sourceSignatories, ...(campaign.signatories || [])]).filter((item) => !/we\s+will\s+free\s+us/i.test(String(item.name || '')))
  const publicationUpdates = deriveAiCampaignPublicationUpdates(options.posts || [], requestUrl)
  const officialSocialUpdates = (feed.items || []).filter((item) => /cavallette/i.test(`${item.account || ''} ${item.handle || ''}`)).map((item) => ({
    id: `official-social-${item.id}`,
    date: item.date,
    title: 'A/I public campaign update',
    body: String(item.text || item.excerpt || '').slice(0, 360),
    url: item.url,
    pinned: false,
    automated: true,
    source: 'A/I official Mastodon',
  }))
  const updates = mergeCampaignUpdates(builtInUpdates, publicationUpdates, intelligence.updates, officialSocialUpdates, campaign.updates || [])
  return {
    ...campaign,
    summary: 'Sabot Media is independently documenting and opposing the treatment of resistant communications infrastructure as terrorism. This page gathers the campaign in one place and will remain as a public archive after the deadline.',
    partners: ['Sabot Media'],
    disclaimer: 'Sabot Media is an independent publisher. We are not affiliated with Autistici/Inventati and do not represent or speak on behalf of A/I. Campaign material is political advocacy and reporting, not legal advice.',
    actions,
    campaignKeywords: ['autistici/inventati', 'a/i campaign'],
    updates,
    timeline: dedupeById([...builtInTimeline, ...(campaign.timeline || [])]),
    resources: dedupeByUrl([articlePdfResource, pdfResource, ...(campaign.resources || [])], 'href'),
    coverage: dedupeCoverage([...(campaign.coverage || []), ...builtInCoverage, ...intelligence.coverage]),
    signatories,
    signatoriesSource: Array.isArray(options.signatories) ? 'published-open-letter' : 'bundled-fallback',
    sources: dedupeByUrl([...builtInSources, ...(campaign.sources || [])], 'url'),
    faq: (campaign.faq || []).map((item) => item.id === 'faq-affiliation' ? { ...item, answer: 'No. Sabot Media is an independent publisher and does not represent or speak for A/I.' } : item),
    graphics: dedupeByUrl([...graphics, ...(campaign.graphics || [])], 'imageUrl'),
    social: dedupeByUrl([...feed.items, ...(campaign.social || [])], 'url'),
    socialSources: feed.sources,
    socialErrors: feed.errors,
    socialCheckedAt: feed.checkedAt,
    intelligenceSources: intelligence.sources,
    intelligenceErrors: intelligence.errors,
    intelligenceCheckedAt: intelligence.checkedAt,
  }
}

function actionRank(action) {
  const value = `${action?.id || ''} ${action?.title || ''}`
  if (/reporting/i.test(value)) return 0
  if (/letter/i.test(value)) return 1
  return 2
}

export async function loadLiveAiSocial(requestUrl, fetcher = fetch) {
  const origin = new URL(requestUrl).origin
  const cacheKey = new Request(`${origin}/__campaign-cache/autistici-inventati-social-v5`)
  const cache = globalThis.caches?.default
  if (cache) { const cached = await cache.match(cacheKey); if (cached) return cached.json() }
  const jobs = [
    ...MASTODON_ACCOUNTS.map((account) => ({ platform: 'mastodon', label: `@${account.acct}@${new URL(account.instance).host}`, priority: account.priority, url: account.url, note: account.note, promise: fetchMastodonAccount(account, fetcher) })),
    ...BLUESKY_ACTORS.map((account) => ({ platform: 'bluesky', label: `@${account.actor}`, priority: account.priority, url: account.url, note: account.note, promise: fetchBlueskyActor(account.actor, fetcher) })),
  ]
  const settled = await Promise.allSettled(jobs.map((job) => job.promise))
  const errors = [], sources = [], collected = []
  settled.forEach((result, index) => { const job = jobs[index]; if (result.status === 'fulfilled') { sources.push({ platform: job.platform, account: job.label, url: job.url, note: job.note, ok: true }); collected.push(...result.value.map((item) => ({ ...item, sourcePriority: job.priority }))) } else { sources.push({ platform: job.platform, account: job.label, url: job.url, note: job.note, ok: false }); errors.push({ platform: job.platform, account: job.label, message: String(result.reason?.message || result.reason) }) } })
  const items = dedupeByUrl(collected.filter(isCampaignSocialPost).sort((a, b) => (a.sourcePriority ?? 99) - (b.sourcePriority ?? 99) || new Date(b.date || 0) - new Date(a.date || 0)), 'url').slice(0, 16)
  const payload = { ok: errors.length < jobs.length, items, sources, errors, checkedAt: new Date().toISOString() }
  if (cache) await cache.put(cacheKey, new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${CACHE_TTL_SECONDS}` } })).catch(() => {})
  return payload
}

export function isCampaignSocialPost(item) {
  const publishedAt = new Date(item?.date || 0).getTime()
  if (!Number.isFinite(publishedAt) || publishedAt < CAMPAIGN_START_MS) return false
  const text = `${item?.text || item?.excerpt || ''} ${item?.external?.url || ''} ${item?.url || ''}`
  return text.includes(CAMPAIGN_URL) || SIGNAL.test(text)
}

async function fetchBlueskyActor(actor, fetcher) {
  const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed'); url.searchParams.set('actor', actor); url.searchParams.set('limit', '50'); url.searchParams.set('filter', 'posts_no_replies')
  const response = await fetchWithTimeout(url, fetcher); if (!response.ok) throw new Error(`Bluesky returned ${response.status}`)
  const data = await response.json(); return (data?.feed || []).map(({ post }) => normalizeBluesky(post)).filter(Boolean)
}

function normalizeBluesky(post) {
  const handle = String(post?.author?.handle || ''), rkey = String(post?.uri || '').split('/').pop() || '', text = String(post?.record?.text || '')
  if (!handle || !rkey || !text) return null
  const images = (post?.embed?.images || []).map((image) => ({ url: String(image?.fullsize || image?.thumb || ''), alt: String(image?.alt || '') })).filter((image) => image.url)
  const externalView = post?.embed?.external || post?.embed?.media?.external
  const language = socialLanguage(text, post?.record?.langs)
  return { id: `bsky-${post?.cid || rkey}`, platform: 'BLUESKY', date: String(post?.record?.createdAt || post?.indexedAt || ''), account: String(post?.author?.displayName || handle), handle: `@${handle}`, text, excerpt: text, url: `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}`, images, imageUrl: images[0]?.url || '', language: language.label, languageCode: language.code, external: externalView?.uri ? { url: String(externalView.uri), title: String(externalView.title || ''), description: String(externalView.description || '') } : null }
}

async function fetchMastodonAccount({ instance, acct }, fetcher) {
  const lookup = new URL('/api/v1/accounts/lookup', instance); lookup.searchParams.set('acct', acct)
  const accountResponse = await fetchWithTimeout(lookup, fetcher); if (!accountResponse.ok) throw new Error(`Mastodon account lookup returned ${accountResponse.status}`)
  const account = await accountResponse.json(), statusesUrl = new URL(`/api/v1/accounts/${encodeURIComponent(account.id)}/statuses`, instance); statusesUrl.searchParams.set('limit', '40'); statusesUrl.searchParams.set('exclude_replies', 'true')
  const response = await fetchWithTimeout(statusesUrl, fetcher); if (!response.ok) throw new Error(`Mastodon returned ${response.status}`)
  return (await response.json()).map((status) => { const text = stripHtml(status?.content || ''); const images = (status?.media_attachments || []).map((media) => ({ url: String(media?.url || media?.preview_url || ''), alt: String(media?.description || '') })).filter((image) => image.url); const language = String(acct).toLowerCase() === 'cavallette' ? cavalletteLanguage(text) : socialLanguage(text, [status?.language]); return { id: `mastodon-${status.id}`, platform: 'MASTODON', date: String(status.created_at || ''), account: String(status?.account?.display_name || acct), handle: `@${status?.account?.acct || acct}`, text, excerpt: text, url: String(status?.url || status?.uri || ''), images, imageUrl: images[0]?.url || '', language: language.label, languageCode: language.code, contentWarning: String(status?.spoiler_text || '') } })
}

export function extractAiLetterSignatories(html) {
  const source = String(html || '')
  const signed = source.match(/<div\b[^>]*>\s*Signed,\s*<\/div>/i)
  if (!signed) return []
  const afterSigned = source.slice((signed.index || 0) + signed[0].length)
  const signOnIndex = afterSigned.search(/<b\b[^>]*>\s*(?:<strong\b[^>]*>\s*)?Sign on/i)
  const section = signOnIndex >= 0 ? afterSigned.slice(0, signOnIndex) : ''
  if (!section) return []
  const signatories = []
  const tokenized = section
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, statement) => `\n@@STATEMENT:${stripHtml(statement)}\n`)
    .replace(/<br\s*\/?>|<\/?(?:div|p)\b[^>]*>/gi, '\n')
  const lines = tokenized.split(/\n+/).map(stripHtml).filter(Boolean)
  for (const rawLine of lines) {
    if (rawLine.startsWith('@@STATEMENT:')) {
      const last = signatories.at(-1)
      if (last) last.statement = rawLine.slice('@@STATEMENT:'.length).trim()
      continue
    }
    const says = /\s+says:\s*$/i.test(rawLine)
    const line = rawLine.replace(/\s+says:\s*$/i, '').trim()
    const dashIndex = line.lastIndexOf(' - ')
    const comma = dashIndex < 0 && line.match(/^(.*?),\s*([A-Z][A-Za-z /.-]{1,30})$/)
    const name = String(dashIndex >= 0 ? line.slice(0, dashIndex) : comma?.[1] || line).trim()
    const location = String(dashIndex >= 0 ? line.slice(dashIndex + 3) : comma?.[2] || '').trim()
    if (name) signatories.push({ id: `signer-${slugify(name)}`, name, location, expectsStatement: says })
  }
  return signatories.map(({ expectsStatement, ...item }) => item)
}

export function hasAiLetterSignatureSection(html) {
  return /<div\b[^>]*>\s*Signed,\s*<\/div>[\s\S]*?<b\b[^>]*>\s*(?:<strong\b[^>]*>\s*)?Sign on/i.test(String(html || ''))
}

function socialLanguage(text, declared = []) {
  const value = String(text || '')
  const codes = (Array.isArray(declared) ? declared : [declared]).map((item) => String(item || '').toLowerCase())
  const markedItalian = /\[(?:ita|it|italiano)\]/i.test(value)
  const markedEnglish = /\[(?:en|eng|english)\]|english version/i.test(value)
  if (markedItalian && markedEnglish) return { code: '', label: 'Italian + English' }
  if (codes.some((code) => code.startsWith('it'))) return { code: 'it', label: 'Italian' }
  if (codes.some((code) => code.startsWith('en'))) return { code: 'en', label: 'English' }
  return { code: '', label: '' }
}

function cavalletteLanguage(text) {
  const value = String(text || '')
  if (/\[(?:ita|it|italiano)\]/i.test(value) && /\[(?:en|eng|english)\]/i.test(value)) return { code: '', label: 'Italian + English' }
  if (/english version|\*\s*\*\s*\*/i.test(value)) return { code: '', label: 'Italian + English' }
  return { code: 'it', label: 'Italian' }
}

async function fetchWithTimeout(url, fetcher) { const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000); try { return await fetcher(url.toString(), { headers: { accept: 'application/json', 'user-agent': 'SabotMediaCampaign/1.0 (+https://sabot.media)' }, signal: controller.signal }) } finally { clearTimeout(timer) } }
function dedupeByUrl(items, key) { const seen = new Set(); return items.filter((item) => { const value = String(item?.[key] || '').trim(); if (!value || seen.has(value)) return false; seen.add(value); return true }) }
function dedupeById(items) { const seen = new Set(); return items.filter((item) => { const value = String(item?.id || '').trim(); if (!value || seen.has(value)) return false; seen.add(value); return true }) }
function dedupeSignatories(items) { const seen = new Set(); return items.filter((item) => { const value = String(item?.name || '').trim().toLowerCase(); if (!value || seen.has(value)) return false; seen.add(value); return true }) }
function dedupeCoverage(items) { const urls = new Set(), titles = new Set(); return items.filter((item) => { const url = String(item?.url || '').trim().replace(/\/$/, '').toLowerCase(), title = String(item?.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' '); if ((!url && !title) || urls.has(url) || titles.has(title)) return false; if (url) urls.add(url); if (title) titles.add(title); return true }) }
function slugify(value) { return String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'signatory' }
function stripHtml(value) { return String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\u00a0/g, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#(?:39|x27);/gi, "'").replace(/\s+/g, ' ').trim() }
