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
  makeAudioLabClip,
  makeAudioLabId,
  makeAudioLabTrack,
  normalizeAudioLabProject,
  putAudioLabAssetFromBlob,
  putAudioLabAssetFromFile,
  saveAudioLabProject,
  slugifyAudioLab,
} from '../lib/audioLabStore'
import {
  clampAudioTime,
  computeProjectDuration,
  encodeWav,
  getClipDuration,
  getEditsForAsset,
  makeAudioDownloadName,
  makeAudioEditOperation,
  normalizeAudioSelection,
  renderMultitrackMixdown,
} from '../lib/audioLabRender'
import {
  createEmptyNativeEntry,
  loadNativeCollection,
  upsertNativeEntryWithMeta,
} from '../lib/nativePublicContent'

const waveformPeakCount = 1100
const timelinePixelsPerSecond = 48
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
        // Browser audio contexts are tiny haunted doors. Sometimes they close later.
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
  const stamp = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-')
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

function stripProjectHistory(project) {
  return JSON.parse(JSON.stringify({
    ...project,
    history: [],
    redoStack: [],
  }))
}

function commitProjectHistory(beforeProject, nextProject) {
  const before = stripProjectHistory(beforeProject)
  const history = [...(beforeProject.history || []), before].slice(-30)
  return normalizeAudioLabProject({
    ...nextProject,
    history,
    redoStack: [],
  })
}

function WaveformCanvas({ peaks, duration, currentTime, selectionStart, selectionEnd, onSeek, onSelectionChange, isLoading }) {
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

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
      const usable = height - 48

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
        context.fillText(isLoading ? 'Rendering preview…' : 'Import or record audio to generate waveform', width / 2, mid)
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
        const sx = (selection.start / Math.max(0.001, duration)) * width
        const ex = (selection.end / Math.max(0.001, duration)) * width
        context.fillStyle = 'rgba(240, 195, 60, 0.22)'
        context.fillRect(sx, 0, Math.max(2, ex - sx), height)
        context.strokeStyle = 'rgba(240, 195, 60, 0.9)'
        context.strokeRect(sx, 0, Math.max(2, ex - sx), height)
      }

      const progress = duration ? Math.max(0, Math.min(1, currentTime / duration)) : 0
      const progressX = progress * width
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

  function timeFromPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const pct = (event.clientX - rect.left) / Math.max(1, rect.width)
    return clampAudioTime(pct * duration, duration)
  }

  return (
    <canvas
      ref={canvasRef}
      className="audio-lab-waveform"
      role="img"
      aria-label="Audio waveform overview"
      onMouseDown={(event) => {
        if (!duration) return
        const start = timeFromPointer(event)
        dragRef.current = { start, moved: false }
        onSeek(start)
        onSelectionChange(start, start)
      }}
      onMouseMove={(event) => {
        if (!dragRef.current || !duration) return
        const end = timeFromPointer(event)
        dragRef.current.moved = true
        onSelectionChange(dragRef.current.start, end)
      }}
      onMouseUp={(event) => {
        if (!dragRef.current || !duration) return
        const end = timeFromPointer(event)
        const drag = dragRef.current
        dragRef.current = null
        if (!drag.moved || Math.abs(end - drag.start) < 0.02) {
          onSeek(end)
          onSelectionChange(0, 0)
        } else {
          onSelectionChange(drag.start, end)
        }
      }}
      onMouseLeave={() => {
        dragRef.current = null
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
            <span>{project.tracks?.length || 0} tracks · {project.sourceAssets?.length || 0} sources</span>
            <small>{shortDate(project.updatedAt)}</small>
          </button>
        )) : (
          <p className="audio-lab-empty">No projects yet. Import, record, or create a new project.</p>
        )}
      </div>
    </aside>
  )
}

function RecordPanel({ canRecord, recordStatus, recordMimeType, recordElapsed, recordLevel, canPauseRecording, onStart, onPause, onResume, onStop }) {
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
      <div className="audio-lab-record-meter" aria-label="Live microphone level"><span style={{ width: levelPct }} /></div>
      <div className="audio-lab-record-actions">
        <button type="button" className="button button--primary" onClick={onStart} disabled={!canRecord || isBusy || isRecording || isPaused}>{recordStatus === 'ready' ? 'Record Another Take' : 'Record'}</button>
        <button type="button" className="button" onClick={onPause} disabled={!canPauseRecording || !isRecording}>Pause</button>
        <button type="button" className="button" onClick={onResume} disabled={!canPauseRecording || !isPaused}>Resume</button>
        <button type="button" className="button" onClick={onStop} disabled={!isRecording && !isPaused}>Stop</button>
      </div>
      {!canRecord ? <p className="description audio-lab-record-warning">This browser does not support MediaRecorder microphone capture.</p> : null}
      <p className="description audio-lab-record-local-note">Recordings are saved locally in this browser for now.</p>
    </section>
  )
}

