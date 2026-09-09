import { isReadablePath, renderReadingPage } from './api/_lib/readablePage.js'
import { permissionHasCapability, resolvePublicSitePermission } from './api/_lib/publicSiteAuth.js'
import { getNativeEntry, listNativeEntries } from './api/_lib/nativePublicContent.js'
import { getCampaign, listCampaigns } from './api/_lib/campaigns.js'

export const ADMIN_PREFIXES = [
  '/admin', '/wp-admin', '/printlab', '/audiolab', '/content', '/posts', '/add-new', '/post-new', '/native-bridge',
  '/native-preview', '/media', '/settings', '/customize', '/site-editor', '/advanced-draft-tools', '/tools', '/users',
  '/pages', '/collections-admin', '/campaigns-admin', '/publications-admin', '/feeds-admin', '/menus', '/sites', '/podcasts', '/draft', '/review',
  '/qa', '/overrides', '/system-backup', '/audit-log', '/analytics', '/site-health', '/taxonomy', '/roles', '/design-system',
  '/platform-map',
]

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const PAGE_METHODS = new Set(['GET', 'HEAD'])
const PUBLIC_AUTH_API_PATHS = new Set([
  '/api/course-contributors',
  '/api/course-recovery',
  '/api/login',
  '/api/logout',
  '/api/session',
  '/api/analytics/collect',
  '/api/campaign-contributor-auth',
  '/api/campaign-correspondence',
  '/api/campaign-contributor-media',
  '/api/episode-worker',
  '/api/episode-worker-credentials',
  '/api/episode-worker-media',
])
const PUBLIC_SPA_EXACT_PATHS = new Set([
  '/', '/archive', '/search', '/about', '/security', '/contact', '/submit', '/support', '/press', '/feeds',
  '/campaigns', '/collections', '/publications', '/updates', '/projects', '/investigations', '/lounge', '/saboteur',
  '/gallery/crumbs', '/aberdeen-local-1312-gallery', '/login', '/wp-login', '/logout',
])

const ADMIN_PAGE_CAPABILITIES = [
  ['/wp-admin/users', 'users:manage'],
  ['/users', 'users:manage'],
  ['/wp-admin/roles', 'users:manage'],
  ['/roles', 'users:manage'],
  ['/wp-admin/settings', 'site:manage'],
  ['/settings', 'site:manage'],
  ['/wp-admin/customize', 'site:manage'],
  ['/customize', 'site:manage'],
  ['/wp-admin/sites', 'site:manage'],
  ['/sites', 'site:manage'],
  ['/wp-admin/campaigns', 'publishing:write'],
  ['/campaigns-admin', 'publishing:write'],
  ['/wp-admin/system-backup', 'system:view'],
  ['/system-backup', 'system:view'],
  ['/wp-admin/site-health', 'system:view'],
  ['/site-health', 'system:view'],
  ['/wp-admin/audit-log', 'system:view'],
  ['/audit-log', 'system:view'],
  ['/wp-admin/tools', 'system:view'],
  ['/tools', 'system:view'],
]

const API_WRITE_CAPABILITIES = [
  ['/api/users', 'users:manage'],
  ['/api/editor-roles', 'users:manage'],
  ['/api/public-site-config', 'site:manage'],
  ['/api/feed-settings', 'site:manage'],
  ['/api/podcast-settings', 'publishing:write'],
  ['/api/sites', 'site:manage'],
  ['/api/native-content', 'content:write'],
  ['/api/taxonomy', 'content:write'],
  ['/api/collections', 'publishing:write'],
  ['/api/campaigns', 'publishing:write'],
  ['/api/campaign-coverage', 'publishing:write'],
  ['/api/publications', 'publishing:write'],
  ['/api/media-assets', 'media:write'],
  ['/api/media/files', 'media:write'],
  ['/api/audiolab', 'media:write'],
  ['/api/podcasts', 'publishing:write'],
]

