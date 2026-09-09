import fs from 'node:fs/promises'
import path from 'node:path'

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

function renderEntry(entry) {
  const slug = String(entry.slug || '').trim()
  const title = cleanText(entry.title) || slug.split('-').filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ') || 'Untitled'
  const excerpt = truncate(entry.excerpt || entry.body || '')
  const date = formatDate(entry.publishedAt || entry.updatedAt || entry.createdAt)
  return `<article><h2><a href="/post/${encodeURIComponent(slug)}">${escapeHtml(title)}</a></h2>${date ? `<p class="ns-meta">${escapeHtml(date)}</p>` : ''}${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ''}</article>`
}

function renderFallback(entries, { homepageOnly }) {
  const heading = homepageOnly ? 'Latest reporting' : 'Archive'
  const items = entries.length
    ? entries.slice(0, 100).map(renderEntry).join('')
    : '<p>No published posts are available in the plain HTML view.</p>'

  return `<noscript data-sabot-static-noscript>
    <style>
      body:has(noscript[data-sabot-plain-html]) noscript[data-sabot-static-noscript]{display:none}
      [data-sabot-static-noscript] .ns-wrap{box-sizing:border-box;max-width:860px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;color:#111;background:#fff}
      [data-sabot-static-noscript] *{box-sizing:border-box}
      [data-sabot-static-noscript] nav{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:28px}
      [data-sabot-static-noscript] nav a{margin-right:14px}
      [data-sabot-static-noscript] article{margin:0 0 2rem}
      [data-sabot-static-noscript] h1,[data-sabot-static-noscript] h2{line-height:1.15}
      [data-sabot-static-noscript] a{color:inherit;text-decoration-thickness:.1em}
      [data-sabot-static-noscript] .ns-note{padding:12px;border:1px solid #777;background:#f4f4f4}
      [data-sabot-static-noscript] .ns-meta{font-size:.9rem;color:#555}
      [data-sabot-static-noscript] footer{border-top:1px solid #aaa;margin-top:36px;padding-top:16px;font-size:.9rem}
    </style>
    <div class="ns-wrap">
      <nav aria-label="Plain HTML navigation"><strong><a href="/">Sabot Media</a></strong> <a href="/archive">Archive</a> <a href="/campaigns">Campaigns</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/feeds">Feeds</a></nav>
      <main>
        <p class="ns-note">JavaScript is disabled. This is the plain HTML reading view.</p>
        <h1>${escapeHtml(heading)}</h1>
        ${items}
      </main>
      <footer><p>Sabot Media · Plain HTML fallback for browsers with JavaScript disabled.</p></footer>
    </div>
  </noscript>`
}

function stripGeneratedFallback(html) {
  return String(html).replace(/\n?\s*<noscript data-sabot-static-noscript>[\s\S]*?<\/noscript>/i, '')
}

function inject(html, fallback) {
  const clean = stripGeneratedFallback(html)
  return clean.replace('</body>', `    ${fallback}\n  </body>`)
}

const allEntries = (Array.isArray(snapshot?.nativeContent?.items) ? snapshot.nativeContent.items : [])
  .filter(isPublicPublished)

const homepageEntries = allEntries.filter((entry) => entry.showOnHomepage !== false)

await fs.writeFile(indexPath, inject(sourceIndex, renderFallback(homepageEntries, { homepageOnly: true })))
await fs.writeFile(archivePath, inject(sourceIndex, renderFallback(allEntries, { homepageOnly: false })))

console.log(`Prepared no-JS fallbacks: ${homepageEntries.length} homepage posts, ${allEntries.length} archive posts.`)
