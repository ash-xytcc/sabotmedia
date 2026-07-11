import {
  getAudioLabAsset,
  getAudioLabProject,
  listAudioLabProjects,
  makeAudioLabId,
  saveAudioLabProject,
} from './lib/audioLabStore'

const TARGET_SAMPLE_RATE = 16000
const PREP_THRESHOLD_BYTES = 1024 * 1024 * 6
const TRANSCRIBE_RETRY_STATUSES = new Set([429, 502, 503, 504])
const preparedCache = new Map()

function isAudioLabRoute() {
  return typeof window !== 'undefined' && /\/wp-admin\/audiolab(?:\/|$)/.test(window.location.pathname)
}

function currentSearch() {
  return new URLSearchParams(window.location.search || '')
}

async function getActiveProject() {
  const params = currentSearch()
  const projectId = params.get('project') || ''
  const projects = await listAudioLabProjects()
  const project = projectId ? await getAudioLabProject(projectId) : projects[0]
  return project || projects[0] || null
}

function getRenderedLocalAssetId(rendered = {}) {
  return String(
    rendered?.delivery?.localAssetId ||
    rendered?.delivery?.assetId ||
    rendered?.master?.localAssetId ||
    rendered?.master?.assetId ||
    rendered?.localAssetId ||
    rendered?.assetId ||
    ''
  )
}

function getPublicAudioUrl(rendered = {}) {
  return String(rendered?.preferredPublicUrl || rendered?.delivery?.publicUrl || rendered?.master?.publicUrl || rendered?.publicUrl || '')
}

function chooseTranscriptionSource(project = {}) {
  const rendered = project.renderedEpisode || {}
  const renderedAssetId = getRenderedLocalAssetId(rendered)
  if (renderedAssetId) return { type: 'asset', id: renderedAssetId, label: 'Rendered episode audio' }
  const publicUrl = getPublicAudioUrl(rendered)
  if (publicUrl) return { type: 'url', url: publicUrl, label: 'Public rendered audio URL' }
  const episodeAssetId = project.episode?.audioAssetId || ''
  if (episodeAssetId) return { type: 'asset', id: episodeAssetId, label: 'Episode source audio' }
  const first = project.sourceAssets?.[0]
  if (first?.id) return { type: 'asset', id: first.id, label: first.filename || 'First source asset' }
  return null
}

function setStatus(shell, message) {
  const status = shell?.querySelector?.('#audio-lab-transcript-status')
  if (status) status.textContent = message
}

function toast(shell, message) {
  let note = shell?.querySelector?.('.audio-lab-task-toast')
  if (!note && shell) {
    note = document.createElement('div')
    note.className = 'audio-lab-task-toast'
    shell.appendChild(note)
  }
  if (!note) return
  note.textContent = message
  note.classList.add('is-visible')
  window.clearTimeout(toast.timer)
  toast.timer = window.setTimeout(() => note.classList.remove('is-visible'), 1800)
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function formatBytes(value = 0) {
  const bytes = Math.max(0, Number(value) || 0)
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

async function postTranscription(form, { label = 'audio', retries = 1 } = {}) {
  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch('/api/audiolab/transcribe', { method: 'POST', body: form })
    const text = await response.text()
    let data = null
    try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }

    if (response.ok && data?.ok) return data.transcript || {}

    const message = data?.error || `Transcription failed: ${response.status}`
    lastError = new Error(`${label}: ${message}`)
    lastError.status = response.status
    lastError.body = data

    if (!TRANSCRIBE_RETRY_STATUSES.has(response.status) || attempt >= retries) break
    await sleep(1200 * (attempt + 1))
  }

  throw lastError || new Error(`${label}: transcription failed`)
}

function makeBaseForm(project, language = '') {
  const form = new FormData()
  form.set('projectId', project.id)
  form.set('title', project.episode?.title || project.title || 'AudioLab episode')
  if (language) form.set('language', language)
  return form
}

async function getAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) throw new Error('This browser cannot prepare audio for faster transcription.')
  return new AudioContextCtor()
}

