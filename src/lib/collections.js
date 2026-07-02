export const COLLECTIONS_STORAGE_KEY = 'sabot-collections-v1'
export const COLLECTIONS_SCHEMA_VERSION = 1

export function slugifyCollection(value = '') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
  }
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeRows(value, fields = []) {
  const arr = Array.isArray(value) ? value : []
  return arr
    .map((row) => {
      const normalized = {
        id: String(row?.id || `row-${Math.random().toString(36).slice(2, 10)}`),
      }
      for (const field of fields) normalized[field] = String(row?.[field] || '')
      return normalized
    })
    .filter((row) => fields.some((field) => row[field].trim()))
}

export function createEmptyCollection() {
  const now = new Date().toISOString()
  return {
    id: `collection-${Math.random().toString(36).slice(2, 10)}`,
    schemaVersion: COLLECTIONS_SCHEMA_VERSION,
    status: 'published',
    title: '',
    slug: '',
    subtitle: '',
    overview: '',
    coverImage: '',
    coverAlt: '',
    featuredQuote: '',
    pieceSlugs: [],
    featuredPieceSlugs: [],
    relatedCollections: [],
    relatedPieces: [],
    timeline: [],
    downloads: [],
    gallery: [],
    updates: [],
    externalLinks: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeCollection(input = {}) {
  const base = createEmptyCollection()
  const raw = input || {}
  const title = String(raw.title || '')
  const slug = slugifyCollection(raw.slug || title || raw.id)

  return {
    ...base,
    ...raw,
    id: String(raw.id || base.id),
    schemaVersion: COLLECTIONS_SCHEMA_VERSION,
    status: ['draft', 'published', 'archived'].includes(raw.status) ? raw.status : 'published',
    title,
    slug,
    subtitle: String(raw.subtitle || ''),
    overview: String(raw.overview || ''),
    coverImage: String(raw.coverImage || raw.image || ''),
    coverAlt: String(raw.coverAlt || ''),
    featuredQuote: String(raw.featuredQuote || ''),
    pieceSlugs: normalizeList(raw.pieceSlugs || raw.pieces),
    featuredPieceSlugs: normalizeList(raw.featuredPieceSlugs || raw.featuredPieces),
    relatedCollections: normalizeList(raw.relatedCollections),
    relatedPieces: normalizeList(raw.relatedPieces),
    timeline: normalizeRows(raw.timeline, ['date', 'title', 'body']),
    downloads: normalizeRows(raw.downloads, ['title', 'url', 'type']),
    gallery: normalizeRows(raw.gallery, ['title', 'url', 'alt', 'caption']),
    updates: normalizeRows(raw.updates, ['date', 'title', 'body', 'url']),
    externalLinks: normalizeRows(raw.externalLinks, ['title', 'url']),
    createdAt: String(raw.createdAt || base.createdAt),
    updatedAt: String(raw.updatedAt || base.updatedAt),
  }
}

export function loadCollections() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(COLLECTIONS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeCollection).sort(sortCollections)
  } catch {
    return []
  }
}

export async function loadCollectionsAsync(params = {}) {
  if (typeof window === 'undefined') return []
  try {
    const url = new URL('/api/collections', window.location.origin)
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') url.searchParams.set(key, String(value))
    }
    const res = await fetch(url.pathname + url.search, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.ok && Array.isArray(data.items) && data.mode !== 'scaffold') {
      return saveCollections(data.items)
    }
  } catch {
    // Local fallback keeps the admin usable in static/dev environments.
  }
  return loadCollections()
}

export function saveCollections(collections = []) {
  const normalized = (Array.isArray(collections) ? collections : []).map(normalizeCollection).sort(sortCollections)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(normalized))
  }
  return normalized
}

export function upsertCollection(collections = [], collection = {}) {
  const normalized = normalizeCollection({
    ...collection,
    updatedAt: new Date().toISOString(),
  })
  const existing = new Map((Array.isArray(collections) ? collections : []).map((item) => [item.id, normalizeCollection(item)]))
  existing.set(normalized.id, normalized)
  return saveCollections([...existing.values()])
}

export async function upsertCollectionAsync(collections = [], collection = {}) {
  const normalized = normalizeCollection({
    ...collection,
    updatedAt: new Date().toISOString(),
  })
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ item: normalized }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.ok && data.item) {
        const next = upsertCollection(collections, data.item)
        return { items: next, item: normalizeCollection(data.item), mode: data.mode || 'api' }
      }
    } catch {
      // Fall through to local persistence.
    }
  }
  const next = upsertCollection(collections, normalized)
  return { items: next, item: normalized, mode: 'local' }
}

export function deleteCollection(collections = [], collectionId = '') {
  return saveCollections((Array.isArray(collections) ? collections : []).filter((item) => item.id !== collectionId))
}

export async function deleteCollectionAsync(collections = [], collectionId = '') {
  if (typeof window !== 'undefined' && collectionId) {
    try {
      const url = new URL('/api/collections', window.location.origin)
      url.searchParams.set('id', collectionId)
      const res = await fetch(url.pathname + url.search, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      })
      if (res.ok) return deleteCollection(collections, collectionId)
    } catch {
      // Fall through to local persistence.
    }
  }
  return deleteCollection(collections, collectionId)
}

export function findCollection(collections = [], slugOrId = '') {
  const key = String(slugOrId || '').trim().toLowerCase()
  return (collections || []).map(normalizeCollection).find((item) => item.slug.toLowerCase() === key || item.id.toLowerCase() === key) || null
}

export function pieceBelongsToCollection(piece = {}, collection = {}) {
  const slug = String(piece?.slug || piece?.nativeSlug || piece?.id || '').trim()
  const collectionTitle = String(collection?.title || '').trim()
  const collectionSlug = String(collection?.slug || '').trim()
  const pieceCollections = normalizeList(piece?.collections || piece?.collection)
  return (
    (slug && normalizeList(collection?.pieceSlugs).includes(slug)) ||
    (collectionTitle && pieceCollections.includes(collectionTitle)) ||
    (collectionSlug && pieceCollections.includes(collectionSlug))
  )
}

export function getCollectionPieces(collection = {}, pieces = []) {
  const pieceSlugs = normalizeList(collection?.pieceSlugs)
  const bySlug = new Map((pieces || []).map((piece) => [String(piece?.slug || piece?.id || '').trim(), piece]))
  const ordered = pieceSlugs.map((slug) => bySlug.get(slug)).filter(Boolean)
  const assigned = (pieces || []).filter((piece) => pieceBelongsToCollection(piece, collection))
  const seen = new Set()
  return [...ordered, ...assigned].filter((piece) => {
    const key = String(piece?.slug || piece?.id || '').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function inferCollectionTermsFromPiece(piece = {}) {
  return normalizeList(piece.collections || piece.collection)
}

function sortCollections(a, b) {
  const aStatus = a.status === 'published' ? 0 : a.status === 'draft' ? 1 : 2
  const bStatus = b.status === 'published' ? 0 : b.status === 'draft' ? 1 : 2
  if (aStatus !== bStatus) return aStatus - bStatus
  return String(a.title || '').localeCompare(String(b.title || ''))
}
