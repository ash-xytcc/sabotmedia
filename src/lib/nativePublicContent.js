import {
  fetchNativeEntries,
  saveNativeEntry,
  removeNativeEntry,
} from './nativePublicContentApi'

const FALLBACK_STORAGE_KEY = 'sabot-native-public-content-v1'

export const NATIVE_CONTENT_SCHEMA_VERSION = 2

export function createEmptyNativeEntry() {
  const now = new Date().toISOString()
  return {
    id: `native-${Math.random().toString(36).slice(2, 10)}`,
    schemaVersion: NATIVE_CONTENT_SCHEMA_VERSION,
    contentType: 'note',
    status: 'draft',
    workflowState: 'draft',
    target: 'general',
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    richBody: [],
    author: '',
    sourceType: 'manual',
    sourceKind: 'manual',
    sourceLabel: '',
    sourceUrl: '',
    sourceExternalId: '',
    sourcePostId: '',
    sourceNotes: '',
    categories: [],
    projects: [],
    tags: [],
    bodyHtml: '',
    featuredImage: '',
    heroImage: '',
    featuredImageTitle: '',
    featuredImageAlt: '',
    featuredImageCaption: '',
    createdAt: now,
    updatedAt: now,
    publishedAt: '',
    scheduledFor: '',
  }
}

export function normalizeNativeEntry(input) {
  const raw = input || {}
  const status = normalizeEnum(raw.status, ['draft', 'published', 'archived', 'trash']) || 'draft'
  const workflowState =
    normalizeEnum(raw.workflowState, ['draft', 'in_review', 'needs_revision', 'ready', 'scheduled', 'published', 'archived']) ||
    inferWorkflowState(raw, status)

  return {
    id: String(raw.id || `native-${Math.random().toString(36).slice(2, 10)}`),
    schemaVersion: NATIVE_CONTENT_SCHEMA_VERSION,
    contentType: normalizeEnum(raw.contentType, ['note', 'publicBlock', 'dispatch', 'podcast', 'print']) || 'note',
    status,
    workflowState,
    target: normalizeEnum(raw.target, ['general', 'home', 'press', 'projects']) || 'general',
    title: String(raw.title || ''),
    slug: slugify(raw.slug || raw.title || ''),
    excerpt: String(raw.excerpt || ''),
    body: String(raw.body || ''),
    richBody: Array.isArray(raw.richBody) ? raw.richBody : [],
    author: String(raw.author || ''),
    sourceType: String(raw.sourceType || 'manual'),
    sourceKind: String(raw.sourceKind || raw.sourceType || 'manual'),
    sourceLabel: String(raw.sourceLabel || ''),
    sourceUrl: String(raw.sourceUrl || ''),
    sourceExternalId: String(raw.sourceExternalId || ''),
    sourcePostId: String(raw.sourcePostId || raw.sourceExternalId || ''),
    sourceNotes: String(raw.sourceNotes || ''),
    bodyHtml: String(raw.bodyHtml || raw.body || ''),
    heroImage: String(raw.heroImage || raw.featuredImage || ''),
    featuredImage: String(raw.featuredImage || raw.heroImage || ''),
    featuredImageTitle: String(raw.featuredImageTitle || ''),
    featuredImageAlt: String(raw.featuredImageAlt || ''),
    featuredImageCaption: String(raw.featuredImageCaption || ''),
    audioSummary: String(raw.audioSummary || ''),
    transcriptExcerpt: String(raw.transcriptExcerpt || ''),
    hasPrintAssets: Boolean(raw.hasPrintAssets),
    transcriptionStatus: String(raw.transcriptionStatus || 'none'),
    audioSourceUrl: String(raw.audioSourceUrl || ''),
    fullTranscript: String(raw.fullTranscript || ''),
    transcriptNotes: String(raw.transcriptNotes || ''),
    categories: normalizeTags(raw.categories || raw.projects),
    projects: normalizeTags(raw.projects || raw.categories),
    tags: normalizeTags(raw.tags),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    publishedAt: String(raw.publishedAt || ''),
    scheduledFor: normalizeDateString(raw.scheduledFor || ''),
  }
}

