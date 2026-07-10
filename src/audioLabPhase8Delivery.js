const DB_NAME = 'sabotpress-audiolab-v1'
const DB_VERSION = 1
const PROJECT_STORE = 'projects'
const ASSET_STORE = 'audioAssets'

const DELIVERY_FORMATS = [
  { id: 'webm-opus', label: 'WebM Opus', mimeType: 'audio/webm;codecs=opus', extension: 'webm', codec: 'opus', bitrateKbps: 96 },
  { id: 'webm', label: 'WebM', mimeType: 'audio/webm', extension: 'webm', codec: 'webm', bitrateKbps: 96 },
  { id: 'mp4', label: 'M4A or MP4 audio', mimeType: 'audio/mp4', extension: 'm4a', codec: 'aac-or-mp4', bitrateKbps: 128 },
]

function shouldRunAudioLabPhase8() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  return /\/audiolab(?:\/|$)/.test(window.location.pathname)
}

function isPublicAudioUrl(value = '') {
  const raw = String(value || '').trim()
  return /^https?:\/\//i.test(raw) || raw.startsWith('/api/audiolab/media')
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open AudioLab storage'))
  })
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('AudioLab storage request failed'))
  })
}

async function withStore(storeName, mode, callback) {
  const db = await openDb()
  try {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const done = new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error || new Error('AudioLab storage transaction failed'))
      transaction.onabort = () => reject(transaction.error || new Error('AudioLab storage transaction aborted'))
    })
    const result = await callback(store)
    await done
    return result
  } finally {
    db.close()
  }
}

async function listProjects() {
  return withStore(PROJECT_STORE, 'readonly', (store) => requestToPromise(store.getAll()))
}

async function getAsset(id) {
  if (!id) return null
  return withStore(ASSET_STORE, 'readonly', (store) => requestToPromise(store.get(String(id))))
}

async function putAsset(asset) {
  return withStore(ASSET_STORE, 'readwrite', (store) => requestToPromise(store.put(asset)))
}

async function saveProject(project) {
  return withStore(PROJECT_STORE, 'readwrite', (store) => requestToPromise(store.put({ ...project, updatedAt: new Date().toISOString() })))
}