async function decodeBlob(blob) {
  const context = await getAudioContext()
  try {
    const bytes = await blob.arrayBuffer()
    return await context.decodeAudioData(bytes.slice(0))
  } finally {
    if (typeof context.close === 'function') {
      try { await context.close() } catch { /* ignore */ }
    }
  }
}

function sampleChannel(buffer, channelIndex, position) {
  const channel = buffer.getChannelData(Math.min(channelIndex, buffer.numberOfChannels - 1))
  const leftIndex = Math.max(0, Math.min(channel.length - 1, Math.floor(position)))
  const rightIndex = Math.max(0, Math.min(channel.length - 1, leftIndex + 1))
  const blend = position - leftIndex
  return channel[leftIndex] * (1 - blend) + channel[rightIndex] * blend
}

function downmixAndResample(buffer, targetRate = TARGET_SAMPLE_RATE) {
  const sourceRate = buffer.sampleRate || 44100
  const duration = buffer.duration || (buffer.length / sourceRate)
  const length = Math.max(1, Math.ceil(duration * targetRate))
  const output = new Float32Array(length)
  const channels = Math.max(1, buffer.numberOfChannels || 1)
  const ratio = sourceRate / targetRate

  for (let index = 0; index < length; index += 1) {
    const sourcePosition = index * ratio
    let mixed = 0
    for (let channel = 0; channel < channels; channel += 1) mixed += sampleChannel(buffer, channel, sourcePosition)
    output[index] = Math.max(-1, Math.min(1, mixed / channels))
  }

  return { samples: output, sampleRate: targetRate, duration }
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index))
}

function encodeMonoWav({ samples, sampleRate }) {
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const dataSize = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, bitDepth, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] || 0))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return new Blob([view], { type: 'audio/wav' })
}

function shouldPrepareForTranscription(audio = {}) {
  const mime = String(audio.mimeType || audio.blob?.type || '').toLowerCase()
  const name = String(audio.filename || '').toLowerCase()
  if (audio.blob?.size > PREP_THRESHOLD_BYTES) return true
  if (mime.includes('wav') || name.endsWith('.wav') || name.endsWith('.wave')) return true
  return false
}

async function prepareFastTranscriptionBlob(shell, audio) {
  if (!shouldPrepareForTranscription(audio)) return audio
  const cacheKey = `${audio.cacheKey || audio.filename || 'audio'}:${audio.blob.size}:${audio.blob.lastModified || ''}`
  if (preparedCache.has(cacheKey)) return preparedCache.get(cacheKey)

  setStatus(shell, `Preparing smaller mono transcript copy from ${formatBytes(audio.blob.size)} audio…`)
  const decoded = await decodeBlob(audio.blob)
  setStatus(shell, `Downmixing ${Math.round(decoded.duration || 0)}s to 16 kHz mono for faster transcription…`)
  const prepared = encodeMonoWav(downmixAndResample(decoded, TARGET_SAMPLE_RATE))
  const filename = `${String(audio.filename || 'interview').replace(/\.[^.]+$/, '')}-transcript-mono-16k.wav`
  const next = {
    ...audio,
    blob: prepared,
    filename,
    mimeType: 'audio/wav',
    prepared: true,
    originalSize: audio.blob.size,
  }
  preparedCache.set(cacheKey, next)
  setStatus(shell, `Prepared transcription copy: ${formatBytes(audio.blob.size)} → ${formatBytes(prepared.size)}.`)
  return next
}

async function resolveSourceBlob(project, source) {
  if (source.type === 'asset') {
    const stored = await getAudioLabAsset(source.id)
    if (!stored?.blob) throw new Error('Audio blob is missing locally. Render or re-import the audio first.')
    return {
      blob: stored.blob,
      filename: stored.filename || 'audiolab-audio',
      mimeType: stored.mimeType || stored.blob.type || 'audio/wav',
      cacheKey: `${project.id}:${source.id}`,
    }
  }

  if (source.type === 'url') {
    const response = await fetch(source.url)
    if (!response.ok) throw new Error(`Unable to fetch public audio for transcription: ${response.status}`)
    const blob = await response.blob()
    const url = new URL(source.url, window.location.origin)
    return {
      blob,
      filename: url.searchParams.get('filename') || 'audiolab-public-audio',
      mimeType: response.headers.get('content-type') || blob.type || 'audio/wav',
      cacheKey: source.url,
    }
  }

  throw new Error('No audio source available to transcribe.')
}

