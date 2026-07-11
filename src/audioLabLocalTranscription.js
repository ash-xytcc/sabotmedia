import {
  getAudioLabAsset,
  getAudioLabProject,
  listAudioLabProjects,
  makeAudioLabId,
  saveAudioLabProject,
} from './lib/audioLabStore'

const TRANSFORMERS_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2'
const DEFAULT_EN_MODEL = 'Xenova/whisper-tiny.en'
const DEFAULT_MULTI_MODEL = 'Xenova/whisper-tiny'
const TARGET_SAMPLE_RATE = 16000
const LOCAL_CHUNK_SECONDS = 20
const PARTIAL_SAVE_EVERY_CHUNKS = 2

let transformersPromise = null
const pipelineCache = new Map()
let activeRunId = ''

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

function statusElement(shell) {
  return shell?.querySelector?.('#audio-lab-transcript-status') || null
}

function setStatus(shell, message) {
  const status = statusElement(shell)
  if (status) status.textContent = String(message || '')
}

function toast(shell, message) {
  let note = shell?.querySelector?.('.audio-lab-task-toast')
  if (!note && shell) {
    note = document.createElement('div')
    note.className = 'audio-lab-task-toast'
    shell.appendChild(note)
  }
  if (!note) return
  note.textContent = String(message || '')
  note.classList.add('is-visible')
  window.clearTimeout(toast.timer)
  toast.timer = window.setTimeout(() => note.classList.remove('is-visible'), 2200)
}

function sleep(ms = 0) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function formatBytes(value = 0) {
  const bytes = Math.max(0, Number(value) || 0)
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatDuration(seconds = 0) {
  const safe = Math.max(0, Number(seconds) || 0)
  const mins = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function pickModel(language = '') {
  const normalized = String(language || '').trim().toLowerCase()
  if (!normalized || normalized === 'en' || normalized === 'en-us' || normalized === 'english') return DEFAULT_EN_MODEL
  return DEFAULT_MULTI_MODEL
}

async function loadTransformers(shell) {
  if (!transformersPromise) {
    transformersPromise = import(/* @vite-ignore */ TRANSFORMERS_MODULE_URL).then((mod) => {
      if (mod?.env) {
        mod.env.allowLocalModels = false
        mod.env.useBrowserCache = true
      }
      return mod
    })
  }
  setStatus(shell, 'Loading local transcription engine. First run downloads the tiny Whisper model into browser cache. Free, but not magic, because apparently we still live here.')
  return transformersPromise
}

async function getTranscriber(shell, language = '') {
  const model = pickModel(language)
  if (pipelineCache.has(model)) return pipelineCache.get(model)
  const { pipeline } = await loadTransformers(shell)
  const promise = pipeline('automatic-speech-recognition', model, {
    quantized: true,
    progress_callback: (progress) => {
      const status = progress?.status || ''
      const file = progress?.file ? ` ${progress.file}` : ''
      const pct = Number.isFinite(progress?.progress) ? ` ${Math.round(progress.progress)}%` : ''
      if (status) setStatus(shell, `Loading local Whisper model:${file}${pct}`)
    },
  })
  pipelineCache.set(model, promise)
  return promise
}

async function resolveSourceBlob(project, source) {
  if (source.type === 'asset') {
    const stored = await getAudioLabAsset(source.id)
    if (!stored?.blob) throw new Error('Audio blob is missing locally. Render or re-import the audio first.')
    return {
      blob: stored.blob,
      filename: stored.filename || 'audiolab-audio',
      mimeType: stored.mimeType || stored.blob.type || 'audio/wav',
      label: source.label || stored.filename || 'Audio source',
    }
  }

  if (source.type === 'url') {
    const response = await fetch(source.url)
    if (!response.ok) throw new Error(`Unable to fetch public audio for local transcription: ${response.status}`)
    const blob = await response.blob()
    const url = new URL(source.url, window.location.origin)
    return {
      blob,
      filename: url.searchParams.get('filename') || 'audiolab-public-audio',
      mimeType: response.headers.get('content-type') || blob.type || 'audio/wav',
      label: source.label || 'Public audio URL',
    }
  }

  throw new Error('No audio source available to transcribe.')
}

async function decodeBlob(blob) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) throw new Error('This browser cannot decode audio for local transcription.')
  const context = new AudioContextCtor()
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
  const samples = new Float32Array(length)
  const channels = Math.max(1, buffer.numberOfChannels || 1)
  const ratio = sourceRate / targetRate

  for (let index = 0; index < length; index += 1) {
    const sourcePosition = index * ratio
    let mixed = 0
    for (let channel = 0; channel < channels; channel += 1) mixed += sampleChannel(buffer, channel, sourcePosition)
    samples[index] = Math.max(-1, Math.min(1, mixed / channels))
  }

  return { samples, sampleRate: targetRate, duration }
}

function makeLocalChunks({ samples, sampleRate, duration }) {
  const chunkFrames = Math.max(1, Math.floor(LOCAL_CHUNK_SECONDS * sampleRate))
  const chunks = []
  for (let startFrame = 0; startFrame < samples.length; startFrame += chunkFrames) {
    const endFrame = Math.min(samples.length, startFrame + chunkFrames)
    const offset = startFrame / sampleRate
    chunks.push({
      index: chunks.length,
      offset,
      duration: (endFrame - startFrame) / sampleRate,
      samples: samples.slice(startFrame, endFrame),
      totalDuration: duration,
    })
  }
  return chunks
}