function createId(prefix) {
  if (typeof crypto?.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function slugify(value = '') {
  return String(value || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'audiolab'
}

function safeFilename(value = 'audiolab-delivery.webm', extension = 'webm') {
  const base = String(value || '').split(/[\\/]/).pop().replace(/\.[a-z0-9]+$/i, '').trim()
  return `${slugify(base || 'audiolab-delivery')}.${extension}`
}

function getActiveProjectTitle() {
  return document.querySelector('.audio-lab-project-card.is-active strong')?.textContent?.trim() || ''
}

async function getActiveProject() {
  const projects = await listProjects()
  const normalized = Array.isArray(projects) ? projects : []
  const activeTitle = getActiveProjectTitle()
  const candidates = normalized
    .filter((project) => project?.renderedEpisode || project?.sourceAssets?.length)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())

  if (activeTitle) {
    const exact = candidates.find((project) => String(project.title || 'Untitled AudioLab Project').trim() === activeTitle)
    if (exact) return exact
  }

  return candidates[0] || null
}

function renderedAssetId(rendered = {}) {
  return String(rendered.localAssetId || rendered.assetId || rendered.master?.localAssetId || rendered.master?.assetId || (String(rendered.url || '').startsWith('audiolab-local://') ? String(rendered.url).replace('audiolab-local://', '') : '') || rendered.mediaId || '')
}

function getMaster(rendered = {}) {
  const publicUrl = rendered.master?.publicUrl || rendered.publicUrl || (isPublicAudioUrl(rendered.url) ? rendered.url : '')
  return {
    mediaId: rendered.master?.mediaId || rendered.mediaId || '',
    localAssetId: rendered.master?.localAssetId || rendered.localAssetId || rendered.assetId || renderedAssetId(rendered),
    filename: rendered.master?.filename || rendered.filename || 'audiolab-master.wav',
    mimeType: rendered.master?.mimeType || rendered.mimeType || 'audio/wav',
    size: Number(rendered.master?.size || rendered.size || 0),
    duration: Number(rendered.master?.duration || rendered.duration || 0),
    publicUrl,
    storageKey: rendered.master?.storageKey || rendered.storageKey || '',
    status: publicUrl ? 'uploaded' : (rendered.status || 'local'),
  }
}

function normalizeRenderedEpisode(project = {}) {
  const rendered = project.renderedEpisode || null
  if (!rendered) return null
  const master = getMaster(rendered)
  const delivery = rendered.delivery || null
  const preferred = delivery?.publicUrl ? delivery : master
  return {
    ...rendered,
    localAssetId: master.localAssetId,
    master,
    delivery: delivery || { status: 'missing' },
    preferredPublicUrl: preferred?.publicUrl || '',
    preferredMimeType: preferred?.mimeType || master.mimeType || 'audio/wav',
    preferredFileSize: Number(preferred?.size || master.size || 0),
    publicUrl: preferred?.publicUrl || '',
    url: preferred?.publicUrl || rendered.url || '',
    mimeType: preferred?.mimeType || rendered.mimeType || 'audio/wav',
    size: Number(preferred?.size || rendered.size || 0),
    duration: Number(preferred?.duration || rendered.duration || 0),
    status: preferred?.publicUrl ? 'uploaded' : (rendered.status || 'local'),
  }
}

function supportedFormats() {
  if (typeof MediaRecorder === 'undefined') return []
  return DELIVERY_FORMATS.filter((format) => typeof MediaRecorder.isTypeSupported !== 'function' || MediaRecorder.isTypeSupported(format.mimeType))
}

function setPanelStatus(panel, message, type = 'info') {
  let node = panel.querySelector('.audio-lab-phase8-status')
  if (!node) {
    node = document.createElement('p')
    node.className = 'description audio-lab-phase8-status'
    panel.appendChild(node)
  }
  node.dataset.status = type
  node.textContent = message
}

function formatBytes(size = 0) {
  const bytes = Number(size || 0)
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function blobToAudioBuffer(blob) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) throw new Error('This browser cannot decode rendered audio for delivery compression.')
  const context = new AudioContextCtor()
  try {
    const array = await blob.arrayBuffer()
    return await context.decodeAudioData(array.slice(0))
  } finally {
    try { await context.close() } catch { /* browser drama */ }
  }
}

async function encodeDeliveryAudio(blob, format) {
  if (typeof MediaRecorder === 'undefined') throw new Error('Compressed delivery audio is not supported in this browser.')
  if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported(format.mimeType)) {
    throw new Error(`${format.label} is not supported in this browser.`)
  }

  const buffer = await blobToAudioBuffer(blob)
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  const context = new AudioContextCtor({ sampleRate: buffer.sampleRate })
  const source = context.createBufferSource()
  const destination = context.createMediaStreamDestination()
  source.buffer = buffer
  source.connect(destination)

  const chunks = []
  const recorder = new MediaRecorder(destination.stream, {
    mimeType: format.mimeType,
    audioBitsPerSecond: Math.max(32000, Number(format.bitrateKbps || 96) * 1000),
  })

  return new Promise((resolve, reject) => {
    const cleanup = async () => {
      destination.stream.getTracks().forEach((track) => track.stop())
      try { await context.close() } catch { /* ignore */ }
    }

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data)
    }
    recorder.onerror = async (event) => {
      await cleanup()
      reject(event.error || new Error('Delivery encoding failed.'))
    }
    recorder.onstop = async () => {
      await cleanup()
      const output = new Blob(chunks, { type: recorder.mimeType || format.mimeType })
      if (!output.size) reject(new Error('Delivery encoder produced an empty file.'))
      else resolve({ blob: output, duration: buffer.duration || 0, mimeType: output.type || format.mimeType })
    }

    source.onended = () => {
      if (recorder.state !== 'inactive') recorder.stop()
    }

    recorder.start(1000)
    source.start()
  })
}

