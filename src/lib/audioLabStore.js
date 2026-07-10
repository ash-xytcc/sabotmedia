const DB_NAME = 'sabotpress-audiolab-v1'
const DB_VERSION = 1
const PROJECT_STORE = 'projects'
const ASSET_STORE = 'audioAssets'

function canUseIndexedDb() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function makeAudioLabId(prefix = 'audio') {
  return makeId(prefix)
}

function openAudioLabDb() {
  if (!canUseIndexedDb()) return Promise.reject(new Error('IndexedDB is not available in this browser'))

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        const projects = db.createObjectStore(PROJECT_STORE, { keyPath: 'id' })
        projects.createIndex('updatedAt', 'updatedAt', { unique: false })
        projects.createIndex('createdAt', 'createdAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        const assets = db.createObjectStore(ASSET_STORE, { keyPath: 'id' })
        assets.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open AudioLab database'))
  })
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('AudioLab storage request failed'))
  })
}

async function withStore(storeName, mode, callback) {
  const db = await openAudioLabDb()

  try {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const transactionDone = new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error || new Error('AudioLab transaction failed'))
      transaction.onabort = () => reject(transaction.error || new Error('AudioLab transaction aborted'))
    })
    const result = await callback(store, transaction)
    await transactionDone
    return result
  } finally {
    db.close()
  }
}

