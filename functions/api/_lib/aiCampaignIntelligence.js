import { XMLParser } from 'fast-xml-parser'

const CAMPAIGN_START_MS = Date.parse('2026-08-26T00:00:00Z')
const CACHE_TTL_SECONDS = 600
const OFFICIAL_AI_FEED = 'https://cavallette.noblogs.org/feed/'
const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
const GOOGLE_NEWS_ENDPOINT = 'https://news.google.com/rss/search'
const AI_NAME = /autistici(?:\s*\/\s*|\s+)?inventati/i
const NOBLOGS = /\bnoblogs(?:\.org)?\b/i
const CASE_SIGNAL = /designat|sanction|terroris|ofac|serverhold|communications infrastructure|infrastruttur|sanzion|terrorist|lista usa/i

export async function loadLiveAiIntelligence(requestUrl, fetcher = fetch) {
  const origin = new URL(requestUrl).origin
  const cacheKey = new Request(`${origin}/__campaign-cache/autistici-inventati-intelligence-v1`)
  const cache = globalThis.caches?.default
  if (cache) {
    const cached = await cache.match(cacheKey)
    if (cached) return cached.json()
  }

  const jobs = [
    { id: 'official-ai', label: 'A/I official dispatches', url: OFFICIAL_AI_FEED, run: () => fetchOfficialAiDispatches(fetcher) },
    { id: 'global-coverage', label: 'GDELT global news index', url: 'https://www.gdeltproject.org/', run: () => fetchGdeltCoverage(fetcher) },
    { id: 'google-news', label: 'Google News exact-match RSS', url: 'https://news.google.com/', run: () => fetchGoogleNewsCoverage(fetcher) },
  ]
  const settled = await Promise.allSettled(jobs.map((job) => job.run()))
  const sources = []
  const errors = []
  const updates = []
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
  const seen = new Set()
  return groups.flat().filter((item = {}) => {
    const key = canonicalUrl(item.url) || String(item.id || '').trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchOfficialAiDispatches(fetcher) {
  const response = await fetchWithTimeout(OFFICIAL_AI_FEED, fetcher, 'application/rss+xml, application/xml, text/xml')
  if (!response.ok) throw new Error(`A/I dispatch feed returned ${response.status}`)
  const xml = await response.text()
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
      id: `official-ai-${slugify(item.url || item.title)}`,
      date: item.date,
      title: item.title,
      body: summarize(item.description || 'New official communication from Autistici/Inventati.', 360),
      url: item.url,
      pinned: false,
      automated: true,
      source: 'Autistici/Inventati',
    })),
    coverage: items.map((item) => ({
      id: `coverage-official-ai-${slugify(item.url || item.title)}`,
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

async function fetchGdeltCoverage(fetcher) {
  const url = new URL(GDELT_ENDPOINT)
  url.searchParams.set('query', '("Autistici/Inventati" OR "Autistici Inventati" OR "NoBlogs.org")')
  url.searchParams.set('mode', 'artlist')
  url.searchParams.set('format', 'json')
  url.searchParams.set('maxrecords', '100')
  url.searchParams.set('timespan', '3m')
  url.searchParams.set('sort', 'datedesc')
  const response = await fetchWithTimeout(url, fetcher, 'application/json')
  if (!response.ok) throw new Error(`GDELT returned ${response.status}`)
  const contentType = String(response.headers.get('content-type') || '')
  if (!contentType.includes('json')) throw new Error('GDELT returned a non-JSON response')
  const data = await response.json()
  const articles = asArray(data?.articles).map((article) => ({
    title: cleanText(article.title),
    url: safeHttpUrl(article.url),
    date: normalizeDate(article.seendate),
    domain: String(article.domain || '').replace(/^www\./, ''),
    language: normalizeLanguage(article.language),
    imageUrl: safeHttpUrl(article.socialimage),
  })).filter((item) => item.url && !isExcludedCoverageDomain(item.domain) && isCampaignCoverageCandidate(item))

  return {
    updates: [],
    coverage: dedupeByUrl(articles).map((item) => ({
      id: `coverage-live-${slugify(`${item.domain}-${item.title}`)}`,
      date: item.date,
      outlet: outletName(item.domain),
      language: item.language.label,
      languageCode: item.language.code,
      title: item.title,
      url: item.url,
      imageUrl: item.imageUrl,
      summary: 'Automatically discovered global coverage matched against exact A/I campaign signals.',
      automated: true,
    })),
  }
}

async function fetchGoogleNewsCoverage(fetcher) {
  const url = new URL(GOOGLE_NEWS_ENDPOINT)
  url.searchParams.set('q', '"Autistici/Inventati" OR "Autistici Inventati" OR "NoBlogs.org"')
  url.searchParams.set('hl', 'en-US')
  url.searchParams.set('gl', 'US')
  url.searchParams.set('ceid', 'US:en')
  const response = await fetchWithTimeout(url, fetcher, 'application/rss+xml, application/xml, text/xml')
  if (!response.ok) throw new Error(`Google News RSS returned ${response.status}`)
  const xml = await response.text()
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(xml)
  const rawItems = asArray(parsed?.rss?.channel?.item)
  const items = rawItems.map((item) => {
    const fullTitle = cleanText(item.title)
    const separator = fullTitle.lastIndexOf(' - ')
    return {
      title: separator > 0 ? fullTitle.slice(0, separator) : fullTitle,
      outlet: separator > 0 ? fullTitle.slice(separator + 3) : 'Google News',
      description: cleanText(item.description || ''),
      url: rssLink(item.link),
      date: normalizeDate(item.pubDate),
    }
  }).filter(isCampaignCoverageCandidate)
  return {
    updates: [],
    coverage: items.map((item) => ({
      id: `coverage-google-${slugify(`${item.outlet}-${item.title}`)}`,
      date: item.date,
      outlet: item.outlet,
      language: inferLanguage(item.title, item.description),
      languageCode: inferLanguage(item.title, item.description) === 'Italian' ? 'it' : '',
      title: item.title,
      url: item.url,
      summary: 'Automatically discovered news coverage matched against exact A/I campaign signals.',
      automated: true,
    })),
  }
}

async function fetchWithTimeout(url, fetcher, accept) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    return await fetcher(url.toString(), {
      headers: { accept, 'user-agent': 'SabotMediaCampaignTracker/1.0 (+https://sabot.media)' },
      signal: controller.signal,
      redirect: 'follow',
    })
  } finally {
    clearTimeout(timer)
  }
}

function isExcludedCoverageDomain(domain) {
  return /(?:^|\.)(?:sabot\.media|inventati\.org|autistici\.org|noblogs\.org|bsky\.app|mastodon\.bida\.im|kolektiva\.social)$/i.test(String(domain || ''))
}

function rssLink(value) {
  if (typeof value === 'string') return safeHttpUrl(value)
  if (Array.isArray(value)) return rssLink(value.find((item) => item?.['@_rel'] === 'alternate') || value[0])
  return safeHttpUrl(value?.['@_href'] || value?.['#text'] || '')
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
  return /\b(?:gli|della|collettivo|comunicato|sanzioni|servizi|stati uniti|terroristi)\b/.test(text) ? 'Italian' : ''
}

function normalizeLanguage(value) {
  const language = String(value || '').toLowerCase()
  if (language.startsWith('ital')) return { code: 'it', label: 'Italian' }
  if (language.startsWith('eng')) return { code: 'en', label: 'English' }
  return { code: '', label: String(value || '') }
}

function outletName(domain) {
  const value = String(domain || '').replace(/^www\./, '').split('.')[0]
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'External coverage'
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
