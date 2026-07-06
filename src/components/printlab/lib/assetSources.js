const htmlStripper = /<[^>]*>/g

function cleanText(value = '') {
  return String(value || '').replace(htmlStripper, ' ').replace(/\s+/g, ' ').trim()
}

function compactUrl(value = '') {
  return String(value || '').trim()
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

function normalizeAsset(asset) {
  if (!asset || typeof asset !== 'object') return null
  const fullUrl = compactUrl(asset.fullUrl || asset.url || asset.thumbnailUrl)
  const thumbnailUrl = compactUrl(asset.thumbnailUrl || fullUrl)
  if (!fullUrl && !thumbnailUrl) return null
  const title = cleanText(asset.title || 'Untitled asset')
  const creator = cleanText(asset.creator || '')
  const license = cleanText(asset.license || '')
  const source = cleanText(asset.source || 'External')
  const licenseUrl = compactUrl(asset.licenseUrl)
  const attribution = cleanText(asset.attribution || [title, creator ? `by ${creator}` : '', source, license].filter(Boolean).join(' / '))
  return {
    id: String(asset.id || `${source}:${fullUrl || thumbnailUrl}`),
    title,
    thumbnailUrl,
    fullUrl,
    url: fullUrl,
    source,
    creator,
    license,
    licenseUrl,
    attribution,
    mediaType: cleanText(asset.mediaType || 'image'),
    landingUrl: compactUrl(asset.landingUrl || asset.foreignLandingUrl || ''),
  }
}

function normalizeOpenverse(item) {
  if (!item || typeof item !== 'object') return null
  return normalizeAsset({
    id: `openverse:${item?.id || item?.url || ''}`,
    title: item?.title,
    thumbnailUrl: item?.thumbnail || item?.url,
    fullUrl: item?.url || item?.thumbnail,
    source: item?.source ? `Openverse / ${item.source}` : 'Openverse',
    creator: item?.creator,
    license: item?.license,
    licenseUrl: item?.license_url,
    attribution: getOpenverseAttribution(item),
    mediaType: 'image',
    landingUrl: item?.foreign_landing_url,
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
  return normalizeAsset({
    id: `wikimedia:${page.pageid || info.url}`,
    title,
    thumbnailUrl: info.thumburl || info.url,
    fullUrl: info.url || info.thumburl,
    source: 'Wikimedia Commons',
    creator,
    license,
    licenseUrl,
    attribution: attributionRequired || credit || [title, creator ? `by ${creator}` : '', 'Wikimedia Commons', license].filter(Boolean).join(' / '),
    mediaType: String(info.mime || '').includes('svg') ? 'svg' : 'image',
    landingUrl: info.descriptionurl,
  })
}

function normalizeIconify(icon) {
  const name = String(icon || '').trim()
  if (!name || !name.includes(':')) return null
  const [prefix, iconName] = name.split(':')
  const svgUrl = `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(iconName)}.svg`
  return normalizeAsset({
    id: `iconify:${name}`,
    title: name,
    thumbnailUrl: svgUrl,
    fullUrl: svgUrl,
    source: 'Iconify',
    creator: prefix,
    license: 'Icon set license varies',
    licenseUrl: 'https://iconify.design/docs/icons/license.html',
    attribution: `${name} icon from Iconify. Verify the ${prefix} icon set license before publication.`,
    mediaType: 'svg',
    landingUrl: `https://icon-sets.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(iconName)}/`,
  })
}

function normalizeLoc(item) {
  if (!item || typeof item !== 'object') return null
  const images = Array.isArray(item?.image_url) ? item.image_url : []
  const contributors = Array.isArray(item?.contributor) ? item.contributor.join(', ') : item?.contributor
  return normalizeAsset({
    id: `loc:${item?.id || item?.url || item?.title}`,
    title: item?.title,
    thumbnailUrl: images[0] || item?.image_url || item?.item?.image_url?.[0],
    fullUrl: images[images.length - 1] || images[0] || item?.url,
    source: 'Library of Congress',
    creator: contributors,
    license: item?.rights || item?.subject?.join(', ') || 'Rights status varies',
    licenseUrl: item?.url,
    attribution: [item?.title, item?.rights || 'Library of Congress'].filter(Boolean).join(' / '),
    mediaType: 'image',
    landingUrl: item?.url,
  })
}

function normalizeArchive(item) {
  if (!item || typeof item !== 'object') return null
  const identifier = cleanText(item?.identifier)
  if (!identifier) return null
  const creator = Array.isArray(item?.creator) ? item.creator.join(', ') : item?.creator
  return normalizeAsset({
    id: `internet-archive:${identifier}`,
    title: item?.title || identifier,
    thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    fullUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    source: 'Internet Archive',
    creator,
    license: item?.licenseurl ? 'See license URL' : (item?.rights || 'Rights status varies'),
    licenseUrl: item?.licenseurl || '',
    attribution: [item?.title || identifier, creator, 'Internet Archive', item?.licenseurl || item?.rights].filter(Boolean).join(' / '),
    mediaType: 'image',
    landingUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
  })
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.detail || data?.error || `Search failed: ${res.status}`)
  if (!data || typeof data !== 'object') throw new Error('Search returned an unreadable response.')
  return data
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

const iconifyFallbacks = [
  { pattern: /mutual\s+aid|community\s+aid|aid/i, terms: ['heart', 'hands', 'group', 'people', 'medical', 'food', 'home'] },
  { pattern: /podcast/i, terms: ['mic', 'radio', 'headphones'] },
  { pattern: /print|printing/i, terms: ['printer', 'file', 'document'] },
  { pattern: /zine|booklet/i, terms: ['book', 'booklet', 'pages'] },
]

async function searchIconifyTerm(term, limit = 36) {
  const url = new URL('https://api.iconify.design/search')
  url.searchParams.set('query', term)
  url.searchParams.set('limit', String(limit))
  const data = await fetchJson(url)
  return safeArray(data.icons)
}

async function searchIconifyWithFallbacks(query) {
  const words = query.split(/\s+/).filter((word) => word.length > 2)
  const mapped = iconifyFallbacks.flatMap((entry) => (entry.pattern.test(query) ? entry.terms : []))
  const terms = uniqueValues([query, ...words, ...mapped])
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

export function normalizePrintlabAsset(asset) {
  return normalizeAsset(asset)
}

export function importUrlAsset(rawUrl) {
  const fullUrl = compactUrl(rawUrl)
  if (!fullUrl) return null
  let parsed = null
  try {
    parsed = new URL(fullUrl)
  } catch {
    throw new Error('Enter a valid URL.')
  }
  const filename = decodeURIComponent(parsed.pathname.split('/').pop() || '').replace(/\.[^.]+$/, '')
  return normalizeAsset({
    id: `url:${fullUrl}`,
    title: filename || parsed.hostname || 'URL import',
    thumbnailUrl: fullUrl,
    fullUrl,
    source: 'URL import',
    creator: parsed.hostname,
    license: 'Unknown',
    attribution: `Imported from ${parsed.hostname}. Add creator/license metadata before publication.`,
    mediaType: /\.svg($|\?)/i.test(parsed.pathname) ? 'svg' : 'image',
    landingUrl: fullUrl,
  })
}

export async function searchAssetSource(sourceId, query) {
  const q = cleanText(query)
  if (!q) return []

  if (sourceId === 'openverse') {
    const url = new URL('https://api.openverse.org/v1/images/')
    url.searchParams.set('q', q)
    url.searchParams.set('page_size', '20')
    const data = await fetchJson(url)
    return safeArray(data.results).map(normalizeOpenverse).filter(Boolean)
  }

  if (sourceId === 'wikimedia') {
    const url = new URL('https://commons.wikimedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')
    url.searchParams.set('generator', 'search')
    url.searchParams.set('gsrnamespace', '6')
    url.searchParams.set('gsrlimit', '24')
    url.searchParams.set('gsrsearch', q)
    url.searchParams.set('prop', 'imageinfo')
    url.searchParams.set('iiprop', 'url|extmetadata|mime|user')
    url.searchParams.set('iiurlwidth', '360')
    const data = await fetchJson(url)
    const pages = data.query?.pages && typeof data.query.pages === 'object' ? Object.values(data.query.pages) : []
    return pages.map(normalizeCommons).filter(Boolean)
  }

  if (sourceId === 'iconify') {
    const icons = await searchIconifyWithFallbacks(q)
    return icons.map(normalizeIconify).filter(Boolean)
  }

  if (sourceId === 'loc') {
    const url = new URL('https://www.loc.gov/search/')
    url.searchParams.set('fo', 'json')
    url.searchParams.set('q', q)
    url.searchParams.set('fa', 'online-format:image')
    url.searchParams.set('c', '24')
    const data = await fetchJson(url)
    return safeArray(data.results).map(normalizeLoc).filter(Boolean)
  }

  if (sourceId === 'archive') {
    const url = new URL('https://archive.org/advancedsearch.php')
    url.searchParams.set('q', `${q} AND mediatype:(image OR texts)`)
    url.searchParams.set('fl[]', 'identifier')
    url.searchParams.append('fl[]', 'title')
    url.searchParams.append('fl[]', 'creator')
    url.searchParams.append('fl[]', 'licenseurl')
    url.searchParams.append('fl[]', 'rights')
    url.searchParams.set('rows', '24')
    url.searchParams.set('output', 'json')
    const data = await fetchJson(url)
    return safeArray(data.response?.docs).map(normalizeArchive).filter(Boolean)
  }

  return []
}
