import { listNativeEntries } from './nativePublicContent.js'

export async function renderPlainHtmlListing(context, { homepageOnly = false } = {}) {
  const response = await context.next()
  if (!response.ok || context.request.method === 'HEAD' || !String(response.headers.get('content-type') || '').includes('text/html')) {
    return response
  }

  let entries = []
  if (context.env?.BF_DB) {
    try {
      entries = await listNativeEntries(context.env.BF_DB, { status: 'published' })
    } catch {
      entries = []
    }
  }

  if (homepageOnly) entries = entries.filter((entry) => entry.showOnHomepage !== false)

  const title = homepageOnly ? 'Sabot Media' : 'Sabot Media Archive'
  const heading = homepageOnly ? 'Latest reporting' : 'Archive'
  const items = entries.length
    ? entries.slice(0, 100).map(renderEntry).join('')
    : '<p>No published posts could be loaded in the plain HTML view.</p>'

  const fallback = `<noscript data-sabot-plain-html>
    <style>
      [data-sabot-plain-html] .ns-wrap{box-sizing:border-box;max-width:860px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;color:#111;background:#fff}
      [data-sabot-plain-html] *{box-sizing:border-box}
      [data-sabot-plain-html] nav{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:28px}
      [data-sabot-plain-html] nav a{margin-right:14px}
      [data-sabot-plain-html] article{margin:0 0 2rem}
      [data-sabot-plain-html] h1,[data-sabot-plain-html] h2{line-height:1.15}
      [data-sabot-plain-html] a{color:inherit;text-decoration-thickness:.1em}
      [data-sabot-plain-html] .ns-note{padding:12px;border:1px solid #777;background:#f4f4f4}
      [data-sabot-plain-html] .ns-meta{font-size:.9rem;color:#555}
      [data-sabot-plain-html] footer{border-top:1px solid #aaa;margin-top:36px;padding-top:16px;font-size:.9rem}
    </style>
    <div class="ns-wrap">
      <nav aria-label="Plain HTML navigation"><strong><a href="/">Sabot Media</a></strong> <a href="/archive">Archive</a> <a href="/campaigns">Campaigns</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/feeds">Feeds</a></nav>
      <main>
        <p class="ns-note">JavaScript is disabled. This is the plain HTML reading view.</p>
        <h1>${escapeHtml(heading)}</h1>
        ${items}
      </main>
      <footer><p>${escapeHtml(title)} · Plain HTML fallback for browsers with JavaScript disabled.</p></footer>
    </div>
  </noscript>`

  let html = await response.text()
  if (!html.includes('data-sabot-plain-html')) html = html.replace('</body>', `${fallback}\n</body>`)

  const headers = new Headers(response.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=60, s-maxage=300')
  headers.delete('content-length')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}

function renderEntry(entry) {
  const slug = String(entry?.slug || '').trim()
  if (!slug) return ''
  const title = cleanText(entry.title) || titleFromSlug(slug) || 'Untitled'
  const excerpt = truncate(cleanText(entry.excerpt || entry.body || ''), 320)
  const date = formatDate(entry.publishedAt || entry.updatedAt || entry.createdAt)
  return `<article><h2><a href="/post/${encodeURIComponent(slug)}">${escapeHtml(title)}</a></h2>${date ? `<p class="ns-meta">${escapeHtml(date)}</p>` : ''}${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ''}</article>`
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return cleanText(value)
  try {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function titleFromSlug(slug) {
  return String(slug || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

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

function truncate(value, length) {
  const text = String(value || '')
  return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
