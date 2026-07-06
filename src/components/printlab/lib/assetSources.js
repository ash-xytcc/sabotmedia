import { getPrintlabElements } from './printlabElements.js'

const htmlStripper = /<[^>]*>/g
const designTerms = new Set(['dog', 'cat', 'arrow', 'badge', 'label', 'sticker', 'shape', 'circle', 'star', 'heart', 'hand', 'hands', 'food', 'housing', 'labor', 'protest', 'zine', 'newspaper', 'radio', 'podcast', 'map', 'redaction', 'halftone', 'frame'])

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

const expansionRules = [
  [/mutual\s+aid|community\s+aid|solidarity|volunteer/i, ['solidarity', 'support', 'care', 'community', 'neighbors', 'people', 'group', 'hands', 'hand', 'heart', 'donation', 'volunteer', 'food', 'box', 'package', 'supplies', 'pantry', 'home', 'house', 'housing', 'medical', 'cross', 'megaphone', 'share', 'relief', 'commons']],
  [/labor|union|strike|worker/i, ['worker', 'workers', 'union', 'strike', 'tools', 'tool', 'gear', 'wrench', 'hammer', 'factory', 'hands', 'people', 'solidarity', 'banner', 'picket', 'megaphone', 'organizing']],
  [/zine|booklet|pamphlet|xerox|photocopy/i, ['paper', 'copy', 'photocopy', 'scissors', 'tape', 'staple', 'paperclip', 'typewriter', 'newspaper', 'halftone', 'print', 'fold', 'cut', 'crop', 'collage', 'booklet', 'pamphlet', 'pages', 'xerox']],
  [/podcast|radio|broadcast/i, ['broadcast', 'signal', 'antenna', 'tower', 'mic', 'microphone', 'headphones', 'audio', 'waveform', 'rss']],
  [/dog|puppy|pet|paw/i, ['dog', 'pet', 'animal', 'paw', 'puppy', 'pets']],
  [/cat|kitten/i, ['cat', 'pet', 'animal', 'paw', 'kitten', 'pets']],
  [/food|meal|pantry|kitchen/i, ['food', 'meal', 'bread', 'soup', 'bowl', 'apple', 'basket', 'box', 'package', 'pantry', 'kitchen', 'fork', 'spoon', 'restaurant', 'grocery']],
  [/home|house|housing|shelter/i, ['home', 'house', 'building', 'shelter', 'neighborhood', 'apartment']],
  [/medical|health|clinic|first\s+aid/i, ['medical', 'health', 'cross', 'first aid', 'hospital', 'care', 'clinic', 'medical-bag']],
  [/newspaper|news|press|dispatch/i, ['newspaper', 'news', 'press', 'article', 'document', 'dispatch', 'byline', 'caption']],
  [/map|location|pin|route/i, ['map', 'location', 'pin', 'marker', 'route', 'atlas', 'map-pin']],
  [/badge|label|sticker|frame|border/i, ['badge', 'label', 'sticker', 'frame', 'border', 'tag', 'ticket']],
  [/halftone|redaction|blackout|censor/i, ['halftone', 'dots', 'redaction', 'censor', 'blackout', 'document']],
  [/arrow|line|divider/i, ['arrow', 'line', 'divider', 'chevron', 'direction', 'pointer']],
]

const preferredPrefixes = ['material-symbols', 'lucide', 'tabler', 'ph', 'heroicons', 'feather', 'bi', 'mdi', 'carbon', 'fluent', 'openmoji', 'game-icons', 'simple-icons']
const collectionLabels = {
  'material-symbols': 'Material Symbols', lucide: 'Lucide', tabler: 'Tabler Icons', ph: 'Phosphor Icons', heroicons: 'Heroicons', feather: 'Feather Icons', bi: 'Bootstrap Icons', mdi: 'Material Design Icons', carbon: 'Carbon Icons', fluent: 'Fluent UI Icons', openmoji: 'OpenMoji', 'game-icons': 'Game Icons', 'simple-icons': 'Simple Icons',
}