function SelectionToolbar({ selection, duration, edits, canUndo, canRedo, isRendering, hasAudio, onSelectionChange, onClear, onSelectAll, onEdit, onUndo, onRedo, onExport }) {
  const disabled = !selection.hasSelection || isRendering

  return (
    <section className="audio-lab-selection-toolbar" aria-label="Selection and edit controls">
      <div className="audio-lab-selection-fields">
        <label><span>Start</span><input type="number" min="0" step="0.01" value={selection.start.toFixed(2)} onChange={(event) => onSelectionChange(event.target.value, selection.end)} disabled={!hasAudio} /></label>
        <label><span>End</span><input type="number" min="0" step="0.01" value={selection.end.toFixed(2)} onChange={(event) => onSelectionChange(selection.start, event.target.value)} disabled={!hasAudio} /></label>
        <label><span>Duration</span><input value={formatAudioLabDuration(selection.duration)} readOnly /></label>
      </div>
      <div className="audio-lab-edit-actions">
        <button type="button" className="button" onClick={onSelectAll} disabled={!hasAudio || !duration}>Select All</button>
        <button type="button" className="button" onClick={onClear} disabled={!selection.hasSelection}>Clear</button>
        <button type="button" className="button" onClick={() => onEdit('trim')} disabled={disabled}>Trim</button>
        <button type="button" className="button" onClick={() => onEdit('delete')} disabled={disabled}>Delete</button>
        <button type="button" className="button" onClick={() => onEdit('silence')} disabled={disabled}>Silence</button>
        <button type="button" className="button" onClick={onUndo} disabled={!canUndo || isRendering}>Undo</button>
        <button type="button" className="button" onClick={onRedo} disabled={!canRedo || isRendering}>Redo</button>
        <button type="button" className="button button--primary" onClick={onExport} disabled={!hasAudio || isRendering}>Export WAV</button>
      </div>
      <p className="description">Edits are non-destructive. Original sources are preserved. {edits.length ? `${edits.length} legacy selection edit${edits.length === 1 ? '' : 's'} active.` : 'No legacy selection edits on this source.'}</p>
    </section>
  )
}

function SourceBin({ assets, selectedTrackId, onAddToTrack }) {
  return (
    <section className="audio-lab-panel audio-lab-source-bin">
      <p className="audio-lab-eyebrow">Sources</p>
      <h2>Project assets</h2>
      {assets.length ? (
        <div className="audio-lab-source-bin__list">
          {assets.map((asset) => (
            <div key={asset.id} className="audio-lab-source-bin__item">
              <strong>{asset.filename}</strong>
              <span>{formatAudioLabDuration(asset.duration)} · {asset.source || 'upload'} · {formatBytes(asset.size)}</span>
              <button type="button" className="button" onClick={() => onAddToTrack(asset.id)} disabled={!selectedTrackId}>Add to selected track</button>
            </div>
          ))}
        </div>
      ) : <p className="description">No sources yet. Import or record something. Revolutionary, I know.</p>}
    </section>
  )
}

