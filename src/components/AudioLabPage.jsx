import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { adminRoutes } from '../routing/routes'
import {
  createEmptyAudioLabProject,
  formatAudioLabDuration,
  getAudioLabAsset,
  getAudioLabProject,
  listAudioLabProjects,
  makeSingleTrackForAsset,
  putAudioLabAssetFromBlob,
  putAudioLabAssetFromFile,
  saveAudioLabProject,
  slugifyAudioLab,
} from '../lib/audioLabStore'
import {
  clampAudioTime,
  encodeWav,
  getEditsForAsset,
  makeAudioDownloadName,
  makeAudioEditOperation,
  normalizeAudioSelection,
  renderAudioEditGraph,
} from '../lib/audioLabRender'
import {
  createEmptyNativeEntry,
  loadNativeCollection,
  upsertNativeEntryWithMeta,
} from '../lib/nativePublicContent'

const waveformPeakCount = 1100
const preferredRecordingMimeTypes = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

function getAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) throw new Error('This browser does not support Web Audio decoding')
  return new AudioContextCtor()
}

async function decodeAudioBlob(blob) {
  const context = getAudioContext()
  try {
    const arrayBuffer = await blob.arrayBuffer()
    return await context.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    if (typeof context.close === 'function') {
      try {
        await context.close()
      } catch {
        // Some browsers keep short-lived contexts open. Very helpful. Very normal.
      }
    }
  }
}

function buildWaveformPeaks(audioBuffer, peakCount = waveformPeakCount) {
  if (!audioBuffer?.length) return []

  const channels = Math.max(1, audioBuffer.numberOfChannels || 1)
  const samplesPerPeak = Math.max(1, Math.floor(audioBuffer.length / peakCount))
  const peaks = []

  for (let peakIndex = 0; peakIndex < peakCount; peakIndex += 1) {
    const start = peakIndex * samplesPerPeak
    const end = Math.min(audioBuffer.length, start + samplesPerPeak)
    const scanStep = Math.max(1, Math.floor((end - start) / 80))
    let max = 0

    for (let channel = 0; channel < channels; channel += 1) {
      const data = audioBuffer.getChannelData(channel)
      for (let index = start; index < end; index += scanStep) {
        const value = Math.abs(data[index] || 0)
        if (value > max) max = value
      }
    }

    peaks.push(Math.min(1, max))
  }

  return peaks
}