const iconConcepts = [
  [['dog', 'puppy', 'pet', 'animal', 'paw', 'pets'], ['lucide:dog', 'lucide:paw-print', 'tabler:dog', 'tabler:paw', 'mdi:dog', 'mdi:dog-side', 'mdi:paw', 'material-symbols:pets', 'openmoji:dog-face']],
  [['cat', 'kitten', 'pet', 'animal', 'paw', 'pets'], ['lucide:cat', 'lucide:paw-print', 'tabler:cat', 'tabler:paw', 'mdi:cat', 'mdi:paw', 'material-symbols:pets', 'openmoji:cat-face']],
  [['heart', 'care', 'support', 'solidarity', 'mutual aid', 'donation', 'volunteer'], ['lucide:heart-handshake', 'lucide:hand-heart', 'lucide:heart', 'tabler:heart-handshake', 'tabler:heart', 'mdi:hand-heart', 'mdi:heart', 'material-symbols:volunteer-activism', 'ph:hand-heart', 'bi:heart']],
  [['hands', 'hand', 'people', 'group', 'community', 'neighbors', 'collective'], ['lucide:users', 'lucide:handshake', 'tabler:users-group', 'tabler:friends', 'tabler:handshake', 'mdi:account-group', 'mdi:handshake', 'material-symbols:groups', 'material-symbols:diversity-3', 'bi:people']],
  [['home', 'house', 'housing', 'shelter', 'neighbors'], ['lucide:house', 'lucide:home', 'tabler:home', 'tabler:building-community', 'mdi:home', 'mdi:home-city', 'material-symbols:home', 'material-symbols:apartment', 'bi:house', 'ph:house']],
  [['medical', 'health', 'clinic', 'cross', 'first aid', 'care'], ['lucide:cross', 'lucide:heart-pulse', 'tabler:first-aid-kit', 'tabler:medical-cross', 'mdi:medical-bag', 'mdi:hospital-box', 'material-symbols:health-and-safety', 'material-symbols:medical-services', 'bi:hospital', 'ph:first-aid-kit']],
  [['food', 'meal', 'pantry', 'bread', 'soup', 'kitchen', 'free food', 'food distribution'], ['lucide:utensils', 'lucide:soup', 'lucide:apple', 'tabler:bowl-spoon', 'tabler:bread', 'tabler:apple', 'mdi:food', 'mdi:food-apple', 'mdi:bowl', 'mdi:silverware-fork-knife', 'material-symbols:restaurant', 'material-symbols:grocery', 'bi:basket', 'ph:fork-knife']],
  [['box', 'package', 'supplies', 'donation', 'relief', 'pantry'], ['lucide:package', 'lucide:boxes', 'tabler:package', 'tabler:box', 'mdi:package-variant', 'mdi:archive', 'material-symbols:inventory-2', 'bi:box', 'ph:package']],
  [['megaphone', 'protest', 'picket', 'banner', 'organizing', 'strike', 'labor'], ['lucide:megaphone', 'tabler:megaphone', 'mdi:bullhorn', 'material-symbols:campaign', 'bi:megaphone', 'ph:megaphone', 'game-icons:raised-fist']],
  [['labor', 'worker', 'union', 'strike', 'tools', 'tool', 'wrench', 'hammer', 'gear', 'factory'], ['lucide:wrench', 'lucide:hammer', 'lucide:settings', 'tabler:tools', 'tabler:hammer', 'mdi:wrench', 'mdi:hammer-wrench', 'mdi:factory', 'material-symbols:construction', 'material-symbols:factory', 'bi:wrench', 'bi:gear']],
  [['zine', 'paper', 'photocopy', 'copy', 'scissors', 'tape', 'staple', 'paperclip', 'typewriter', 'print', 'fold', 'cut', 'crop', 'collage'], ['lucide:scissors', 'lucide:paperclip', 'lucide:printer', 'lucide:file-text', 'lucide:copy', 'lucide:crop', 'tabler:scissors', 'tabler:paperclip', 'tabler:printer', 'mdi:scissors-cutting', 'mdi:paperclip', 'mdi:printer', 'material-symbols:content-cut', 'material-symbols:content-copy', 'material-symbols:print', 'bi:scissors']],
  [['newspaper', 'news', 'press', 'dispatch', 'article', 'byline', 'caption'], ['lucide:newspaper', 'lucide:file-text', 'tabler:news', 'tabler:article', 'mdi:newspaper', 'mdi:file-document-outline', 'material-symbols:newspaper', 'material-symbols:article', 'bi:newspaper', 'ph:newspaper']],
  [['radio', 'podcast', 'broadcast', 'signal', 'antenna', 'microphone', 'mic', 'audio', 'waveform', 'rss', 'headphones'], ['lucide:radio', 'lucide:mic', 'lucide:podcast', 'lucide:rss', 'lucide:audio-lines', 'tabler:radio', 'tabler:microphone', 'tabler:podcast', 'mdi:radio', 'mdi:microphone', 'mdi:podcast', 'mdi:rss', 'material-symbols:radio', 'material-symbols:mic', 'material-symbols:rss-feed', 'bi:radio', 'bi:mic', 'bi:rss']],
  [['map', 'location', 'pin', 'route', 'marker', 'atlas'], ['lucide:map', 'lucide:map-pin', 'lucide:navigation', 'tabler:map', 'tabler:map-pin', 'tabler:route', 'mdi:map', 'mdi:map-marker', 'material-symbols:map', 'material-symbols:location-on', 'bi:map', 'bi:geo-alt']],
  [['camera', 'photo', 'media', 'image'], ['lucide:camera', 'lucide:image', 'tabler:camera', 'tabler:photo', 'mdi:camera', 'material-symbols:photo-camera', 'bi:camera', 'ph:camera']],
  [['book', 'archive', 'document', 'library', 'file'], ['lucide:book-open', 'lucide:archive', 'lucide:file-stack', 'tabler:book', 'tabler:archive', 'mdi:book-open-page-variant', 'mdi:archive', 'material-symbols:menu-book', 'material-symbols:archive', 'bi:book', 'ph:books']],
  [['arrow', 'line', 'divider', 'pointer', 'direction'], ['lucide:arrow-right', 'lucide:arrow-up-right', 'lucide:move-right', 'lucide:corner-down-right', 'tabler:arrow-right', 'tabler:arrow-big-right', 'mdi:arrow-right', 'mdi:arrow-right-bold', 'material-symbols:arrow-right-alt', 'bi:arrow-right', 'ph:arrow-right']],
  [['badge', 'label', 'sticker', 'tag', 'warning', 'alert'], ['lucide:badge', 'lucide:tag', 'lucide:badge-alert', 'lucide:triangle-alert', 'tabler:badge', 'tabler:tag', 'tabler:alert-triangle', 'mdi:tag', 'mdi:alert', 'material-symbols:label', 'material-symbols:warning', 'bi:tag']],
  [['frame', 'border', 'layout', 'square', 'circle', 'star', 'shape'], ['lucide:square', 'lucide:circle', 'lucide:star', 'lucide:frame', 'tabler:square', 'tabler:circle', 'tabler:star', 'mdi:square-outline', 'mdi:circle-outline', 'mdi:star-outline', 'bi:square', 'bi:circle', 'bi:star']],
  [['fire', 'water', 'tree', 'leaf', 'nature'], ['lucide:flame', 'lucide:droplets', 'lucide:tree-pine', 'lucide:leaf', 'tabler:flame', 'tabler:droplet', 'mdi:fire', 'mdi:water', 'mdi:tree', 'mdi:leaf', 'material-symbols:local-fire-department', 'material-symbols:water-drop']],
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

function clean(value = '') { return String(value || '').replace(htmlStripper, ' ').replace(/\s+/g, ' ').trim() }
function compactUrl(value = '') { return String(value || '').trim() }
function safeArray(value) { return Array.isArray(value) ? value : [] }
function safeNumber(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null }
function uniqueValues(values = []) { const seen = new Set(); return values.map((value) => clean(value).toLowerCase()).filter((value) => value && !seen.has(value) && seen.add(value)) }
function titleWords(value = '') { return clean(value).split(/[^a-z0-9]+/i).filter((word) => word.length > 1) }
function titleCase(value = '') { return clean(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function assetText(asset) { return [asset.title, asset.description, asset.category, asset.sourceLabel, ...(asset.tags || [])].join(' ').toLowerCase() }

export function expandEditorialQuery(query = '') {
  const q = clean(query)
  return uniqueValues([q, ...titleWords(q).filter((word) => word.length > 2), ...expansionRules.flatMap(([pattern, terms]) => (pattern.test(q) ? terms : []))])
}

export function expandElementQuery(query = '') {
  const q = clean(query)
  return uniqueValues([q, ...titleWords(q).filter((word) => word.length > 2), ...expandEditorialQuery(q)])
}

function inferMediaType(input = {}) {
  const mediaType = clean(input.mediaType || input.type || '').toLowerCase()
  const mimeType = clean(input.mimeType || input.mime || '').toLowerCase()
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
  const source = clean(asset.source || asset.originalProvider || 'external')
  const sourceLabel = clean(asset.sourceLabel || asset.providerLabel || source || 'External')
  const title = clean(asset.title || 'Untitled asset')
  const creator = clean(asset.creator || '')
  const license = clean(asset.license || '')
  const licenseUrl = compactUrl(asset.licenseUrl || '')
  const attributionText = clean(asset.attributionText || asset.attribution || [title, creator ? `by ${creator}` : '', sourceLabel, license].filter(Boolean).join(' / '))
  const normalized = {
    id: String(asset.id || asset.originalId || `${source}:${downloadUrl || previewUrl || thumbnailUrl || landingPageUrl}`),
    title,
    creator,
    description: clean(asset.description || asset.caption || ''),
    thumbnailUrl,
    previewUrl,
    downloadUrl,
    landingPageUrl,
    license,
    licenseUrl,
    source,
    sourceLabel,
    mediaType: inferMediaType(asset),
    width: safeNumber(asset.width),
    height: safeNumber(asset.height),
    mimeType: clean(asset.mimeType || asset.mime || ''),
    attributionText,
    tags: uniqueValues(safeArray(asset.tags).length ? asset.tags : String(asset.tags || '').split(',')),
    category: clean(asset.category || ''),
    raw: asset.raw ?? asset,
    originalProvider: clean(asset.originalProvider || source),
    originalId: String(asset.originalId || asset.id || ''),
  }
  return { ...normalized, fullUrl: normalized.downloadUrl, url: normalized.downloadUrl, sourceName: normalized.sourceLabel, landingUrl: normalized.landingPageUrl, attribution: normalized.attributionText }
}

function normalizeOpenverse(item) {
  const title = clean(item?.title || 'Untitled')
  const creator = clean(item?.creator || '')
  const license = clean(item?.license || '')
  return normalizePrintlabAsset({
    id: `openverse:${item?.id || item?.url || ''}`,
    originalProvider: 'openverse',
    originalId: item?.id || item?.url || '',
    title,
    thumbnailUrl: item?.thumbnail || item?.url,
    previewUrl: item?.thumbnail || item?.url,
    downloadUrl: item?.url || item?.thumbnail,
    source: 'openverse',
    sourceLabel: item?.source ? `Openverse / ${item.source}` : 'Openverse',
    creator,
    license,
    licenseUrl: item?.license_url,
    attributionText: clean(item?.attribution || [title, creator ? `by ${creator}` : '', license].filter(Boolean).join(' / ')),
    mediaType: 'photo',
    landingPageUrl: item?.foreign_landing_url,
    width: item?.width,
    height: item?.height,
    tags: [title, creator, item?.source],
    raw: item,
  })
}

function commonsMetadata(info, key) { return clean(info?.extmetadata?.[key]?.value || '') }
function normalizeCommons(page) {
  const info = page?.imageinfo?.[0] || {}
  const title = commonsMetadata(info, 'ObjectName') || clean(page?.title || '').replace(/^File:/, '')
  const creator = commonsMetadata(info, 'Artist') || clean(info.user || '')
  const license = commonsMetadata(info, 'LicenseShortName') || commonsMetadata(info, 'License')
  const licenseUrl = commonsMetadata(info, 'LicenseUrl')
  const credit = commonsMetadata(info, 'Credit')
  const attributionRequired = commonsMetadata(info, 'Attribution')
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
    tags: ['commons', 'historical', title],
    raw: page,
  })
}

function splitIcon(icon = '') { const [prefix = '', iconName = ''] = clean(icon).split(':'); return { prefix, iconName, words: titleWords(iconName) } }
function iconId(input) { return typeof input === 'string' ? input : clean(input?.icon || input?.id || '') }
function normalizeIconify(input) {
  const name = iconId(input)
  if (!name.includes(':')) return null
  const meta = typeof input === 'object' ? input : {}
  const { prefix, iconName, words } = splitIcon(name)
  const collection = collectionLabels[prefix] || prefix
  const svgUrl = `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(iconName)}.svg`
  return normalizePrintlabAsset({
    id: `iconify:${name}`,
    originalProvider: 'iconify',
    originalId: name,
    title: meta.title || titleCase(iconName),
    description: `${titleCase(iconName)} icon from ${collection}.`,
    thumbnailUrl: svgUrl,
    previewUrl: svgUrl,
    downloadUrl: svgUrl,
    source: 'iconify',
    sourceLabel: `Iconify / ${collection}`,
    creator: prefix,
    license: 'Icon set license varies',
    licenseUrl: 'https://iconify.design/docs/icons/license.html',
    attributionText: `${name} icon from Iconify. Verify the ${collection} license before publication.`,
    mediaType: 'icon',
    mimeType: 'image/svg+xml',
    landingPageUrl: `https://icon-sets.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(iconName)}/`,
    tags: [prefix, collection, iconName, ...words, ...(meta.tags || []), 'svg', 'icon', 'vector', 'element'],
    category: meta.category || 'Elements',
    raw: input,
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

function packSvg(title, mode) {
  const initials = title.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" fill="#f6f1e8"/><rect x="34" y="34" width="572" height="352" fill="none" stroke="#1d2327" stroke-width="12"/><path d="M72 316h496M72 284h360M72 252h420" stroke="#c22b26" stroke-width="11"/><text x="72" y="132" font-family="Arial Black, Impact, sans-serif" font-size="82" fill="#1d2327">${initials}</text><text x="76" y="184" font-family="Arial, sans-serif" font-size="28" fill="#50575e">${mode.toUpperCase()}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function normalizeLocalPack([title, mode, tags], index) {
  const image = packSvg(title, mode)
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

function scoreIcon(input, query, terms) {
  const exact = clean(query).toLowerCase()
  const name = iconId(input)
  const { prefix, iconName, words } = splitIcon(name)
  const wordSet = new Set(words.map((word) => word.toLowerCase()))
  const text = [iconName, ...(typeof input === 'object' ? input.tags || [] : [])].join(' ').toLowerCase()
  let score = preferredPrefixes.includes(prefix) ? 100 - preferredPrefixes.indexOf(prefix) * 5 : 0
  if (exact && (iconName === exact || wordSet.has(exact))) score += 180
  if (exact && iconName.includes(exact)) score += 105
  terms.forEach((term, index) => { if (text.includes(term)) score += Math.max(14, 82 - index * 3) })
  if (exact !== 'arrow' && iconName.includes('arrow')) score -= 45
  return score
}

function suggestedIcons(query, terms) {
  const searchTerms = uniqueValues([query, ...terms])
  const icons = []
  const seen = new Set()
  iconConcepts.forEach(([aliases, iconNames]) => {
    const matched = aliases.some((alias) => searchTerms.includes(alias)) || aliases.some((alias) => searchTerms.some((term) => alias.includes(term) || term.includes(alias)))
    if (!matched) return
    iconNames.forEach((icon) => { if (!seen.has(icon)) { seen.add(icon); icons.push({ icon, tags: aliases, category: 'Elements' }) } })
  })
  return icons
}

async function searchIconifyTerm(term, limit = 96) {
  const url = new URL('https://api.iconify.design/search')
  url.searchParams.set('query', term)
  url.searchParams.set('limit', String(limit))
  const data = await fetchJson(url)
  return safeArray(data.icons)
}

async function searchIconify(query, expandedTerms = []) {
  const cleanQuery = clean(query)
  const terms = uniqueValues([...expandElementQuery(cleanQuery), ...expandedTerms])
  const icons = []
  const seen = new Set()
  let firstError = null
  for (const item of suggestedIcons(cleanQuery, terms)) { const id = iconId(item); if (!seen.has(id)) { seen.add(id); icons.push(item) } }
  for (const term of uniqueValues([cleanQuery, ...terms]).slice(0, 18)) {
    try {
      const matches = await searchIconifyTerm(term, term === cleanQuery ? 220 : 84)
      matches.forEach((icon) => { if (icon && !seen.has(icon)) { seen.add(icon); icons.push({ icon, tags: [term], category: 'Elements' }) } })
    } catch (err) { if (!firstError) firstError = err }
    if (icons.length >= 520) break
  }
  if (!icons.length && firstError) throw firstError
  const prefixCounts = new Map()
  return icons
    .sort((a, b) => scoreIcon(b, cleanQuery, terms) - scoreIcon(a, cleanQuery, terms) || iconId(a).localeCompare(iconId(b)))
    .filter((item, index) => {
      const { prefix } = splitIcon(iconId(item))
      const count = prefixCounts.get(prefix) || 0
      prefixCounts.set(prefix, count + 1)
      return count < 5 || index > 52
    })
    .slice(0, 96)
}

function modeMatches(asset, mode) {
  if (!asset || mode === 'everything') return true
  const mediaType = clean(asset.mediaType).toLowerCase()
  const text = assetText(asset)
  if (mode === 'photos') return ['photo', 'image'].includes(mediaType) || (mediaType === 'image' && asset.source !== 'iconify')
  if (mode === 'elements') return ['iconify', 'printlab-elements', 'local-packs'].includes(asset.source) || ['element', 'icon', 'illustration', 'graphic'].includes(mediaType)
  if (mode === 'illustrations') return ['illustration', 'graphic', 'element'].includes(mediaType) || ['woodcut', 'poster', 'graphic'].some((term) => text.includes(term))
  if (mode === 'icons') return mediaType === 'icon' || asset.source === 'iconify' || text.includes('icon')
  if (mode === 'historical') return ['wikimedia', 'local-packs'].includes(asset.source) && ['historical', 'labor', 'archive', 'woodcut'].some((term) => text.includes(term))
  if (mode === 'audio') return mediaType === 'audio'
  if (mode === 'textures') return mediaType === 'texture' || ['texture', 'riso', 'photocopy', 'halftone', 'stain', 'fold'].some((term) => text.includes(term))
  if (mode === 'maps') return mediaType === 'map' || ['map', 'atlas', 'location', 'route'].some((term) => text.includes(term))
  if (mode === 'documents') return mediaType === 'document' || ['document', 'template', 'typewriter', 'wire'].some((term) => text.includes(term))
  return true
}

function textMatches(asset, terms) { return !terms.length || terms.some((term) => assetText(asset).includes(term)) }
function dedupe(items) { const seen = new Set(); return items.filter((asset) => { const key = asset?.id || asset?.downloadUrl || asset?.previewUrl; if (!key || seen.has(key)) return false; seen.add(key); return true }) }
function rank(asset, query, terms, mode) {
  const exact = clean(query).toLowerCase()
  const text = assetText(asset)
  const title = clean(asset.title).toLowerCase()
  const designQuery = terms.some((term) => designTerms.has(term))
  let score = 0
  if (asset.source === 'local-media') score += 170
  if (asset.source === 'iconify') score += mode === 'icons' ? 220 : mode === 'elements' ? 230 : designQuery ? 150 : 65
  if (asset.source === 'printlab-elements') score += mode === 'elements' ? 70 : designQuery ? 60 : 25
  if (asset.source === 'local-packs') score += mode === 'elements' ? 55 : 45
  if (asset.source === 'iconify' && preferredPrefixes.includes(asset.creator)) score += 90 - preferredPrefixes.indexOf(asset.creator) * 5
  if (exact && title === exact) score += 110
  if (exact && title.includes(exact)) score += 84
  if (exact && text.includes(exact)) score += 78
  score += Math.min(90, terms.filter((term) => text.includes(term)).length * 18)
  if (modeMatches(asset, mode)) score += 30
  if (asset.thumbnailUrl || asset.previewUrl) score += 14
  if (asset.license || asset.licenseUrl || asset.attributionText) score += 7
  if (asset.source === 'wikimedia' || asset.source === 'openverse') score -= mode === 'everything' ? 18 : 8
  if (asset.source === 'printlab-elements' && exact !== 'arrow' && /arrow/i.test(title)) score -= 90
  return score
}

const providers = [
  { id: 'iconify', label: 'Iconify', modes: ['everything', 'elements', 'icons'], async search({ query, expandedTerms }) { if (!query) return []; return (await searchIconify(query, expandedTerms)).map(normalizeIconify).filter(Boolean) } },
  { id: 'printlab-elements', label: 'Printlab Elements', modes: ['everything', 'elements', 'illustrations', 'icons', 'textures', 'maps', 'documents'], async search({ query, expandedTerms, mode }) { const terms = mode === 'elements' ? expandElementQuery(query) : expandedTerms.length ? expandedTerms : expandEditorialQuery(query); return getPrintlabElements().map(normalizePrintlabAsset).filter(Boolean).filter((asset) => modeMatches(asset, mode)).filter((asset) => textMatches(asset, terms)) } },
  { id: 'local-media', label: 'Sabot Media Library', modes: ['everything', 'photos', 'illustrations', 'icons', 'audio', 'textures', 'maps', 'documents'], async search({ query, expandedTerms, mode, localMedia }) { const terms = expandedTerms.length ? expandedTerms : expandEditorialQuery(query); return safeArray(localMedia).map(normalizeLocalMedia).filter(Boolean).filter((asset) => modeMatches(asset, mode)).filter((asset) => textMatches(asset, terms)) } },
  { id: 'local-packs', label: 'Local Asset Packs', modes: ['everything', 'elements', 'illustrations', 'icons', 'historical', 'textures', 'documents'], async search({ query, expandedTerms, mode }) { const terms = mode === 'elements' ? expandElementQuery(query) : expandedTerms.length ? expandedTerms : expandEditorialQuery(query); return localPackSeed.map(normalizeLocalPack).filter(Boolean).filter((asset) => modeMatches(asset, mode)).filter((asset) => textMatches(asset, terms)) } },
  { id: 'openverse', label: 'Openverse', modes: ['everything', 'photos', 'illustrations', 'textures'], async search({ query }) { if (!query) return []; const url = new URL('https://api.openverse.org/v1/images/'); url.searchParams.set('q', query); url.searchParams.set('page_size', '20'); const data = await fetchJson(url); return safeArray(data.results).map(normalizeOpenverse).filter(Boolean) } },
  { id: 'wikimedia', label: 'Wikimedia Commons', modes: ['everything', 'photos', 'illustrations', 'historical', 'maps', 'documents'], async search({ query }) { if (!query) return []; const url = new URL('https://commons.wikimedia.org/w/api.php'); url.searchParams.set('action', 'query'); url.searchParams.set('format', 'json'); url.searchParams.set('origin', '*'); url.searchParams.set('generator', 'search'); url.searchParams.set('gsrnamespace', '6'); url.searchParams.set('gsrlimit', '24'); url.searchParams.set('gsrsearch', query); url.searchParams.set('prop', 'imageinfo'); url.searchParams.set('iiprop', 'url|extmetadata|mime|user|size'); url.searchParams.set('iiurlwidth', '420'); const data = await fetchJson(url); const pages = data.query?.pages && typeof data.query.pages === 'object' ? Object.values(data.query.pages) : []; return pages.map(normalizeCommons).filter(Boolean) } },
]

export const assetProviders = providers.map(({ id, label, modes }) => ({ id, label, modes }))

function effectiveSources(sourceIds = [], mode = 'everything') {
  if (mode !== 'elements' || !sourceIds.length) return sourceIds
  return sourceIds.includes('printlab-elements') && !sourceIds.includes('iconify') ? [] : sourceIds
}

export async function searchUnifiedAssets({ query, mode = 'everything', sourceIds = [], localMedia = [] } = {}) {
  const cleanQuery = clean(query)
  const expandedTerms = mode === 'elements' ? expandElementQuery(cleanQuery) : expandEditorialQuery(cleanQuery)
  const activeSources = effectiveSources(sourceIds, mode)
  const activeProviders = providers.filter((provider) => (!activeSources.length || activeSources.includes(provider.id)) && (mode === 'everything' || provider.modes.includes(mode)))
  const settled = await Promise.all(activeProviders.map(async (provider) => {
    try { return { provider: { id: provider.id, label: provider.label }, results: safeArray(await provider.search({ query: cleanQuery, expandedTerms, mode, localMedia })).map(normalizePrintlabAsset).filter(Boolean), error: '' } }
    catch (err) { return { provider: { id: provider.id, label: provider.label }, results: [], error: String(err?.message || err || 'Provider failed.') } }
  }))
  const results = dedupe(settled.flatMap((entry) => entry.results))
    .filter((asset) => modeMatches(asset, mode))
    .filter((asset) => textMatches(asset, expandedTerms))
    .map((asset) => ({ ...asset, rank: rank(asset, cleanQuery, expandedTerms, mode) }))
    .sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title))
  return { results, providers: settled.map((entry) => ({ id: entry.provider.id, label: entry.provider.label, count: entry.results.length, error: entry.error, state: entry.error ? 'error' : 'loaded' })), expandedTerms }
}

export function importUrlAsset(rawUrl) {
  const downloadUrl = compactUrl(rawUrl)
  if (!downloadUrl) return null
  let parsed = null
  try { parsed = new URL(downloadUrl) } catch { throw new Error('Enter a valid URL.') }
  const filename = decodeURIComponent(parsed.pathname.split('/').pop() || '').replace(/\.[^.]+$/, '')
  return normalizePrintlabAsset({ id: `url:${downloadUrl}`, originalProvider: 'url-import', originalId: downloadUrl, title: filename || parsed.hostname || 'URL import', thumbnailUrl: downloadUrl, previewUrl: downloadUrl, downloadUrl, source: 'url-import', sourceLabel: 'URL Import', creator: parsed.hostname, license: 'Unknown', attributionText: `Imported from ${parsed.hostname}. Add creator/license metadata before publication.`, mediaType: /\.svg($|\?)/i.test(parsed.pathname) ? 'icon' : 'image', landingPageUrl: downloadUrl })
}

export async function searchAssetSource(sourceId, query, options = {}) {
  const data = await searchUnifiedAssets({ query, mode: options.mode || 'everything', sourceIds: [sourceId], localMedia: options.localMedia || [] })
  const providerState = data.providers.find((provider) => provider.id === sourceId)
  if (providerState?.error) throw new Error(providerState.error)
  return data.results
}