async function uploadMedia({ blob, project, rendered, role, filename, mimeType, duration, codec, bitrateKbps, sourceMediaId }) {
  const file = new File([blob], filename, { type: mimeType || blob.type || 'audio/webm' })
  const form = new FormData()
  form.set('file', file, filename)
  form.set('projectId', project.id || '')
  form.set('title', project.episode?.title || project.title || filename)
  form.set('filename', filename)
  form.set('mimeType', mimeType || file.type || blob.type || 'audio/webm')
  form.set('duration', String(duration || rendered?.duration || 0))
  form.set('role', role)
  form.set('codec', codec || '')
  form.set('bitrateKbps', String(bitrateKbps || ''))
  form.set('sourceMediaId', sourceMediaId || '')

  const response = await fetch('/api/audiolab/media', { method: 'POST', credentials: 'same-origin', body: form })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || !data?.media?.publicUrl) throw new Error(data?.error || `Upload failed: ${response.status}`)
  return data.media
}

async function createDelivery(panel, formatId) {
  const project = await getActiveProject()
  const rendered = normalizeRenderedEpisode(project || {})
  if (!project || !rendered) throw new Error('Render WAV master first.')
  const masterAssetId = rendered.master?.localAssetId || renderedAssetId(rendered)
  const asset = await getAsset(masterAssetId)
  if (!asset?.blob) throw new Error('Local WAV master was not found. Re-render final episode audio first.')
  const format = supportedFormats().find((item) => item.id === formatId) || supportedFormats()[0]
  if (!format) throw new Error('No compressed delivery format is supported in this browser.')

  setPanelStatus(panel, `Creating ${format.label} delivery audio. This runs in real time, because browsers remain unserious little appliances.`, 'info')
  const encoded = await encodeDeliveryAudio(asset.blob, format)
  const id = createId('audiolab-delivery')
  const filename = safeFilename(project.episode?.slug || project.title || 'audiolab-delivery', format.extension)
  const deliveryAsset = {
    id,
    filename,
    title: filename.replace(/\.[^.]+$/, ''),
    mimeType: encoded.mimeType,
    size: encoded.blob.size,
    duration: encoded.duration || rendered.duration || asset.duration || 0,
    source: 'audiolab-delivery',
    blob: encoded.blob,
    createdAt: new Date().toISOString(),
  }
  await putAsset(deliveryAsset)

  const nextRendered = {
    ...rendered,
    delivery: {
      localAssetId: id,
      filename,
      mimeType: encoded.mimeType,
      size: encoded.blob.size,
      duration: deliveryAsset.duration,
      codec: format.codec,
      bitrateKbps: format.bitrateKbps,
      status: 'local',
    },
    preferredMimeType: encoded.mimeType,
    preferredFileSize: encoded.blob.size,
    status: rendered.publicUrl ? 'uploaded' : 'local',
  }
  await saveProject({ ...project, renderedEpisode: nextRendered })
  setPanelStatus(panel, `Created ${format.label} delivery audio: ${formatBytes(encoded.blob.size)}. Upload it before attaching/publishing.`, 'success')
}

