const STORAGE_KEY = 'sabot.wpClone.localMedia.v1'

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

export function loadLocalMediaItems() {
  if (!canUseStorage()) return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = safeJson(raw || '[]', [])
  if (!Array.isArray(parsed)) return []
  return parsed.map(normalizeMediaItem).filter(Boolean)
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
