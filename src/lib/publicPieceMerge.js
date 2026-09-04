function normalizeReleaseTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’‘]/g, "'")
    .replace(/\b(?:season\s*\d+\s*)?episode\s*#?\s*\d+\b/g, ' ')
    .replace(/\bs\d+\s*[-–—]?\s*e\d+\b/g, ' ')
    .replace(/\bep\.?\s*#?\s*\d+\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeProjectIdentity(item) {
  return [
    item?.primaryProject,
    item?.primaryProjectSlug,
    item?.project,
    item?.projectName,
    ...(Array.isArray(item?.projects) ? item.projects : []),
  ]
    .map((value) => String(value || '').toLowerCase())
    .join(' ')
}

function isKnownStaleMolotovNewsletter(item) {
  const rawType = String(item?.type || item?.contentType || '').toLowerCase()
  if (!rawType.includes('newsletter')) return false

  const projectIdentity = normalizeProjectIdentity(item)
  const title = normalizeReleaseTitle(item?.title)
  const molotovIdentity =
    projectIdentity.includes('molotov') ||
    String(item?.featuredImage || item?.heroImage || item?.imageUrl || '').toLowerCase().includes('molotov')

  if (!molotovIdentity) return false

  return new Set([
    'the problem with good cops',
    'food not bombs round table',
    'we re back here s what you missed',
    'were back heres what you missed',
  ]).has(title)
}

function releaseDay(item) {
  const raw = item?.publishedAt || item?.date || item?.updatedAt || ''
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function getSemanticReleaseKey(item) {
  const title = normalizeReleaseTitle(item?.title)
  const day = releaseDay(item)
  if (!title || title.length < 8 || !day) return ''
  return `release:${day}:${title}`
}

function getKnownLegacyReleaseKey(item) {
  const title = normalizeReleaseTitle(item?.title)
  if (!title) return ''

  if (title === 'aberdeen and the non profit industrial complex') {
    return 'known-release:mn:aberdeen-non-profit-industrial-complex'
  }

  if (title === 'we re back here s what you missed' || title === 'were back heres what you missed') {
    return 'known-release:mn:were-back-heres-what-you-missed'
  }

  if (
    title === 'discussion with the blackflower collective' ||
    title === 'discussions with the blackflower collective'
  ) {
    return 'known-release:mn:blackflower-collective-discussion'
  }

  return ''
}

export function getPublicPieceMergeKeys(item) {
  const values = [
    ['slug', item?.slug],
    ['source', item?.sourcePostId || item?.sourceExternalId],
    ['id', item?.id],
  ]
  const keys = values
    .map(([kind, value]) => `${kind}:${String(value || '').trim().toLowerCase()}`)
    .filter((key) => !key.endsWith(':'))
  const semantic = getSemanticReleaseKey(item)
  if (semantic) keys.push(semantic)
  const knownLegacyRelease = getKnownLegacyReleaseKey(item)
  if (knownLegacyRelease) keys.push(knownLegacyRelease)
  return keys
}

export function publicPiecesShareIdentity(a, b) {
  const left = new Set(getPublicPieceMergeKeys(a))
  return getPublicPieceMergeKeys(b).some((key) => left.has(key))
}

export function mergeNativeAndImportedPieces(importedPieces = [], nativePieces = []) {
  const merged = []
  const indexByKey = new Map()

  function add(item) {
    if (isKnownStaleMolotovNewsletter(item)) return

    const keys = getPublicPieceMergeKeys(item)
    const existingIndex = keys
      .map((key) => indexByKey.get(key))
      .find((index) => Number.isInteger(index))

    if (Number.isInteger(existingIndex)) {
      merged[existingIndex] = item
      for (const key of keys) indexByKey.set(key, existingIndex)
      return
    }

    const nextIndex = merged.length
    merged.push(item)
    for (const key of keys) indexByKey.set(key, nextIndex)
  }

  for (const item of importedPieces || []) add(item)
  for (const item of nativePieces || []) add(item)

  return merged
    .filter((item) => item?.hidden !== true)
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0))
}