export function isAdminRoutePath(pathname = '') {
  return ADMIN_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function isPublicSpaPath(pathname = '') {
  const normalized = pathname === '/' ? '/' : String(pathname || '').replace(/\/+$/, '')
  if (PUBLIC_SPA_EXACT_PATHS.has(normalized)) return true
  return /^\/(?:project|projects|print|zine|collections|publications|reader|read|updates|contribute)\/[^/]+$/i.test(normalized)
    || /^\/(?:post|piece)\/[^/]+\/print$/i.test(normalized)
    || /^\/investigations\/[a-z0-9-]+$/i.test(normalized)
    || /^\/gallery\/[a-z0-9-]+$/i.test(normalized)
}

export async function onRequest(context) {
  const url = new URL(context.request.url)

  if (url.hostname.toLowerCase() === 'www.sabot.media') {
    url.hostname = 'sabot.media'
    return Response.redirect(url.toString(), 308)
  }

  if (url.pathname === '/archive.html') { url.pathname = '/archive'; return Response.redirect(url.toString(), 308) }

  if (url.pathname === '/pgp.asc') {
    return Response.redirect(new URL('/keys/info-sabot-media.asc', url.origin).toString(), 308)
  }

  const method = String(context.request.method || 'GET').toUpperCase()
  if (PAGE_METHODS.has(method) && /\/index\.html$/.test(url.pathname)) {
    const canonical = url.pathname.replace(/\/index\.html$/, '') || '/'
    if (isReadablePath(canonical)) { url.pathname = canonical; return Response.redirect(url.toString(), 308) }
  }
  if (PAGE_METHODS.has(method) && url.pathname.length > 1 && url.pathname.endsWith('/')) {
    const stripped = url.pathname.replace(/\/+$/, '')
    if (isPublicPostPath(stripped) || isPublicCampaignPath(stripped) || isPublicSpaPath(stripped)) {
      url.pathname = stripped
      return Response.redirect(url.toString(), 308)
    }
  }

  const pathname = url.pathname
  const isAdminRoute = isAdminRoutePath(pathname)
  const isApiWrite = pathname.startsWith('/api/') && WRITE_METHODS.has(method)

  if (PUBLIC_AUTH_API_PATHS.has(pathname)) return context.next()
  if (PAGE_METHODS.has(method) && isReadablePath(pathname)) return renderReadingPage(context, url)
  if (method === 'GET' && isPublicPostPath(pathname)) return renderPublicPost(context, url)
  if (PAGE_METHODS.has(method) && isPublicCampaignPath(pathname)) return renderPublicCampaign(context, url)
  if (PAGE_METHODS.has(method) && !isAdminRoute && isPublicSpaPath(pathname)) return renderSpaShell(context, url)
  if (!isAdminRoute && !isApiWrite) return context.next()

  const permission = await resolvePublicSitePermission(context)

  if (isApiWrite) {
    const requiredCapability = matchingCapability(pathname, API_WRITE_CAPABILITIES)
    const allowed = requiredCapability ? permissionHasCapability(permission, requiredCapability) : permission.canEdit
    if (allowed) return context.next()
    return forbiddenJson(permission, requiredCapability)
  }

  if (isAdminRoute && PAGE_METHODS.has(method)) {
    if (!permission.canAccessAdmin) return redirectToLogin(url)
    const requiredCapability = matchingCapability(pathname, ADMIN_PAGE_CAPABILITIES)
    if (requiredCapability && !permissionHasCapability(permission, requiredCapability)) {
      const dashboard = new URL('/wp-admin', url.origin)
      dashboard.searchParams.set('access', 'denied')
      dashboard.searchParams.set('required', requiredCapability)
      return Response.redirect(dashboard.toString(), 302)
    }
    if (context.env?.ASSETS?.fetch) {
      const indexUrl = new URL('/index.html', url.origin)
      return context.env.ASSETS.fetch(new Request(indexUrl.toString(), context.request))
    }
    return context.next()
  }

  return redirectToLogin(url)
}

function matchingCapability(pathname, rules) {
  for (const [prefix, capability] of rules) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return capability
  }
  return ''
}