async function transcribeBlob({ project, blob, filename, mimeType, language, label }) {
  const form = makeBaseForm(project, language)
  form.set('filename', filename || 'audiolab-audio.wav')
  form.set('mimeType', mimeType || blob.type || 'audio/wav')
  form.set('file', blob, filename || 'audiolab-audio.wav')
  return postTranscription(form, { label, retries: 2 })
}

function normalizeTranscriptForSave(transcript = {}) {
  const cues = Array.isArray(transcript.cues) ? transcript.cues.map((cue) => ({
    id: String(cue.id || makeAudioLabId('cue')),
    start: Math.max(0, Number(cue.start || 0)),
    end: Math.max(0, Number(cue.end || cue.start || 0)),
    speaker: String(cue.speaker || ''),
    text: String(cue.text || ''),
  })).filter((cue) => cue.text.trim()) : []

  return {
    mode: cues.length ? 'timestamped' : 'plain',
    text: String(transcript.text || cues.map((cue) => cue.text).join(' ') || ''),
    cues,
    updatedAt: new Date().toISOString(),
    generatedAt: String(transcript.generatedAt || new Date().toISOString()),
    language: String(transcript.language || ''),
    provider: String(transcript.provider || ''),
    engine: String(transcript.engine || ''),
  }
}

async function runFastTranscription(shell, button, textarea) {
  const language = shell.querySelector('#audio-lab-transcript-language')?.value || ''
  const project = await getActiveProject()
  if (!project) throw new Error('No AudioLab project is open.')
  const source = chooseTranscriptionSource(project)
  if (!source) throw new Error('No rendered or source audio available to transcribe.')

  button.disabled = true
  button.textContent = 'Preparing…'
  setStatus(shell, 'Loading audio for fast transcription…')

  const rawAudio = await resolveSourceBlob(project, source)
  const audio = await prepareFastTranscriptionBlob(shell, rawAudio)

  button.textContent = 'Transcribing…'
  setStatus(shell, `${audio.prepared ? 'Sending prepared mono transcript copy' : 'Sending original audio'} (${formatBytes(audio.blob.size)}) to transcription provider…`)
  const transcript = await transcribeBlob({
    project,
    blob: audio.blob,
    filename: audio.filename,
    mimeType: audio.mimeType,
    language,
    label: audio.prepared ? 'Prepared transcription audio' : 'Audio',
  })

  const nextTranscript = normalizeTranscriptForSave(transcript || {})
  const saved = await saveAudioLabProject({ ...project, transcript: nextTranscript })
  if (textarea) textarea.value = nextTranscript.text || ''
  setStatus(shell, `Transcript created with ${nextTranscript.cues.length} timestamped cues. Fast saveback complete.`)
  toast(shell, `Auto transcript saved for ${saved.title || 'AudioLab project'}.`)
  window.dispatchEvent(new Event('audiolab-task-navigation'))
}

function handleTranscribeClick(event) {
  if (!isAudioLabRoute()) return
  const button = event.target?.closest?.('#audio-lab-transcribe-run')
  if (!button) return
  const shell = button.closest('.audio-lab-task-shell')
  if (!shell) return
  const textarea = shell.querySelector('#audio-lab-transcript-text')

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  runFastTranscription(shell, button, textarea).catch((error) => {
    setStatus(shell, error.message || 'Automatic transcription failed.')
    toast(shell, error.message || 'Automatic transcription failed.')
  }).finally(() => {
    button.disabled = false
    button.textContent = 'Auto transcribe audio'
  })
}

window.addEventListener('click', handleTranscribeClick, true)