export function normalizeNativeCollection(input) {
  const arr = Array.isArray(input) ? input : []
  return arr.map(normalizeNativeEntry).sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

function loadLocalNativeCollection() {
  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY)
    if (!raw) return []
    return normalizeNativeCollection(JSON.parse(raw))
  } catch {
    return []
  }
}

function mergeNativeCollections(primary = [], secondary = []) {
  const byId = new Map()

  for (const item of normalizeNativeCollection(secondary)) {
    byId.set(item.id, item)
  }

  for (const item of normalizeNativeCollection(primary)) {
    byId.set(item.id, item)
  }

  return normalizeNativeCollection([...byId.values()])
}

export async function loadNativeCollection(params = {}) {
  const localItems = loadLocalNativeCollection()

  try {
    const data = await fetchNativeEntries(params)
    const remoteItems = normalizeNativeCollection(data?.items || [])
    const merged = mergeNativeCollections(remoteItems, localItems)

    try {
      window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(merged))
    } catch {
      // ignore
    }

    return merged
  } catch {
    return localItems
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

export function upsertNativeEntryLocal(items, entry) {
  const normalizedEntry = normalizeNativeEntry({
    ...entry,
    updatedAt: new Date().toISOString(),
    publishedAt: entry?.status === 'published'
      ? String(entry.publishedAt || new Date().toISOString())
      : String(entry?.publishedAt || ''),
  })

  const localBase = mergeNativeCollections(items || [], loadLocalNativeCollection())
  const nextItems = normalizeNativeCollection(
    localBase.some((item) => item.id === normalizedEntry.id)
      ? localBase.map((item) => (item.id === normalizedEntry.id ? normalizedEntry : item))
      : [normalizedEntry, ...localBase]
  )

  try {
    window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(nextItems))
    return { items: nextItems, item: normalizedEntry, ok: true }
  } catch {
    return { items: nextItems, item: normalizedEntry, ok: false }
  }
}

export async function upsertNativeEntry(items, entry, revisionNote = 'save') {
  const normalizedEntry = normalizeNativeEntry({
    ...entry,
    updatedAt: new Date().toISOString(),
    publishedAt: entry?.status === 'published'
      ? String(entry.publishedAt || new Date().toISOString())
      : String(entry?.publishedAt || ''),
  })

  const localBase = mergeNativeCollections(items || [], loadLocalNativeCollection())
  const locallySaved = saveNativeCollection(
    localBase.some((item) => item.id === normalizedEntry.id)
      ? localBase.map((item) => (item.id === normalizedEntry.id ? normalizedEntry : item))
      : [normalizedEntry, ...localBase]
  )

  try {
    const data = await saveNativeEntry(normalizedEntry, revisionNote)
    const saved = normalizeNativeEntry(data?.item || normalizedEntry)
    const merged = saveNativeCollection(
      locallySaved.some((item) => item.id === saved.id)
        ? locallySaved.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...locallySaved]
    )
    return merged
  } catch {
    return locallySaved
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
  return normalizeNativeCollection(items).filter((item) => item.status === 'published' && isScheduledVisible(item))
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

function isScheduledVisible(item) {
  if (!item?.scheduledFor) return true
  const ms = new Date(item.scheduledFor).getTime()
  return !Number.isFinite(ms) || ms <= Date.now()
}

function inferWorkflowState(raw, status) {
  if (status === 'archived') return 'archived'
  if (status === 'published') {
    const scheduled = normalizeDateString(raw?.scheduledFor || '')
    if (scheduled && new Date(scheduled).getTime() > Date.now()) return 'scheduled'
    return 'published'
  }
  return 'draft'
}

function normalizeDateString(value) {
  const str = String(value || '').trim()
  if (!str) return ''
  const ms = new Date(str).getTime()
  return Number.isFinite(ms) ? new Date(ms).toISOString() : ''
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