function forbiddenJson(permission, requiredCapability) {
  return new Response(JSON.stringify({
    ok: false,
    canEdit: false,
    error: requiredCapability ? `permission required: ${requiredCapability}` : (permission.reason || 'authentication required'),
    authMode: permission.mode || 'locked',
    role: permission.role || '',
    requiredCapability: requiredCapability || '',
  }, null, 2), {
    status: 403,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function redirectToLogin(url) {
  const loginUrl = new URL('/login', url.origin)
  loginUrl.searchParams.set('returnTo', `${url.pathname}${url.search || ''}${url.hash || ''}`)
  return Response.redirect(loginUrl.toString(), 302)
}

function isPublicPostPath(pathname) {
  return /^\/(?:post|piece)\/[^/]+\/?$/.test(pathname)
}

export function isPublicCampaignPath(pathname = '') {
  return pathname === '/campaigns' || /^\/campaigns\/[a-z0-9-]+(?:\/(?:coverage|benefit-kit|instagram-connect))?\/?$/i.test(pathname)
}

async function renderSpaShell(context, url) {
  if (!context.env?.ASSETS?.fetch) return context.next()

  const normalizedPath = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '')
  const routeAssetPath = normalizedPath === '/investigations/autistici-inventati'
    ? '/_reading/autistici-inventati'
    : normalizedPath ? `${normalizedPath}/` : '/'
  const requestAsset = async (assetPath) => context.env.ASSETS.fetch(new Request(new URL(assetPath, url.origin), {
    method: context.request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: { accept: 'text/html' },
  }))

  let response = await requestAsset(routeAssetPath)
  if (!response.ok && routeAssetPath !== '/') response = await requestAsset('/')
  if (!response.ok) return response

  const headers = new Headers(response.headers)
  headers.set('cache-control', 'public, max-age=60, s-maxage=300')
  if (context.request.method === 'HEAD' || !String(response.headers.get('content-type') || '').includes('text/html')) {
    return new Response(null, { status: 200, headers })
  }

  let html = await response.text()

  // The build generates route-specific no-JS HTML for every public route. Preserve it.
  // Dynamic home/archive data may replace that static snapshot when D1 is available.
  if ((url.pathname === '/' || url.pathname === '/archive') && context.env?.BF_DB) {
    try {
      const entries = await listNativeEntries(context.env.BF_DB, { status: 'published' })
      const visibleEntries = url.pathname === '/' ? entries.filter((entry) => entry.showOnHomepage !== false) : entries
      html = injectNoScript(html, renderNoScriptHome(visibleEntries, url))
    } catch {
      // Keep the generated static fallback when storage is unavailable.
    }
  } else if (!html.includes('data-sabot-static-noscript') && !html.includes('data-sabot-plain-html')) {
    html = injectNoScript(html, renderNoScriptGeneric(url))
  }

  headers.set('content-type', 'text/html; charset=utf-8')
  headers.delete('content-length')
  return new Response(html, { status: 200, headers })
}

async function renderPublicCampaign(context, url) {
  const slug = url.pathname.match(/^\/campaigns\/([^/]+)/)?.[1] || ''
  const isCoverageArchive = /\/coverage\/?$/.test(url.pathname)
  let campaign = null
  let campaigns = []

  if (context.env?.BF_DB) {
    try {
      if (slug) campaign = await getCampaign(context.env.BF_DB, decodeURIComponent(slug))
      else campaigns = await listCampaigns(context.env.BF_DB)
    } catch {
      // Serve a safe generic shell if storage is unavailable.
    }
  }

  if (campaign?.status !== 'published') campaign = null
  const campaignTitle = cleanText(campaign?.title || (slug ? titleFromSlug(slug) : 'Campaigns'))
  const title = isCoverageArchive ? `${campaign?.shortTitle || campaignTitle} Coverage Archive` : campaignTitle
  const description = truncate(cleanText(isCoverageArchive ? `Search reporting, analysis, and public statements connected to ${campaign?.shortTitle || campaignTitle}.` : campaign?.deck || campaign?.summary || (slug
    ? 'Sabot Media campaign reporting, source records, live updates, and public action materials.'
    : 'Sabot Media campaign hubs gathering reporting, sources, live updates, and public action materials.')), 240)
  const canonicalPath = isCoverageArchive ? `/campaigns/${encodeURIComponent(slug)}/coverage` : slug ? `/campaigns/${encodeURIComponent(slug)}` : '/campaigns'
  const canonical = `${url.origin}${canonicalPath}`
  const image = absoluteUrl(campaign?.heroImage || '/sabot-logo.png', url.origin)
  const response = await renderSpaShell(context, url)
  if (!response.ok || context.request.method === 'HEAD' || !String(response.headers.get('content-type') || '').includes('text/html')) return response

  let html = await response.text()
  const pageTitle = title === 'Sabot Media' ? title : `${title} | Sabot Media`
  const replacements = {
    '<title>Sabot Media</title>': `<title>${escapeHtml(pageTitle)}</title>`,
    '<meta name="description" content="Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media." />': `<meta name="description" content="${escapeHtml(description)}" />`,
    '<meta property="og:title" content="Sabot Media" />': `<meta property="og:title" content="${escapeHtml(title)}" />`,
    '<meta property="og:description" content="Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media." />': `<meta property="og:description" content="${escapeHtml(description)}" />`,
    '<meta property="og:image" content="/sabot-logo.png" />': `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:title" content="Sabot Media" />': `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    '<meta name="twitter:description" content="Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media." />': `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    '<meta name="twitter:image" content="/sabot-logo.png" />': `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  }
  for (const [from, to] of Object.entries(replacements)) html = html.replace(from, to)
  html = html.replace('</head>', `    <meta property="og:url" content="${escapeHtml(canonical)}" />\n    <link rel="canonical" href="${escapeHtml(canonical)}" />\n  </head>`)

  const fallback = slug
    ? renderNoScriptCampaign(campaign, title, description, url, isCoverageArchive)
    : renderNoScriptCampaignIndex(campaigns, url)
  html = replaceNoScript(html, fallback)

  const headers = new Headers(response.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.delete('content-length')
  return new Response(html, { status: 200, headers })
}

async function renderPublicPost(context, url) {
  const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '')
  let post = null

  if (context.env?.BF_DB) {
    try {
      post = await getNativeEntry(context.env.BF_DB, slug)
    } catch {
      // The route must still return the SPA when content storage is unavailable.
    }
  }

  const title = cleanText(post?.seoTitle || post?.title || titleFromSlug(slug)) || 'Sabot Media'
  const description = truncate(cleanText(post?.seoDescription || post?.excerpt || post?.body || ''), 240)
    || 'Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media.'
  const image = absoluteUrl(post?.featuredImage || post?.heroImage || post?.imageUrl || '/sabot-logo.png', url.origin)
  const canonical = `${url.origin}/post/${encodeURIComponent(slug)}`
  const indexUrl = new URL('/', url.origin)
  const response = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(new Request(indexUrl, { method: 'GET', headers: { accept: 'text/html' } }))
    : await context.next()

  if (!response.ok || !String(response.headers.get('content-type') || '').includes('text/html')) return response

  const html = await response.text()
  const pageTitle = title === 'Sabot Media' ? title : `${title} | Sabot Media`
  const replacements = {
    '<title>Sabot Media</title>': `<title>${escapeHtml(pageTitle)}</title>`,
    '<meta name="description" content="Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media." />': `<meta name="description" content="${escapeHtml(description)}" />`,
    '<meta property="og:title" content="Sabot Media" />': `<meta property="og:title" content="${escapeHtml(title)}" />`,
    '<meta property="og:description" content="Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media." />': `<meta property="og:description" content="${escapeHtml(description)}" />`,
    '<meta property="og:type" content="website" />': '<meta property="og:type" content="article" />',
    '<meta property="og:image" content="/sabot-logo.png" />': `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:title" content="Sabot Media" />': `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    '<meta name="twitter:description" content="Independent reporting, essays, comics, podcasts, zines, and project-based archive work from Sabot Media." />': `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    '<meta name="twitter:image" content="/sabot-logo.png" />': `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  }

  let rendered = html
  for (const [from, to] of Object.entries(replacements)) rendered = rendered.replace(from, to)
  rendered = rendered.replace('</head>', `    <meta property="og:url" content="${escapeHtml(canonical)}" />\n    <link rel="canonical" href="${escapeHtml(canonical)}" />\n  </head>`)
  rendered = injectNoScript(rendered, renderNoScriptPost(post, title, description, image, url))

  const headers = new Headers(response.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=60, s-maxage=300')
  headers.delete('content-length')
  return new Response(rendered, { status: 200, headers })
}

function renderNoScriptHome(entries, url) {
  const visible = Array.isArray(entries) ? entries.slice(0, 50) : []
  const items = visible.length
    ? visible.map((entry) => {
      const title = cleanText(entry.title || titleFromSlug(entry.slug)) || 'Untitled'
      const excerpt = truncate(cleanText(entry.excerpt || entry.body || ''), 320)
      const date = formatDate(entry.publishedAt || entry.updatedAt || entry.createdAt)
      return `<article><h2><a href="/post/${encodeURIComponent(entry.slug)}">${escapeHtml(title)}</a></h2>${date ? `<p class="ns-meta">${escapeHtml(date)}</p>` : ''}${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ''}</article>`
    }).join('')
    : '<p>No published posts could be loaded in the plain HTML view.</p>'

  return noScriptDocument('Sabot Media', `
    <p class="ns-lede">Independent reporting, essays, comics, podcasts, zines, and project-based archive work.</p>
    <p class="ns-note">JavaScript is disabled. This is the plain HTML reading view. Core reporting remains readable; interactive features are omitted.</p>
    <section aria-labelledby="ns-latest"><h1 id="ns-latest">Latest reporting</h1>${items}</section>
  `, url)
}

function renderNoScriptPost(post, title, description, image, url) {
  if (!post) {
    return noScriptDocument(title, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p>The article body could not be loaded from storage. Try the <a href="/archive">archive</a> or <a href="/feeds">feeds</a>.</p>`, url)
  }

  const author = cleanText(post.author)
  const date = formatDate(post.publishedAt || post.updatedAt || post.createdAt)
  const meta = [author, date].filter(Boolean).join(' · ')
  const body = renderPlainBody(post.bodyHtml || post.body || '')
  const source = safeHttpUrl(post.sourceUrl)
  const related = Array.isArray(post.relatedPrintLinks)
    ? post.relatedPrintLinks.map((item) => {
      const href = safeHttpUrl(typeof item === 'string' ? item : item?.url || item?.href)
      const label = cleanText(typeof item === 'string' ? item : item?.title || item?.label || href)
      return href ? `<li><a href="${escapeHtml(href)}">${escapeHtml(label || href)}</a></li>` : ''
    }).filter(Boolean).join('')
    : ''

  return noScriptDocument(title, `
    <article>
      <p class="ns-note">Plain HTML reading view. Interactive presentation features are omitted because JavaScript is disabled.</p>
      <h1>${escapeHtml(cleanText(post.title) || title)}</h1>
      ${meta ? `<p class="ns-meta">${escapeHtml(meta)}</p>` : ''}
      ${image && !image.endsWith('/sabot-logo.png') ? `<p><img src="${escapeHtml(image)}" alt="${escapeHtml(cleanText(post.featuredImageAlt || post.featuredImageTitle || ''))}" loading="eager" /></p>` : ''}
      ${cleanText(post.excerpt) ? `<p class="ns-lede">${escapeHtml(cleanText(post.excerpt))}</p>` : ''}
      <div class="ns-body">${body || `<p>${escapeHtml(description)}</p>`}</div>
      ${source ? `<p><strong>Source:</strong> <a href="${escapeHtml(source)}">${escapeHtml(source)}</a></p>` : ''}
      ${related ? `<section><h2>Related files and links</h2><ul>${related}</ul></section>` : ''}
    </article>
  `, url)
}

function renderNoScriptCampaignIndex(campaigns, url) {
  const items = Array.isArray(campaigns) && campaigns.length
    ? campaigns.map((campaign) => `<article><h2><a href="/campaigns/${encodeURIComponent(campaign.slug)}">${escapeHtml(cleanText(campaign.title || campaign.shortTitle || titleFromSlug(campaign.slug)))}</a></h2>${campaign.summary || campaign.deck ? `<p>${escapeHtml(cleanText(campaign.summary || campaign.deck))}</p>` : ''}</article>`).join('')
    : '<p>No published campaigns could be loaded in the plain HTML view.</p>'
  return noScriptDocument('Campaigns', `<p class="ns-note">JavaScript is disabled. Campaign text and essential links remain available here; live widgets and interactive tools are omitted.</p><h1>Campaigns</h1>${items}`, url)
}

function renderNoScriptCampaign(campaign, title, description, url, isCoverageArchive) {
  if (!campaign) {
    return noScriptDocument(title, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p>This campaign could not be loaded in the plain HTML view.</p>`, url)
  }

  if (isCoverageArchive) {
    const coverage = Array.isArray(campaign.coverage) ? campaign.coverage : []
    const items = coverage.length ? coverage.map((item) => {
      const href = safeHttpUrl(item?.url || item?.href)
      const label = cleanText(item?.title || item?.headline || href || 'Coverage item')
      const note = cleanText(item?.description || item?.summary || item?.note || '')
      return `<li>${href ? `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>` : escapeHtml(label)}${note ? ` — ${escapeHtml(note)}` : ''}</li>`
    }).join('') : '<li>No coverage items are currently available.</li>'
    return noScriptDocument(title, `<p class="ns-note">Plain HTML campaign archive.</p><h1>${escapeHtml(title)}</h1><ul>${items}</ul>`, url)
  }

  const actions = renderCampaignLinkList(campaign.actions)
  const resources = renderCampaignLinkList(campaign.resources)
  const sources = renderCampaignLinkList(campaign.sources)
  const updates = Array.isArray(campaign.updates) ? campaign.updates.map((item) => `<article><h3>${escapeHtml(cleanText(item?.title || 'Update'))}</h3>${item?.date ? `<p class="ns-meta">${escapeHtml(formatDate(item.date) || cleanText(item.date))}</p>` : ''}${item?.body ? `<p>${escapeHtml(cleanText(item.body))}</p>` : ''}</article>`).join('') : ''
  const faq = Array.isArray(campaign.faq) ? campaign.faq.map((item) => `<details open><summary>${escapeHtml(cleanText(item?.question || 'Question'))}</summary><p>${escapeHtml(cleanText(item?.answer || ''))}</p></details>`).join('') : ''
  const donationUrl = safeHttpUrl(campaign?.donation?.url)

  return noScriptDocument(title, `
    <article>
      <p class="ns-note">Plain HTML campaign view. Live counters, embeds, submission forms and other interactive features are omitted because JavaScript is disabled.</p>
      ${campaign.kicker ? `<p class="ns-meta">${escapeHtml(cleanText(campaign.kicker))}</p>` : ''}
      <h1>${escapeHtml(cleanText(campaign.title) || title)}</h1>
      ${campaign.deck ? `<p class="ns-lede">${escapeHtml(cleanText(campaign.deck))}</p>` : ''}
      ${campaign.summary ? `<p>${escapeHtml(cleanText(campaign.summary))}</p>` : ''}
      ${campaign.disclaimer ? `<p><small>${escapeHtml(cleanText(campaign.disclaimer))}</small></p>` : ''}
      ${donationUrl ? `<p><a href="${escapeHtml(donationUrl)}"><strong>${escapeHtml(cleanText(campaign?.donation?.label || 'Donate'))}</strong></a></p>` : ''}
      ${actions ? `<section><h2>Ways to act</h2><ul>${actions}</ul></section>` : ''}
      ${updates ? `<section><h2>Updates</h2>${updates}</section>` : ''}
      ${resources ? `<section><h2>Resources</h2><ul>${resources}</ul></section>` : ''}
      ${sources ? `<section><h2>Sources</h2><ul>${sources}</ul></section>` : ''}
      ${faq ? `<section><h2>Questions</h2>${faq}</section>` : ''}
    </article>
  `, url)
}

function renderCampaignLinkList(items) {
  if (!Array.isArray(items)) return ''
  return items.map((item) => {
    const href = safeHttpUrl(item?.href || item?.url)
    const title = cleanText(item?.title || item?.label || item?.publisher || href || '')
    const body = cleanText(item?.body || item?.description || item?.note || '')
    if (!title && !body) return ''
    return `<li>${href ? `<a href="${escapeHtml(href)}">${escapeHtml(title || href)}</a>` : `<strong>${escapeHtml(title)}</strong>`}${body ? ` — ${escapeHtml(body)}` : ''}</li>`
  }).filter(Boolean).join('')
}

function renderNoScriptGeneric(url) {
  return noScriptDocument('Sabot Media', `
    <h1>Sabot Media</h1>
    <p class="ns-note">JavaScript is disabled. This page has interactive features that are not available in the plain HTML view.</p>
    <p>Reporting remains available through the <a href="/">home page</a>, <a href="/archive">archive</a>, <a href="/campaigns">campaigns</a>, and <a href="/feeds">feeds</a>.</p>
  `, url)
}

function noScriptDocument(title, content, url) {
  return `<noscript data-sabot-plain-html>
    <style>
      [data-sabot-plain-html] .ns-wrap{box-sizing:border-box;max-width:860px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;color:#111;background:#fff}
      [data-sabot-plain-html] *{box-sizing:border-box}
      [data-sabot-plain-html] nav{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:28px}
      [data-sabot-plain-html] nav a{margin-right:14px}
      [data-sabot-plain-html] article{margin:0 0 2rem}
      [data-sabot-plain-html] h1,[data-sabot-plain-html] h2,[data-sabot-plain-html] h3{line-height:1.15}
      [data-sabot-plain-html] img{display:block;max-width:100%;height:auto}
      [data-sabot-plain-html] a{color:inherit;text-decoration-thickness:.1em}
      [data-sabot-plain-html] .ns-note{padding:12px;border:1px solid #777;background:#f4f4f4}
      [data-sabot-plain-html] .ns-lede{font-size:1.15rem}
      [data-sabot-plain-html] .ns-meta{font-size:.9rem;color:#555}
      [data-sabot-plain-html] .ns-body p{margin:0 0 1.1rem}
      [data-sabot-plain-html] footer{border-top:1px solid #aaa;margin-top:36px;padding-top:16px;font-size:.9rem}
    </style>
    <div class="ns-wrap">
      <nav aria-label="Plain HTML navigation"><strong><a href="/">Sabot Media</a></strong> <a href="/archive">Archive</a> <a href="/campaigns">Campaigns</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/feeds">Feeds</a></nav>
      <main>${content}</main>
      <footer><p>${escapeHtml(title)} · Plain HTML fallback for browsers with JavaScript disabled.</p></footer>
    </div>
  </noscript>`
}

function injectNoScript(html, fallback) {
  if (!fallback || String(html).includes('data-sabot-plain-html')) return html
  return String(html).replace('</body>', `${fallback}\n</body>`)
}

function replaceNoScript(html, fallback) {
  const source = String(html)
  if (!source.includes('data-sabot-plain-html')) return injectNoScript(source, fallback)
  return source.replace(/<noscript data-sabot-plain-html>[\s\S]*?<\/noscript>/i, fallback)
}

function renderPlainBody(value) {
  const source = String(value || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<(?:li|blockquote)[^>]*>/gi, '\n')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
  const decoded = decodeBasicEntities(source)
  return decoded.split(/\n\s*\n+/).map((paragraph) => paragraph.replace(/\s+/g, ' ').trim()).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
}

function safeHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ''))
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : ''
  } catch {
    return ''
  }
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return cleanText(value)
  try { return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date) } catch { return date.toISOString().slice(0, 10) }
}

function titleFromSlug(slug) {
  return String(slug || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
function decodeBasicEntities(value) {
  return String(value || '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
}
function cleanText(value) {
  return decodeBasicEntities(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}
function truncate(value, length) { const text = String(value || ''); return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…` }
function absoluteUrl(value, origin) { try { return new URL(String(value || ''), origin).toString() } catch { return `${origin}/sabot-logo.png` } }
function escapeHtml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
