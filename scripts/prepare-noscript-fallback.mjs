import fs from 'node:fs/promises'
import path from 'node:path'
import { publicInfoCopy } from '../src/content/publicInfoCopy.js'

const root = process.cwd()
const indexPath = path.join(root, 'index.html')
const archivePath = path.join(root, 'archive.html')
const snapshotPath = path.join(root, 'public', 'static-fallback.json')

const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
const sourceIndex = await fs.readFile(indexPath, 'utf8')

const generatedTopLevelRoutes = [
  'about', 'contact', 'submit', 'support', 'security', 'press', 'feeds',
  'campaigns', 'publications', 'updates', 'search',
]

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

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

function nav() {
  return '<nav aria-label="Plain HTML navigation"><strong><a href="/">Sabot Media</a></strong> <a href="/archive">Archive</a> <a href="/campaigns">Campaigns</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/feeds">Feeds</a></nav>'
}

function sharedStyle() {
  return `<style>
    body:has(noscript[data-sabot-plain-html]) noscript[data-sabot-static-noscript]{display:none}
    [data-sabot-static-noscript] .ns-wrap{box-sizing:border-box;max-width:860px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;color:#111;background:#fff}
    [data-sabot-static-noscript] *{box-sizing:border-box}
    [data-sabot-static-noscript] nav{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:28px}
    [data-sabot-static-noscript] nav a{margin-right:14px}
    [data-sabot-static-noscript] article{margin:0 0 2rem}
    [data-sabot-static-noscript] h1,[data-sabot-static-noscript] h2,[data-sabot-static-noscript] h3{line-height:1.15}
    [data-sabot-static-noscript] a{color:inherit;text-decoration-thickness:.1em}
    [data-sabot-static-noscript] img{max-width:100%;height:auto}
    [data-sabot-static-noscript] pre{overflow:auto;white-space:pre-wrap}
    [data-sabot-static-noscript] blockquote{border-left:3px solid #777;margin-left:0;padding-left:1rem}
    [data-sabot-static-noscript] .ns-note{padding:12px;border:1px solid #777;background:#f4f4f4}
    [data-sabot-static-noscript] .ns-meta{font-size:.9rem;color:#555}
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

function renderEntry(entry) {
  const slug = String(entry.slug || '').trim()
  const title = cleanText(entry.title) || titleFromSlug(slug) || 'Untitled'
  const excerpt = truncate(entry.excerpt || entry.body || '')
  const date = formatDate(entry.publishedAt || entry.updatedAt || entry.createdAt)
  return `<article><h2><a href="/post/${encodeURIComponent(slug)}/">${escapeHtml(title)}</a></h2>${date ? `<p class="ns-meta">${escapeHtml(date)}</p>` : ''}${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ''}</article>`
}

function renderListing(entries, { homepageOnly }) {
  const heading = homepageOnly ? 'Latest reporting' : 'Archive'
  const items = entries.length
    ? entries.slice(0, 100).map(renderEntry).join('')
    : '<p>No published posts are available in the plain HTML view.</p>'
  return shell(`<h1>${escapeHtml(heading)}</h1>${items}`)
}

function renderPost(entry) {
  const title = cleanText(entry.title) || titleFromSlug(entry.slug) || 'Untitled'
  const date = formatDate(entry.publishedAt || entry.updatedAt || entry.createdAt)
  const byline = cleanText(entry.author || entry.byline || '')
  const body = safePublishedBody(entry.body || entry.content || entry.excerpt || '')
  return shell(`<article>
    <p><a href="/archive">← Back to archive</a></p>
    <h1>${escapeHtml(title)}</h1>
    ${(date || byline) ? `<p class="ns-meta">${[byline, date].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}
    ${body || '<p>This published item has no readable text body in the static snapshot.</p>'}
  </article>`)
}

function textToParagraphs(value) {
  return String(value || '').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean).map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('')
}

