/**
 * @typedef {Object} PrintlabAssetResult
 * @property {string} id
 * @property {string} title
 * @property {string} creator
 * @property {string} description
 * @property {string} thumbnailUrl
 * @property {string} previewUrl
 * @property {string} downloadUrl
 * @property {string} landingPageUrl
 * @property {string} license
 * @property {string} licenseUrl
 * @property {string} source
 * @property {string} sourceLabel
 * @property {string} mediaType
 * @property {number|null} width
 * @property {number|null} height
 * @property {string} mimeType
 * @property {string} attributionText
 * @property {string[]} tags
 * @property {string} category
 * @property {unknown} raw
 */

import { getPrintlabElements } from './printlabElements.js'

const htmlStripper = /<[^>]*>/g

export const assetModeOptions = [
  { id: 'everything', label: 'Search Everything' },
  { id: 'elements', label: 'Elements' },
  { id: 'photos', label: 'Photos' },
  { id: 'illustrations', label: 'Illustrations' },
  { id: 'icons', label: 'Icons' },
  { id: 'historical', label: 'Historical' },
  { id: 'audio', label: 'Audio' },
  { id: 'textures', label: 'Textures' },
  { id: 'maps', label: 'Maps' },
  { id: 'documents', label: 'Documents' },
]

const editorialExpansionMap = [
  { pattern: /mutual\s+aid/i, terms: ['solidarity', 'community', 'neighbors', 'food', 'free food', 'food distribution', 'collective', 'organizing', 'housing', 'volunteers', 'relief', 'support', 'care', 'protest', 'labor', 'union', 'cooperative', 'commons'] },
  { pattern: /labor|union|strike/i, terms: ['workers', 'picket', 'organizing', 'solidarity', 'shop floor'] },
  { pattern: /zine/i, terms: ['booklet', 'pamphlet', 'pages', 'xerox', 'fold'] },
  { pattern: /print|poster/i, terms: ['press', 'flyer', 'broadside', 'paper', 'halftone'] },
  { pattern: /podcast|radio/i, terms: ['mic', 'microphone', 'headphones', 'broadcast', 'audio'] },
]

const iconifyFallbacks = [
  { pattern: /mutual\s+aid|community\s+aid|aid/i, terms: ['heart', 'hands', 'home', 'people', 'group', 'medical', 'food', 'box', 'package', 'megaphone', 'fist', 'community', 'volunteer', 'donation', 'share'] },
  { pattern: /podcast/i, terms: ['mic', 'radio', 'headphones'] },
  { pattern: /print|printing/i, terms: ['printer', 'file', 'document'] },
  { pattern: /zine|booklet/i, terms: ['book', 'booklet', 'pages'] },
]

const localPackSeed = [
  ['Sabot Brand Kit', 'illustrations', ['sabot', 'brand', 'logo', 'masthead']],
  ['Labor Posters', 'historical', ['labor', 'union', 'strike', 'poster', 'workers']],
  ['Public Domain Woodcuts', 'illustrations', ['woodcut', 'public domain', 'engraving', 'historic']],
  ['Risograph Textures', 'textures', ['riso', 'risograph', 'texture', 'grain']],
  ['Photocopy Artifacts', 'textures', ['photocopy', 'xerox', 'noise', 'paper']],
  ['Redaction Marks', 'illustrations', ['redaction', 'censor', 'blackout', 'document']],
  ['Typewriter Elements', 'documents', ['typewriter', 'text', 'letter', 'paper']],
  ['Fold Lines', 'textures', ['fold', 'paper', 'zine', 'layout']],
  ['Coffee Stains', 'textures', ['coffee', 'stain', 'paper', 'artifact']],
  ['Mutual Aid Icons', 'icons', ['mutual aid', 'solidarity', 'community', 'food', 'housing', 'volunteers']],
  ['Protest Graphics', 'illustrations', ['protest', 'banner', 'picket', 'solidarity']],
  ['Newswire Templates', 'documents', ['wire', 'newswire', 'template', 'dispatch']],
  ['Newspaper Halftones', 'textures', ['newspaper', 'halftone', 'print', 'dot']],
]

function cleanText(value = '') {
  return String(value || '').replace(htmlStripper, ' ').replace(/\s+/g, ' ').trim()
}

function compactUrl(value = '') {
  return String(value || '').trim()
}

function safeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function uniqueValues(values = []) {
  const seen = new Set()
  return values.map((value) => cleanText(value).toLowerCase()).filter((value) => {
    if (!value || seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function includesAny(haystack, needles) {
  const value = cleanText(haystack).toLowerCase()
  return needles.some((needle) => needle && value.includes(needle))
}

function makePackSvgDataUrl(title, mode) {
  const initials = title.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" fill="#f6f1e8"/><rect x="34" y="34" width="572" height="352" fill="none" stroke="#1d2327" stroke-width="12"/><path d="M72 316h496M72 284h360M72 252h420" stroke="#c22b26" stroke-width="11" stroke-linecap="square"/><text x="72" y="132" font-family="Arial Black, Impact, sans-serif" font-size="82" fill="#1d2327">${initials}</text><text x="76" y="184" font-family="Arial, sans-serif" font-size="28" fill="#50575e">${mode.toUpperCase()}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function expandEditorialQuery(query = '') {
  const q = cleanText(query)
  const words = q.split(/\s+/).filter((word) => word.length > 2)
  const mapped = editorialExpansionMap.flatMap((entry) => (entry.pattern.test(q) ? entry.terms : []))
  return uniqueValues([q, ...words, ...mapped])
}

function getOpenverseAttribution(item) {
  if (item?.attribution) return cleanText(item.attribution)
  const title = cleanText(item?.title || 'Untitled')
  const creator = cleanText(item?.creator || '')
  const license = cleanText(item?.license || '')
  return [title, creator ? `by ${creator}` : '', license].filter(Boolean).join(' / ')
}

function getCommonsMetadata(info, key) {
  return cleanText(info?.extmetadata?.[key]?.value || '')
}

function inferMediaType(input = {}) {
  const mediaType = cleanText(input.mediaType || input.type || '').toLowerCase()
  const mimeType = cleanText(input.mimeType || input.mime || '').toLowerCase()
  const url = compactUrl(input.downloadUrl || input.previewUrl || input.thumbnailUrl || input.fullUrl || input.url)
  if (mediaType) return mediaType
  if (mimeType.includes('svg') || /\.svg($|\?)/i.test(url)) return 'icon'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf') || /\.(pdf|docx?|txt)($|\?)/i.test(url)) return 'document'
  return 'image'
}

export function normalizePrintlabAsset(asset) {
  if (!asset || typeof asset !== 'object') return null
  const downloadUrl = compactUrl(asset.downloadUrl || asset.fullUrl || asset.url || asset.previewUrl || asset.thumbnailUrl)
  const previewUrl = compactUrl(asset.previewUrl || asset.thumbnailUrl || downloadUrl)
  const thumbnailUrl = compactUrl(asset.thumbnailUrl || previewUrl || downloadUrl)
  const landingPageUrl = compactUrl(asset.landingPageUrl || asset.landingUrl || asset.foreignLandingUrl || '')
  if (!downloadUrl && !previewUrl && !thumbnailUrl && !landingPageUrl) return null
  const source = cleanText(asset.source || asset.originalProvider || 'external')
  const sourceLabel = cleanText(asset.sourceLabel || asset.providerLabel || source || 'External')
  const title = cleanText(asset.title || 'Untitled asset')
  const creator = cleanText(asset.creator || '')
  const license = cleanText(asset.license || '')
  const licenseUrl = compactUrl(asset.licenseUrl || '')
  const attributionText = cleanText(asset.attributionText || asset.attribution || [title, creator ? `by ${creator}` : '', sourceLabel, license].filter(Boolean).join(' / '))
  const mediaType = inferMediaType(asset)
  const normalized = {
    id: String(asset.id || asset.originalId || `${source}:${downloadUrl || previewUrl || thumbnailUrl || landingPageUrl}`),
    title,
    creator,
    description: cleanText(asset.description || asset.caption || ''),
    thumbnailUrl,
    previewUrl,
    downloadUrl,
    landingPageUrl,
    license,
    licenseUrl,
    source,
    sourceLabel,
    mediaType,
    width: safeNumber(asset.width),
    height: safeNumber(asset.height),
    mimeType: cleanText(asset.mimeType || asset.mime || ''),
    attributionText,
    tags: uniqueValues(safeArray(asset.tags).length ? asset.tags : String(asset.tags || '').split(',')),
    category: cleanText(asset.category || ''),
    raw: asset.raw ?? asset,
    originalProvider: cleanText(asset.originalProvider || source),
    originalId: String(asset.originalId || asset.id || ''),
  }

  return {
    ...normalized,
    fullUrl: normalized.downloadUrl,
    url: normalized.downloadUrl,
    sourceName: normalized.sourceLabel,
    landingUrl: normalized.landingPageUrl,
    attribution: normalized.attributionText,
  }
}

function normalizeOpenverse(item) {
  if (!item || typeof item !== 'object') return null
  return normalizePrintlabAsset({
    id: `openverse:${item?.id || item?.url || ''}`,
    originalProvider: 'openverse',
    originalId: item?.id || item?.url || '',
    title: item?.title,
    thumbnailUrl: item?.thumbnail || item?.url,
    previewUrl: item?.thumbnail || item?.url,
    downloadUrl: item?.url || item?.thumbnail,
    source: 'openverse',
    sourceLabel: item?.source ? `Openverse / ${item.source}` : 'Openverse',
    creator: item?.creator,
    license: item?.license,
    licenseUrl: item?.license_url,
    attributionText: getOpenverseAttribution(item),
    mediaType: 'photo',
    landingPageUrl: item?.foreign_landing_url,
    width: item?.width,
    height: item?.height,
    raw: item,
  })
}

function normalizeCommons(page) {
  if (!page || typeof page !== 'object') return null
  const info = page?.imageinfo?.[0] || {}
  const objectName = getCommonsMetadata(info, 'ObjectName')
  const title = objectName || cleanText(page?.title || '').replace(/^File:/, '')
  const creator = getCommonsMetadata(info, 'Artist') || cleanText(info.user || '')
  const license = getCommonsMetadata(info, 'LicenseShortName') || getCommonsMetadata(info, 'License')
  const licenseUrl = getCommonsMetadata(info, 'LicenseUrl')
  const credit = getCommonsMetadata(info, 'Credit')
  const attributionRequired = getCommonsMetadata(info, 'Attribution')
  return normalizePrintlabAsset({
    id: `wikimedia:${page.pageid || info.url}`,
    originalProvider: 'wikimedia',
    originalId: page.pageid || info.url || '',
    title,
    thumbnailUrl: info.thumburl || info.url,
    previewUrl: info.thumburl || info.url,
    downloadUrl: info.url || info.thumburl,
    source: 'wikimedia',
    sourceLabel: 'Wikimedia Commons',
    creator,
    license,
    licenseUrl,
    attributionText: attributionRequired || credit || [title, creator ? `by ${creator}` : '', 'Wikimedia Commons', license].filter(Boolean).join(' / '),
    mediaType: String(info.mime || '').includes('svg') ? 'illustration' : 'photo',
    landingPageUrl: info.descriptionurl,
    mimeType: info.mime,
    width: info.width,
    height: info.height,
    tags: ['commons', 'historical'],
    raw: page,
  })
}

function normalizeIconify(icon) {
  const name = String(icon || '').trim()
  if (!name || !name.includes(':')) return null
  const [prefix, iconName] = name.split(':')
  const svgUrl = `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(iconName)}.svg`
  return normalizePrintlabAsset({
    id: `iconify:${name}`,
    originalProvider: 'iconify',
    originalId: name,
    title: name,
    thumbnailUrl: svgUrl,
    previewUrl: svgUrl,
    downloadUrl: svgUrl,
    source: 'iconify',
    sourceLabel: 'Iconify',
    creator: prefix,
    license: 'Icon set license varies',
    licenseUrl: 'https://iconify.design/docs/icons/license.html',
    attributionText: `${name} icon from Iconify. Verify the ${prefix} icon set license before publication.`,
    mediaType: 'icon',
    mimeType: 'image/svg+xml',
    landingPageUrl: `https://icon-sets.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(iconName)}/`,
    tags: [prefix, iconName, 'svg', 'icon'],
    raw: icon,
  })
}

function normalizeLocalMedia(item) {
  return normalizePrintlabAsset({
    id: item?.id,
    originalProvider: item?.originalProvider || 'local-media',
    originalId: item?.originalId || item?.id,
    title: item?.title || item?.filename || 'Uploaded media',
    creator: item?.creator || '',
    description: item?.description || item?.caption || '',
    thumbnailUrl: item?.thumbnailUrl || item?.url || item?.dataUrl,
    previewUrl: item?.previewUrl || item?.url || item?.dataUrl,
    downloadUrl: item?.downloadUrl || item?.fullUrl || item?.url || item?.dataUrl,
    landingPageUrl: item?.landingPageUrl || item?.landingUrl || '',
    license: item?.license || '',
    licenseUrl: item?.licenseUrl || '',
    source: 'local-media',
    sourceLabel: item?.source && item.source !== 'local-upload' ? `Media Library / ${item.source}` : 'Sabot Media Library',
    mediaType: item?.mediaType || 'image',
    mimeType: item?.mimeType || '',
    attributionText: item?.attributionText || item?.attribution || item?.caption || '',
    category: item?.category || '',
    tags: item?.tags || [],
    raw: item,
  })
}

function normalizeLocalPack(pack, index) {
  const [title, mode, tags] = pack
  const image = makePackSvgDataUrl(title, mode)
  return normalizePrintlabAsset({
    id: `local-pack:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    originalProvider: 'local-packs',
    originalId: title,
    title,
    creator: 'Sabot Media',
    description: 'Curated local asset pack placeholder.',
    thumbnailUrl: image,
    previewUrl: image,
    downloadUrl: image,
    source: 'local-packs',
    sourceLabel: 'Local Asset Packs',
    license: 'Internal curated asset',
    attributionText: `${title} local pack / Sabot Media`,
    mediaType: mode,
    mimeType: 'image/svg+xml',
    tags: [...tags, 'local pack', `pack-${index + 1}`],
    raw: { title, mode, tags },
  })
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.detail || data?.error || `Search failed: ${res.status}`)
  if (!data || typeof data !== 'object') throw new Error('Search returned an unreadable response.')
  return data
}

async function searchIconifyTerm(term, limit = 36) {
  const url = new URL('https://api.iconify.design/search')
  url.searchParams.set('query', term)
  url.searchParams.set('limit', String(limit))
  const data = await fetchJson(url)
  return safeArray(data.icons)
}

async function searchIconifyWithFallbacks(query, expandedTerms = []) {
  const words = query.split(/\s+/).filter((word) => word.length > 2)
  const mapped = iconifyFallbacks.flatMap((entry) => (entry.pattern.test(query) ? entry.terms : []))
  const terms = uniqueValues([query, ...mapped, ...words, ...expandedTerms])
  const icons = []
  const seen = new Set()

  for (const term of terms) {
    const matches = await searchIconifyTerm(term, 36)
    for (const icon of matches) {
      if (!icon || seen.has(icon)) continue
      seen.add(icon)
      icons.push(icon)
      if (icons.length >= 36) return icons
    }
  }

  return icons
}

function modeMatchesAsset(asset, mode) {
  if (!asset || mode === 'everything') return true
  const mediaType = cleanText(asset.mediaType).toLowerCase()
  const haystack = [asset.title, asset.description, asset.sourceLabel, ...(asset.tags || [])].join(' ').toLowerCase()
  if (mode === 'photos') return ['photo', 'image'].includes(mediaType) || (mediaType === 'image' && asset.source !== 'iconify')
  if (mode === 'elements') return asset.source === 'printlab-elements' || mediaType === 'element'
  if (mode === 'illustrations') return ['illustration', 'graphic', 'element'].includes(mediaType) || includesAny(haystack, ['woodcut', 'poster', 'graphic'])
  if (mode === 'icons') return mediaType === 'icon' || asset.source === 'iconify' || includesAny(haystack, ['icon'])
  if (mode === 'historical') return ['wikimedia', 'local-packs'].includes(asset.source) && includesAny(haystack, ['historical', 'labor', 'archive', 'woodcut'])
  if (mode === 'audio') return mediaType === 'audio'
  if (mode === 'textures') return mediaType === 'texture' || includesAny(haystack, ['texture', 'riso', 'photocopy', 'halftone', 'stain', 'fold'])
  if (mode === 'maps') return mediaType === 'map' || includesAny(haystack, ['map', 'atlas'])
  if (mode === 'documents') return mediaType === 'document' || includesAny(haystack, ['document', 'template', 'typewriter', 'wire'])
  return true
}

function textMatchesAsset(asset, terms) {
  if (!terms.length) return true
  const haystack = [asset.title, asset.description, ...(asset.tags || [])].join(' ').toLowerCase()
  return terms.some((term) => haystack.includes(term))
}

function rankAsset(asset, query, expandedTerms, mode) {
  const exact = cleanText(query).toLowerCase()
  const title = cleanText(asset.title).toLowerCase()
  const description = cleanText(asset.description).toLowerCase()
  const tags = (asset.tags || []).join(' ').toLowerCase()
  const category = cleanText(asset.category).toLowerCase()
  const strongText = `${title} ${tags}`
  const expandedMatches = expandedTerms.filter((term) => strongText.includes(term))
  let score = 0
  if (asset.source === 'printlab-elements') score += mode === 'elements' ? 230 : 180
  if (asset.source === 'local-media') score += 160
  if (asset.source === 'local-packs') score += 110
  if (asset.source === 'iconify') score += mode === 'icons' ? 95 : 50
  if (asset.source === 'printlab-elements' && exact && (title.includes(exact) || tags.includes(exact) || category.includes(exact))) score += 120
  if (asset.source === 'local-packs' && exact && (title.includes(exact) || tags.includes(exact) || category.includes(exact))) score += 95
  if (asset.source === 'iconify' && exact && (title.includes(exact) || tags.includes(exact))) score += 70
  if (exact && title === exact) score += 80
  if (exact && title.includes(exact)) score += 70
  if (exact && tags.includes(exact)) score += 62
  if (exact && category.includes(exact)) score += 58
  if (expandedMatches.length) score += Math.min(70, expandedMatches.length * 18)
  if (expandedTerms.some((term) => description.includes(term))) score += 8
  if (modeMatchesAsset(asset, mode)) score += 28
  if (asset.thumbnailUrl || asset.previewUrl) score += 14
  if (asset.license || asset.licenseUrl || asset.attributionText) score += 7
  if (asset.source === 'wikimedia' || asset.source === 'openverse') score -= 8
  if (/mutual\s+aid/i.test(exact) && /fund|axis|finance|bank/i.test(title)) score -= 90
  return score
}

function dedupeAssets(items) {
  const seen = new Set()
  return items.filter((asset) => {
    const key = asset?.id || asset?.downloadUrl || asset?.previewUrl
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const providers = [
  {
    id: 'printlab-elements',
    label: 'Printlab Elements',
    modes: ['everything', 'elements', 'illustrations', 'icons', 'textures', 'maps', 'documents'],
    async search({ query, expandedTerms, mode }) {
      const terms = expandedTerms.length ? expandedTerms : expandEditorialQuery(query)
      return getPrintlabElements()
        .map(normalizePrintlabAsset)
        .filter(Boolean)
        .filter((asset) => modeMatchesAsset(asset, mode))
        .filter((asset) => textMatchesAsset(asset, terms))
    },
  },
  {
    id: 'local-media',
    label: 'Sabot Media Library',
    modes: ['everything', 'photos', 'illustrations', 'icons', 'audio', 'textures', 'maps', 'documents'],
    async search({ query, expandedTerms, mode, localMedia }) {
      const terms = expandedTerms.length ? expandedTerms : expandEditorialQuery(query)
      return safeArray(localMedia)
        .map(normalizeLocalMedia)
        .filter(Boolean)
        .filter((asset) => modeMatchesAsset(asset, mode))
        .filter((asset) => textMatchesAsset(asset, terms))
    },
  },
  {
    id: 'local-packs',
    label: 'Local Asset Packs',
    modes: ['everything', 'illustrations', 'icons', 'historical', 'textures', 'documents'],
    async search({ query, expandedTerms, mode }) {
      const terms = expandedTerms.length ? expandedTerms : expandEditorialQuery(query)
      return localPackSeed
        .map(normalizeLocalPack)
        .filter(Boolean)
        .filter((asset) => modeMatchesAsset(asset, mode))
        .filter((asset) => textMatchesAsset(asset, terms))
    },
  },
  {
    id: 'openverse',
    label: 'Openverse',
    modes: ['everything', 'photos', 'illustrations', 'textures'],
    async search({ query }) {
      if (!query) return []
      const url = new URL('https://api.openverse.org/v1/images/')
      url.searchParams.set('q', query)
      url.searchParams.set('page_size', '20')
      const data = await fetchJson(url)
      return safeArray(data.results).map(normalizeOpenverse).filter(Boolean)
    },
  },
  {
    id: 'wikimedia',
    label: 'Wikimedia Commons',
    modes: ['everything', 'photos', 'illustrations', 'historical', 'maps', 'documents'],
    async search({ query }) {
      if (!query) return []
      const url = new URL('https://commons.wikimedia.org/w/api.php')
      url.searchParams.set('action', 'query')
      url.searchParams.set('format', 'json')
      url.searchParams.set('origin', '*')
      url.searchParams.set('generator', 'search')
      url.searchParams.set('gsrnamespace', '6')
      url.searchParams.set('gsrlimit', '24')
      url.searchParams.set('gsrsearch', query)
      url.searchParams.set('prop', 'imageinfo')
      url.searchParams.set('iiprop', 'url|extmetadata|mime|user|size')
      url.searchParams.set('iiurlwidth', '420')
      const data = await fetchJson(url)
      const pages = data.query?.pages && typeof data.query.pages === 'object' ? Object.values(data.query.pages) : []
      return pages.map(normalizeCommons).filter(Boolean)
    },
  },
  {
    id: 'iconify',
    label: 'Iconify',
    modes: ['everything', 'icons'],
    async search({ query, expandedTerms }) {
      if (!query) return []
      const icons = await searchIconifyWithFallbacks(query, expandedTerms)
      return icons.map(normalizeIconify).filter(Boolean)
    },
  },
]

export const assetProviders = providers.map(({ id, label, modes }) => ({ id, label, modes }))

export async function searchUnifiedAssets({
  query,
  mode = 'everything',
  sourceIds = [],
  localMedia = [],
} = {}) {
  const cleanQuery = cleanText(query)
  const expandedTerms = expandEditorialQuery(cleanQuery)
  const activeProviders = providers.filter((provider) => (
    (!sourceIds.length || sourceIds.includes(provider.id)) &&
    (mode === 'everything' || provider.modes.includes(mode))
  ))
  const settled = await Promise.all(activeProviders.map(async (provider) => {
    try {
      const results = await provider.search({ query: cleanQuery, expandedTerms, mode, localMedia })
      return {
        provider: { id: provider.id, label: provider.label },
        results: safeArray(results).map(normalizePrintlabAsset).filter(Boolean),
        error: '',
      }
    } catch (err) {
      return {
        provider: { id: provider.id, label: provider.label },
        results: [],
        error: String(err?.message || err || 'Provider failed.'),
      }
    }
  }))

  const results = dedupeAssets(settled.flatMap((entry) => entry.results))
    .filter((asset) => modeMatchesAsset(asset, mode))
    .filter((asset) => textMatchesAsset(asset, expandedTerms))
    .map((asset) => ({ ...asset, rank: rankAsset(asset, cleanQuery, expandedTerms, mode) }))
    .sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title))

  return {
    results,
    providers: settled.map((entry) => ({
      id: entry.provider.id,
      label: entry.provider.label,
      count: entry.results.length,
      error: entry.error,
      state: entry.error ? 'error' : 'loaded',
    })),
    expandedTerms,
  }
}

export function importUrlAsset(rawUrl) {
  const downloadUrl = compactUrl(rawUrl)
  if (!downloadUrl) return null
  let parsed = null
  try {
    parsed = new URL(downloadUrl)
  } catch {
    throw new Error('Enter a valid URL.')
  }
  const filename = decodeURIComponent(parsed.pathname.split('/').pop() || '').replace(/\.[^.]+$/, '')
  return normalizePrintlabAsset({
    id: `url:${downloadUrl}`,
    originalProvider: 'url-import',
    originalId: downloadUrl,
    title: filename || parsed.hostname || 'URL import',
    thumbnailUrl: downloadUrl,
    previewUrl: downloadUrl,
    downloadUrl,
    source: 'url-import',
    sourceLabel: 'URL Import',
    creator: parsed.hostname,
    license: 'Unknown',
    attributionText: `Imported from ${parsed.hostname}. Add creator/license metadata before publication.`,
    mediaType: /\.svg($|\?)/i.test(parsed.pathname) ? 'icon' : 'image',
    landingPageUrl: downloadUrl,
  })
}

export async function searchAssetSource(sourceId, query, options = {}) {
  const data = await searchUnifiedAssets({
    query,
    mode: options.mode || 'everything',
    sourceIds: [sourceId],
    localMedia: options.localMedia || [],
  })
  const providerState = data.providers.find((provider) => provider.id === sourceId)
  if (providerState?.error) throw new Error(providerState.error)
  return data.results
}
