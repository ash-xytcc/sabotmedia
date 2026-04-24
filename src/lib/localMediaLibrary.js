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

export function loadLocalMediaItems() {
  if (!canUseStorage()) return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = safeJson(raw || '[]', [])
  if (!Array.isArray(parsed)) return []
  return parsed.filter((item) => item && item.id && item.url)
}

export function saveLocalMediaItems(items) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items || []))
}

export function addLocalMediaItem(item) {
  const existing = loadLocalMediaItems()
  const next = [item, ...existing]
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
  const name = String(file?.name || 'upload').replace(/\.[^.]+$/, '')
  const ext = String(file?.name || '').split('.').pop()?.toLowerCase() || 'image'
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: name || 'Uploaded image',
    alt: '',
    caption: '',
    mimeType: file?.type || '',
    extension: ext,
    source: 'local-upload',
    createdAt: new Date().toISOString(),
  }
}