function renderInfoPage(route) {
  const info = publicInfoCopy[route]
  if (info) return shell(`<h1>${escapeHtml(info.title)}</h1>${textToParagraphs(info.body)}`)

  const generic = {
    security: ['Security', 'Security guidance and public OpenPGP information for contacting Sabot Media.', '<p><a href="/keys/info-sabot-media.asc">Download Sabot Media public PGP key</a></p><p>For sensitive correspondence, use cautious channels and avoid sending unnecessary identifying information.</p>'],
    press: ['Press', 'Press information and public-facing Sabot Media materials.', '<p>For press correspondence, use the contact page and identify your outlet, deadline, and the material you are asking about.</p>'],
    feeds: ['Feeds', 'Subscribe without relying on a social platform.', '<ul><li><a href="/feeds/all-content.xml">All-content RSS feed</a></li></ul>'],
    publications: ['Publications', 'Sabot Media publications and longer-form work.', '<p>The JavaScript-free publication index is still being expanded. Published reporting remains available through the <a href="/archive">archive</a>.</p>'],
    updates: ['Updates', 'Latest Sabot Media updates.', '<p>Current published material is available through the <a href="/archive">archive</a>.</p>'],
    search: ['Search', 'Search requires the interactive site.', '<p>With JavaScript disabled, use your browser’s find function on the <a href="/archive">archive</a>, which lists public published posts.</p>'],
  }[route]

  if (!generic) return shell(`<h1>${escapeHtml(titleFromSlug(route))}</h1><p>This public page is available in the interactive site. Use the navigation above for JavaScript-free reading.</p>`)
  return shell(`<h1>${escapeHtml(generic[0])}</h1><p>${escapeHtml(generic[1])}</p>${generic[2]}`)
}

function renderCampaignIndex() {
  const campaigns = Array.isArray(snapshot?.campaigns?.items) ? snapshot.campaigns.items : []
  const visible = campaigns.filter((item) => String(item?.status || '').toLowerCase() === 'published')
  const items = visible.length ? visible.map((item) => {
    const slug = String(item.slug || '').trim()
    const title = cleanText(item.title || item.shortTitle) || titleFromSlug(slug)
    const summary = truncate(item.deck || item.summary || '', 280)
    return `<article><h2>${slug ? `<a href="/campaigns/${encodeURIComponent(slug)}/">${escapeHtml(title)}</a>` : escapeHtml(title)}</h2>${summary ? `<p>${escapeHtml(summary)}</p>` : ''}</article>`
  }).join('') : '<p>No published campaigns are available in the static snapshot.</p>'
  return shell(`<h1>Campaigns</h1>${items}`)
}

function renderCampaign(campaign) {
  const title = cleanText(campaign.title || campaign.shortTitle) || titleFromSlug(campaign.slug) || 'Campaign'
  const intro = safePublishedBody(campaign.body || campaign.description || campaign.deck || campaign.summary || '')
  return shell(`<article><p><a href="/campaigns">← Back to campaigns</a></p><h1>${escapeHtml(title)}</h1>${intro || '<p>Campaign details are available in the interactive site.</p>'}</article>`)
}

function stripGeneratedFallback(html) {
  return String(html).replace(/\n?\s*<noscript data-sabot-static-noscript>[\s\S]*?<\/noscript>/i, '')
}

function inject(html, fallback, title = '') {
  let clean = stripGeneratedFallback(html)
  if (title) clean = clean.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)} | Sabot Media</title>`)
  return clean.replace('</body>', `    ${fallback}\n  </body>`)
}

function titleFromSlug(slug) {
  return String(slug || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

async function writeRoute(route, fallback, title) {
  const dir = path.join(root, route)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'index.html'), inject(sourceIndex, fallback, title))
}

async function removeGeneratedRoute(route) {
  await fs.rm(path.join(root, route), { recursive: true, force: true })
}

const allEntries = (Array.isArray(snapshot?.nativeContent?.items) ? snapshot.nativeContent.items : [])
  .filter(isPublicPublished)
const homepageEntries = allEntries.filter((entry) => entry.showOnHomepage !== false)

await fs.writeFile(indexPath, inject(sourceIndex, renderListing(homepageEntries, { homepageOnly: true })))
await fs.writeFile(archivePath, inject(sourceIndex, renderListing(allEntries, { homepageOnly: false }), 'Archive'))

for (const route of generatedTopLevelRoutes) await removeGeneratedRoute(route)
await removeGeneratedRoute('post')

for (const route of generatedTopLevelRoutes) {
  const fallback = route === 'campaigns' ? renderCampaignIndex() : renderInfoPage(route)
  await writeRoute(route, fallback, titleFromSlug(route))
}

for (const entry of allEntries) {
  const slug = String(entry.slug || '').trim()
  await writeRoute(path.join('post', slug), renderPost(entry), cleanText(entry.title) || titleFromSlug(slug))
}

const campaignDetails = snapshot?.campaigns?.details && typeof snapshot.campaigns.details === 'object' ? snapshot.campaigns.details : {}
for (const campaign of Object.values(campaignDetails)) {
  if (!campaign || String(campaign.status || '').toLowerCase() !== 'published' || !campaign.slug) continue
  await writeRoute(path.join('campaigns', String(campaign.slug)), renderCampaign(campaign), cleanText(campaign.title || campaign.shortTitle) || titleFromSlug(campaign.slug))
}

console.log(`Prepared no-JS fallbacks: ${homepageEntries.length} homepage posts, ${allEntries.length} archive/article pages, ${generatedTopLevelRoutes.length} top-level routes.`)
