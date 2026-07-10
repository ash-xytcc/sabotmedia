const DB_NAME = 'sabotpress-audiolab-v1'
const DB_VERSION = 1
const PROJECT_STORE = 'projects'
const ASSET_STORE = 'audioAssets'

function shouldRunAudioLabBridge() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  return /\/audiolab(?:\/|$)/.test(window.location.pathname)
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

async function saveProject(project) {
  return withStore(PROJECT_STORE, 'readwrite', (store) => requestToPromise(store.put({ ...project, updatedAt: new Date().toISOString() })))
}

function getActiveProjectTitle() {
  return document.querySelector('.audio-lab-project-card.is-active strong')?.textContent?.trim() || ''
}

async function getActiveProject() {
  const projects = await listProjects()
  const normalized = Array.isArray(projects) ? projects : []
  const activeTitle = getActiveProjectTitle()
  const candidates = normalized
    .filter((project) => project?.renderedEpisode)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())

  if (activeTitle) {
    const exact = candidates.find((project) => String(project.title || 'Untitled AudioLab Project').trim() === activeTitle)
    if (exact) return exact
  }

  return candidates[0] || null
}

function renderedAssetId(rendered = {}) {
  return String(rendered.localAssetId || rendered.assetId || (String(rendered.url || '').startsWith('audiolab-local://') ? String(rendered.url).replace('audiolab-local://', '') : '') || rendered.mediaId || '')
}

function setStatus(panel, message, type = 'info') {
  let node = panel.querySelector('.audio-lab-phase7-status')
  if (!node) {
    node = document.createElement('p')
    node.className = 'description audio-lab-phase7-status'
    panel.appendChild(node)
  }
  node.dataset.status = type
  node.textContent = message
}

function makeUploadButton(panel) {
  let actions = panel.querySelector('.audio-lab-phase7-actions')
  if (!actions) {
    actions = document.createElement('div')
    actions.className = 'audio-lab-edit-actions audio-lab-phase7-actions'
    panel.appendChild(actions)
  }

  if (!actions.querySelector('[data-audiolab-upload-render]')) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'button button--primary'
    button.dataset.audiolabUploadRender = '1'
    button.textContent = 'Upload rendered audio'
    button.addEventListener('click', () => uploadRenderedAudio(panel, button))
    actions.prepend(button)
  }

  if (!actions.querySelector('[data-audiolab-copy-url]')) {
    const copy = document.createElement('button')
    copy.type = 'button'
    copy.className = 'button'
    copy.dataset.audiolabCopyUrl = '1'
    copy.textContent = 'Copy public URL'
    copy.addEventListener('click', async () => {
      const project = await getActiveProject()
      const url = project?.renderedEpisode?.publicUrl || project?.renderedEpisode?.url || ''
      if (!url || url.startsWith('audiolab-local://')) {
        setStatus(panel, 'No public URL yet. Upload rendered audio first.', 'warn')
        return
      }
      await navigator.clipboard?.writeText?.(url)
      setStatus(panel, 'Public audio URL copied.', 'success')
    })
    actions.appendChild(copy)
  }

  if (!actions.querySelector('[data-audiolab-open-url]')) {
    const open = document.createElement('button')
    open.type = 'button'
    open.className = 'button'
    open.dataset.audiolabOpenUrl = '1'
    open.textContent = 'Open public URL'
    open.addEventListener('click', async () => {
      const project = await getActiveProject()
      const url = project?.renderedEpisode?.publicUrl || project?.renderedEpisode?.url || ''
      if (!url || url.startsWith('audiolab-local://')) {
        setStatus(panel, 'No public URL yet. Upload rendered audio first.', 'warn')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    })
    actions.appendChild(open)
  }
}

async function uploadRenderedAudio(panel, button) {
  try {
    button.disabled = true
    setStatus(panel, 'Uploading rendered audio…', 'info')

    const project = await getActiveProject()
    const rendered = project?.renderedEpisode
    if (!project || !rendered) throw new Error('No rendered episode found. Render final episode audio first.')

    const asset = await getAsset(renderedAssetId(rendered))
    if (!asset?.blob) throw new Error('Rendered WAV blob was not found in local AudioLab storage. Re-render the episode audio.')

    const filename = rendered.filename || asset.filename || `${project.id || 'audiolab'}-episode.wav`
    const file = new File([asset.blob], filename, { type: rendered.mimeType || asset.mimeType || 'audio/wav' })
    const form = new FormData()
    form.set('file', file, filename)
    form.set('projectId', project.id || '')
    form.set('title', project.episode?.title || project.title || filename)
    form.set('filename', filename)
    form.set('mimeType', rendered.mimeType || asset.mimeType || file.type || 'audio/wav')
    form.set('duration', String(rendered.duration || asset.duration || 0))

    const response = await fetch('/api/audiolab/media', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok || !data?.media?.publicUrl) {
      throw new Error(data?.error || `Upload failed: ${response.status}`)
    }

    const media = data.media
    const nextRendered = {
      ...rendered,
      mediaId: media.mediaId || media.id || rendered.mediaId,
      assetId: rendered.assetId || asset.id,
      localAssetId: rendered.localAssetId || asset.id,
      filename: media.filename || filename,
      mimeType: media.mimeType || rendered.mimeType || 'audio/wav',
      size: Number(media.size || rendered.size || asset.size || 0),
      duration: Number(media.duration || rendered.duration || asset.duration || 0),
      publicUrl: media.publicUrl,
      url: media.publicUrl,
      storageKey: media.storageKey || '',
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      source: 'audiolab-render',
      projectId: project.id || media.projectId || '',
    }

    await saveProject({
      ...project,
      renderedEpisode: nextRendered,
      episode: {
        ...(project.episode || {}),
        audioStatus: 'public',
        updatedAt: new Date().toISOString(),
      },
    })

    setStatus(panel, 'Uploaded. Reloading AudioLab so Attach/update podcast draft uses the public URL instead of the local bridge.', 'success')
    window.setTimeout(() => window.location.reload(), 900)
  } catch (error) {
    setStatus(panel, error.message || 'Upload failed.', 'error')
  } finally {
    button.disabled = false
  }
}

function enhanceAudioLab() {
  const panel = document.querySelector('.audio-lab-rendered-panel')
  if (!panel) return
  makeUploadButton(panel)
}

if (shouldRunAudioLabBridge()) {
  window.addEventListener('load', enhanceAudioLab)
  const observer = new MutationObserver(enhanceAudioLab)
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