async function uploadDelivery(panel) {
  const project = await getActiveProject()
  const rendered = normalizeRenderedEpisode(project || {})
  const delivery = rendered?.delivery
  if (!project || !rendered) throw new Error('Render WAV master first.')
  if (!delivery?.localAssetId) throw new Error('Create delivery audio first.')
  const asset = await getAsset(delivery.localAssetId)
  if (!asset?.blob) throw new Error('Delivery blob was not found. Recreate delivery audio.')

  setPanelStatus(panel, 'Uploading compressed delivery audio…', 'info')
  const media = await uploadMedia({
    blob: asset.blob,
    project,
    rendered,
    role: 'delivery',
    filename: delivery.filename || asset.filename || 'audiolab-delivery.webm',
    mimeType: delivery.mimeType || asset.mimeType || 'audio/webm',
    duration: delivery.duration || asset.duration || rendered.duration || 0,
    codec: delivery.codec || '',
    bitrateKbps: delivery.bitrateKbps || '',
    sourceMediaId: rendered.master?.mediaId || rendered.mediaId || '',
  })

  const nextDelivery = {
    ...delivery,
    mediaId: media.mediaId || media.id || delivery.mediaId || '',
    filename: media.filename || delivery.filename || asset.filename,
    mimeType: media.mimeType || delivery.mimeType || asset.mimeType,
    size: Number(media.size || delivery.size || asset.size || 0),
    duration: Number(media.duration || delivery.duration || asset.duration || 0),
    publicUrl: media.publicUrl,
    storageKey: media.storageKey || '',
    codec: media.codec || delivery.codec || '',
    bitrateKbps: media.bitrateKbps || delivery.bitrateKbps || '',
    uploadedAt: new Date().toISOString(),
    status: 'uploaded',
  }
  const nextRendered = {
    ...rendered,
    delivery: nextDelivery,
    preferredPublicUrl: nextDelivery.publicUrl,
    preferredMimeType: nextDelivery.mimeType,
    preferredFileSize: nextDelivery.size,
    publicUrl: nextDelivery.publicUrl,
    url: nextDelivery.publicUrl,
    mimeType: nextDelivery.mimeType,
    size: nextDelivery.size,
    duration: nextDelivery.duration,
    status: 'uploaded',
    uploadedAt: nextDelivery.uploadedAt,
  }

  await saveProject({
    ...project,
    renderedEpisode: nextRendered,
    episode: {
      ...(project.episode || {}),
      audioStatus: 'public-delivery',
      updatedAt: new Date().toISOString(),
    },
  })
  setPanelStatus(panel, 'Delivery audio uploaded. Reloading so Attach/update podcast draft uses the compressed public URL.', 'success')
  window.setTimeout(() => window.location.reload(), 900)
}

function readiness(project) {
  const rendered = normalizeRenderedEpisode(project || {})
  const episode = project?.episode || {}
  const checks = [
    ['Title', Boolean(episode.title || project?.title)],
    ['Slug', Boolean(episode.slug || episode.title || project?.title)],
    ['Description or show notes', Boolean(episode.description)],
    ['Public audio URL', Boolean(rendered?.preferredPublicUrl || rendered?.publicUrl) && !String(rendered?.preferredPublicUrl || rendered?.publicUrl).startsWith('audiolab-local://')],
    ['MIME type', Boolean(rendered?.preferredMimeType || rendered?.mimeType)],
    ['File size', Number(rendered?.preferredFileSize || rendered?.size || 0) > 0],
    ['Duration', Number(rendered?.duration || rendered?.master?.duration || 0) > 0],
    ['Explicit flag set', typeof episode.explicit !== 'undefined'],
    ['Compressed delivery', Boolean(rendered?.delivery?.publicUrl)],
    ['Transcript present', Boolean(project?.transcript?.text || project?.transcript?.cues?.length)],
  ]
  const missingCritical = checks.filter(([label, ok]) => !ok && ['Public audio URL', 'MIME type', 'File size', 'Duration'].includes(label))
  const warnings = checks.filter(([, ok]) => !ok)
  return { checks, status: missingCritical.length ? 'Not ready' : warnings.length ? 'Ready with warnings' : 'Ready' }
}

async function runDeliveryChecks(panel) {
  const project = await getActiveProject()
  const rendered = normalizeRenderedEpisode(project || {})
  const url = rendered?.preferredPublicUrl || rendered?.publicUrl || ''
  if (!url) throw new Error('No public audio URL yet.')
  const response = await fetch(url, { method: 'HEAD' }).catch(() => null)
  if (!response || !response.ok) throw new Error(`Public URL check failed${response ? `: ${response.status}` : ''}`)
  const rss = await fetch('/rss/podcast.xml', { method: 'GET' }).catch(() => null)
  if (!rss || !rss.ok) throw new Error(`RSS check failed${rss ? `: ${rss.status}` : ''}`)
  setPanelStatus(panel, `Delivery checks passed. Content-Type: ${response.headers.get('content-type') || 'unknown'} · Length: ${response.headers.get('content-length') || 'unknown'}`, 'success')
}