export function formatAudioLabDuration(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hrs) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function slugifyAudioLab(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function clampNumber(value, min, max) {
  const parsed = Number(value)
  const safe = Number.isFinite(parsed) ? parsed : min
  return Math.min(max, Math.max(min, safe))
}

function normalizeEditOperation(edit = {}) {
  if (!edit?.id || !['delete', 'silence', 'trim'].includes(String(edit.type || ''))) return null

  return {
    id: String(edit.id),
    type: String(edit.type),
    assetId: String(edit.assetId || ''),
    start: Math.max(0, Number(edit.start) || 0),
    end: Math.max(0, Number(edit.end) || 0),
    createdAt: String(edit.createdAt || nowIso()),
  }
}

function normalizeEditList(value) {
  return Array.isArray(value) ? value.map(normalizeEditOperation).filter(Boolean) : []
}

export function normalizeAudioLabAsset(asset = {}) {
  if (!asset?.id) return null

  return {
    id: String(asset.id),
    filename: String(asset.filename || 'audio-source'),
    title: String(asset.title || String(asset.filename || '').replace(/\.[^.]+$/, '') || 'Audio source'),
    mimeType: String(asset.mimeType || 'audio/mpeg'),
    size: Number(asset.size || 0),
    duration: Number(asset.duration || 0),
    createdAt: String(asset.createdAt || nowIso()),
    source: String(asset.source || 'upload'),
  }
}

export function makeAudioLabClip(asset, fields = {}) {
  const normalized = normalizeAudioLabAsset(asset) || {}
  const sourceEnd = Number(fields.sourceEnd ?? normalized.duration ?? 0)

  return normalizeAudioLabClip({
    id: fields.id || makeId('clip'),
    assetId: fields.assetId || normalized.id || '',
    name: fields.name || normalized.title || normalized.filename || 'Audio clip',
    timelineStart: fields.timelineStart ?? 0,
    sourceStart: fields.sourceStart ?? 0,
    sourceEnd,
    gain: fields.gain ?? 1,
    muted: fields.muted || false,
  }, normalized)
}

export function normalizeAudioLabClip(clip = {}, asset = null) {
  if (!clip?.assetId && !asset?.id) return null
  const assetDuration = Number(asset?.duration || 0)
  const sourceStart = clampNumber(clip.sourceStart ?? 0, 0, Math.max(assetDuration, Number(clip.sourceEnd || 0), 0))
  const fallbackEnd = assetDuration || Math.max(sourceStart, Number(clip.sourceEnd || 0))
  const sourceEnd = clampNumber(clip.sourceEnd ?? fallbackEnd, sourceStart, Math.max(fallbackEnd, sourceStart))

  return {
    id: String(clip.id || makeId('clip')),
    assetId: String(clip.assetId || asset?.id || ''),
    name: String(clip.name || asset?.title || asset?.filename || 'Audio clip'),
    timelineStart: Math.max(0, Number(clip.timelineStart || 0)),
    sourceStart,
    sourceEnd,
    gain: Math.max(0, Number(clip.gain ?? 1)),
    muted: Boolean(clip.muted),
  }
}

export function makeAudioLabTrack(fields = {}) {
  return normalizeAudioLabTrack({
    id: fields.id || makeId('track'),
    name: fields.name || 'Audio Track',
    type: 'audio',
    muted: Boolean(fields.muted),
    solo: Boolean(fields.solo),
    gain: fields.gain ?? 1,
    pan: fields.pan ?? 0,
    clips: Array.isArray(fields.clips) ? fields.clips : [],
  })
}

export function normalizeAudioLabTrack(track = {}, assetsById = new Map()) {
  const clips = Array.isArray(track.clips)
    ? track.clips.map((clip) => normalizeAudioLabClip(clip, assetsById.get(String(clip?.assetId || '')))).filter(Boolean)
    : []

  return {
    id: String(track.id || makeId('track')),
    name: String(track.name || 'Audio Track'),
    type: 'audio',
    muted: Boolean(track.muted),
    solo: Boolean(track.solo),
    gain: Math.max(0, Number(track.gain ?? 1)),
    pan: clampNumber(track.pan ?? 0, -1, 1),
    clips,
  }
}

function normalizeTrackList(project = {}, sourceAssets = []) {
  const assetsById = new Map(sourceAssets.map((asset) => [asset.id, asset]))
  const existingTracks = Array.isArray(project.tracks) ? project.tracks : []
  const normalized = existingTracks.map((track) => normalizeAudioLabTrack(track, assetsById)).filter(Boolean)

  if (normalized.length) return normalized

  const firstAsset = sourceAssets[0]
  if (!firstAsset) return []

  return [
    makeAudioLabTrack({
      id: 'track-main',
      name: 'Main Track',
      clips: [makeAudioLabClip(firstAsset)],
    }),
  ]
}

function compactHistory(value) {
  if (!Array.isArray(value)) return []
  return value.slice(-30).map((entry) => {
    if (!entry || typeof entry !== 'object') return null
    return JSON.parse(JSON.stringify({
      ...entry,
      history: [],
      redoStack: [],
    }))
  }).filter(Boolean)
}

export function createEmptyAudioLabProject(fields = {}) {
  const createdAt = fields.createdAt || nowIso()
  const title = String(fields.title || 'Untitled AudioLab Project')

  return normalizeAudioLabProject({
    id: fields.id || makeId('audio-project'),
    schemaVersion: 1,
    title,
    status: fields.status || 'draft',
    createdAt,
    updatedAt: fields.updatedAt || createdAt,
    sourceAssets: Array.isArray(fields.sourceAssets) ? fields.sourceAssets : [],
    tracks: Array.isArray(fields.tracks) ? fields.tracks : [],
    edits: Array.isArray(fields.edits) ? fields.edits : [],
    history: Array.isArray(fields.history) ? fields.history : [],
    redoStack: Array.isArray(fields.redoStack) ? fields.redoStack : [],
    transport: {
      zoom: Number(fields.transport?.zoom || 1),
      selectionStart: Number(fields.transport?.selectionStart || 0),
      selectionEnd: Number(fields.transport?.selectionEnd || 0),
    },
    episode: {
      title: fields.episode?.title || title,
      slug: fields.episode?.slug || slugifyAudioLab(title),
      description: fields.episode?.description || '',
      status: fields.episode?.status || 'draft',
      audioAssetId: fields.episode?.audioAssetId || '',
      nativeEntryId: fields.episode?.nativeEntryId || '',
      nativeEntrySlug: fields.episode?.nativeEntrySlug || '',
      updatedAt: fields.episode?.updatedAt || '',
    },
  })
}

export function normalizeAudioLabProject(project = {}) {
  const createdAt = String(project.createdAt || nowIso())
  const title = String(project.title || 'Untitled AudioLab Project')
  const sourceAssets = Array.isArray(project.sourceAssets)
    ? project.sourceAssets.map(normalizeAudioLabAsset).filter(Boolean)
    : []
  const tracks = normalizeTrackList(project, sourceAssets)

  return {
    id: String(project.id || makeId('audio-project')),
    schemaVersion: 1,
    title,
    status: String(project.status || 'draft'),
    createdAt,
    updatedAt: String(project.updatedAt || createdAt),
    sourceAssets,
    tracks,
    edits: normalizeEditList(project.edits),
    history: compactHistory(project.history),
    redoStack: compactHistory(project.redoStack),
    transport: {
      zoom: Math.max(0.25, Number(project.transport?.zoom || 1)),
      selectionStart: Math.max(0, Number(project.transport?.selectionStart || 0)),
      selectionEnd: Math.max(0, Number(project.transport?.selectionEnd || 0)),
      playhead: Math.max(0, Number(project.transport?.playhead || 0)),
      selectedTrackId: String(project.transport?.selectedTrackId || tracks[0]?.id || ''),
      selectedClipId: String(project.transport?.selectedClipId || ''),
    },
    episode: {
      title: String(project.episode?.title || title),
      slug: slugifyAudioLab(project.episode?.slug || project.episode?.title || title),
      description: String(project.episode?.description || ''),
      status: String(project.episode?.status || 'draft'),
      audioAssetId: String(project.episode?.audioAssetId || sourceAssets[0]?.id || ''),
      nativeEntryId: String(project.episode?.nativeEntryId || ''),
      nativeEntrySlug: String(project.episode?.nativeEntrySlug || ''),
      updatedAt: String(project.episode?.updatedAt || ''),
    },
  }
}

export async function listAudioLabProjects() {
  const projects = await withStore(PROJECT_STORE, 'readonly', (store) => requestToPromise(store.getAll()))
  return (Array.isArray(projects) ? projects : [])
    .map(normalizeAudioLabProject)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
}

export async function getAudioLabProject(id) {
  if (!id) return null
  const project = await withStore(PROJECT_STORE, 'readonly', (store) => requestToPromise(store.get(String(id))))
  return project ? normalizeAudioLabProject(project) : null
}

export async function saveAudioLabProject(project) {
  const normalized = normalizeAudioLabProject({
    ...project,
    updatedAt: nowIso(),
  })

  await withStore(PROJECT_STORE, 'readwrite', (store) => requestToPromise(store.put(normalized)))
  return normalized
}

export async function deleteAudioLabProject(id) {
  if (!id) return false
  await withStore(PROJECT_STORE, 'readwrite', (store) => requestToPromise(store.delete(String(id))))
  return true
}

export async function putAudioLabAssetFromBlob(blob, fields = {}) {
  if (!blob) throw new Error('No audio blob supplied')

  const filename = String(fields.filename || 'audio-source')
  const asset = {
    id: fields.id || makeId('audio-asset'),
    filename,
    title: String(fields.title || filename.replace(/\.[^.]+$/, '') || 'Audio source'),
    mimeType: String(fields.mimeType || blob.type || 'audio/webm'),
    size: Number(fields.size || blob.size || 0),
    duration: Number(fields.duration || 0),
    createdAt: fields.createdAt || nowIso(),
    source: fields.source || 'upload',
    blob,
  }

  await withStore(ASSET_STORE, 'readwrite', (store) => requestToPromise(store.put(asset)))
  return normalizeAudioLabAsset(asset)
}

export async function putAudioLabAssetFromFile(file, fields = {}) {
  if (!file) throw new Error('No audio file selected')

  return putAudioLabAssetFromBlob(file, {
    ...fields,
    filename: String(file.name || 'audio-source'),
    title: String(fields.title || String(file.name || '').replace(/\.[^.]+$/, '') || 'Audio source'),
    mimeType: String(file.type || fields.mimeType || 'audio/mpeg'),
    size: Number(file.size || 0),
    source: fields.source || 'upload',
  })
}

export async function getAudioLabAsset(id) {
  if (!id) return null
  const asset = await withStore(ASSET_STORE, 'readonly', (store) => requestToPromise(store.get(String(id))))
  return asset || null
}

export async function listAudioLabAssets() {
  const assets = await withStore(ASSET_STORE, 'readonly', (store) => requestToPromise(store.getAll()))
  return (Array.isArray(assets) ? assets : [])
    .map(normalizeAudioLabAsset)
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
}

export function makeSingleTrackForAsset(asset) {
  const normalized = normalizeAudioLabAsset(asset)
  if (!normalized) return []

  return [
    makeAudioLabTrack({
      id: 'track-main',
      name: 'Main Track',
      clips: [makeAudioLabClip(normalized)],
    }),
  ]
}