function MultitrackTimeline({ project, duration, currentTime, selection, selectedTrackId, selectedClipId, onAddTrack, onSelectTrack, onSelectClip, onUpdateTrack, onDeleteTrack, onDuplicateTrack, onStartClipDrag }) {
  const tracks = project?.tracks || []
  const width = Math.max(900, Math.ceil(Math.max(duration, computeProjectDuration(project), 10) * timelinePixelsPerSecond) + 160)
  const playheadLeft = Math.max(0, currentTime * timelinePixelsPerSecond)
  const selectionRange = normalizeAudioSelection(selection.start, selection.end, duration || computeProjectDuration(project))

  return (
    <section className="audio-lab-multitrack" aria-label="Multitrack timeline">
      <div className="audio-lab-timeline-actions">
        <button type="button" className="button" onClick={onAddTrack}>Add Track</button>
        <span>{tracks.length} track{tracks.length === 1 ? '' : 's'}</span>
      </div>
      <div className="audio-lab-multitrack-scroll">
        <div className="audio-lab-multitrack-inner" style={{ minWidth: `${width}px` }}>
          <div className="audio-lab-multitrack-ruler">
            <span>0:00</span>
            <span>{formatAudioLabDuration((duration || computeProjectDuration(project) || 0) / 2)}</span>
            <span>{formatAudioLabDuration(duration || computeProjectDuration(project) || 0)}</span>
          </div>
          <div className="audio-lab-playhead" style={{ left: `${150 + playheadLeft}px` }} />
          {selectionRange.hasSelection ? (
            <div className="audio-lab-multitrack-selection" style={{ left: `${150 + selectionRange.start * timelinePixelsPerSecond}px`, width: `${selectionRange.duration * timelinePixelsPerSecond}px` }} />
          ) : null}
          {tracks.map((track) => (
            <div key={track.id} className={`audio-lab-multitrack-row${track.id === selectedTrackId ? ' is-selected' : ''}`}>
              <div className="audio-lab-multitrack-controls" onClick={() => onSelectTrack(track.id)}>
                <input value={track.name} onChange={(event) => onUpdateTrack(track.id, { name: event.target.value })} aria-label="Track name" />
                <div className="audio-lab-track-buttons">
                  <button type="button" className={track.muted ? 'is-active' : ''} onClick={(event) => { event.stopPropagation(); onUpdateTrack(track.id, { muted: !track.muted }) }}>Mute</button>
                  <button type="button" className={track.solo ? 'is-active' : ''} onClick={(event) => { event.stopPropagation(); onUpdateTrack(track.id, { solo: !track.solo }) }}>Solo</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicateTrack(track.id) }}>Dup</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteTrack(track.id) }} disabled={track.clips?.length > 0}>Del</button>
                </div>
                <label>Gain <input type="number" min="0" step="0.05" value={track.gain} onChange={(event) => onUpdateTrack(track.id, { gain: event.target.value })} /></label>
                <label>Pan <input type="number" min="-1" max="1" step="0.05" value={track.pan} onChange={(event) => onUpdateTrack(track.id, { pan: event.target.value })} /></label>
              </div>
              <div className="audio-lab-multitrack-lane" onClick={() => onSelectTrack(track.id)}>
                {(track.clips || []).map((clip) => {
                  const clipDuration = getClipDuration(clip)
                  return (
                    <button
                      type="button"
                      key={clip.id}
                      className={`audio-lab-clip${clip.id === selectedClipId ? ' is-selected' : ''}${clip.muted ? ' is-muted' : ''}`}
                      style={{ left: `${clip.timelineStart * timelinePixelsPerSecond}px`, width: `${Math.max(36, clipDuration * timelinePixelsPerSecond)}px` }}
                      onMouseDown={(event) => onStartClipDrag(event, track.id, clip)}
                      onClick={(event) => { event.stopPropagation(); onSelectClip(track.id, clip.id) }}
                    >
                      <strong>{clip.name}</strong>
                      <span>{formatAudioLabDuration(clipDuration)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClipInspector({ project, selectedTrack, selectedClip, assets, currentTime, onUpdateClip, onDeleteClip, onSplitClip, onMoveClipToTrack }) {
  if (!selectedClip || !selectedTrack) {
    return (
      <section className="audio-lab-panel audio-lab-clip-inspector">
        <p className="audio-lab-eyebrow">Clip inspector</p>
        <h2>No clip selected</h2>
        <p className="description">Select a clip in the timeline to trim, split, move, rename, or delete it.</p>
      </section>
    )
  }

  const asset = assets.find((item) => item.id === selectedClip.assetId)
  const clipDuration = getClipDuration(selectedClip)

  return (
    <section className="audio-lab-panel audio-lab-clip-inspector">
      <p className="audio-lab-eyebrow">Clip inspector</p>
      <h2>{selectedClip.name || 'Selected clip'}</h2>
      <label className="audio-lab-field"><span>Clip name</span><input value={selectedClip.name || ''} onChange={(event) => onUpdateClip({ name: event.target.value })} /></label>
      <label className="audio-lab-field"><span>Track</span><select value={selectedTrack.id} onChange={(event) => onMoveClipToTrack(event.target.value)}>{(project?.tracks || []).map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}</select></label>
      <label className="audio-lab-field"><span>Timeline start</span><input type="number" min="0" step="0.01" value={Number(selectedClip.timelineStart || 0)} onChange={(event) => onUpdateClip({ timelineStart: event.target.value })} /></label>
      <label className="audio-lab-field"><span>Source start</span><input type="number" min="0" step="0.01" value={Number(selectedClip.sourceStart || 0)} onChange={(event) => onUpdateClip({ sourceStart: event.target.value })} /></label>
      <label className="audio-lab-field"><span>Source end</span><input type="number" min="0" step="0.01" value={Number(selectedClip.sourceEnd || 0)} onChange={(event) => onUpdateClip({ sourceEnd: event.target.value })} /></label>
      <label className="audio-lab-field"><span>Clip gain</span><input type="number" min="0" step="0.05" value={Number(selectedClip.gain ?? 1)} onChange={(event) => onUpdateClip({ gain: event.target.value })} /></label>
      <label className="audio-lab-checkbox"><input type="checkbox" checked={Boolean(selectedClip.muted)} onChange={(event) => onUpdateClip({ muted: event.target.checked })} /> Muted</label>
      <dl className="audio-lab-facts">
        <div><dt>Source</dt><dd>{asset?.filename || selectedClip.assetId}</dd></div>
        <div><dt>Duration</dt><dd>{formatAudioLabDuration(clipDuration)}</dd></div>
        <div><dt>Playhead</dt><dd>{formatAudioLabDuration(currentTime)}</dd></div>
      </dl>
      <button type="button" className="button" onClick={onSplitClip}>Split at playhead</button>
      <button type="button" className="button audio-lab-danger-button" onClick={onDeleteClip}>Delete selected clip</button>
    </section>
  )
}

export function AudioLabPage() {
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)
  const activeProjectRef = useRef(null)
  const renderUrlRef = useRef('')
  const mediaRecorderRef = useRef(null)
  const recordingStreamRef = useRef(null)
  const recordingChunksRef = useRef([])
  const recordingAudioContextRef = useRef(null)
  const recordingSourceRef = useRef(null)
  const recordingAnalyserRef = useRef(null)
  const recordingAnimationRef = useRef(0)
  const recordingStartedAtRef = useRef(0)
  const recordingAccumulatedMsRef = useRef(0)
  const clipDragRef = useRef(null)

  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [peaks, setPeaks] = useState([])
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [recordStatus, setRecordStatus] = useState('idle')
  const [recordElapsed, setRecordElapsed] = useState(0)
  const [recordLevel, setRecordLevel] = useState(0)
  const [recordMimeType, setRecordMimeType] = useState('')
  const [canPauseRecording, setCanPauseRecording] = useState(false)
  const [renderedBuffer, setRenderedBuffer] = useState(null)
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 })
  const [statusMessage, setStatusMessage] = useState('AudioLab Phase 4 is ready. Import, record, arrange clips, and mix down tracks.')
  const [errorMessage, setErrorMessage] = useState('')

  const recorderSupported = canUseRecorder()

  useEffect(() => {
    activeProjectRef.current = activeProject
  }, [activeProject])

  useEffect(() => () => {
    cleanupRecordingResources({ clearChunks: true })
    if (renderUrlRef.current) URL.revokeObjectURL(renderUrlRef.current)
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

  const selectedAsset = useMemo(() => {
    if (!activeProject?.sourceAssets?.length) return null
    return activeProject.sourceAssets.find((asset) => asset.id === selectedAssetId) || activeProject.sourceAssets[0]
  }, [activeProject, selectedAssetId])

  const selectedTrackId = activeProject?.transport?.selectedTrackId || activeProject?.tracks?.[0]?.id || ''
  const selectedClipId = activeProject?.transport?.selectedClipId || ''
  const selectedTrack = activeProject?.tracks?.find((track) => track.id === selectedTrackId) || activeProject?.tracks?.[0] || null
  const selectedClip = selectedTrack?.clips?.find((clip) => clip.id === selectedClipId) || null
  const selection = normalizeAudioSelection(selectionRange.start, selectionRange.end, duration)
  const selectedEdits = getEditsForAsset(activeProject?.edits || [], selectedAsset?.id || '')
  const renderKey = JSON.stringify({
    id: activeProject?.id || '',
    assets: activeProject?.sourceAssets?.map((asset) => [asset.id, asset.duration]) || [],
    tracks: activeProject?.tracks || [],
    edits: activeProject?.edits || [],
  })

  async function refreshProjects(selectId = '') {
    const loaded = await listAudioLabProjects()
    setProjects(loaded)

    if (selectId) {
      const project = await getAudioLabProject(selectId)
      if (project) openProjectInState(project)
      return
    }

    if (!activeProjectRef.current && loaded[0]) {
      const project = await getAudioLabProject(loaded[0].id)
      if (project) openProjectInState(project)
    }
  }

  function openProjectInState(project) {
    const normalized = normalizeAudioLabProject(project)
    setActiveProject(normalized)
    activeProjectRef.current = normalized
    setSelectedAssetId(normalized.episode?.audioAssetId || normalized.sourceAssets?.[0]?.id || '')
    setSelectionRange({
      start: normalized.transport?.selectionStart || 0,
      end: normalized.transport?.selectionEnd || 0,
    })
    setCurrentTime(normalized.transport?.playhead || 0)
  }

  useEffect(() => {
    refreshProjects().catch((error) => setErrorMessage(error.message || 'Unable to load AudioLab projects'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    async function renderProject() {
      if (!activeProject?.sourceAssets?.length) {
        setPeaks([])
        setDuration(0)
        setRenderedBuffer(null)
        setAudioUrl('')
        return
      }

      try {
        setIsRendering(true)
        setErrorMessage('')
        const buffers = new Map()

        for (const asset of activeProject.sourceAssets) {
          const stored = await getAudioLabAsset(asset.id)
          if (!stored?.blob) continue
          const decoded = await decodeAudioBlob(stored.blob)
          buffers.set(asset.id, decoded)
        }

        if (cancelled) return
        if (!buffers.size) throw new Error('Original audio blobs are missing from local AudioLab storage')

        const mixdown = renderMultitrackMixdown(activeProject, buffers)
        const wav = encodeWav(mixdown)
        const nextUrl = URL.createObjectURL(wav)

        if (renderUrlRef.current) URL.revokeObjectURL(renderUrlRef.current)
        renderUrlRef.current = nextUrl
        setAudioUrl(nextUrl)
        setRenderedBuffer(mixdown)
        setPeaks(buildWaveformPeaks(mixdown))
        setDuration(mixdown.duration || computeProjectDuration(activeProject) || 0)
        setStatusMessage('Rendered multitrack preview from preserved source blobs and project JSON.')
      } catch (error) {
        if (!cancelled) setErrorMessage(error.message || 'Unable to render multitrack preview')
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    }

    renderProject()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey])

  function updateActiveProject(nextProject) {
    const normalized = normalizeAudioLabProject(nextProject)
    setActiveProject(normalized)
    activeProjectRef.current = normalized
  }

  function updateProjectWithHistory(mutator, message = 'Project updated.') {
    const before = activeProjectRef.current
    if (!before) return
    const draft = stripProjectHistory(before)
    const changed = mutator(draft) || draft
    const next = commitProjectHistory(before, changed)
    updateActiveProject(next)
    setStatusMessage(message)
  }

  async function handleNewProject() {
    const project = await saveAudioLabProject(createEmptyAudioLabProject({ title: 'Untitled AudioLab Project' }))
    openProjectInState(project)
    setStatusMessage('New AudioLab project created. Import or record an audio source to start arranging tracks.')
    await refreshProjects(project.id)
  }

  async function handleOpenProject(id) {
    const project = await getAudioLabProject(id)
    if (!project) return
    openProjectInState(project)
    setStatusMessage(`Opened ${project.title || 'AudioLab project'}.`)
  }

  async function handleSaveProject(project = activeProjectRef.current) {
    if (!project) return null
    const saved = await saveAudioLabProject(project)
    openProjectInState(saved)
    await refreshProjects(saved.id)
    setStatusMessage('Project saved. Tracks, clips, and edit graph stored as lightweight JSON.')
    return saved
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

  async function attachAssetToProject(asset, sourceLabel = 'Imported') {
    const baseProject = activeProjectRef.current || createEmptyAudioLabProject({ title: asset.title })
    const selected = baseProject.transport?.selectedTrackId || baseProject.tracks?.[0]?.id || 'track-main'
    const tracks = baseProject.tracks?.length ? baseProject.tracks : [makeAudioLabTrack({ id: selected, name: 'Main Track' })]
    const nextTracks = tracks.map((track, index) => {
      if (track.id !== selected && index !== 0) return track
      if (track.id !== selected && tracks.some((item) => item.id === selected)) return track
      return {
        ...track,
        clips: [
          ...(track.clips || []),
          makeAudioLabClip(asset, { timelineStart: computeProjectDuration(baseProject) ? currentTime : 0 }),
        ],
      }
    })
    const title = baseProject.title === 'Untitled AudioLab Project' ? asset.title : baseProject.title
    const nextProject = normalizeAudioLabProject({
      ...baseProject,
      title,
      sourceAssets: [asset, ...(baseProject.sourceAssets || []).filter((item) => item.id !== asset.id)],
      tracks: nextTracks,
      episode: {
        ...(baseProject.episode || {}),
        title: baseProject.episode?.title && baseProject.episode.title !== 'Untitled AudioLab Project' ? baseProject.episode.title : title,
        slug: baseProject.episode?.slug || slugifyAudioLab(title),
        audioAssetId: asset.id,
      },
      transport: {
        ...(baseProject.transport || {}),
        selectedTrackId: selected,
      },
    })

    const saved = await saveAudioLabProject(nextProject)
    openProjectInState(saved)
    setSelectedAssetId(asset.id)
    setStatusMessage(`${sourceLabel} ${asset.filename}. Source preserved and inserted as a clip.`)
    await refreshProjects(saved.id)
    return saved
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!String(file.type || '').startsWith('audio/')) {
      setErrorMessage('Choose an audio file. The browser bureaucracy is strict today.')
      return
    }

    try {
      setErrorMessage('')
      setIsRendering(true)
      setStatusMessage(`Importing ${file.name}…`)
      const decoded = await decodeAudioBlob(file)
      const asset = await putAudioLabAssetFromFile(file, { duration: decoded.duration || 0 })
      await attachAssetToProject(asset, 'Imported')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to import audio')
    } finally {
      setIsRendering(false)
    }
  }

  function stopInputMeter() {
    if (recordingAnimationRef.current) {
      window.cancelAnimationFrame(recordingAnimationRef.current)
      recordingAnimationRef.current = 0
    }
    try { recordingSourceRef.current?.disconnect?.() } catch { /* ignore */ }
    try { recordingAudioContextRef.current?.close?.() } catch { /* ignore */ }
    recordingSourceRef.current = null
    recordingAnalyserRef.current = null
    recordingAudioContextRef.current = null
    setRecordLevel(0)
  }

  function releaseRecordingStream() {
    const stream = recordingStreamRef.current
    if (stream) stream.getTracks().forEach((track) => track.stop())
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
        stream = await window.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })
      } catch {
        stream = await window.navigator.mediaDevices.getUserMedia({ audio: true })
      }

      const preferredMimeType = getPreferredRecordingMimeType()
      const recorder = new window.MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined)
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
          setIsRendering(false)
        })
      }

      recorder.start(1000)
      setRecordStatus('recording')
      setStatusMessage('Recording. The microphone is now doing something useful for once.')
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
    if (recorder.state === 'recording' && recordingStartedAtRef.current) recordingAccumulatedMsRef.current += Date.now() - recordingStartedAtRef.current
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
      setIsRendering(true)
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
      await attachAssetToProject(asset, 'Recorded')
      setRecordStatus('ready')
      setRecordElapsed(decoded.duration || recordElapsed || 0)
      setStatusMessage(`Recorded ${asset.filename}. Raw take preserved and inserted as a clip.`)
    } finally {
      cleanupRecordingResources({ clearChunks: true })
      setIsRendering(false)
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
    const nextTime = clampAudioTime(value, duration || computeProjectDuration(activeProject))
    if (audioRef.current) audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
    if (activeProjectRef.current) {
      updateActiveProject({
        ...activeProjectRef.current,
        transport: { ...(activeProjectRef.current.transport || {}), playhead: nextTime },
      })
    }
  }

  function updateProjectFields(fields) {
    if (!activeProjectRef.current) return
    updateActiveProject({ ...activeProjectRef.current, ...fields })
  }

  function updateEpisodeFields(fields) {
    const project = activeProjectRef.current
    if (!project) return
    const nextEpisode = { ...(project.episode || {}), ...fields }
    if (fields.title && !fields.slug) nextEpisode.slug = slugifyAudioLab(fields.title)
    updateActiveProject({ ...project, episode: nextEpisode })
  }

  function handleLegacyEdit(type) {
    if (!activeProjectRef.current || !selectedAsset?.id || !selection.hasSelection) return
    updateProjectWithHistory((project) => ({
      ...project,
      edits: [...(project.edits || []), makeAudioEditOperation(type, selectedAsset.id, selection.start, selection.end)],
      transport: { ...(project.transport || {}), selectionStart: 0, selectionEnd: 0 },
    }), `${type[0].toUpperCase()}${type.slice(1)} edit added. Preview re-rendering from original sources.`)
    setSelectionRange({ start: 0, end: 0 })
  }

  function handleUndo() {
    const project = activeProjectRef.current
    const history = Array.isArray(project?.history) ? project.history : []
    const previous = history[history.length - 1]
    if (!previous?.tracks) return
    updateActiveProject(normalizeAudioLabProject({
      ...previous,
      history: history.slice(0, -1),
      redoStack: [stripProjectHistory(project), ...(project.redoStack || [])].slice(0, 30),
    }))
    setStatusMessage('Undo applied. Multitrack preview re-rendering.')
  }

  function handleRedo() {
    const project = activeProjectRef.current
    const redoStack = Array.isArray(project?.redoStack) ? project.redoStack : []
    const next = redoStack[0]
    if (!next?.tracks) return
    updateActiveProject(normalizeAudioLabProject({
      ...next,
      history: [...(project.history || []), stripProjectHistory(project)].slice(-30),
      redoStack: redoStack.slice(1),
    }))
    setStatusMessage('Redo applied. Multitrack preview re-rendering.')
  }

  async function handleExportWav() {
    if (!renderedBuffer) return
    try {
      setErrorMessage('')
      setIsRendering(true)
      const wav = encodeWav(renderedBuffer)
      const filename = makeAudioDownloadName(activeProject?.title || 'audiolab-mixdown', 'wav')
      downloadBlob(wav, filename)
      setStatusMessage(`Exported ${filename}. This is the multitrack mixdown. Originals remain untouched.`)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to export WAV')
    } finally {
      setIsRendering(false)
    }
  }

  function handleAddTrack() {
    updateProjectWithHistory((project) => {
      const track = makeAudioLabTrack({ name: `Audio Track ${(project.tracks?.length || 0) + 1}` })
      return { ...project, tracks: [...(project.tracks || []), track], transport: { ...(project.transport || {}), selectedTrackId: track.id } }
    }, 'Track added.')
  }

  function handleUpdateTrack(trackId, patch) {
    updateProjectWithHistory((project) => ({
      ...project,
      tracks: (project.tracks || []).map((track) => track.id === trackId ? { ...track, ...patch, gain: patch.gain ?? track.gain, pan: patch.pan ?? track.pan } : track),
      transport: { ...(project.transport || {}), selectedTrackId: trackId },
    }), 'Track updated.')
  }

  function handleDeleteTrack(trackId) {
    const track = activeProjectRef.current?.tracks?.find((item) => item.id === trackId)
    if (track?.clips?.length) return
    updateProjectWithHistory((project) => {
      const tracks = (project.tracks || []).filter((item) => item.id !== trackId)
      return { ...project, tracks, transport: { ...(project.transport || {}), selectedTrackId: tracks[0]?.id || '', selectedClipId: '' } }
    }, 'Empty track deleted.')
  }

  function handleDuplicateTrack(trackId) {
    const track = activeProjectRef.current?.tracks?.find((item) => item.id === trackId)
    if (!track) return
    updateProjectWithHistory((project) => {
      const copy = makeAudioLabTrack({ ...track, id: makeAudioLabId('track'), name: `${track.name} Copy`, clips: (track.clips || []).map((clip) => ({ ...clip, id: makeAudioLabId('clip') })) })
      return { ...project, tracks: [...(project.tracks || []), copy], transport: { ...(project.transport || {}), selectedTrackId: copy.id, selectedClipId: '' } }
    }, 'Track duplicated.')
  }

  function handleSelectTrack(trackId) {
    const project = activeProjectRef.current
    if (!project) return
    updateActiveProject({ ...project, transport: { ...(project.transport || {}), selectedTrackId: trackId } })
  }

  function handleSelectClip(trackId, clipId) {
    const project = activeProjectRef.current
    if (!project) return
    const clip = project.tracks?.find((track) => track.id === trackId)?.clips?.find((item) => item.id === clipId)
    updateActiveProject({
      ...project,
      transport: {
        ...(project.transport || {}),
        selectedTrackId: trackId,
        selectedClipId: clipId,
        playhead: clip?.timelineStart ?? project.transport?.playhead ?? 0,
      },
    })
    if (clip) setSelectedAssetId(clip.assetId)
  }

  function handleAddAssetToTrack(assetId) {
    const asset = activeProjectRef.current?.sourceAssets?.find((item) => item.id === assetId)
    if (!asset) return
    updateProjectWithHistory((project) => {
      const tracks = project.tracks?.length ? project.tracks : [makeAudioLabTrack({ name: 'Main Track' })]
      const targetId = project.transport?.selectedTrackId || tracks[0].id
      return {
        ...project,
        tracks: tracks.map((track) => track.id === targetId ? { ...track, clips: [...(track.clips || []), makeAudioLabClip(asset, { timelineStart: currentTime || computeProjectDuration(project) || 0 })] } : track),
        transport: { ...(project.transport || {}), selectedTrackId: targetId },
      }
    }, 'Source added as a clip.')
  }

  function handleUpdateSelectedClip(patch) {
    if (!selectedClip || !selectedTrack) return
    updateProjectWithHistory((project) => ({
      ...project,
      tracks: (project.tracks || []).map((track) => track.id !== selectedTrack.id ? track : {
        ...track,
        clips: (track.clips || []).map((clip) => clip.id === selectedClip.id ? { ...clip, ...patch } : clip),
      }),
    }), 'Clip updated.')
  }

  function handleDeleteSelectedClip() {
    if (!selectedClip || !selectedTrack) return
    updateProjectWithHistory((project) => ({
      ...project,
      tracks: (project.tracks || []).map((track) => track.id !== selectedTrack.id ? track : { ...track, clips: (track.clips || []).filter((clip) => clip.id !== selectedClip.id) }),
      transport: { ...(project.transport || {}), selectedClipId: '' },
    }), 'Clip deleted.')
  }

  function handleSplitSelectedClip() {
    if (!selectedClip || !selectedTrack) return
    const clipStart = Number(selectedClip.timelineStart || 0)
    const splitOffset = currentTime - clipStart
    const clipDuration = getClipDuration(selectedClip)
    if (splitOffset <= 0.02 || splitOffset >= clipDuration - 0.02) {
      setErrorMessage('Move the playhead inside the selected clip before splitting.')
      return
    }

    updateProjectWithHistory((project) => ({
      ...project,
      tracks: (project.tracks || []).map((track) => track.id !== selectedTrack.id ? track : {
        ...track,
        clips: (track.clips || []).flatMap((clip) => {
          if (clip.id !== selectedClip.id) return [clip]
          const first = { ...clip, sourceEnd: Number(clip.sourceStart || 0) + splitOffset }
          const second = { ...clip, id: makeAudioLabId('clip'), timelineStart: currentTime, sourceStart: Number(clip.sourceStart || 0) + splitOffset, name: `${clip.name} split` }
          return [first, second]
        }),
      }),
    }), 'Clip split at playhead.')
  }

  function handleMoveClipToTrack(targetTrackId) {
    if (!selectedClip || !selectedTrack || targetTrackId === selectedTrack.id) return
    updateProjectWithHistory((project) => ({
      ...project,
      tracks: (project.tracks || []).map((track) => {
        if (track.id === selectedTrack.id) return { ...track, clips: (track.clips || []).filter((clip) => clip.id !== selectedClip.id) }
        if (track.id === targetTrackId) return { ...track, clips: [...(track.clips || []), selectedClip] }
        return track
      }),
      transport: { ...(project.transport || {}), selectedTrackId: targetTrackId, selectedClipId: selectedClip.id },
    }), 'Clip moved to another track.')
  }

  function handleStartClipDrag(event, trackId, clip) {
    event.preventDefault()
    event.stopPropagation()
    const before = activeProjectRef.current
    if (!before) return
    handleSelectClip(trackId, clip.id)
    const startX = event.clientX
    const startTime = Number(clip.timelineStart || 0)
    clipDragRef.current = { before: stripProjectHistory(before), trackId, clipId: clip.id, startX, startTime }

    const handleMove = (moveEvent) => {
      const drag = clipDragRef.current
      if (!drag || !activeProjectRef.current) return
      const delta = (moveEvent.clientX - drag.startX) / timelinePixelsPerSecond
      const nextStart = Math.max(0, drag.startTime + delta)
      const project = activeProjectRef.current
      updateActiveProject({
        ...project,
        tracks: (project.tracks || []).map((track) => track.id !== drag.trackId ? track : {
          ...track,
          clips: (track.clips || []).map((item) => item.id === drag.clipId ? { ...item, timelineStart: nextStart } : item),
        }),
      })
    }

    const handleUp = () => {
      const drag = clipDragRef.current
      clipDragRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      if (drag && activeProjectRef.current) {
        updateActiveProject(commitProjectHistory(drag.before, activeProjectRef.current))
        setStatusMessage('Clip moved on the timeline.')
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
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
        relatedAssets: [{
          type: 'audiolab-project',
          projectId: project.id,
          assetId: asset?.id || '',
          filename: asset?.filename || '',
          duration: duration || asset?.duration || 0,
          source: asset?.source || '',
          tracks: project.tracks?.length || 0,
          clips: (project.tracks || []).reduce((sum, track) => sum + (track.clips?.length || 0), 0),
          note: 'Audio sources are preserved in local AudioLab IndexedDB storage. Phase 4 exports a local multitrack WAV, but server upload is not added yet.',
        }],
      }

      const result = await upsertNativeEntryWithMeta(items, payload, 'AudioLab episode draft')
      const nextProject = await saveAudioLabProject({
        ...project,
        episode: { ...episode, title, slug: payload.slug, description, status: 'draft', nativeEntryId: result.item.id, nativeEntrySlug: result.item.slug, updatedAt: new Date().toISOString() },
      })
      openProjectInState(nextProject)
      await refreshProjects(nextProject.id)
      setStatusMessage(result.synced ? 'Episode draft attached and synced.' : 'Episode draft attached locally. Remote sync can catch up later.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to attach episode draft')
    }
  }

  const episodeEditLink = activeProject?.episode?.nativeEntryId
    ? `${adminRoutes.nativeBridge}?edit=${encodeURIComponent(activeProject.episode.nativeEntryId)}`
    : `${adminRoutes.nativeBridge}?new=podcast`
  const canUndo = Boolean(activeProject?.history?.some((entry) => entry?.tracks))
  const canRedo = Boolean(activeProject?.redoStack?.some((entry) => entry?.tracks))
  const totalClips = (activeProject?.tracks || []).reduce((sum, track) => sum + (track.clips?.length || 0), 0)

  return (
    <AdminFrame>
      <main className="page wp-admin-screen audio-lab-page">
        <div className="wp-screen-header audio-lab-header">
          <div>
            <p className="audio-lab-eyebrow">Native SabotPress audio desk</p>
            <h1>AudioLab</h1>
            <p className="description">Phase 4: multitrack timeline, clip management, mute/solo/gain/pan, mixdown preview, WAV export, and episode draft attachment.</p>
          </div>
          <div className="review-card__actions">
            <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>Import Audio</button>
            <button type="button" className="button button--primary" onClick={() => handleSaveProject()} disabled={!activeProject}>Save Project</button>
          </div>
        </div>

        <input ref={fileInputRef} className="audio-lab-file-input" type="file" accept="audio/*" onChange={handleImportFile} />
        {errorMessage ? <p className="notice notice-error audio-lab-notice">{errorMessage}</p> : null}
        {statusMessage ? <p className="notice notice-info audio-lab-notice">{statusMessage}</p> : null}

        <section className="audio-lab-workbench audio-lab-workbench--phase4">
          <ProjectSidebar projects={projects} activeProjectId={activeProject?.id || ''} onNewProject={handleNewProject} onOpenProject={handleOpenProject} />

          <section className="audio-lab-editor" aria-label="Audio editor">
            <div className="audio-lab-project-strip">
              <label className="audio-lab-field"><span>Project title</span><input value={activeProject?.title || ''} placeholder="Untitled AudioLab Project" onChange={(event) => updateProjectFields({ title: event.target.value })} /></label>
              <div className="audio-lab-source-picker"><span>Selected source</span>{activeProject?.sourceAssets?.length ? <select value={selectedAsset?.id || ''} onChange={(event) => setSelectedAssetId(event.target.value)}>{activeProject.sourceAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.filename}</option>)}</select> : <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>Choose audio</button>}</div>
            </div>

            <RecordPanel canRecord={recorderSupported} recordStatus={recordStatus} recordMimeType={recordMimeType} recordElapsed={recordElapsed} recordLevel={recordLevel} canPauseRecording={canPauseRecording} onStart={handleStartRecording} onPause={handlePauseRecording} onResume={handleResumeRecording} onStop={handleStopRecording} />

            <SelectionToolbar selection={selection} duration={duration} edits={selectedEdits} canUndo={canUndo} canRedo={canRedo} isRendering={isRendering} hasAudio={Boolean(activeProject?.sourceAssets?.length)} onSelectionChange={updateSelection} onClear={() => updateSelection(0, 0)} onSelectAll={() => updateSelection(0, duration || 0)} onEdit={handleLegacyEdit} onUndo={handleUndo} onRedo={handleRedo} onExport={handleExportWav} />

            <div className="audio-lab-transport" aria-label="Playback transport">
              <button type="button" className="button button--primary audio-lab-play" onClick={handleTransportToggle} disabled={!audioUrl || isRendering}>{isPlaying ? 'Pause' : 'Play'}</button>
              <button type="button" className="button" onClick={() => handleSeek(0)} disabled={!audioUrl}>Stop</button>
              <div className="audio-lab-time-readout"><strong>{formatAudioLabDuration(currentTime)}</strong><span>/ {formatAudioLabDuration(duration)}</span></div>
              <input className="audio-lab-seeker" type="range" min="0" max={duration || 0} step="0.01" value={Math.min(currentTime, duration || 0)} onChange={(event) => handleSeek(event.target.value)} disabled={!audioUrl} aria-label="Seek audio timeline" />
            </div>

            <div className="audio-lab-timeline-shell">
              <div className="audio-lab-ruler"><span>Mix overview</span><span>{isRendering ? 'Rendering…' : `${activeProject?.tracks?.length || 0} tracks · ${totalClips} clips`}</span><span>{formatAudioLabDuration(duration || 0)}</span></div>
              <WaveformCanvas peaks={peaks} duration={duration} currentTime={currentTime} selectionStart={selection.start} selectionEnd={selection.end} isLoading={isRendering} onSeek={handleSeek} onSelectionChange={updateSelection} />
              <MultitrackTimeline project={activeProject} duration={duration} currentTime={currentTime} selection={selection} selectedTrackId={selectedTrackId} selectedClipId={selectedClipId} onAddTrack={handleAddTrack} onSelectTrack={handleSelectTrack} onSelectClip={handleSelectClip} onUpdateTrack={handleUpdateTrack} onDeleteTrack={handleDeleteTrack} onDuplicateTrack={handleDuplicateTrack} onStartClipDrag={handleStartClipDrag} />
            </div>

            <audio ref={audioRef} src={audioUrl} preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || duration || 0)} />
          </section>

          <aside className="audio-lab-project-sidebar" aria-label="Project details">
            <SourceBin assets={activeProject?.sourceAssets || []} selectedTrackId={selectedTrackId} onAddToTrack={handleAddAssetToTrack} />
            <ClipInspector project={activeProject} selectedTrack={selectedTrack} selectedClip={selectedClip} assets={activeProject?.sourceAssets || []} currentTime={currentTime} onUpdateClip={handleUpdateSelectedClip} onDeleteClip={handleDeleteSelectedClip} onSplitClip={handleSplitSelectedClip} onMoveClipToTrack={handleMoveClipToTrack} />

            <section className="audio-lab-panel">
              <p className="audio-lab-eyebrow">Project JSON</p>
              <h2>Preserved source model</h2>
              <dl className="audio-lab-facts">
                <div><dt>Project ID</dt><dd>{activeProject?.id || '—'}</dd></div>
                <div><dt>Sources</dt><dd>{activeProject?.sourceAssets?.length || 0}</dd></div>
                <div><dt>Tracks</dt><dd>{activeProject?.tracks?.length || 0}</dd></div>
                <div><dt>Clips</dt><dd>{totalClips}</dd></div>
                <div><dt>Edits</dt><dd>{activeProject?.edits?.length || 0}</dd></div>
                <div><dt>Undo</dt><dd>{activeProject?.history?.length || 0}</dd></div>
              </dl>
              <p className="description">Phase 4 stores tracks, clips, mute, solo, gain, pan, and source ranges as JSON. Audio blobs stay in IndexedDB. The preview and export are rendered mixdowns.</p>
            </section>

            <section className="audio-lab-panel">
              <p className="audio-lab-eyebrow">Episode attachment</p>
              <h2>Podcast draft</h2>
              <label className="audio-lab-field"><span>Episode title</span><input value={activeProject?.episode?.title || ''} onChange={(event) => updateEpisodeFields({ title: event.target.value })} /></label>
              <label className="audio-lab-field"><span>Slug</span><input value={activeProject?.episode?.slug || ''} onChange={(event) => updateEpisodeFields({ slug: slugifyAudioLab(event.target.value) })} /></label>
              <label className="audio-lab-field"><span>Description / show notes</span><textarea rows={7} value={activeProject?.episode?.description || ''} onChange={(event) => updateEpisodeFields({ description: event.target.value })} /></label>
              <button type="button" className="button button--primary" onClick={handleCreateEpisodeDraft} disabled={!activeProject || !activeProject.sourceAssets?.length}>Attach Podcast Draft</button>
              {activeProject?.episode?.nativeEntryId ? <Link className="button audio-lab-edit-episode" to={episodeEditLink}>Open attached draft</Link> : null}
            </section>
          </aside>
        </section>
      </main>
    </AdminFrame>
  )
}
