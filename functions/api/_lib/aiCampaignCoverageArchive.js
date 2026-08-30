import { isCampaignCoverageCandidate } from './aiCampaignIntelligence.js'

export const AI_COVERAGE_CAMPAIGN = 'autistici-inventati'
export const GDELT_SOURCE = 'gdelt-doc-api'

const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
const GDELT_REFRESH_MS = 55 * 60 * 1000
const MAX_PAGE_SIZE = 500
const AI_NAME = /autistici(?:\s*\/\s*|\s+)?inventati/i
const NOBLOGS = /\bnoblogs(?:\.org)?\b/i
const CASE_SIGNAL = /designat|sanction|terroris|ofac|serverhold|communications infrastructure|infrastruttur|sanzion|lista usa/i

export async function ensureAiCoverageArchiveTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS campaign_coverage_archive (
    id TEXT PRIMARY KEY,
    campaign_slug TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    title TEXT NOT NULL,
    translated_title TEXT NOT NULL DEFAULT '',
    outlet TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    published_at TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT '',
    language_code TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    discovery_source TEXT NOT NULL DEFAULT '',
    relevance_score INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_slug, canonical_url)
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_coverage_campaign_date ON campaign_coverage_archive(campaign_slug, published_at DESC)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_coverage_campaign_outlet ON campaign_coverage_archive(campaign_slug, outlet)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_coverage_campaign_language ON campaign_coverage_archive(campaign_slug, language_code)').run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS campaign_coverage_refresh (
    campaign_slug TEXT NOT NULL,
    source TEXT NOT NULL,
    last_attempt_at TEXT NOT NULL DEFAULT '',
    last_success_at TEXT NOT NULL DEFAULT '',
    last_error TEXT NOT NULL DEFAULT '',
    item_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(campaign_slug, source)
  )`).run()
}

export async function upsertAiCoverageItems(db, items = [], { campaignSlug = AI_COVERAGE_CAMPAIGN, source = '' } = {}) {
  await ensureAiCoverageArchiveTables(db)
  let saved = 0
  for (const raw of dedupeArchiveItems(items)) {
    const item = normalizeArchiveItem(raw, { campaignSlug, source })
    if (!item) continue
    await db.prepare(`INSERT INTO campaign_coverage_archive (
      id, campaign_slug, canonical_url, title, translated_title, outlet, summary,
      published_at, language, language_code, image_url, discovery_source,
      relevance_score, is_featured, status, first_seen_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
    ON CONFLICT(campaign_slug, canonical_url) DO UPDATE SET
      title = excluded.title,
      translated_title = CASE WHEN excluded.translated_title != '' THEN excluded.translated_title ELSE translated_title END,
      outlet = CASE WHEN excluded.outlet != '' THEN excluded.outlet ELSE outlet END,
      summary = CASE WHEN length(excluded.summary) > length(summary) THEN excluded.summary ELSE summary END,
      published_at = CASE WHEN excluded.published_at != '' THEN excluded.published_at ELSE published_at END,
      language = CASE WHEN excluded.language != '' THEN excluded.language ELSE language END,
      language_code = CASE WHEN excluded.language_code != '' THEN excluded.language_code ELSE language_code END,
      image_url = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE image_url END,
      discovery_source = CASE WHEN is_featured = 1 THEN discovery_source ELSE excluded.discovery_source END,
      relevance_score = MAX(relevance_score, excluded.relevance_score),
      is_featured = MAX(is_featured, excluded.is_featured),
      status = 'published',
      last_seen_at = excluded.last_seen_at`)
      .bind(
        item.id, item.campaignSlug, item.url, item.title, item.translatedTitle, item.outlet,
        item.summary, item.date, item.language, item.languageCode, item.imageUrl,
        item.discoverySource, item.relevanceScore, item.isFeatured ? 1 : 0,
        item.firstSeenAt, item.lastSeenAt,
      ).run()
    saved += 1
  }
  return saved
}

export async function listAiCoverageArchive(db, options = {}) {
  await ensureAiCoverageArchiveTables(db)
  const campaignSlug = String(options.campaignSlug || AI_COVERAGE_CAMPAIGN)
  const page = clampInt(options.page, 1, 100000, 1)
  const limit = clampInt(options.limit, 1, MAX_PAGE_SIZE, 24)
  const q = cleanText(options.q).slice(0, 160)
  const language = cleanText(options.language).slice(0, 20).toLowerCase()
  const outlet = cleanText(options.outlet).slice(0, 120)
  const clauses = ["campaign_slug = ?", "status = 'published'"]
  const values = [campaignSlug]
  if (q) {
    clauses.push("(lower(title) LIKE ? ESCAPE '\\' OR lower(translated_title) LIKE ? ESCAPE '\\' OR lower(outlet) LIKE ? ESCAPE '\\' OR lower(summary) LIKE ? ESCAPE '\\')")
    const term = `%${escapeLike(q.toLowerCase())}%`
    values.push(term, term, term, term)
  }
  if (language) { clauses.push('lower(language_code) = ?'); values.push(language) }
  if (outlet) { clauses.push('outlet = ?'); values.push(outlet) }
  const where = `WHERE ${clauses.join(' AND ')}`
  const countRow = await db.prepare(`SELECT COUNT(*) AS total FROM campaign_coverage_archive ${where}`).bind(...values).first()
  const result = await db.prepare(`SELECT * FROM campaign_coverage_archive ${where}
    ORDER BY is_featured DESC, published_at DESC, relevance_score DESC, outlet ASC
    LIMIT ? OFFSET ?`).bind(...values, limit, (page - 1) * limit).all()
  const rows = Array.isArray(result?.results) ? result.results : []
  const total = Number(countRow?.total || 0)
  return { items: rows.map(rowToArchiveItem), page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
}

export async function getAiCoverageArchiveSummary(db, campaignSlug = AI_COVERAGE_CAMPAIGN) {
  await ensureAiCoverageArchiveTables(db)
  const [count, languages, outlets, refreshed] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS total, MAX(last_seen_at) AS last_updated_at FROM campaign_coverage_archive WHERE campaign_slug = ? AND status = 'published'").bind(campaignSlug).first(),
    db.prepare("SELECT language_code, language, COUNT(*) AS count FROM campaign_coverage_archive WHERE campaign_slug = ? AND status = 'published' GROUP BY language_code, language ORDER BY count DESC, language ASC").bind(campaignSlug).all(),
    db.prepare("SELECT outlet, COUNT(*) AS count FROM campaign_coverage_archive WHERE campaign_slug = ? AND status = 'published' AND outlet != '' GROUP BY outlet ORDER BY count DESC, outlet ASC").bind(campaignSlug).all(),
    db.prepare('SELECT source, last_success_at, item_count FROM campaign_coverage_refresh WHERE campaign_slug = ? ORDER BY source ASC').bind(campaignSlug).all(),
  ])
  return {
    total: Number(count?.total || 0),
    lastUpdatedAt: String(count?.last_updated_at || ''),
    languages: (languages?.results || []).map((row) => ({ code: String(row.language_code || ''), label: String(row.language || row.language_code || 'Unlabeled'), count: Number(row.count || 0) })),
    outlets: (outlets?.results || []).map((row) => ({ label: String(row.outlet || ''), count: Number(row.count || 0) })),
    refreshedSources: (refreshed?.results || []).map((row) => ({ source: String(row.source || ''), lastSuccessAt: String(row.last_success_at || ''), itemCount: Number(row.item_count || 0) })),
  }
}

export async function refreshGdeltCoverageIfStale(db, fetcher = fetch, options = {}) {
  await ensureAiCoverageArchiveTables(db)
  const now = options.now instanceof Date ? options.now : new Date()
  const force = options.force === true
  const state = await db.prepare('SELECT last_attempt_at FROM campaign_coverage_refresh WHERE campaign_slug = ? AND source = ? LIMIT 1').bind(AI_COVERAGE_CAMPAIGN, GDELT_SOURCE).first()
  const lastAttempt = new Date(state?.last_attempt_at || 0).getTime()
  if (!force && Number.isFinite(lastAttempt) && now.getTime() - lastAttempt < GDELT_REFRESH_MS) return { refreshed: false, reason: 'fresh' }

  const attemptedAt = now.toISOString()
  await writeRefreshState(db, { source: GDELT_SOURCE, lastAttemptAt: attemptedAt, lastSuccessAt: '', lastError: '', itemCount: 0 })
  try {
    const items = await fetchGdeltAiCoverage(fetcher)
    const saved = await upsertAiCoverageItems(db, items, { source: GDELT_SOURCE })
    await writeRefreshState(db, { source: GDELT_SOURCE, lastAttemptAt: attemptedAt, lastSuccessAt: new Date().toISOString(), lastError: '', itemCount: saved })
    return { refreshed: true, saved }
  } catch (error) {
    await writeRefreshState(db, { source: GDELT_SOURCE, lastAttemptAt: attemptedAt, lastSuccessAt: '', lastError: String(error?.message || error).slice(0, 500), itemCount: 0 })
    return { refreshed: false, reason: 'source-error' }
  }
}

export async function fetchGdeltAiCoverage(fetcher = fetch) {
  const url = new URL(GDELT_ENDPOINT)
  url.searchParams.set('query', '("Autistici Inventati" OR "Autistici/Inventati" OR "NoBlogs.org")')
  url.searchParams.set('mode', 'ArtList')
  url.searchParams.set('maxrecords', '250')
  url.searchParams.set('format', 'json')
  url.searchParams.set('sort', 'DateDesc')
  url.searchParams.set('timespan', '3months')
  const response = await fetchWithTimeout(url, fetcher)
  if (!response.ok) throw new Error(`GDELT returned ${response.status}`)
  const data = await response.json()
  return (Array.isArray(data?.articles) ? data.articles : [])
    .filter(isStrictGdeltCandidate)
    .map((article) => ({
      id: `coverage-gdelt-${stableId(article.url || article.title)}`,
      date: normalizeDate(article.seendate || article.date || article.publishedAt),
      outlet: cleanText(article.domain || article.sourcecountry || 'News coverage'),
      language: normalizeLanguage(article.language),
      languageCode: languageCode(article.language),
      title: cleanText(article.title),
      url: safeHttpUrl(article.url),
      imageUrl: safeHttpUrl(article.socialimage),
      summary: '',
      automated: true,
      discoverySource: GDELT_SOURCE,
      relevanceScore: scoreCoverage(article),
    }))
    .filter((item) => item.title && item.url && item.date)
}

export function isStrictGdeltCandidate(item = {}) {
  if (!isCampaignCoverageCandidate(item)) return false
  const title = cleanText(item.title)
  const context = `${title} ${cleanText(item.description)} ${String(item.url || '')}`
  return AI_NAME.test(title) || (AI_NAME.test(context) && CASE_SIGNAL.test(context)) || (NOBLOGS.test(context) && CASE_SIGNAL.test(context))
}

export function normalizeArchiveItem(raw = {}, { campaignSlug = AI_COVERAGE_CAMPAIGN, source = '' } = {}) {
  const url = canonicalUrl(raw.url || raw.href)
  const title = cleanText(raw.title)
  if (!url || !title) return null
  const now = new Date().toISOString()
  const discoverySource = cleanText(raw.discoverySource || source || inferSource(raw))
  return {
    id: `coverage-${stableId(`${campaignSlug}:${url}`)}`,
    campaignSlug,
    url,
    title,
    translatedTitle: cleanText(raw.translatedTitle),
    outlet: cleanText(raw.outlet || raw.publisher),
    summary: cleanText(raw.summary || raw.description).slice(0, 600),
    date: normalizeDate(raw.date || raw.publishedAt || raw.seendate),
    language: normalizeLanguage(raw.language),
    languageCode: cleanText(raw.languageCode).toLowerCase() || languageCode(raw.language),
    imageUrl: safeHttpUrl(raw.imageUrl || raw.socialimage),
    discoverySource,
    relevanceScore: Number.isFinite(Number(raw.relevanceScore)) ? Number(raw.relevanceScore) : scoreCoverage(raw),
    isFeatured: raw.isFeatured === true || raw.featured === true || raw.automated !== true,
    firstSeenAt: now,
    lastSeenAt: now,
  }
}

async function writeRefreshState(db, state) {
  await db.prepare(`INSERT INTO campaign_coverage_refresh (campaign_slug, source, last_attempt_at, last_success_at, last_error, item_count)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(campaign_slug, source) DO UPDATE SET
      last_attempt_at = excluded.last_attempt_at,
      last_success_at = CASE WHEN excluded.last_success_at != '' THEN excluded.last_success_at ELSE last_success_at END,
      last_error = excluded.last_error,
      item_count = excluded.item_count`)
    .bind(AI_COVERAGE_CAMPAIGN, state.source, state.lastAttemptAt, state.lastSuccessAt, state.lastError, state.itemCount).run()
}

function rowToArchiveItem(row = {}) {
  return {
    id: String(row.id || ''),
    date: String(row.published_at || ''),
    outlet: String(row.outlet || ''),
    language: String(row.language || ''),
    languageCode: String(row.language_code || ''),
    title: String(row.title || ''),
    translatedTitle: String(row.translated_title || ''),
    url: String(row.canonical_url || ''),
    imageUrl: String(row.image_url || ''),
    summary: String(row.summary || ''),
    discoverySource: String(row.discovery_source || ''),
    relevanceScore: Number(row.relevance_score || 0),
    featured: Number(row.is_featured || 0) === 1,
  }
}

function inferSource(item) {
  if (item.automated !== true) return 'editorial'
  if (/autistici|inventati|cavallette/i.test(String(item.outlet || item.publisher || ''))) return 'official-ai'
  return 'live-discovery'
}

function scoreCoverage(item) {
  const title = cleanText(item.title)
  const context = `${title} ${cleanText(item.description || item.summary)} ${String(item.url || '')}`
  let score = 0
  if (AI_NAME.test(title)) score += 80
  else if (AI_NAME.test(context)) score += 50
  if (NOBLOGS.test(title)) score += 35
  else if (NOBLOGS.test(context)) score += 18
  if (CASE_SIGNAL.test(title)) score += 25
  else if (CASE_SIGNAL.test(context)) score += 12
  if (item.automated !== true) score += 20
  return score
}

function dedupeArchiveItems(items) {
  const seen = new Set()
  return (Array.isArray(items) ? items : []).filter((item) => {
    const url = canonicalUrl(item?.url || item?.href)
    if (!url || seen.has(url)) return false
    seen.add(url)
    return true
  })
}

async function fetchWithTimeout(url, fetcher) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    return await fetcher(url.toString(), {
      headers: { accept: 'application/json', 'user-agent': 'SabotMediaCoverageArchive/1.0 (+https://sabot.media)' },
      signal: controller.signal,
      redirect: 'follow',
    })
  } finally { clearTimeout(timer) }
}

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || ''))
    if (!/^https?:$/.test(url.protocol)) return ''
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key)
    return url.toString().replace(/\/$/, '')
  } catch { return '' }
}
function safeHttpUrl(value) { return canonicalUrl(value) }
function cleanText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => safeCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => safeCodePoint(Number.parseInt(code, 10)))
    .replace(/&(?:amp|#38);/gi, '&')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}
function safeCodePoint(value) { try { return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '' } catch { return '' } }
function normalizeDate(value) { const compact = String(value || '').match(/^(\d{8})T(\d{6})Z$/); const normalized = compact ? `${compact[1].slice(0, 4)}-${compact[1].slice(4, 6)}-${compact[1].slice(6, 8)}T${compact[2].slice(0, 2)}:${compact[2].slice(2, 4)}:${compact[2].slice(4, 6)}Z` : value; const time = new Date(normalized || 0).getTime(); return Number.isFinite(time) ? new Date(time).toISOString() : '' }
function normalizeLanguage(value) { const text = cleanText(value); if (/^it(?:alian|aliano)?$/i.test(text)) return 'Italian'; if (/^en(?:glish)?$/i.test(text)) return 'English'; return text }
function languageCode(value) { const text = cleanText(value); if (/^it(?:alian|aliano)?$/i.test(text)) return 'it'; if (/^en(?:glish)?$/i.test(text)) return 'en'; return '' }
function stableId(value) { let hash = 2166136261; for (const char of String(value || '')) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619) } return (hash >>> 0).toString(36) }
function clampInt(value, min, max, fallback) { const number = Number.parseInt(value, 10); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback }
function escapeLike(value) { return String(value || '').replace(/[\\%_]/g, '\\$&') }
