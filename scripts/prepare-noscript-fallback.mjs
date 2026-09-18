import fs from 'node:fs/promises'
import { articleSupplementHtml, zineSupplementHtml } from '../src/content/articleSupplements.js'
import path from 'node:path'
import { publicInfoCopy } from '../src/content/publicInfoCopy.js'
import { publicPageRegistry } from '../src/lib/publicPageRegistry.js'

const root = process.cwd()
const indexPath = path.join(root, 'index.html')
const archivePath = path.join(root, 'archive.html')
const snapshotPath = path.join(root, 'public', 'static-fallback.json')

const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
const sourceIndex = await fs.readFile(indexPath, 'utf8')

function cleanText(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function safePublishedBody(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:src|href)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, '')
}

function truncate(value, length = 320) {
  const text = cleanText(value)
  return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`
}

function titleFromSlug(slug) {
  return String(slug || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

function isPublicPublished(entry) {
  const status = String(entry?.status || '').toLowerCase()
  if (status !== 'published') return false
  const workflow = String(entry?.workflowState || '').toLowerCase()
  if (['draft', 'private', 'hidden', 'archived', 'trash', 'trashed', 'unpublished'].includes(workflow)) return false
  if (entry?.private === true || entry?.isPrivate === true || entry?.hidden === true) return false
  const publishedAt = entry?.publishedAt ? new Date(entry.publishedAt) : null
  if (publishedAt && !Number.isNaN(publishedAt.getTime()) && publishedAt.getTime() > Date.now()) return false
  return Boolean(String(entry?.slug || '').trim())
}

function isPublicCollection(item) {
  return Boolean(item && String(item.status || 'published').toLowerCase() === 'published' && String(item.slug || '').trim())
}

function isPublicCampaign(item) {
  if (!item || !String(item.slug || '').trim()) return false
  const status = String(item.status || '').toLowerCase()
  return status === 'published'
}

function isPublicPublication(item) {
  if (!item || !String(item.slug || item.id || '').trim()) return false
  return item.status === 'published' && !['private', 'hidden'].includes(item.visibility)
}

function nav() {
  return '<nav aria-label="Plain HTML navigation"><strong><a href="/">Sabot Media</a></strong> <a href="/archive">Archive</a> <a href="/campaigns">Campaigns</a> <a href="/investigations">Investigations</a> <a href="/collections">Collections</a> <a href="/publications">Publications</a> <a href="/updates">Updates</a> <a href="/press">Press</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/feeds">Feeds</a></nav>'
}

function sharedStyle() {
  return `<style>
    body:has(noscript[data-sabot-plain-html]) noscript[data-sabot-static-noscript]{display:none}
    [data-sabot-static-noscript] .ns-wrap{box-sizing:border-box;max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;color:#111;background:#fff}
    [data-sabot-static-noscript] *{box-sizing:border-box}
    [data-sabot-static-noscript] nav{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:28px}
    [data-sabot-static-noscript] nav a{display:inline-block;margin:0 14px 8px 0}
    [data-sabot-static-noscript] article{margin:0 0 2rem}
    [data-sabot-static-noscript] h1,[data-sabot-static-noscript] h2,[data-sabot-static-noscript] h3{line-height:1.15}
    [data-sabot-static-noscript] a{color:inherit;text-decoration-thickness:.1em}
    [data-sabot-static-noscript] img{max-width:100%;height:auto}
    [data-sabot-static-noscript] pre{overflow:auto;white-space:pre-wrap}
    [data-sabot-static-noscript] blockquote{border-left:3px solid #777;margin-left:0;padding-left:1rem}
    [data-sabot-static-noscript] .ns-note{padding:12px;border:1px solid #777;background:#f4f4f4}
    [data-sabot-static-noscript] .ns-meta{font-size:.9rem;color:#555}
    [data-sabot-static-noscript] .ns-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}
    [data-sabot-static-noscript] .ns-card{border-top:2px solid #111;padding-top:12px}
    [data-sabot-static-noscript] figure{margin:1.5rem 0}
    [data-sabot-static-noscript] footer{border-top:1px solid #aaa;margin-top:36px;padding-top:16px;font-size:.9rem}
  </style>`
}

function shell(content) {
  return `<noscript data-sabot-static-noscript>
    ${sharedStyle()}
    <div class="ns-wrap">
      ${nav()}
      <main>
        <p class="ns-note">JavaScript is disabled. This is the plain HTML reading view.</p>
        ${content}
      </main>
      <footer><p>Sabot Media · Plain HTML fallback for browsers with JavaScript disabled.</p></footer>
    </div>
  </noscript>`
}

function renderEntry(entry, heading = 'h2') {
  const slug = String(entry.slug || '').trim()
  const title = cleanText(entry.title) || titleFromSlug(slug) || 'Untitled'
  const excerpt = truncate(entry.excerpt || entry.body || '')
  const date = formatDate(entry.publishedAt || entry.updatedAt || entry.createdAt)
  return `<article class="ns-card"><${heading}><a href="/post/${encodeURIComponent(slug)}/">${escapeHtml(title)}</a></${heading}>${date ? `<p class="ns-meta">${escapeHtml(date)}</p>` : ''}${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ''}</article>`
}

function renderListing(entries, { homepageOnly, title } = {}) {
  const heading = title || (homepageOnly ? 'Latest reporting' : 'Archive')
  const items = entries.length ? entries.map((entry) => renderEntry(entry)).join('') : '<p>No published posts are available in the plain HTML view.</p>'
  return shell(`<h1>${escapeHtml(heading)}</h1>${items}`)
}

function renderPost(entry, surface = 'article') {
  const title = cleanText(entry.title) || titleFromSlug(entry.slug) || 'Untitled'
  const date = formatDate(entry.publishedAt || entry.updatedAt || entry.createdAt)
  const byline = cleanText(entry.author || entry.byline || '')
  const body = safePublishedBody(entry.body || entry.content || entry.excerpt || '')
  const supplement = surface === 'zine' ? zineSupplementHtml(entry.slug) : articleSupplementHtml(entry.slug)
  return shell(`<article><p><a href="/archive">← Back to archive</a></p><h1>${escapeHtml(title)}</h1>${(date || byline) ? `<p class="ns-meta">${[byline, date].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}${supplement}${body || '<p>This published item has no readable text body in the static snapshot.</p>'}</article>`)
}
function textToParagraphs(value) {
  return String(value || '').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean).map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('')
}

function postsForProject(project) {
  const wanted = cleanText(project).toLowerCase()
  if (!wanted) return []
  return allEntries.filter((entry) => {
    const values = [entry.project, entry.projectName, entry.projectSlug, ...(Array.isArray(entry.projects) ? entry.projects : [])]
    return values.some((value) => cleanText(typeof value === 'object' ? (value.slug || value.name || value.title) : value).toLowerCase() === wanted)
  })
}

function collectionPostSlugs(collection) {
  const fields = [collection.pieceSlugs, collection.postSlugs, collection.featuredPieceSlugs, collection.relatedPieces, collection.items]
  const slugs = new Set()
  for (const field of fields) {
    if (!Array.isArray(field)) continue
    for (const value of field) {
      const slug = cleanText(typeof value === 'object' ? (value.slug || value.nativeSlug || value.id) : value)
      if (slug) slugs.add(slug)
    }
  }
  return slugs
}

function renderInfoPage(route) {
  const info = publicInfoCopy[route]
  if (info) return shell(`<h1>${escapeHtml(info.title)}</h1>${textToParagraphs(info.body)}`)
  if (route === 'security') return shell('<h1>Security</h1><p>Security guidance and public OpenPGP information for contacting Sabot Media.</p><p><a href="/keys/info-sabot-media.asc">Download Sabot Media public PGP key</a></p><p>For sensitive correspondence, use cautious channels and avoid sending unnecessary identifying information.</p>')
  if (route === 'feeds') return shell('<h1>Feeds</h1><p>Subscribe without relying on a social platform.</p><ul><li><a href="/feeds/all-content.xml">All-content RSS feed</a></li></ul>')
  if (route === 'press') {
    const pressEntries = allEntries.filter((entry) => String(entry.target || '').toLowerCase() === 'press')
    return shell(`<h1>Press</h1><p>Sabot Media is an independent public-interest media project publishing reporting, essays, archive work, print material, and project-based dispatches.</p><p>For press questions, statements, interviews, corrections, or background, use the <a href="/contact">contact page</a>.</p>${pressEntries.map((entry) => renderEntry(entry)).join('')}`)
  }
  if (route === 'updates') return renderListing(allEntries, { title: 'Updates' })
  if (route === 'search') return shell('<h1>Search</h1><p>The interactive search interface requires JavaScript. The complete public post list is available in the <a href="/archive">archive</a>, where browser find works normally.</p>')
  if (route === 'aberdeen-local-1312-gallery') return shell('<h1>Aberdeen Local 1312 Gallery</h1><p>This is the JavaScript-free entry point to the historical image archive. Images and captions that are represented in published posts remain available through the <a href="/archive">archive</a>.</p>')
  if (route === 'projects') return renderProjectsIndex()
  return shell(`<h1>${escapeHtml(titleFromSlug(route))}</h1><p>This public Sabot Media route is available in the plain HTML site.</p><p><a href="/archive">Browse the public archive</a></p>`)
}

function renderCampaignIndex() {
  const items = campaigns.length ? campaigns.map((item) => {
    const slug = cleanText(item.slug)
    const title = cleanText(item.title || item.shortTitle) || titleFromSlug(slug)
    const summary = truncate(item.deck || item.summary || item.description || '', 400)
    return `<article class="ns-card"><h2><a href="/campaigns/${encodeURIComponent(slug)}/">${escapeHtml(title)}</a></h2>${summary ? `<p>${escapeHtml(summary)}</p>` : ''}</article>`
  }).join('') : '<p>No public campaigns are available in the static snapshot.</p>'
  return shell(`<h1>Campaigns</h1>${items}`)
}

function renderCampaign(campaign) {
  const title = cleanText(campaign.title || campaign.shortTitle) || titleFromSlug(campaign.slug) || 'Campaign'
  const intro = safePublishedBody(campaign.body || campaign.description || campaign.deck || campaign.summary || '')
  const related = allEntries.filter((entry) => {
    const campaignSlug = cleanText(campaign.slug).toLowerCase()
    const values = [entry.campaign, entry.campaignSlug, entry.target, ...(Array.isArray(entry.campaigns) ? entry.campaigns : [])]
    return values.some((value) => cleanText(typeof value === 'object' ? (value.slug || value.name) : value).toLowerCase() === campaignSlug)
  })
  return shell(`<article><p><a href="/campaigns">← Back to campaigns</a></p><h1>${escapeHtml(title)}</h1>${intro || ''}${related.length ? `<section><h2>Reporting and updates</h2>${related.map((entry) => renderEntry(entry, 'h3')).join('')}</section>` : ''}</article>`)
}

function renderCampaignCoverage(campaign) {
  const campaignSlug = cleanText(campaign?.slug || 'autistici-inventati').toLowerCase()
  const related = allEntries.filter((entry) => [entry.campaign, entry.campaignSlug, entry.target].some((value) => cleanText(value).toLowerCase() === campaignSlug) || cleanText(entry.title).toLowerCase().includes('autistici') || cleanText(entry.title).toLowerCase().includes('a/i'))
  return shell(`<p><a href="/campaigns/${escapeHtml(campaignSlug)}">← Back to campaign</a></p><h1>Campaign coverage archive</h1>${related.length ? related.map((entry) => renderEntry(entry)).join('') : '<p>No matching published coverage is present in the static snapshot.</p>'}`)
}

function renderCollectionsIndex() {
  const items = collections.length ? collections.map((item) => `<article class="ns-card"><h2><a href="/collections/${encodeURIComponent(item.slug)}/">${escapeHtml(cleanText(item.title) || titleFromSlug(item.slug))}</a></h2>${item.subtitle ? `<p>${escapeHtml(cleanText(item.subtitle))}</p>` : ''}${item.overview ? `<p>${escapeHtml(truncate(item.overview, 400))}</p>` : ''}</article>`).join('') : '<p>No public collections are available in the static snapshot.</p>'
  return shell(`<h1>Collections</h1>${items}`)
}

function renderCollection(collection) {
  const wanted = collectionPostSlugs(collection)
  const matching = allEntries.filter((entry) => wanted.has(cleanText(entry.slug)))
  const timeline = Array.isArray(collection.timeline) ? collection.timeline : []
  const downloads = Array.isArray(collection.downloads) ? collection.downloads : []
  const gallery = Array.isArray(collection.gallery) ? collection.gallery : []
  return shell(`<article><p><a href="/collections">← Back to collections</a></p><h1>${escapeHtml(cleanText(collection.title) || titleFromSlug(collection.slug))}</h1>${collection.subtitle ? `<p><strong>${escapeHtml(cleanText(collection.subtitle))}</strong></p>` : ''}${collection.overview ? `<p>${escapeHtml(cleanText(collection.overview))}</p>` : ''}${matching.length ? `<section><h2>Related pieces</h2>${matching.map((entry) => renderEntry(entry, 'h3')).join('')}</section>` : ''}${timeline.length ? `<section><h2>Timeline</h2>${timeline.map((item) => `<article><p class="ns-meta">${escapeHtml(formatDate(item.date) || cleanText(item.date))}</p><h3>${escapeHtml(cleanText(item.title))}</h3>${item.body ? `<p>${escapeHtml(cleanText(item.body))}</p>` : ''}</article>`).join('')}</section>` : ''}${downloads.length ? `<section><h2>Downloads</h2><ul>${downloads.filter((item) => item?.url).map((item) => `<li><a href="${escapeHtml(item.url)}">${escapeHtml(cleanText(item.title) || item.url)}</a></li>`).join('')}</ul></section>` : ''}${gallery.length ? `<section><h2>Gallery</h2>${gallery.filter((item) => item?.url).map((item) => `<figure><img src="${escapeHtml(item.url)}" alt="${escapeHtml(cleanText(item.alt || item.title))}">${item.caption || item.title ? `<figcaption>${escapeHtml(cleanText(item.caption || item.title))}</figcaption>` : ''}</figure>`).join('')}</section>` : ''}</article>`)
}

function renderPublicationsIndex() {
  const items = publications.length ? publications.filter(item => item.visibility !== 'unlisted').map((item) => `<article class="ns-card"><h2><a href="/publications/${encodeURIComponent(item.slug || item.id)}/">${escapeHtml(cleanText(item.title) || titleFromSlug(item.slug || item.id))}</a></h2>${item.description || item.subtitle ? `<p>${escapeHtml(cleanText(item.description || item.subtitle))}</p>` : ''}<p class="ns-meta">${escapeHtml(cleanText(item.publicationType || 'publication'))}${Array.isArray(item.pages) ? ` · ${item.pages.length} pages` : ''}</p></article>`).join('') : '<p>No public publications are available in the static snapshot.</p>'
  return shell(`<h1>Publications</h1>${items}`)
}

function publicationDownloads(publication) {
  const candidates = [publication.assets?.readerPdf, publication.assets?.printPdf, publication.assets?.imposedPdf, ...(Array.isArray(publication.downloadAssets) ? publication.downloadAssets.map((item) => item?.url) : [])]
  return candidates.filter(Boolean)
}

function renderPublication(publication, reader = false) {
  const slug = cleanText(publication.slug || publication.id)
  const pages = Array.isArray(publication.pages) ? publication.pages : []
  const title = cleanText(publication.title) || titleFromSlug(slug)
  const pageContent = pages.map((page, index) => {
    const blocks = Array.isArray(page.blocks) ? page.blocks : []
    const text = blocks.map((block) => cleanText(block.text)).filter(Boolean).map((value) => `<p>${escapeHtml(value)}</p>`).join('')
    return `<article class="ns-card"><h2>${index + 1}. ${escapeHtml(cleanText(page.title) || `Page ${index + 1}`)}</h2>${text || '<p>No text blocks on this page.</p>'}</article>`
  }).join('')
  const downloads = publicationDownloads(publication)
  return shell(`<article><p><a href="/publications">← Back to publications</a></p><h1>${escapeHtml(title)}</h1>${publication.description || publication.subtitle ? `<p>${escapeHtml(cleanText(publication.description || publication.subtitle))}</p>` : ''}${!reader && pages.length ? `<p><a href="/reader/${encodeURIComponent(slug)}/">Read the plain-text online edition</a></p>` : ''}${downloads.length ? `<h2>Downloads</h2><ul>${downloads.map((url) => `<li><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`).join('')}</ul>` : ''}${pages.length ? `<section><h2>${reader ? 'Pages' : 'Contents'}</h2>${pageContent}</section>` : '<p>This publication has no text pages in the static snapshot.</p>'}</article>`)
}

function projectNames() {
  const found = new Map()
  for (const entry of allEntries) {
    const values = [entry.project, entry.projectName, entry.projectSlug, ...(Array.isArray(entry.projects) ? entry.projects : [])]
    for (const value of values) {
      const raw = typeof value === 'object' ? (value.slug || value.name || value.title) : value
      const name = cleanText(raw)
      if (!name) continue
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      if (slug) found.set(slug, name)
    }
  }
  return [...found.entries()].map(([slug, name]) => ({ slug, name }))
}

function renderProjectsIndex() {
  const projects = projectNames()
  return shell(`<h1>Projects</h1>${projects.length ? `<ul>${projects.map((project) => `<li><a href="/project/${encodeURIComponent(project.slug)}/">${escapeHtml(project.name)}</a></li>`).join('')}</ul>` : '<p>No project labels are present in the public snapshot.</p>'}`)
}

function renderProject(project) {
  const entries = postsForProject(project.name).concat(postsForProject(project.slug)).filter((entry, index, list) => list.findIndex((item) => item.slug === entry.slug) === index)
  return shell(`<p><a href="/projects">← Back to projects</a></p><h1>${escapeHtml(project.name)}</h1>${entries.length ? entries.map((entry) => renderEntry(entry)).join('') : '<p>No published posts are currently assigned to this project.</p>'}`)
}

function renderInvestigationsIndex() {
  return shell('<h1>Investigations</h1><article class="ns-card"><h2><a href="/investigations/autistici-inventati/">From Kirk to A/I</a></h2><p>The reporting map, evidence trail, and source record behind Sabot Media’s investigation into the path from post-assassination anti-Antifa advocacy to the designation of Autistici/Inventati.</p></article>')
}

function renderAiInvestigation() {
  const related = allEntries.filter((entry) => {
    const haystack = `${cleanText(entry.title)} ${cleanText(entry.excerpt)} ${cleanText(entry.target)} ${cleanText(entry.campaign)} ${cleanText(entry.campaignSlug)}`.toLowerCase()
    return haystack.includes('autistici') || haystack.includes('a/i')
  })
  return shell(`<article><p><a href="/investigations">← Back to investigations</a></p><h1>From Kirk to A/I</h1><p>The reporting map, evidence trail, and source record behind Sabot Media’s investigation into the path from post-assassination anti-Antifa advocacy to the designation of Autistici/Inventati.</p>${related.length ? `<section><h2>Published reporting</h2>${related.map((entry) => renderEntry(entry, 'h3')).join('')}</section>` : ''}</article>`)
}

function stripGeneratedFallback(html) {
  return String(html).replace(/\n?\s*<noscript data-sabot-static-noscript>[\s\S]*?<\/noscript>/i, '')
}

function inject(html, fallback, title = '') {
  let clean = stripGeneratedFallback(html)
  if (title) clean = clean.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)} | Sabot Media</title>`)
  return clean.replace('</body>', `    ${fallback}\n  </body>`)
}

async function writeRoute(route, fallback, title) {
  const cleanRoute = String(route || '').replace(/^\/+|\/+$/g, '')
  if (!cleanRoute) return
  // Hand-authored public documents are already readable; never replace them with a SPA snapshot.
  if (await fs.stat(path.join(root, 'public', cleanRoute, 'index.html')).catch(() => null)) return
  const dir = path.join(root, cleanRoute)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'index.html'), inject(sourceIndex, fallback, title))
}

async function removeGeneratedRoute(route) {
  await fs.rm(path.join(root, route), { recursive: true, force: true })
}

const allEntries = (Array.isArray(snapshot?.nativeContent?.items) ? snapshot.nativeContent.items : []).filter(isPublicPublished)
const homepageEntries = allEntries.filter((entry) => entry.showOnHomepage !== false)
const campaigns = (Array.isArray(snapshot?.campaigns?.items) ? snapshot.campaigns.items : []).filter(isPublicCampaign)
const campaignDetails = snapshot?.campaigns?.details && typeof snapshot.campaigns.details === 'object' ? snapshot.campaigns.details : {}
const collections = (Array.isArray(snapshot?.collections?.items) ? snapshot.collections.items : []).filter(isPublicCollection)
const publications = (Array.isArray(snapshot?.publications?.items) ? snapshot.publications.items : []).filter(isPublicPublication)

// Clear generated public directories so stale pages cannot survive after content is unpublished or renamed.
const generatedRoots = ['post', 'piece', 'print', 'zine', 'collections', 'campaigns', 'investigations', 'project', 'projects', 'publications', 'reader', 'updates']
for (const route of generatedRoots) await removeGeneratedRoute(route)

await fs.writeFile(indexPath, inject(sourceIndex, renderListing(homepageEntries, { homepageOnly: true })))
await fs.writeFile(archivePath, inject(sourceIndex, renderListing(allEntries, { homepageOnly: false }), 'Archive'))

// Every static public route registered by the application gets a real HTML file, whether or not it is in the masthead.
for (const page of publicPageRegistry) {
  if (!page?.path || page.path === '/' || page.path === '/archive') continue
  const route = page.path.replace(/^\/+|\/+$/g, '')
  let fallback
  if (route === 'campaigns') fallback = renderCampaignIndex()
  else if (route === 'collections') fallback = renderCollectionsIndex()
  else if (route === 'publications') fallback = renderPublicationsIndex()
  else if (route === 'investigations') fallback = renderInvestigationsIndex()
  else if (route === 'investigations/autistici-inventati') fallback = renderAiInvestigation()
  else if (route === 'campaigns/autistici-inventati/coverage') fallback = renderCampaignCoverage(campaignDetails['autistici-inventati'])
  else if (route === 'campaigns/autistici-inventati' && campaignDetails['autistici-inventati']) fallback = renderCampaign(campaignDetails['autistici-inventati'])
  else fallback = renderInfoPage(route)
  await writeRoute(route, fallback, page.label || titleFromSlug(route))
}

await writeRoute('projects', renderProjectsIndex(), 'Projects')

// Every public article gets its canonical route plus all public legacy/print/update aliases.
for (const entry of allEntries) {
  const slug = cleanText(entry.slug)
  const title = cleanText(entry.title) || titleFromSlug(slug)
  const fallback = renderPost(entry)
  await writeRoute(`post/${slug}`, fallback, title)
  await writeRoute(`piece/${slug}`, fallback, title)
  await writeRoute(`updates/${slug}`, fallback, title)
  await writeRoute(`post/${slug}/print`, fallback, `${title} Print`)
  await writeRoute(`piece/${slug}/print`, fallback, `${title} Print`)
  await writeRoute(`print/${slug}`, fallback, `${title} Print`)
  await writeRoute(`zine/${slug}`, renderPost(entry, 'zine'), `${title} Zine`)
}

// Every public campaign in the snapshot gets a concrete route, not only campaigns linked in navigation.
for (const campaign of campaigns) {
  const slug = cleanText(campaign.slug)
  const detail = campaignDetails[slug] || campaign
  await writeRoute(`campaigns/${slug}`, renderCampaign(detail), cleanText(detail.title || detail.shortTitle) || titleFromSlug(slug))
}

// Every public collection in the snapshot gets a concrete route.
for (const collection of collections) {
  const slug = cleanText(collection.slug)
  await writeRoute(`collections/${slug}`, renderCollection(collection), cleanText(collection.title) || titleFromSlug(slug))
}

// Every public publication gets both landing and reader routes.
for (const publication of publications) {
  const slug = cleanText(publication.slug || publication.id)
  const title = cleanText(publication.title) || titleFromSlug(slug)
  await writeRoute(`publications/${slug}`, renderPublication(publication, false), title)
  await writeRoute(`reader/${slug}`, renderPublication(publication, true), `${title} Reader`)
}

// Project URLs are derived from public post metadata. /project and /projects aliases both work without JavaScript.
for (const project of projectNames()) {
  const fallback = renderProject(project)
  await writeRoute(`project/${project.slug}`, fallback, project.name)
  await writeRoute(`projects/${project.slug}`, fallback, project.name)
}

console.log(`Prepared complete no-JS public route set: ${homepageEntries.length} homepage posts, ${allEntries.length} articles, ${campaigns.length} campaigns, ${collections.length} collections, ${publications.length} publications, ${projectNames().length} projects, plus all registered static public routes.`)