function formatBytes(size = 0) {
  const bytes = Number(size || 0)
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function shortDate(value = '') {
  const date = new Date(String(value || ''))
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function textToHtml(text = '') {
  return String(text || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('\n')
}

function canUseRecorder() {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof window.navigator !== 'undefined' &&
    typeof window.navigator.mediaDevices?.getUserMedia === 'function'
  )
}

function getPreferredRecordingMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return ''
  return preferredRecordingMimeTypes.find((mimeType) => {
    if (typeof window.MediaRecorder.isTypeSupported !== 'function') return false
    return window.MediaRecorder.isTypeSupported(mimeType)
  }) || ''
}

function getRecordingExtension(mimeType = '') {
  const value = String(mimeType || '').toLowerCase()
  if (value.includes('ogg')) return 'ogg'
  if (value.includes('mp4')) return 'm4a'
  if (value.includes('mpeg')) return 'mp3'
  if (value.includes('wav')) return 'wav'
  return 'webm'
}

function makeRecordingFilename(mimeType = '') {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-')
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}`
  return `audiolab-take-${stamp}-${time}.${getRecordingExtension(mimeType)}`
}

function getRecordingStatusLabel(status = '') {
  return {
    idle: 'Idle',
    requesting: 'Requesting mic',
    recording: 'Recording',
    paused: 'Paused',
    saving: 'Saving take',
    ready: 'Ready',
    error: 'Error',
  }[status] || 'Idle'
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function WaveformCanvas({
  peaks,
  duration,
  currentTime,
  selectionStart,
  selectionEnd,
  onSeek,
  onSelectionChange,
  isLoading,
}) {
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  function timeFromEvent(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const pct = (event.clientX - rect.left) / Math.max(1, rect.width)
    return clampAudioTime(pct * (duration || 0), duration || 0)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0

    function draw() {
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(720, Math.floor(rect.width || 720))
      const height = Math.max(220, Math.floor(rect.height || 220))
      const ratio = window.devicePixelRatio || 1
      const context = canvas.getContext('2d')

      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)

      context.fillStyle = '#101820'
      context.fillRect(0, 0, width, height)

      const mid = height / 2
      const topPad = 24
      const bottomPad = 24
      const usable = height - topPad - bottomPad

      context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(0, mid)
      context.lineTo(width, mid)
      context.stroke()

      if (!peaks?.length) {
        context.fillStyle = 'rgba(255,255,255,0.72)'
        context.font = '600 14px system-ui, sans-serif'
        context.textAlign = 'center'
        context.fillText(isLoading ? 'Rendering waveform…' : 'Import or record audio to generate waveform', width / 2, mid)
        return
      }

      const barWidth = Math.max(1, width / peaks.length)
      context.fillStyle = '#72aee6'
      peaks.forEach((peak, index) => {
        const x = index * barWidth
        const barHeight = Math.max(1, peak * usable * 0.5)
        context.fillRect(x, mid - barHeight, Math.max(1, barWidth * 0.72), barHeight * 2)
      })

      const selection = normalizeAudioSelection(selectionStart, selectionEnd, duration)
      if (selection.hasSelection) {
        const x1 = (selection.start / Math.max(1, duration || 1)) * width
        const x2 = (selection.end / Math.max(1, duration || 1)) * width
        context.fillStyle = 'rgba(240, 195, 60, 0.22)'
        context.fillRect(x1, 0, Math.max(2, x2 - x1), height)
        context.strokeStyle = 'rgba(240, 195, 60, 0.88)'
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(x1, 0)
        context.lineTo(x1, height)
        context.moveTo(x2, 0)
        context.lineTo(x2, height)
        context.stroke()
      }

      const progress = duration ? Math.max(0, Math.min(1, currentTime / duration)) : 0
      const progressX = progress * width

      context.fillStyle = 'rgba(255, 255, 255, 0.11)'
      context.fillRect(0, 0, progressX, height)

      context.strokeStyle = '#f0c33c'
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(progressX, 0)
      context.lineTo(progressX, height)
      context.stroke()
    }

    frame = window.requestAnimationFrame(draw)
    window.addEventListener('resize', draw)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', draw)
    }
  }, [peaks, duration, currentTime, selectionStart, selectionEnd, isLoading])

  return (
    <canvas
      ref={canvasRef}
      className="audio-lab-waveform"
      role="img"
      aria-label="Audio waveform timeline"
      onPointerDown={(event) => {
        if (!duration) return
        event.currentTarget.setPointerCapture?.(event.pointerId)
        const start = timeFromEvent(event)
        dragRef.current = { start, moved: false }
        onSelectionChange?.(start, start)
      }}
      onPointerMove={(event) => {
        if (!dragRef.current || !duration) return
        const next = timeFromEvent(event)
        if (Math.abs(next - dragRef.current.start) > 0.03) dragRef.current.moved = true
        onSelectionChange?.(dragRef.current.start, next)
      }}
      onPointerUp={(event) => {
        if (!dragRef.current || !duration) return
        const drag = dragRef.current
        const end = timeFromEvent(event)
        dragRef.current = null
        event.currentTarget.releasePointerCapture?.(event.pointerId)

        if (!drag.moved || Math.abs(end - drag.start) < 0.03) {
          onSelectionChange?.(0, 0)
          onSeek?.(drag.start)
          return
        }

        onSelectionChange?.(drag.start, end)
      }}
    />
  )
}

function ProjectSidebar({ projects, activeProjectId, onNewProject, onOpenProject }) {
  return (
    <aside className="audio-lab-sidebar" aria-label="AudioLab projects">
      <div className="audio-lab-sidebar__header">
        <div>
          <p className="audio-lab-eyebrow">Projects</p>
          <h2>AudioLab</h2>
        </div>
        <button type="button" className="button button--primary" onClick={onNewProject}>New</button>
      </div>

      <div className="audio-lab-project-list">
        {projects.length ? projects.map((project) => (
          <button
            type="button"
            key={project.id}
            className={`audio-lab-project-card${project.id === activeProjectId ? ' is-active' : ''}`}
            onClick={() => onOpenProject(project.id)}
          >
            <strong>{project.title || 'Untitled AudioLab Project'}</strong>
            <span>{project.sourceAssets?.[0]?.filename || 'No source audio yet'}</span>
            <small>{shortDate(project.updatedAt)}</small>
          </button>
        )) : (
          <p className="audio-lab-empty">No projects yet. Import, record, or create a new project.</p>
        )}
      </div>
    </aside>
  )
}

function RecordPanel({
  canRecord,
  recordStatus,
  recordMimeType,
  recordElapsed,
  recordLevel,
  canPauseRecording,
  onStart,
  onPause,
  onResume,
  onStop,
}) {
  const isRecording = recordStatus === 'recording'
  const isPaused = recordStatus === 'paused'
  const isBusy = recordStatus === 'requesting' || recordStatus === 'saving'
  const levelPct = `${Math.round(Math.max(0, Math.min(1, recordLevel || 0)) * 100)}%`

  return (
    <section className="audio-lab-record-panel" aria-label="Audio recording controls">
      <div className="audio-lab-record-panel__meta">
        <p className="audio-lab-eyebrow">Record</p>
        <strong>{getRecordingStatusLabel(recordStatus)}</strong>
        <span>{formatAudioLabDuration(recordElapsed)}</span>
        <small>{recordMimeType || 'Recorder will choose the best supported format.'}</small>
      </div>

      <div className="audio-lab-record-meter" aria-label="Live microphone level">
        <span style={{ width: levelPct }} />
      </div>

      <div className="audio-lab-record-actions">
        <button type="button" className="button button--primary" onClick={onStart} disabled={!canRecord || isBusy || isRecording || isPaused}>
          {recordStatus === 'ready' ? 'Record Another Take' : 'Record'}
        </button>
        <button type="button" className="button" onClick={onPause} disabled={!canPauseRecording || !isRecording}>Pause</button>
        <button type="button" className="button" onClick={onResume} disabled={!canPauseRecording || !isPaused}>Resume</button>
        <button type="button" className="button" onClick={onStop} disabled={!isRecording && !isPaused}>Stop</button>
      </div>

      {!canRecord ? <p className="description audio-lab-record-warning">This browser does not support MediaRecorder microphone capture.</p> : null}
      <p className="description audio-lab-record-local-note">Recordings are saved locally in this browser for now. Server upload/export comes later, because audio files like being heavy little bricks.</p>
    </section>
  )
}

function SelectionToolbar({
  selection,
  duration,
  edits,
  redoStack,
  isRendering,
  hasAudio,
  onSelectionChange,
  onClear,
  onSelectAll,
  onEdit,
  onUndo,
  onRedo,
  onExport,
}) {
  const hasSelection = selection.hasSelection

  return (
    <section className="audio-lab-selection-toolbar" aria-label="Single-track edit controls">
      <div className="audio-lab-selection-readout">
        <label>
          <span>Start</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={selection.start.toFixed(2)}
            disabled={!hasAudio}
            onChange={(event) => onSelectionChange(Number(event.target.value), selection.end)}
          />
        </label>
        <label>
          <span>End</span>
          <input
            type="number"
            min="0"
            max={duration || 0}
            step="0.01"
            value={selection.end.toFixed(2)}
            disabled={!hasAudio}
            onChange={(event) => onSelectionChange(selection.start, Number(event.target.value))}
          />
        </label>
        <div className="audio-lab-selection-duration">
          <span>Duration</span>
          <strong>{formatAudioLabDuration(selection.duration)}</strong>
        </div>
      </div>

      <div className="audio-lab-edit-actions">
        <button type="button" className="button" onClick={onSelectAll} disabled={!hasAudio}>Select All</button>
        <button type="button" className="button" onClick={onClear} disabled={!hasAudio}>Clear Selection</button>
        <button type="button" className="button" onClick={() => onEdit('trim')} disabled={!hasSelection || isRendering}>Trim</button>
        <button type="button" className="button" onClick={() => onEdit('delete')} disabled={!hasSelection || isRendering}>Delete</button>
        <button type="button" className="button" onClick={() => onEdit('silence')} disabled={!hasSelection || isRendering}>Silence</button>
        <button type="button" className="button" onClick={onUndo} disabled={!edits.length || isRendering}>Undo</button>
        <button type="button" className="button" onClick={onRedo} disabled={!redoStack.length || isRendering}>Redo</button>
        <button type="button" className="button button--primary" onClick={onExport} disabled={!hasAudio || isRendering}>Export WAV</button>
      </div>

      <p className="description audio-lab-edit-note">Edits are non-destructive. Original source is preserved. The preview is rendered from JSON edit operations, because eating the master file would be barbarism with a progress bar.</p>
    </section>
  )
}

export function AudioLabPage() {
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)
  const activeProjectRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingStreamRef = useRef(null)
  const recordingChunksRef = useRef([])
  const recordingAudioContextRef = useRef(null)
  const recordingSourceRef = useRef(null)
  const recordingAnalyserRef = useRef(null)
  const recordingAnimationRef = useRef(0)
  const recordingStartedAtRef = useRef(0)
  const recordingAccumulatedMsRef = useRef(0)

  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [peaks, setPeaks] = useState([])
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 })
  const [sourceBuffer, setSourceBuffer] = useState(null)
  const [renderedBuffer, setRenderedBuffer] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [recordStatus, setRecordStatus] = useState('idle')
  const [recordElapsed, setRecordElapsed] = useState(0)
  const [recordLevel, setRecordLevel] = useState(0)
  const [recordMimeType, setRecordMimeType] = useState('')
  const [canPauseRecording, setCanPauseRecording] = useState(false)
  const [statusMessage, setStatusMessage] = useState('AudioLab Phase 3 is ready. Import, record, select, edit, and export a single track.')
  const [errorMessage, setErrorMessage] = useState('')

  const recorderSupported = canUseRecorder()

  useEffect(() => {
    activeProjectRef.current = activeProject
  }, [activeProject])

  async function refreshProjects(selectId = '') {
    const loaded = await listAudioLabProjects()
    setProjects(loaded)

    if (selectId) {
      const project = await getAudioLabProject(selectId)
      if (project) {
        setActiveProject(project)
        activeProjectRef.current = project
        setSelectedAssetId(project.episode?.audioAssetId || project.sourceAssets?.[0]?.id || '')
        setSelectionRange({
          start: Number(project.transport?.selectionStart || 0),
          end: Number(project.transport?.selectionEnd || 0),
        })
      }
      return
    }

    if (!activeProjectRef.current && loaded[0]) {
      const project = await getAudioLabProject(loaded[0].id)
      setActiveProject(project)
      activeProjectRef.current = project
      setSelectedAssetId(project?.episode?.audioAssetId || project?.sourceAssets?.[0]?.id || '')
      setSelectionRange({
        start: Number(project?.transport?.selectionStart || 0),
        end: Number(project?.transport?.selectionEnd || 0),
      })
    }
  }

  useEffect(() => {
    refreshProjects().catch((error) => {
      setErrorMessage(error.message || 'Unable to load AudioLab projects')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (recordStatus !== 'recording') {
      if (recordStatus === 'paused') setRecordElapsed(recordingAccumulatedMsRef.current / 1000)
      return undefined
    }

    const updateElapsed = () => {
      const liveMs = recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0
      setRecordElapsed((recordingAccumulatedMsRef.current + liveMs) / 1000)
    }

    updateElapsed()
    const interval = window.setInterval(updateElapsed, 200)
    return () => window.clearInterval(interval)
  }, [recordStatus])

  useEffect(() => () => {
    cleanupRecordingResources({ clearChunks: true })
  }, [])

  const selectedAsset = useMemo(() => {
    if (!activeProject?.sourceAssets?.length) return null
    return activeProject.sourceAssets.find((asset) => asset.id === selectedAssetId) || activeProject.sourceAssets[0]
  }, [activeProject, selectedAssetId])

  const selectedEdits = useMemo(
    () => getEditsForAsset(activeProject?.edits || [], selectedAsset?.id || ''),
    [activeProject?.edits, selectedAsset?.id]
  )
  const selectedRedoStack = useMemo(
    () => getEditsForAsset(activeProject?.redoStack || [], selectedAsset?.id || ''),
    [activeProject?.redoStack, selectedAsset?.id]
  )
  const editSignature = useMemo(() => JSON.stringify(selectedEdits), [selectedEdits])
  const selection = normalizeAudioSelection(selectionRange.start, selectionRange.end, duration)

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''

    async function loadSelectedAudio() {
      setCurrentTime(0)
      setIsPlaying(false)
      setPeaks([])
      setAudioUrl('')
      setSourceBuffer(null)
      setRenderedBuffer(null)
      setDuration(selectedAsset?.duration || 0)

      if (!selectedAsset?.id) return

      try {
        setIsDecoding(true)
        setIsRendering(Boolean(selectedEdits.length))
        setErrorMessage('')
        const stored = await getAudioLabAsset(selectedAsset.id)
        const blob = stored?.blob
        if (!blob) throw new Error('The original audio blob is missing from local AudioLab storage')

        const decoded = await decodeAudioBlob(blob)
        let rendered = decoded
        let playbackBlob = blob

        if (selectedEdits.length) {
          rendered = renderAudioEditGraph(decoded, selectedEdits, selectedAsset.id)
          playbackBlob = encodeWav(rendered)
        }

        objectUrl = URL.createObjectURL(playbackBlob)
        const nextPeaks = buildWaveformPeaks(rendered)

        if (cancelled) return
        setAudioUrl(objectUrl)
        setSourceBuffer(decoded)
        setRenderedBuffer(rendered)
        setPeaks(nextPeaks)
        setDuration(rendered.duration || 0)
        setSelectionRange((range) => ({
          start: clampAudioTime(range.start, rendered.duration || 0),
          end: clampAudioTime(range.end, rendered.duration || 0),
        }))
        setStatusMessage(selectedEdits.length
          ? `Rendered ${selectedEdits.length} edit operation${selectedEdits.length === 1 ? '' : 's'} for ${selectedAsset.filename}.`
          : `Loaded ${selectedAsset.filename}. Original source preserved. Edits are project JSON only.`)
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.message || 'Unable to decode or render audio')
          try {
            const stored = await getAudioLabAsset(selectedAsset.id)
            if (stored?.blob) {
              const fallbackUrl = URL.createObjectURL(stored.blob)
              objectUrl = fallbackUrl
              const decoded = await decodeAudioBlob(stored.blob)
              setAudioUrl(fallbackUrl)
              setSourceBuffer(decoded)
              setRenderedBuffer(decoded)
              setPeaks(buildWaveformPeaks(decoded))
              setDuration(decoded.duration || selectedAsset.duration || 0)
              setStatusMessage('Preview rendering failed. Falling back to original playback until the edit graph is fixed.')
            }
          } catch {
            // leave the first error visible
          }
        }
      } finally {
        if (!cancelled) {
          setIsDecoding(false)
          setIsRendering(false)
        }
      }
    }

    loadSelectedAudio()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [selectedAsset?.id, editSignature])

  function stopInputMeter() {
    if (recordingAnimationRef.current) {
      window.cancelAnimationFrame(recordingAnimationRef.current)
      recordingAnimationRef.current = 0
    }

    try {
      recordingSourceRef.current?.disconnect?.()
    } catch {
      // ignore meter disconnect noise
    }

    try {
      recordingAudioContextRef.current?.close?.()
    } catch {
      // ignore context close noise
    }

    recordingSourceRef.current = null
    recordingAnalyserRef.current = null
    recordingAudioContextRef.current = null
    setRecordLevel(0)
  }

  function releaseRecordingStream() {
    const stream = recordingStreamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    recordingStreamRef.current = null
  }

  function cleanupRecordingResources({ clearChunks = false } = {}) {
    stopInputMeter()
    releaseRecordingStream()
    mediaRecorderRef.current = null
    recordingStartedAtRef.current = 0
    recordingAccumulatedMsRef.current = 0
    if (clearChunks) recordingChunksRef.current = []
    setCanPauseRecording(false)
  }

  function setupInputMeter(stream) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor) return

    const context = new AudioContextCtor()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    const data = new Uint8Array(analyser.frequencyBinCount)

    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.72
    source.connect(analyser)

    recordingAudioContextRef.current = context
    recordingSourceRef.current = source
    recordingAnalyserRef.current = analyser

    function tick() {
      const liveAnalyser = recordingAnalyserRef.current
      if (!liveAnalyser) return

      liveAnalyser.getByteTimeDomainData(data)
      let max = 0
      for (let index = 0; index < data.length; index += 1) {
        const value = Math.abs((data[index] || 128) - 128) / 128
        if (value > max) max = value
      }

      setRecordLevel(Math.min(1, max * 1.4))
      recordingAnimationRef.current = window.requestAnimationFrame(tick)
    }

    tick()
  }

  async function handleNewProject() {
    const project = await saveAudioLabProject(createEmptyAudioLabProject({ title: 'Untitled AudioLab Project' }))
    setActiveProject(project)
    activeProjectRef.current = project
    setSelectedAssetId('')
    setSelectionRange({ start: 0, end: 0 })
    setStatusMessage('New AudioLab project created. Import or record an audio source to build the waveform.')
    await refreshProjects(project.id)
  }

  async function handleOpenProject(id) {
    const project = await getAudioLabProject(id)
    if (!project) return
    setActiveProject(project)
    activeProjectRef.current = project
    setSelectedAssetId(project.episode?.audioAssetId || project.sourceAssets?.[0]?.id || '')
    setSelectionRange({
      start: Number(project.transport?.selectionStart || 0),
      end: Number(project.transport?.selectionEnd || 0),
    })
    setStatusMessage(`Opened ${project.title || 'AudioLab project'}.`)
  }

  async function handleSaveProject(project = activeProjectRef.current) {
    if (!project) return null
    const saved = await saveAudioLabProject(project)
    setActiveProject(saved)
    activeProjectRef.current = saved
    await refreshProjects(saved.id)
    setStatusMessage('Project saved. Originals preserved. Edit graph stored as JSON.')
    return saved
  }

  function updateActiveProject(nextProject) {
    setActiveProject(nextProject)
    activeProjectRef.current = nextProject
  }

  function updateSelection(start, end) {
    const next = normalizeAudioSelection(start, end, duration)
    setSelectionRange({ start: next.start, end: next.end })

    if (!activeProjectRef.current) return
    updateActiveProject({
      ...activeProjectRef.current,
      transport: {
        ...(activeProjectRef.current.transport || {}),
        selectionStart: next.start,
        selectionEnd: next.end,
      },
    })
  }

  async function attachAssetToProject(asset, decoded, sourceLabel = 'Imported') {
    const baseProject = activeProjectRef.current || createEmptyAudioLabProject({ title: asset.title })
    const title = baseProject.title === 'Untitled AudioLab Project' ? asset.title : baseProject.title
    const nextProject = {
      ...baseProject,
      title,
      sourceAssets: [asset, ...(baseProject.sourceAssets || []).filter((item) => item.id !== asset.id)],
      tracks: makeSingleTrackForAsset(asset),
      edits: Array.isArray(baseProject.edits) ? baseProject.edits : [],
      redoStack: [],
      transport: {
        ...(baseProject.transport || {}),
        selectionStart: 0,
        selectionEnd: 0,
      },
      episode: {
        ...(baseProject.episode || {}),
        title: baseProject.episode?.title && baseProject.episode.title !== 'Untitled AudioLab Project' ? baseProject.episode.title : title,
        slug: baseProject.episode?.slug || slugifyAudioLab(title),
        audioAssetId: asset.id,
      },
    }

    const saved = await saveAudioLabProject(nextProject)
    setActiveProject(saved)
    activeProjectRef.current = saved
    setSelectedAssetId(asset.id)
    setSelectionRange({ start: 0, end: 0 })
    setSourceBuffer(decoded)
    setRenderedBuffer(decoded)
    setPeaks(buildWaveformPeaks(decoded))
    setDuration(decoded.duration || asset.duration || 0)
    setCurrentTime(0)
    setStatusMessage(`${sourceLabel} ${asset.filename}. Waveform generated from the preserved original.`)
    await refreshProjects(saved.id)
    return saved
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!String(file.type || '').startsWith('audio/')) {
      setErrorMessage('Choose an audio file. The machine is picky because browsers are picky.')
      return
    }

    try {
      setErrorMessage('')
      setStatusMessage(`Importing ${file.name}…`)
      setIsDecoding(true)
      const decoded = await decodeAudioBlob(file)
      const asset = await putAudioLabAssetFromFile(file, { duration: decoded.duration || 0 })
      await attachAssetToProject(asset, decoded, 'Imported')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to import audio')
    } finally {
      setIsDecoding(false)
    }
  }

  async function handleStartRecording() {
    if (!recorderSupported) {
      setRecordStatus('error')
      setErrorMessage('This browser does not support native MediaRecorder microphone capture.')
      return
    }

    try {
      if (audioRef.current) audioRef.current.pause()
      setErrorMessage('')
      setRecordElapsed(0)
      setRecordLevel(0)
      setRecordStatus('requesting')
      setStatusMessage('Requesting microphone access…')

      let stream
      try {
        stream = await window.navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })
      } catch {
        stream = await window.navigator.mediaDevices.getUserMedia({ audio: true })
      }

      const preferredMimeType = getPreferredRecordingMimeType()
      const options = preferredMimeType ? { mimeType: preferredMimeType } : undefined
      const recorder = new window.MediaRecorder(stream, options)

      recordingChunksRef.current = []
      recordingAccumulatedMsRef.current = 0
      recordingStartedAtRef.current = Date.now()
      recordingStreamRef.current = stream
      mediaRecorderRef.current = recorder
      setRecordMimeType(recorder.mimeType || preferredMimeType || 'browser default')
      setCanPauseRecording(typeof recorder.pause === 'function' && typeof recorder.resume === 'function')
      setupInputMeter(stream)

      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordingChunksRef.current.push(event.data)
      }

      recorder.onerror = (event) => {
        setRecordStatus('error')
        setErrorMessage(event.error?.message || 'Recording failed')
        cleanupRecordingResources({ clearChunks: true })
      }

      recorder.onstop = () => {
        finishRecordingTake(recorder).catch((error) => {
          setRecordStatus('error')
          setErrorMessage(error.message || 'Unable to save recorded take')
          cleanupRecordingResources({ clearChunks: true })
          setIsDecoding(false)
        })
      }

      recorder.start(1000)
      setRecordStatus('recording')
      setStatusMessage('Recording. Speak clearly into the tiny surveillance flower, except this one is yours.')
    } catch (error) {
      setRecordStatus('error')
      setErrorMessage(error?.name === 'NotAllowedError' ? 'Microphone permission was denied.' : (error.message || 'Unable to start recording'))
      cleanupRecordingResources({ clearChunks: true })
    }
  }

  function handlePauseRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'recording' || typeof recorder.pause !== 'function') return

    recordingAccumulatedMsRef.current += Date.now() - recordingStartedAtRef.current
    recordingStartedAtRef.current = 0
    recorder.pause()
    setRecordStatus('paused')
    setStatusMessage('Recording paused.')
  }

  function handleResumeRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'paused' || typeof recorder.resume !== 'function') return

    recordingStartedAtRef.current = Date.now()
    recorder.resume()
    setRecordStatus('recording')
    setStatusMessage('Recording resumed.')
  }

  function handleStopRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    if (recorder.state === 'recording' && recordingStartedAtRef.current) {
      recordingAccumulatedMsRef.current += Date.now() - recordingStartedAtRef.current
    }

    recordingStartedAtRef.current = 0
    setRecordElapsed(recordingAccumulatedMsRef.current / 1000)
    setRecordStatus('saving')
    setStatusMessage('Stopping recording and saving raw take…')
    stopInputMeter()
    recorder.stop()
  }

  async function finishRecordingTake(recorder) {
    try {
      setRecordStatus('saving')
      setIsDecoding(true)
      const chunks = recordingChunksRef.current
      const mimeType = recorder.mimeType || getPreferredRecordingMimeType() || 'audio/webm'
      const blob = new Blob(chunks, { type: mimeType })

      if (!blob.size) throw new Error('Recording produced an empty audio file')

      releaseRecordingStream()
      const decoded = await decodeAudioBlob(blob)
      const filename = makeRecordingFilename(blob.type || mimeType)
      const asset = await putAudioLabAssetFromBlob(blob, {
        filename,
        title: filename.replace(/\.[^.]+$/, ''),
        mimeType: blob.type || mimeType,
        size: blob.size,
        duration: decoded.duration || recordElapsed || 0,
        source: 'browser-recording',
      })

      await attachAssetToProject(asset, decoded, 'Recorded')
      setRecordStatus('ready')
      setRecordElapsed(decoded.duration || recordElapsed || 0)
      setStatusMessage(`Recorded ${asset.filename}. Raw take preserved locally and attached to the active project.`)
    } finally {
      cleanupRecordingResources({ clearChunks: true })
      setIsDecoding(false)
    }
  }

  async function handleTransportToggle() {
    const element = audioRef.current
    if (!element || !audioUrl) return

    if (isPlaying) {
      element.pause()
      return
    }

    try {
      await element.play()
    } catch (error) {
      setErrorMessage(error.message || 'Playback failed')
    }
  }

  function handleSeek(value) {
    const nextTime = clampAudioTime(value, duration || 0)
    if (audioRef.current) audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  function updateProjectFields(fields) {
    if (!activeProject) return
    const nextProject = { ...activeProject, ...fields }
    updateActiveProject(nextProject)
  }

  function updateEpisodeFields(fields) {
    if (!activeProject) return
    const nextEpisode = {
      ...(activeProject.episode || {}),
      ...fields,
    }

    if (fields.title && !fields.slug) {
      nextEpisode.slug = slugifyAudioLab(fields.title)
    }

    const nextProject = { ...activeProject, episode: nextEpisode }
    updateActiveProject(nextProject)
  }

  function handleEdit(type) {
    if (!activeProjectRef.current || !selectedAsset?.id || !selection.hasSelection) return
    const edit = makeAudioEditOperation(type, selectedAsset.id, selection.start, selection.end)
    const nextProject = {
      ...activeProjectRef.current,
      edits: [...(activeProjectRef.current.edits || []), edit],
      redoStack: [],
      transport: {
        ...(activeProjectRef.current.transport || {}),
        selectionStart: 0,
        selectionEnd: 0,
      },
    }

    setSelectionRange({ start: 0, end: 0 })
    updateActiveProject(nextProject)
    setStatusMessage(`${type[0].toUpperCase()}${type.slice(1)} operation added. Preview re-rendering from the original source.`)
  }

  function handleUndo() {
    const project = activeProjectRef.current
    if (!project?.edits?.length) return
    const edits = [...project.edits]
    const last = edits.pop()
    const nextProject = {
      ...project,
      edits,
      redoStack: [last, ...(project.redoStack || [])],
    }
    updateActiveProject(nextProject)
    setStatusMessage('Undo applied. Preview re-rendering from the edit graph.')
  }

  function handleRedo() {
    const project = activeProjectRef.current
    if (!project?.redoStack?.length) return
    const redoStack = [...project.redoStack]
    const next = redoStack.shift()
    const nextProject = {
      ...project,
      edits: [...(project.edits || []), next],
      redoStack,
    }
    updateActiveProject(nextProject)
    setStatusMessage('Redo applied. Preview re-rendering from the edit graph.')
  }

  async function handleExportWav() {
    if (!selectedAsset?.id) return

    try {
      setErrorMessage('')
      setIsRendering(true)
      setStatusMessage('Rendering WAV export from non-destructive edit graph…')

      let buffer = renderedBuffer
      if (!buffer) {
        const stored = await getAudioLabAsset(selectedAsset.id)
        if (!stored?.blob) throw new Error('Original source blob is missing')
        const decoded = await decodeAudioBlob(stored.blob)
        buffer = renderAudioEditGraph(decoded, selectedEdits, selectedAsset.id)
      }

      const wav = encodeWav(buffer)
      const filename = makeAudioDownloadName(activeProject?.title || selectedAsset.title || 'audiolab-export', 'wav')
      downloadBlob(wav, filename)
      setStatusMessage(`Exported ${filename}. Original source remains untouched.`)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to export WAV')
    } finally {
      setIsRendering(false)
    }
  }

  async function handleCreateEpisodeDraft() {
    if (!activeProject) return

    try {
      setErrorMessage('')
      const savedProject = await handleSaveProject(activeProject)
      const project = savedProject || activeProject
      const episode = project.episode || {}
      const nativeEntry = createEmptyNativeEntry()
      const items = await loadNativeCollection({ includeFuture: 1 })
      const asset = project.sourceAssets.find((item) => item.id === (episode.audioAssetId || selectedAsset?.id)) || selectedAsset
      const title = episode.title || project.title || 'Untitled AudioLab Episode'
      const description = episode.description || ''

      const payload = {
        ...nativeEntry,
        id: episode.nativeEntryId || `audiolab-${project.id}`,
        contentType: 'podcast',
        status: 'draft',
        workflowState: 'draft',
        title,
        slug: episode.slug || slugifyAudioLab(title),
        excerpt: description,
        body: description,
        bodyHtml: textToHtml(description),
        sourceType: 'audiolab',
        sourceKind: 'audiolab',
        sourceLabel: 'AudioLab project',
        sourceExternalId: project.id,
        sourcePostId: project.id,
        podcastDuration: formatAudioLabDuration(duration || asset?.duration || 0),
        podcastSummary: description,
        relatedAssets: [
          {
            type: 'audiolab-project',
            projectId: project.id,
            assetId: asset?.id || '',
            filename: asset?.filename || '',
            duration: duration || asset?.duration || 0,
            source: asset?.source || '',
            edits: selectedEdits.length,
            note: 'Audio source is preserved in local AudioLab IndexedDB storage. Phase 3 can export a local edited WAV, but server upload is not added yet.',
          },
        ],
      }

      const result = await upsertNativeEntryWithMeta(items, payload, 'AudioLab episode draft')
      const nextProject = await saveAudioLabProject({
        ...project,
        episode: {
          ...episode,
          title,
          slug: payload.slug,
          description,
          status: 'draft',
          nativeEntryId: result.item.id,
          nativeEntrySlug: result.item.slug,
          updatedAt: new Date().toISOString(),
        },
      })

      setActiveProject(nextProject)
      activeProjectRef.current = nextProject
      await refreshProjects(nextProject.id)
      setStatusMessage(result.synced ? 'Episode draft attached and synced.' : 'Episode draft attached locally. Remote sync can catch up later.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to attach episode draft')
    }
  }

  const track = activeProject?.tracks?.[0]
  const episodeEditLink = activeProject?.episode?.nativeEntryId
    ? `${adminRoutes.nativeBridge}?edit=${encodeURIComponent(activeProject.episode.nativeEntryId)}`
    : `${adminRoutes.nativeBridge}?new=podcast`
  const isBusyRendering = isDecoding || isRendering

  return (
    <AdminFrame>
      <main className="page wp-admin-screen audio-lab-page">
        <div className="wp-screen-header audio-lab-header">
          <div>
            <p className="audio-lab-eyebrow">Native SabotPress audio desk</p>
            <h1>AudioLab</h1>
            <p className="description">Phase 3: import, record, waveform selection, non-destructive single-track edits, rendered preview, WAV export, and episode draft attachment.</p>
          </div>
          <div className="review-card__actions">
            <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>Import Audio</button>
            <button type="button" className="button button--primary" onClick={() => handleSaveProject()} disabled={!activeProject}>Save Project</button>
          </div>
        </div>

        <input ref={fileInputRef} className="audio-lab-file-input" type="file" accept="audio/*" onChange={handleImportFile} />

        {errorMessage ? <p className="notice notice-error audio-lab-notice">{errorMessage}</p> : null}
        {statusMessage ? <p className="notice notice-info audio-lab-notice">{statusMessage}</p> : null}

        <section className="audio-lab-workbench">
          <ProjectSidebar
            projects={projects}
            activeProjectId={activeProject?.id || ''}
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
          />

          <section className="audio-lab-editor" aria-label="Audio editor">
            <div className="audio-lab-project-strip">
              <label className="audio-lab-field">
                <span>Project title</span>
                <input
                  value={activeProject?.title || ''}
                  placeholder="Untitled AudioLab Project"
                  onChange={(event) => updateProjectFields({ title: event.target.value })}
                />
              </label>

              <div className="audio-lab-source-picker">
                <span>Source</span>
                {activeProject?.sourceAssets?.length ? (
                  <select
                    value={selectedAsset?.id || ''}
                    onChange={(event) => {
                      setSelectedAssetId(event.target.value)
                      updateSelection(0, 0)
                    }}
                  >
                    {activeProject.sourceAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.filename}</option>
                    ))}
                  </select>
                ) : (
                  <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>Choose audio</button>
                )}
              </div>
            </div>

            <RecordPanel
              canRecord={recorderSupported}
              recordStatus={recordStatus}
              recordMimeType={recordMimeType}
              recordElapsed={recordElapsed}
              recordLevel={recordLevel}
              canPauseRecording={canPauseRecording}
              onStart={handleStartRecording}
              onPause={handlePauseRecording}
              onResume={handleResumeRecording}
              onStop={handleStopRecording}
            />

            <SelectionToolbar
              selection={selection}
              duration={duration}
              edits={selectedEdits}
              redoStack={selectedRedoStack}
              isRendering={isBusyRendering}
              hasAudio={Boolean(selectedAsset)}
              onSelectionChange={updateSelection}
              onClear={() => updateSelection(0, 0)}
              onSelectAll={() => updateSelection(0, duration || 0)}
              onEdit={handleEdit}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onExport={handleExportWav}
            />

            <div className="audio-lab-transport" aria-label="Playback transport">
              <button type="button" className="button button--primary audio-lab-play" onClick={handleTransportToggle} disabled={!audioUrl || isBusyRendering}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" className="button" onClick={() => handleSeek(0)} disabled={!audioUrl}>Stop</button>
              <div className="audio-lab-time-readout">
                <strong>{formatAudioLabDuration(currentTime)}</strong>
                <span>/ {formatAudioLabDuration(duration)}</span>
              </div>
              <input
                className="audio-lab-seeker"
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => handleSeek(event.target.value)}
                disabled={!audioUrl}
                aria-label="Seek audio timeline"
              />
            </div>

            <div className="audio-lab-timeline-shell">
              <div className="audio-lab-ruler">
                <span>0:00</span>
                <span>{formatAudioLabDuration((duration || 0) / 2)}</span>
                <span>{formatAudioLabDuration(duration || 0)}</span>
              </div>
              <div className="audio-lab-track-lane">
                <div className="audio-lab-track-controls">
                  <strong>{track?.name || 'Main Track'}</strong>
                  <span>{selectedAsset?.mimeType || 'No source'}</span>
                  <small>{selectedAsset ? `${formatBytes(selectedAsset.size)} · ${formatAudioLabDuration(duration || selectedAsset.duration)} · ${selectedAsset.source || 'source'}` : 'Import or record audio'}</small>
                  <small>{selectedEdits.length ? `${selectedEdits.length} edit${selectedEdits.length === 1 ? '' : 's'} active` : 'No edits'}</small>
                </div>
                <WaveformCanvas
                  peaks={peaks}
                  duration={duration}
                  currentTime={currentTime}
                  selectionStart={selection.start}
                  selectionEnd={selection.end}
                  isLoading={isBusyRendering}
                  onSeek={handleSeek}
                  onSelectionChange={updateSelection}
                />
              </div>
            </div>

            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || duration || 0)}
            />
          </section>

          <aside className="audio-lab-project-sidebar" aria-label="Project details">
            <section className="audio-lab-panel">
              <p className="audio-lab-eyebrow">Project JSON</p>
              <h2>Preserved source model</h2>
              <dl className="audio-lab-facts">
                <div><dt>Project ID</dt><dd>{activeProject?.id || '—'}</dd></div>
                <div><dt>Sources</dt><dd>{activeProject?.sourceAssets?.length || 0}</dd></div>
                <div><dt>Tracks</dt><dd>{activeProject?.tracks?.length || 0}</dd></div>
                <div><dt>Edits</dt><dd>{activeProject?.edits?.length || 0}</dd></div>
                <div><dt>Redo</dt><dd>{activeProject?.redoStack?.length || 0}</dd></div>
              </dl>
              <p className="description">Phase 3 edits audio non-destructively. Imported files and recorded takes stay in IndexedDB. Delete, silence, and trim are stored as JSON operations and rendered into the preview/export only.</p>
            </section>

            <section className="audio-lab-panel audio-lab-edit-log">
              <p className="audio-lab-eyebrow">Edit graph</p>
              <h2>Single-track operations</h2>
              {selectedEdits.length ? (
                <ol>
                  {selectedEdits.map((edit) => (
                    <li key={edit.id}>
                      <strong>{edit.type}</strong>
                      <span>{formatAudioLabDuration(edit.start)} to {formatAudioLabDuration(edit.end)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="description">No edits on this source yet.</p>
              )}
            </section>

            <section className="audio-lab-panel">
              <p className="audio-lab-eyebrow">Episode attachment</p>
              <h2>Podcast draft</h2>
              <label className="audio-lab-field">
                <span>Episode title</span>
                <input value={activeProject?.episode?.title || ''} onChange={(event) => updateEpisodeFields({ title: event.target.value })} />
              </label>
              <label className="audio-lab-field">
                <span>Slug</span>
                <input value={activeProject?.episode?.slug || ''} onChange={(event) => updateEpisodeFields({ slug: slugifyAudioLab(event.target.value) })} />
              </label>
              <label className="audio-lab-field">
                <span>Description / show notes</span>
                <textarea rows={7} value={activeProject?.episode?.description || ''} onChange={(event) => updateEpisodeFields({ description: event.target.value })} />
              </label>
              <button type="button" className="button button--primary" onClick={handleCreateEpisodeDraft} disabled={!activeProject || !selectedAsset}>
                Attach Podcast Draft
              </button>
              {activeProject?.episode?.nativeEntryId ? (
                <Link className="button audio-lab-edit-episode" to={episodeEditLink}>Open attached draft</Link>
              ) : null}
            </section>
          </aside>
        </section>
      </main>
    </AdminFrame>
  )
}
