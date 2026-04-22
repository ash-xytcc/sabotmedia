import {
  fetchNativeEntries,
  saveNativeEntry,
  removeNativeEntry,
} from './nativePublicContentApi'

const FALLBACK_STORAGE_KEY = 'sabot-native-public-content-v1'

export const NATIVE_CONTENT_SCHEMA_VERSION = 1

export function createEmptyNativeEntry() {
  const now = new Date().toISOString()
  return {
    id: `native-${Math.random().toString(36).slice(2, 10)}`,
    schemaVersion: NATIVE_CONTENT_SCHEMA_VERSION,
    contentType: 'note',
    status: 'draft',
    target: 'general',
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    author: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    publishedAt: '',
  }
}

export function normalizeNativeEntry(input) {
  const raw = input || {}
  return {
    id: String(raw.id || `native-${Math.random().toString(36).slice(2, 10)}`),
    schemaVersion: NATIVE_CONTENT_SCHEMA_VERSION,
    contentType: normalizeEnum(raw.contentType, ['note', 'publicBlock', 'dispatch']) || 'note',
    status: normalizeEnum(raw.status, ['draft', 'published', 'archived']) || 'draft',
    target: normalizeEnum(raw.target, ['general', 'home', 'press', 'projects']) || 'general',
    title: String(raw.title || ''),
    slug: slugify(raw.slug || raw.title || ''),
    excerpt: String(raw.excerpt || ''),
    body: String(raw.body || ''),
    author: String(raw.author || ''),
    tags: normalizeTags(raw.tags),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    publishedAt: String(raw.publishedAt || ''),
  }
}

export function normalizeNativeCollection(input) {
  const arr = Array.isArray(input) ? input : []
  return arr.map(normalizeNativeEntry).sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export async function loadNativeCollection() {
  try {
    const data = await fetchNativeEntries()
    return normalizeNativeCollection(data?.items || [])
  } catch {
    try {
      const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY)
      if (!raw) return []
      return normalizeNativeCollection(JSON.parse(raw))
    } catch {
      return []
    }
  }
}

export function saveNativeCollection(items) {
  const normalized = normalizeNativeCollection(items)
  try {
    window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // ignore
  }
  return normalized
}

export async function upsertNativeEntry(items, entry) {
  const normalizedEntry = normalizeNativeEntry({
    ...entry,
    updatedAt: new Date().toISOString(),
    publishedAt:
      entry?.status === 'published'
        ? String(entry?.publishedAt || new Date().toISOString())
        : String(entry?.publishedAt || ''),
  })

  try {
    const data = await saveNativeEntry(normalizedEntry)
    const saved = normalizeNativeEntry(data?.item || normalizedEntry)
    const current = await loadNativeCollection()
    return normalizeNativeCollection(
      current.some((item) => item.id === saved.id)
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]
    )
  } catch {
    const next = [...(items || [])]
    const index = next.findIndex((item) => item.id === normalizedEntry.id)

    if (index >= 0) {
      next[index] = normalizedEntry
    } else {
      next.unshift(normalizedEntry)
    }

    return saveNativeCollection(next)
  }
}

export async function deleteNativeEntry(items, id) {
  try {
    await removeNativeEntry(id)
    return normalizeNativeCollection((items || []).filter((item) => item.id !== id && item.slug !== id))
  } catch {
    return saveNativeCollection((items || []).filter((item) => item.id !== id))
  }
}

export function exportNativeCollection(items) {
  return JSON.stringify(
    {
      schemaVersion: NATIVE_CONTENT_SCHEMA_VERSION,
      items: normalizeNativeCollection(items),
    },
    null,
    2
  )
}

export function importNativeCollection(raw) {
  const payload = raw?.items && Array.isArray(raw.items) ? raw.items : Array.isArray(raw) ? raw : []
  return saveNativeCollection(payload)
}

export function getPublishedNativeEntries(items) {
  return normalizeNativeCollection(items).filter((item) => item.status === 'published')
}

export function getLatestPublishedNativeEntry(items, target = '') {
  const published = getPublishedNativeEntries(items)
  return published.find((item) => !target || item.target === target) || null
}

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeEnum(value, allowed) {
  const str = String(value || '').trim()
  return allowed.includes(str) ? str : ''
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}
