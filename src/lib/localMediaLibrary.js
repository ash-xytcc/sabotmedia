const STORAGE_KEY = 'sabot.wpClone.localMedia.v1'
const METADATA_STORAGE_KEY = 'sabot.wpClone.localMedia.meta.v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeJson(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function normalizeMediaItem(item) {
  if (!item || !item.id) return null
  const url = String(item.url || item.dataUrl || '').trim()
  if (!url) return null
  const filename = String(item.filename || '')
  const title = String(item.title || filename.replace(/\.[^.]+$/, '') || 'Uploaded media')
  return {
    id: String(item.id),
    url,
    dataUrl: url,
    filename,
    title,
    alt: String(item.alt || ''),
    caption: String(item.caption || ''),
    description: String(item.description || ''),
    uploadedAt: String(item.uploadedAt || item.createdAt || new Date().toISOString()),
    source: String(item.source || 'local-upload'),
    mimeType: String(item.mimeType || ''),
    extension: String(item.extension || ''),
  }
}

function toMediaMetadataKey(input) {
  if (!input) return ''
  if (typeof input === 'string') return input.trim()
  const url = String(input.url || input.dataUrl || '').trim()
  if (url) return url
  return String(input.id || '').trim()
}

function normalizeMediaMetadata(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const next = {}
  for (const [key, value] of Object.entries(raw)) {
    const cleanKey = toMediaMetadataKey(key)
    if (!cleanKey || !value || typeof value !== 'object') continue
    next[cleanKey] = {
      title: String(value.title || ''),
      alt: String(value.alt || ''),
      caption: String(value.caption || ''),
      description: String(value.description || ''),
    }
  }
  return next
}

export function loadLocalMediaItems() {
  if (!canUseStorage()) return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = safeJson(raw || '[]', [])
  if (!Array.isArray(parsed)) return []
  return parsed.map(normalizeMediaItem).filter(Boolean)
}

export function loadLocalMediaMetadata() {
  if (!canUseStorage()) return {}
  const raw = window.localStorage.getItem(METADATA_STORAGE_KEY)
  return normalizeMediaMetadata(safeJson(raw || '{}', {}))
}

function saveLocalMediaMetadata(metadata) {
  if (!canUseStorage()) return
  const normalized = normalizeMediaMetadata(metadata)
  window.localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(normalized))
}

export function saveLocalMediaItems(items) {
  if (!canUseStorage()) return
  const normalized = Array.isArray(items) ? items.map(normalizeMediaItem).filter(Boolean) : []
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
}

export function addLocalMediaItem(item) {
  const normalized = normalizeMediaItem(item)
  if (!normalized) return loadLocalMediaItems()
  const existing = loadLocalMediaItems()
  const next = [normalized, ...existing.filter((entry) => entry.id !== normalized.id)]
  saveLocalMediaItems(next)
  return next
}

export function updateLocalMediaItem(id, fields) {
  if (!id) return []
  const existing = loadLocalMediaItems()
  const next = existing.map((item) => {
    if (item.id !== id) return item
    return normalizeMediaItem({ ...item, ...fields, id: item.id, source: item.source || 'local-upload' })
  }).filter(Boolean)
  saveLocalMediaItems(next)
  return next
}

export function updateLocalMediaMetadata(itemOrKey, fields) {
  const key = toMediaMetadataKey(itemOrKey)
  if (!key) return loadLocalMediaMetadata()
  const updates = {
    title: String(fields?.title || ''),
    alt: String(fields?.alt || ''),
    caption: String(fields?.caption || ''),
    description: String(fields?.description || ''),
  }
  const existing = loadLocalMediaMetadata()
  const next = { ...existing, [key]: updates }
  saveLocalMediaMetadata(next)
  return next
}

export function applyLocalMediaMetadata(item) {
  const key = toMediaMetadataKey(item)
  if (!key) return item
  const metadata = loadLocalMediaMetadata()
  const saved = metadata[key]
  if (!saved) return item
  return {
    ...item,
    title: String(saved.title || item.title || ''),
    alt: String(saved.alt || item.alt || ''),
    caption: String(saved.caption || item.caption || ''),
    description: String(saved.description || item.description || ''),
  }
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
}

export function makeLocalMediaFromFile(file) {
  const filename = String(file?.name || 'upload')
  const name = filename.replace(/\.[^.]+$/, '')
  const ext = filename.split('.').pop()?.toLowerCase() || 'image'
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: '',
    dataUrl: '',
    filename,
    title: name || 'Uploaded image',
    alt: '',
    caption: '',
    description: '',
    mimeType: file?.type || '',
    extension: ext,
    source: 'local-upload',
    uploadedAt: new Date().toISOString(),
  }
}
