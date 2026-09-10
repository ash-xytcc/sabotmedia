import { findCampaignPieces } from '../../../src/lib/campaignPieces.js'
import { articleSupplementHtml } from '../../../src/content/articleSupplements.js'
import { buildCopy } from '../../../src/content/campaignBenefitCopy.js'
import { listReadingPosts } from './readablePosts.js'
import { onRequestGet as collectionsGet } from '../collections.js'
import { onRequestGet as publicationsGet } from '../publications.js'
import { getCampaign, listCampaigns } from './campaigns.js'
import { getEditablePage } from '../../../src/lib/editableContentRegistry.js'
import { onRequestGet as translationsGet } from '../native-translations.js'
import { onRequestGet as feedsGet } from '../feed-manifest.js'
import { listMessages } from './campaignCorrespondence.js'
import { listAiCoverageArchive } from './aiCampaignCoverageArchive.js'
import { getGallery } from './galleries.js'
import { readPublicSiteConfig } from './publicSiteConfig.js'
import { publicInfoCopy, getPublicInfoField } from '../../../src/content/publicInfoCopy.js'
import { escapeHtml as e, link, paragraphs, readableBody, image, media, readingDocument } from './readableHtml.js'

const infoRoutes = new Set([...Object.keys(publicInfoCopy), 'security'])
export function isReadablePath(path) {
  return ['/', '/archive', '/search', '/updates', '/press', '/campaigns', '/collections', '/publications', '/projects', '/feeds', '/aberdeen-local-1312-gallery', '/investigations'].includes(path)
    || infoRoutes.has(path.slice(1))
    || /^\/(post|piece|print|zine|updates|collections|publications|reader|read|project|projects)\/[^/]+(?:\/print)?$/.test(path)
    || /^\/campaigns\/[^/]+(?:\/(coverage|benefit-kit|instagram-connect))?$/.test(path)
    || /^\/contribute\/[^/]+$/.test(path)
}

// Never inherit login cookies, contributor tokens, or admin query parameters.
export async function publicRead(handler, context, path) {
  const response = await handler({ ...context, request: new Request(new URL(path, context.request.url), { headers: { accept: 'application/json' } }) })
  const payload = await response.json()
  if (!response.ok || payload.ok === false) throw new Error('Public content unavailable')
  return payload
}
const rows = value => Array.isArray(value) ? value : []
const titleFromSlug = slug => String(slug).replace(/-/g, ' ')
const section = (title, body) => body ? `<section><h2>${e(title)}</h2>${body}</section>` : ''
const missing = () => ({ title: 'Not found', body: '<h1>Not found</h1><p>This page is not publicly available.</p>', status: 404 })
const publicationVisible = item => item && item.status === 'published' && !['private','hidden'].includes(item.visibility)
function entryCard(item) { return `<article><h2>${link(`/post/${encodeURIComponent(item.slug)}`, item.title)}</h2>${paragraphs(item.excerpt || '')}</article>` }
function rowContent(item) {
  return `<article>${item.title || item.name || item.question ? `<h3>${e(item.title || item.name || item.question)}</h3>` : ''}${item.date || item.createdAt ? `<p>${e(item.date || item.createdAt)}</p>` : ''}${readableBody(item.body || item.answer || item.description || item.summary || item.excerpt || item.statement || item.note || '')}${item.imageUrl ? image(item) : ''}${link(item.href || item.url || item.downloadUrl, item.label || item.language || item.outlet || 'Read more')}${item.downloadUrl ? `<p>${link(item.downloadUrl, 'Download')}</p>` : ''}</article>`
}

