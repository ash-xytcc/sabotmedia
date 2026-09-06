import { XMLParser } from 'fast-xml-parser'
import { fetchBoundedText } from './safeRemoteFeed.js'

const CAMPAIGN_START_MS = Date.parse('2026-08-26T00:00:00Z')
const CACHE_TTL_SECONDS = 600
const OFFICIAL_AI_FEEDS = [
  { id: 'keepitfree', label: 'A/I Keep It Free dispatches', url: 'https://keepitfree.ai/it/index.xml' },
  { id: 'noblogs', label: 'A/I legacy NoBlogs dispatches', url: 'https://cavallette.noblogs.org/feed/' },
]
const BING_NEWS_ENDPOINT = 'https://www.bing.com/news/search'
const AI_NAME = /autistici(?:\s*\/\s*|\s+)?inventati/i
const NOBLOGS = /\bnoblogs(?:\.org)?\b/i
const CASE_SIGNAL = /designat|sanction|terroris|ofac|serverhold|communications infrastructure|infrastruttur|sanzion|terrorist|lista usa/i

export async function loadLiveAiIntelligence(requestUrl, fetcher = fetch) {
  const origin = new URL(requestUrl).origin
  const cacheKey = new Request(`${origin}/__campaign-cache/autistici-inventati-intelligence-v4`)
  const cache = globalThis.caches?.default
  if (cache) {
    const cached = await cache.match(cacheKey)
    if (cached) return cached.json()
  }

  const jobs = [
    ...OFFICIAL_AI_FEEDS.map((feed) => ({
      id: `official-ai-${feed.id}`,
      label: feed.label,
      url: feed.url,
      run: () => fetchOfficialAiDispatches(feed, fetcher),
    })),
    { id: 'bing-news', label: 'International news coverage', url: 'https://www.bing.com/news', run: () => fetchBingNewsCoverage(fetcher) },
  ]
  const settled = await Promise.allSettled(jobs.map((job) => job.run()))
  const sources = []
  const errors = []
  const updates = [{
    id: 'sabot-foia-filed-2026-09-05',
    date: '2026-09-05T07:00:00Z',
    title: 'NEW: Five federal records requests filed',
    body: 'Sabot filed three requests with the State Department, one with Treasury/OFAC, and one with the FBI seeking the missing referral and targeting records behind the Autistici/Inventati designation. The investigation page now carries the live public-records docket.',
    url: new URL('/investigations/autistici-inventati/#foia-desk', origin).toString(),
    pinned: true,
    automated: false,
    source: 'Sabot Media investigation',
  }]
  const coverage = []

  settled.forEach((result, index) => {
    const job = jobs[index]
    if (result.status === 'fulfilled') {
      sources.push({ id: job.id, label: job.label, url: job.url, ok: true, count: result.value.coverage.length })
      updates.push(...result.value.updates)
      coverage.push(...result.value.coverage)
    } else {
      sources.push({ id: job.id, label: job.label, url: job.url, ok: false, count: 0 })
      errors.push({ source: job.label, message: String(result.reason?.message || result.reason) })
    }
  })

  const payload = {
    ok: errors.length < jobs.length,
    updates: dedupeByUrl(updates).sort(newestFirst).slice(0, 20),
    coverage: dedupeCoverage(coverage).sort(newestFirst).slice(0, 40),
    sources,
    errors,
    checkedAt: new Date().toISOString(),
  }
  if (cache) {
    await cache.put(cacheKey, new Response(JSON.stringify(payload), {
      headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${CACHE_TTL_SECONDS}` },
    })).catch(() => {})
  }
  return payload
}

export function isCampaignCoverageCandidate(item = {}) {
  const publishedAt = parseDate(item.date || item.seendate || item.publishedAt)
  if (!publishedAt || publishedAt < CAMPAIGN_START_MS) return false
  const title = cleanText(item.title || '')
  const context = `${title} ${item.description || ''} ${item.url || ''}`
  return AI_NAME.test(context) || (NOBLOGS.test(context) && CASE_SIGNAL.test(context))
}

export function isAiCampaignRelationship(item = {}) {
  const exactSlugs = new Set([
    'the-us-designated-a-25-year-old-volunteer-communications-collective-a-terrorist-organization',
    'communications-infrastructure-is-not-terrorism',
    'open-letter-defend-autistici-inventati',
    'open-letter-ai',
    'individual-letter-defend-autistici-inventati',
    'the-server-called-paranoia',
  ])
  if (exactSlugs.has(String(item.slug || '').toLowerCase())) return true
  const relationships = [
    ...(item.campaigns || []),
    ...(item.tags || []),
    ...(item.collections || []),
    ...(item.projects || []),
    ...(item.categories || []),
    item.primaryProject,
  ].map((value) => String(value || '').toLowerCase())
  if (relationships.some((value) => value === 'autistici-inventati' || value.includes('autistici') || value.includes('inventati') || value.includes('a/i campaign'))) return true
  const title = String(item.title || '')
  return AI_NAME.test(title) || (/communications infrastructure/i.test(title) && CASE_SIGNAL.test(title))
}

export function deriveAiCampaignPublicationUpdates(items = [], requestUrl) {
  const origin = new URL(requestUrl).origin
  return items
    .filter(isAiCampaignRelationship)
    .map((item) => {
      const slug = String(item.slug || item.id || '').trim()
      const date = String(item.publishedAt || item.updatedAt || '')
      return {
        id: `publication-${slugify(slug)}`,
        date,
        title: `${cleanText(item.title || 'Campaign reporting')} published`,
        body: summarize(item.excerpt || item.body || item.bodyHtml || 'New Sabot Media reporting connected to the A/I campaign.', 260),
        url: new URL(`/post/${encodeURIComponent(slug)}`, origin).toString(),
        pinned: false,
        automated: true,
        source: 'Sabot Media publishing',
      }
    })
    .filter((item) => item.url && parseDate(item.date))
}

export function mergeCampaignUpdates(...groups) {
  const seenUrls = new Set()
  const seenIds = new Set()
  return groups.flat().filter((item = {}) => {
    const url = canonicalUrl(item.url)
    const id = String(item.id || '').trim().toLowerCase()
    if ((!url && !id) || (url && seenUrls.has(url)) || (id && seenIds.has(id))) return false
    if (url) seenUrls.add(url)
    if (id) seenIds.add(id)
    return true
  })
}

async function fetchOfficialAiDispatches(feed, fetcher) {
  const { text: xml } = await fetchBoundedText(feed.url, feedOptions(fetcher))
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(xml)
  const channel = parsed?.rss?.channel || parsed?.feed || {}
  const rawItems = asArray(channel.item || channel.entry)
  const items = rawItems.map((item) => {
    const url = rssLink(item.link)
    const date = normalizeDate(item.pubDate || item.published || item.updated || item['dc:date'])
    const title = cleanText(item.title)
    const description = cleanText(item['content:encoded'] || item.description || item.summary || item.content || '')
    return { title, description, url, date }
  }).filter(isCampaignCoverageCandidate)

  return {
    updates: items.map((item) => ({
      id: `official-ai-${feed.id}-${slugify(item.url || item.title)}`,
      date: item.date,
      title: item.title,
      body: summarize(item.description || 'New official communication from Autistici/Inventati.', 360),
      url: item.url,
      pinned: false,
      automated: true,
      source: 'Autistici/Inventati',
    })),
    coverage: items.map((item) => ({
      id: `coverage-official-ai-${feed.id}-${slugify(item.url || item.title)}`,
      date: item.date,
      outlet: 'Autistici/Inventati',
      language: inferLanguage(item.title, item.description),
      languageCode: inferLanguage(item.title, item.description) === 'Italian' ? 'it' : '',
      title: item.title,
      url: item.url,
      summary: summarize(item.description || 'Official A/I campaign communication.', 320),
      automated: true,
    })),
  }
}

async function fetchBingNewsCoverage(fetcher) {
  const url = new URL(BING_NEWS_ENDPOINT)
  url.searchParams.set('q', '"Autistici/Inventati" OR "Autistici Inventati" OR "NoBlogs.org"')
  url.searchParams.set('qft', 'sortbydate="1"')
  url.searchParams.set('format', 'RSS')
  const { text: xml } = await fetchBoundedText(url, feedOptions(fetcher))
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(xml)
  const rawItems = asArray(parsed?.rss?.channel?.item)
  const items = rawItems.map((item) => {
    const fullTitle = cleanText(item.title)
    const explicitSource = cleanText(item['News:Source'] || item.source || '')
    const separator = explicitSource ? -1 : fullTitle.lastIndexOf(' - ')
    return {
      title: separator > 0 ? fullTitle.slice(0, separator) : fullTitle,
      outlet: explicitSource || (separator > 0 ? fullTitle.slice(separator + 3) : 'Bing News'),
      description: cleanText(item.description || ''),
      url: unwrapBingUrl(rssLink(item.link)),
      date: normalizeDate(item.pubDate),
    }
  }).filter(isCampaignCoverageCandidate)
  return {
    updates: [],
    coverage: items.map((item) => ({
      id: `coverage-bing-${slugify(`${item.outlet}-${item.title}`)}`,
      date: item.date,
      outlet: item.outlet,
      language: inferLanguage(item.title, item.description),
      languageCode: inferLanguage(item.title, item.description) === 'Italian' ? 'it' : '',
      title: item.title,
      url: item.url,
      summary: summarize(item.description, 300),
      automated: true,
    })),
  }
}

function feedOptions(fetcher) {
  return { fetcher, maxBytes: 2 * 1024 * 1024, timeoutMs: 12000, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml', userAgent: 'SabotMediaCampaignTracker/1.0 (+https://sabot.media)' }
}

function rssLink(value) {
  if (typeof value === 'string') return safeHttpUrl(value)
  if (Array.isArray(value)) return rssLink(value.find((item) => item?.['@_rel'] === 'alternate') || value[0])
  return safeHttpUrl(value?.['@_href'] || value?.['#text'] || '')
}

function unwrapBingUrl(value) {
  try {
    const url = new URL(String(value || ''))
    if (url.hostname.endsWith('bing.com') && url.pathname.includes('apiclick')) return safeHttpUrl(url.searchParams.get('url')) || url.toString()
    return url.toString()
  } catch { return '' }
}

function parseDate(value) {
  const compact = String(value || '').match(/^(\d{8})T(\d{6})Z$/)
  const normalized = compact ? `${compact[1].slice(0, 4)}-${compact[1].slice(4, 6)}-${compact[1].slice(6, 8)}T${compact[2].slice(0, 2)}:${compact[2].slice(2, 4)}:${compact[2].slice(4, 6)}Z` : value
  const time = new Date(normalized || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

function normalizeDate(value) {
  const time = parseDate(value)
  return time ? new Date(time).toISOString() : ''
}

function inferLanguage(...values) {
  const text = values.join(' ').toLowerCase()
  return /\b(?:gli|della|collettivo|comunicato|sanzioni|servizi|stati uniti|terroristi|banca|fondi|riunione|associazione)\b/.test(text) ? 'Italian' : ''
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''))
    return /^https?:$/.test(url.protocol) ? url.toString() : ''
  } catch { return '' }
}

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || ''))
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key)) url.searchParams.delete(key)
    return url.toString().replace(/\/$/, '').toLowerCase()
  } catch { return '' }
}

function dedupeByUrl(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = canonicalUrl(item.url)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function dedupeCoverage(items) {
  const seenUrls = new Set()
  const seenTitles = new Set()
  return items.filter((item) => {
    const url = canonicalUrl(item.url)
    const title = cleanText(item.title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (!url || !title || seenUrls.has(url) || seenTitles.has(title)) return false
    seenUrls.add(url)
    seenTitles.add(title)
    return true
  })
}

function asArray(value) { return Array.isArray(value) ? value : value ? [value] : [] }
function newestFirst(a, b) { return parseDate(b.date) - parseDate(a.date) }
function cleanText(value) { return String(value || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#(?:39|x27);/gi, "'").replace(/\s+/g, ' ').trim() }
function summarize(value, length) { const text = cleanText(value); return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…` }
function slugify(value) { return String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'campaign-item' }