function ensurePhase8Panel(renderedPanel) {
  if (document.querySelector('[data-audiolab-phase8-panel]')) return
  const panel = document.createElement('section')
  panel.className = 'audio-lab-panel audio-lab-phase8-panel'
  panel.dataset.audiolabPhase8Panel = '1'
  panel.innerHTML = `
    <p class="audio-lab-eyebrow">Delivery</p>
    <h2>Podcast delivery</h2>
    <p class="description">Create a compressed delivery file for RSS. WAV remains the master, because apparently one file cannot be both archival and merciful to bandwidth.</p>
    <label class="audio-lab-field"><span>Delivery format</span><select data-audiolab-delivery-format></select></label>
    <div class="audio-lab-edit-actions">
      <button type="button" class="button" data-audiolab-create-delivery>Create delivery audio</button>
      <button type="button" class="button button--primary" data-audiolab-upload-delivery>Upload delivery audio</button>
      <button type="button" class="button" data-audiolab-copy-delivery>Copy public URL</button>
      <button type="button" class="button" data-audiolab-open-rss>Open RSS</button>
      <button type="button" class="button" data-audiolab-run-checks>Run delivery checks</button>
    </div>
    <div class="audio-lab-feed-readiness" data-audiolab-feed-readiness></div>
  `
  renderedPanel.insertAdjacentElement('afterend', panel)

  const select = panel.querySelector('[data-audiolab-delivery-format]')
  const formats = supportedFormats()
  select.innerHTML = formats.length
    ? formats.map((format) => `<option value="${format.id}">${format.label} · ${format.bitrateKbps} kbps</option>`).join('')
    : '<option value="">No compressed browser encoder available</option>'

  panel.querySelector('[data-audiolab-create-delivery]').addEventListener('click', async () => {
    try { await createDelivery(panel, select.value) } catch (error) { setPanelStatus(panel, error.message || 'Unable to create delivery audio.', 'error') }
  })
  panel.querySelector('[data-audiolab-upload-delivery]').addEventListener('click', async () => {
    try { await uploadDelivery(panel) } catch (error) { setPanelStatus(panel, error.message || 'Unable to upload delivery audio.', 'error') }
  })
  panel.querySelector('[data-audiolab-copy-delivery]').addEventListener('click', async () => {
    const project = await getActiveProject()
    const rendered = normalizeRenderedEpisode(project || {})
    const url = rendered?.preferredPublicUrl || rendered?.publicUrl || ''
    if (!url) return setPanelStatus(panel, 'No public delivery URL yet.', 'warn')
    await navigator.clipboard?.writeText?.(url)
    setPanelStatus(panel, 'Public delivery URL copied.', 'success')
  })
  panel.querySelector('[data-audiolab-open-rss]').addEventListener('click', () => window.open('/rss/podcast.xml', '_blank', 'noopener,noreferrer'))
  panel.querySelector('[data-audiolab-run-checks]').addEventListener('click', async () => {
    try { await runDeliveryChecks(panel) } catch (error) { setPanelStatus(panel, error.message || 'Delivery checks failed.', 'error') }
  })
}

async function refreshReadiness() {
  const panel = document.querySelector('[data-audiolab-phase8-panel]')
  const target = panel?.querySelector('[data-audiolab-feed-readiness]')
  if (!panel || !target) return
  const project = await getActiveProject()
  const rendered = normalizeRenderedEpisode(project || {})
  if (project?.renderedEpisode && JSON.stringify(project.renderedEpisode) !== JSON.stringify(rendered)) {
    await saveProject({ ...project, renderedEpisode: rendered })
  }
  const info = readiness(project)
  target.innerHTML = `
    <p class="audio-lab-eyebrow">Feed readiness</p>
    <strong>${info.status}</strong>
    <ul>${info.checks.map(([label, ok]) => `<li class="${ok ? 'is-ready' : 'is-warning'}">${ok ? '✓' : '•'} ${label}</li>`).join('')}</ul>
  `
}

function enhanceAudioLabPhase8() {
  const renderedPanel = document.querySelector('.audio-lab-rendered-panel')
  if (!renderedPanel) return
  ensurePhase8Panel(renderedPanel)
  refreshReadiness().catch(() => {})
}

if (shouldRunAudioLabPhase8()) {
  window.addEventListener('load', enhanceAudioLabPhase8)
  const observer = new MutationObserver(enhanceAudioLabPhase8)
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