function normalizeChunks(result = {}, offset = 0) {
  const chunks = Array.isArray(result.chunks) ? result.chunks : []
  return chunks.map((chunk, index) => {
    const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : []
    const start = Number(timestamp[0] ?? chunk.start ?? 0)
    const end = Number(timestamp[1] ?? chunk.end ?? start)
    const text = String(chunk.text || chunk.chunk || '').trim()
    if (!text) return null
    return {
      id: makeAudioLabId('cue'),
      start: Math.max(0, (Number.isFinite(start) ? start : 0) + offset),
      end: Math.max(0, (Number.isFinite(end) ? end : start) + offset),
      speaker: '',
      text,
      order: index,
    }
  }).filter(Boolean)
}

function normalizeTranscriptForSave({ textParts = [], cues = [], language = '', partial = false } = {}) {
  const cleanTextParts = textParts.map((part) => String(part || '').trim()).filter(Boolean)
  const cleanCues = cues.filter((cue) => String(cue.text || '').trim())
  return {
    mode: cleanCues.length ? 'timestamped' : 'plain',
    text: cleanTextParts.join('\n\n'),
    cues: cleanCues,
    language: String(language || ''),
    provider: 'browser-local',
    engine: partial ? 'transformers.js-whisper-tiny-local-chunked-partial' : 'transformers.js-whisper-tiny-local-chunked',
    updatedAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
  }
}

async function savePartialTranscript(project, transcript, textarea, shell, chunkIndex, totalChunks) {
  await saveAudioLabProject({ ...project, transcript })
  if (textarea) textarea.value = transcript.text || ''
  setStatus(shell, `Saved local partial transcript after chunk ${chunkIndex}/${totalChunks}. Keep the tab open, because naturally browsers hate responsibility.`)
}

async function runLocalTranscription(shell, button, textarea) {
  const runId = makeAudioLabId('local-transcribe')
  activeRunId = runId
  const language = shell.querySelector('#audio-lab-transcript-language')?.value || ''
  const project = await getActiveProject()
  if (!project) throw new Error('No AudioLab project is open.')
  const source = chooseTranscriptionSource(project)
  if (!source) throw new Error('No rendered or source audio available to transcribe.')

  button.disabled = true
  button.textContent = 'Preparing local…'
  setStatus(shell, 'Loading audio for local browser transcription. No OpenAI. No Cloudflare AI. Your browser is doing the job, which is both noble and annoying.')

  const rawAudio = await resolveSourceBlob(project, source)
  setStatus(shell, `Decoding ${rawAudio.label || rawAudio.filename} (${formatBytes(rawAudio.blob.size)}) locally…`)
  await sleep(20)
  const decoded = await decodeBlob(rawAudio.blob)

  setStatus(shell, `Preparing ${formatDuration(decoded.duration || 0)} of mono 16 kHz audio for local Whisper…`)
  await sleep(20)
  const prepared = downmixAndResample(decoded, TARGET_SAMPLE_RATE)
  const chunks = makeLocalChunks(prepared)

  button.textContent = 'Loading model…'
  const transcriber = await getTranscriber(shell, language)

  const textParts = []
  const cues = []
  button.textContent = `Local 0/${chunks.length}`
  setStatus(shell, `Running local Whisper in ${chunks.length} browser chunks of about ${LOCAL_CHUNK_SECONDS}s. Slow, but no provider bill and no 230-request clown ritual.`)
  await sleep(50)

  for (let index = 0; index < chunks.length; index += 1) {
    if (activeRunId !== runId) throw new Error('Local transcription was interrupted by a newer run.')
    const chunk = chunks[index]
    button.textContent = `Local ${index + 1}/${chunks.length}`
    setStatus(shell, `Local chunk ${index + 1}/${chunks.length}: ${formatDuration(chunk.offset)}–${formatDuration(chunk.offset + chunk.duration)}. Keep this tab awake.`)
    await sleep(20)

    const result = await transcriber(chunk.samples, {
      sampling_rate: prepared.sampleRate,
      chunk_length_s: Math.min(LOCAL_CHUNK_SECONDS, Math.max(5, chunk.duration)),
      stride_length_s: 0,
      return_timestamps: true,
      task: 'transcribe',
      language: language || undefined,
    })

    const chunkText = String(result?.text || '').trim()
    if (chunkText) textParts.push(chunkText)
    cues.push(...normalizeChunks(result || {}, chunk.offset))

    const isSavePoint = (index + 1) % PARTIAL_SAVE_EVERY_CHUNKS === 0 || index === chunks.length - 1
    if (isSavePoint) {
      const partialTranscript = normalizeTranscriptForSave({ textParts, cues, language, partial: index !== chunks.length - 1 })
      await savePartialTranscript(project, partialTranscript, textarea, shell, index + 1, chunks.length)
    }
  }

  const nextTranscript = normalizeTranscriptForSave({ textParts, cues, language, partial: false })
  const saved = await saveAudioLabProject({ ...project, transcript: nextTranscript })
  if (textarea) textarea.value = nextTranscript.text || ''
  setStatus(shell, `Local transcript saved with ${nextTranscript.cues.length} timestamped cues. Engine: browser-local Whisper tiny, chunked.`)
  toast(shell, `Local transcript saved for ${saved.title || 'AudioLab project'}.`)
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

  runLocalTranscription(shell, button, textarea).catch((error) => {
    setStatus(shell, error.message || 'Local automatic transcription failed.')
    toast(shell, error.message || 'Local automatic transcription failed.')
  }).finally(() => {
    button.disabled = false
    button.textContent = 'Auto transcribe audio'
  })
}

window.addEventListener('click', handleTranscribeClick, true)