export async function buildReadingPage(context, url) {
  const db = context.env?.BF_DB
  const path = url.pathname
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
  const [family, slug, action] = parts
  if (['post','piece','print','zine','updates'].includes(family) && slug) {
    let post = (await listReadingPosts(db)).find(item => item.slug === slug)
    if (!post) return missing()
    const base = `/post/${encodeURIComponent(post.slug)}`
    const translations = post.sourceKind === 'native' ? await publicRead(translationsGet, context, `/api/native-translations?slug=${encodeURIComponent(post.slug)}`) : {translations:[]}
    const publicTranslations = rows(translations.translations).filter(t => t.status === 'published')
    const lang = url.searchParams.get('lang') || 'en'
    const translated = publicTranslations.find(t => t.code.toLowerCase() === lang.toLowerCase())
    if (lang !== 'en' && !translated) return missing()
    if (translated?.translation?.bodyHtml) post = { ...post, ...translated.translation }
    const languageNav = `<nav aria-label="Article languages">${link(base, 'English')} ${publicTranslations.map(t => link(t.href, t.label)).join(' ')}</nav>`
    return { title: post.seoTitle || post.title, description:post.seoDescription || post.excerpt, image:post.featuredImage || post.heroImage, body: `${languageNav}<article lang="${e(lang)}" dir="auto"><h1>${e(post.title)}</h1>${paragraphs([post.author, post.publishedAt].filter(Boolean).join(' · '))}${translated ? paragraphs(translated.credit) : ''}${image({ imageUrl:post.featuredImage || post.heroImage, alt:post.featuredImageAlt || post.heroImageAlt })}${articleSupplementHtml(slug)}${readableBody(post.bodyHtml || post.body)}${media(post.podcastAudioUrl || post.audioSourceUrl, 'audio', 'Download audio')}${section('Audio summary',paragraphs(post.audioSummary))}${section('Transcript excerpt',paragraphs(post.transcriptExcerpt))}${section('Attachments',rows(post.relatedAssets).map(a => `<p>${link(a.url || a.src,a.title || a.label || 'Download attachment')}</p>`).join(''))}${link(post.sourceUrl, 'Original source')}${section('Related files', rows(post.relatedPrintLinks).map(i => `<p>${link(typeof i === 'string' ? i : i.url || i.href, i.title || i.label || 'Download')}</p>`).join(''))}</article>` }
  }
  if (infoRoutes.has(family)) {
    const { config } = await readPublicSiteConfig(db)
    const registered = getEditablePage(family)
    const defaults = publicInfoCopy[family] || Object.fromEntries(['title','body'].map(part => [part,registered?.[part]?.defaultText || '']))
    const field = part => config.text?.[getPublicInfoField(family, part)] ?? defaults[part] ?? ''
    return { title:field('title'), body:`<h1>${e(field('title'))}</h1>${paragraphs(field('body'))}${family === 'security' ? `<p>${link('/keys/info-sabot-media.asc','Download public PGP key')}</p>` : ''}${family === 'contact' ? ['info','tips','submit','press','support'].map(name => `<p>${link(`mailto:${name}@sabot.media`,`${name}@sabot.media`)}</p>`).join('') : ''}` }
  }
  if (family === 'collections') {
    const data = await publicRead(collectionsGet, context, `/api/collections${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`)
    if (!slug) return { title:'Collections', body:`<h1>Collections</h1>${rows(data.items).filter(i => i.status === 'published').map(i => `<article><h2>${link(`/collections/${encodeURIComponent(i.slug)}`,i.title)}</h2>${paragraphs(i.description)}</article>`).join('')}` }
    const item = data.item
    if (!item || item.status !== 'published') return missing()
    const posts = await listReadingPosts(db)
    return { title:item.title, body:`<h1>${e(item.title)}</h1>${image({url:item.coverImage,alt:item.title})}${paragraphs(item.subtitle)}${readableBody(item.description)}${posts.filter(p => rows(item.pieceSlugs).includes(p.slug)).map(entryCard).join('')}` }
  }
  if (['publications','reader','read'].includes(family)) {
    const data = await publicRead(publicationsGet, context, `/api/publications${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`)
    if (!slug) return {title:'Publications',body:`<h1>Publications</h1>${rows(data.items).filter(i => publicationVisible(i) && i.visibility !== 'unlisted').map(i => `<article><h2>${link(`/publications/${encodeURIComponent(i.slug)}`,i.title)}</h2>${paragraphs(i.description)}</article>`).join('')}`}
    const item = data.item
    if (!publicationVisible(item)) return missing()
    const downloads = [item.assets?.readerPdf,item.assets?.printPdf,item.assets?.imposedPdf,...rows(item.downloadAssets).map(i => i.url)].filter(Boolean)
    return {title:item.title,noindex:item.visibility === 'unlisted',body:`<h1>${e(item.title)}</h1>${paragraphs(item.description || item.subtitle)}${downloads.map(u => `<p>${link(u,'Download PDF')}</p>`).join('')}${rows(item.pages).map((p,i) => section(p.title || `Page ${i+1}`, rows(p.blocks).map(b => `${readableBody(b.html || b.text || b.content || '')}${b.type === 'image' ? image(b) : ''}`).join(''))).join('')}`}
  }
  if (family === 'campaigns' || family === 'contribute') {
    // HTML reads use persisted editorial data, without waiting for remote social refreshes.
    const data = slug ? { item: await getCampaign(db, slug) } : { items: await listCampaigns(db) }
    if (!slug) return {title:'Campaigns',body:`<h1>Campaigns</h1>${rows(data.items).filter(i => i.status === 'published').map(i => `<article><h2>${link(`/campaigns/${encodeURIComponent(i.slug)}`,i.title)}</h2>${paragraphs(i.summary || i.deck)}</article>`).join('')}`}
    const c = data.item
    if (!c || c.status !== 'published') return missing()
    if (!rows(c.hiddenSections).includes('coverage')) {
      const archive = await listAiCoverageArchive(db, { campaignSlug: slug, limit: 50 })
      c.coverage = archive.items
    }
    const base = `/campaigns/${encodeURIComponent(slug)}`
    if (family === 'contribute' || action === 'instagram-connect') return {title:'Campaign tools',body:`<h1>Campaign tools</h1><p>Signing in and editing require JavaScript.</p>${link(base,'Read the campaign')}`}
    if (action === 'coverage') {
      if (rows(c.hiddenSections).includes('coverage')) return missing()
      const archive = await listAiCoverageArchive(db, {campaignSlug:slug,page:url.searchParams.get('page'),q:url.searchParams.get('q'),limit:50})
      const pageLink = n => `${base}/coverage?page=${n}&q=${encodeURIComponent(url.searchParams.get('q') || '')}`
      return {title:`${c.title} coverage`,body:`<h1>${e(c.title)} coverage</h1>${searchForm(`${base}/coverage`,url.searchParams.get('q'))}${archive.items.map(rowContent).join('')}<nav>${archive.page > 1 ? link(pageLink(archive.page-1),'Previous page') : ''} Page ${archive.page} of ${archive.pages} ${archive.page < archive.pages ? link(pageLink(archive.page+1),'Next page') : ''}</nav>`}
    }
    let body = `<h1>${e(c.title)}</h1>${paragraphs(c.deck)}${readableBody(c.summary)}${paragraphs(c.disclaimer)}${image({url:c.heroImage,alt:c.heroAlt})}${!rows(c.hiddenSections).includes('donate') ? `<p>${link(c.donation?.url,c.donation?.label || 'Donate')}</p>` : ''}`
    const hidden = new Set(rows(c.hiddenSections))
    const posts = findCampaignPieces(await listReadingPosts(db),c)
    if (!hidden.has('reporting')) body += section(c.sectionTitles?.reporting || 'Reporting',posts.filter(p => !/letter/i.test(p.title)).map(entryCard).join(''))
    if (!hidden.has('letters')) body += section(c.sectionTitles?.letters || 'Open letters',posts.filter(p => /letter/i.test(p.title)).map(entryCard).join(''))
    const sections = [...new Set([...rows(c.sectionOrder),'actions','updates','resources','graphics','timeline','coverage','sources','faq','translations','signatories','social'])]
    if (hidden.has('act')) hidden.add('actions')
    if (hidden.has('letters') && hidden.has('reporting')) hidden.add('resources')
    for (const key of sections) if (!hidden.has(key) && Array.isArray(c[key])) body += section(c.sectionTitles?.[key] || titleFromSlug(key), c[key].map(rowContent).join(''))
    if (!hidden.has('officialsLetter') && c.individualLetter) body += section(c.individualLetter.title, paragraphs(c.individualLetter.description) + paragraphs(c.individualLetter.guidance) + link(c.individualLetter.href,c.individualLetter.label))
    if (!hidden.has('coverage')) body += `<p>${link(`${base}/coverage`,'Browse all coverage')}</p>`
    if (c.correspondence?.enabled && !hidden.has('dispatches')) {
      const messages = await listMessages(db,c.id,{publicOnly:true})
      body += section('Field dispatches',messages.filter(m => m.visibility === 'public' && m.status === 'sent').map(m => `<article><h3>${e(m.displayName)}</h3>${paragraphs(m.createdAt)}${paragraphs(m.body)}${m.mediaType?.startsWith('image') ? image({url:m.mediaUrl}) : media(m.mediaUrl,m.mediaType)}</article>`).join(''))
    }
    if (slug === 'food-not-bombs-gaza' && (action === 'benefit-kit' || !hidden.has('benefit'))) body += section('Organize a benefit',`<p>Choose a format, confirm an accessible venue and date, share the campaign fundraiser, assign door and access roles, count funds with two people, and report the net amount transferred.</p><p>${link(base,'Campaign information and fundraiser')}</p>`)
    if (slug === 'food-not-bombs-gaza' && (action === 'benefit-kit' || !hidden.has('benefit'))) {
      const copy = buildCopy({title:'[EVENT TITLE]',date:'[DATE + TIME]',venue:'[VENUE]',location:'[CITY]',url:'',admission:'[ADMISSION]',details:'[PROGRAM DETAILS]'})
      body += section('Benefit organizer toolkit',Object.entries(copy).map(([name,text]) => section(name,paragraphs(text))).join(''))
    }
    return {title:c.title,body}
  }
  if (family === 'aberdeen-local-1312-gallery') {
    const gallery = await getGallery(db,'aberdeen-local-1312')
    return gallery ? {title:gallery.title,body:`<h1>${e(gallery.title)}</h1>${paragraphs(gallery.description)}${rows(gallery.items).map(image).join('')}`} : missing()
  }
  if (family === 'investigations') return {title:'Investigations',body:`<h1>Investigations</h1><article><h2>${link('/investigations/autistici-inventati','The Missing File')}</h2><p>How Autistici/Inventati became a U.S. counterterrorism target: reporting, evidence, sources, and updates.</p></article>`}
  if (family === 'feeds') {
    const manifest = await publicRead(feedsGet,context,'/api/feed-manifest')
    return {title:'Feeds',body:`<h1>Feeds</h1>${rows(manifest.files).map(name => `<p>${link(`/feeds/${name}`,name)}</p>`).join('')}`}
  }
  let entries = await listReadingPosts(db)
  if (path === '/' || path === '/updates') entries = entries.filter(i => i.showOnHomepage !== false)
  if (family === 'press') entries = entries.filter(i => i.target === 'press')
  const q = (url.searchParams.get('q') || '').trim()
  const project = slug && ['project','projects'].includes(family) ? slug : url.searchParams.get('project')
  if (project) entries = entries.filter(i => [i.project,i.projectSlug,i.projectName,i.primaryProject,i.primaryProjectSlug,...rows(i.projects)].some(p => String(typeof p === 'object' ? p.slug || p.name : p).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') === project))
  if (q) entries = entries.filter(i => `${i.title} ${i.excerpt} ${i.body || ''}`.toLowerCase().includes(q.toLowerCase()))
  const title = path === '/' ? 'Latest reporting' : project ? titleFromSlug(project) : family === 'press' ? 'Press' : family === 'updates' ? 'Updates' : 'Archive'
  return {title,body:`<h1>${e(title)}</h1>${searchForm('/archive',q,project)}<p>${entries.length} posts</p>${entries.map(entryCard).join('')}`}
}
function searchForm(action,q='',project='') { return `<form action="${e(action)}" method="get"><label for="reading-search">Search</label> <input id="reading-search" name="q" value="${e(q || '')}">${project ? `<input type="hidden" name="project" value="${e(project)}">` : ''} <button type="submit">Search</button></form>` }

export async function renderReadingPage(context, url) {
  if (!context.env?.ASSETS?.fetch) return context.next()
  let page
  try { page = await buildReadingPage(context,url) }
  catch { page = {title:'Temporarily unavailable',status:503,body:'<h1>Temporarily unavailable</h1><p>The public content could not be loaded. Please try again shortly.</p>'} }
  // Pages requires the pretty asset URL; /index.html would redirect back to /.
  const asset = await context.env.ASSETS.fetch(new Request(new URL('/',url),{headers:{accept:'text/html'}}))
  if (!asset.ok) return asset
  let html = await asset.text()
  html = html.replace(/<noscript\b[^>]*data-sabot-(?:static-noscript|plain-html)[^>]*>[\s\S]*?<\/noscript>/gi,'')
  html = html.replace(/<title>[^<]*<\/title>/i,`<title>${e(page.title)} | Sabot Media</title>`)
  // Avoid stale homepage metadata on article/detail responses.
  html = html.replace(/<meta\b[^>]*(?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*>/gi,'')
  html = html.replace('</head>',`<meta property="og:title" content="${e(page.title)}">${page.description ? `<meta name="description" content="${e(page.description)}"><meta property="og:description" content="${e(page.description)}">` : ''}${page.image ? `<meta property="og:image" content="${e(new URL(page.image,url.origin).href)}">` : ''}<link rel="canonical" href="${e(url.origin + url.pathname)}">${page.noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}</head>`)
  html = html.replace('</body>',`${readingDocument(page.title,page.body)}</body>`)
  const headers = new Headers(asset.headers)
  headers.delete('content-length'); headers.delete('etag'); headers.delete('last-modified')
  headers.set('content-type','text/html; charset=utf-8')
  // Includes search/language responses; never serve withdrawn snapshots on a DB failure.
  headers.set('cache-control','no-store')
  return new Response(context.request.method === 'HEAD' ? null : html,{status:page.status || 200,headers})
}
