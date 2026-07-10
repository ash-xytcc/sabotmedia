import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { adminRoutes } from '../routing/routes'
import {
  createAudioLabEpisodeDraft,
  createEmptyAudioLabProject,
  formatAudioLabDuration,
  getAudioLabAsset,
  getAudioLabProject,
  listAudioLabProjects,
  makeSingleTrackForAsset,
  putAudioLabAssetFromFile,
  saveAudioLabProject,
  slugifyAudioLab,
} from '../lib/audioLabStore'
import {
  createEmptyNativeEntry,
  loadNativeCollection,
  upsertNativeEntryWithMeta,
} from '../lib/nativePublicContent'

const waveformPeakCount = 1100

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

function WaveformCanvas({ peaks, duration, currentTime, onSeek, isLoading }) {
  const canvasRef = useRef(null)

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
        context.fillText(isLoading ? 'Decoding waveform…' : 'Import audio to generate waveform', width / 2, mid)
        return
      }

      const barWidth = Math.max(1, width / peaks.length)
      context.fillStyle = '#72aee6'
      peaks.forEach((peak, index) => {
        const x = index * barWidth
        const barHeight = Math.max(1, peak * usable * 0.5)
        context.fillRect(x, mid - barHeight, Math.max(1, barWidth * 0.72), barHeight * 2)
      })

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
  }, [peaks, duration, currentTime, isLoading])

  return (
    <canvas
      ref={canvasRef}
      className="audio-lab-waveform"
      role="img"
      aria-label="Audio waveform timeline"
      onClick={(event) => {
        if (!duration || typeof onSeek !== 'function') return
        const rect = event.currentTarget.getBoundingClientRect()
        const pct = (event.clientX - rect.left) / Math.max(1, rect.width)
        onSeek(Math.max(0, Math.min(duration, pct * duration)))
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
          <p className="audio-lab-empty">No projects yet. Import a file or create a new project.</p>
        )}
      </div>
    </aside>
  )
}

export function AudioLabPage() {
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)
  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [peaks, setPeaks] = useState([])
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [statusMessage, setStatusMessage] = useState('AudioLab Phase 1 is ready. Import audio to start a native project.')
  const [errorMessage, setErrorMessage] = useState('')

  async function refreshProjects(selectId = '') {
    const loaded = await listAudioLabProjects()
    setProjects(loaded)

    if (selectId) {
      const project = await getAudioLabProject(selectId)
      if (project) {
        setActiveProject(project)
        setSelectedAssetId(project.episode?.audioAssetId || project.sourceAssets?.[0]?.id || '')
      }
      return
    }

    if (!activeProject && loaded[0]) {
      const project = await getAudioLabProject(loaded[0].id)
      setActiveProject(project)
      setSelectedAssetId(project?.episode?.audioAssetId || project?.sourceAssets?.[0]?.id || '')
    }
  }

  useEffect(() => {
    refreshProjects().catch((error) => {
      setErrorMessage(error.message || 'Unable to load AudioLab projects')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedAsset = useMemo(() => {
    if (!activeProject?.sourceAssets?.length) return null
    return activeProject.sourceAssets.find((asset) => asset.id === selectedAssetId) || activeProject.sourceAssets[0]
  }, [activeProject, selectedAssetId])

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''

    async function loadSelectedAudio() {
      setCurrentTime(0)
      setIsPlaying(false)
      setPeaks([])
      setAudioUrl('')
      setDuration(selectedAsset?.duration || 0)

      if (!selectedAsset?.id) return

      try {
        setIsDecoding(true)
        setErrorMessage('')
        const stored = await getAudioLabAsset(selectedAsset.id)
        const blob = stored?.blob
        if (!blob) throw new Error('The original audio blob is missing from local AudioLab storage')

        objectUrl = URL.createObjectURL(blob)
        const decoded = await decodeAudioBlob(blob)
        const nextPeaks = buildWaveformPeaks(decoded)

        if (cancelled) return
        setAudioUrl(objectUrl)
        setPeaks(nextPeaks)
        setDuration(decoded.duration || selectedAsset.duration || 0)
        setStatusMessage(`Loaded ${selectedAsset.filename}. Original source preserved. Edits are project JSON only.`)
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.message || 'Unable to decode audio')
        }
      } finally {
        if (!cancelled) setIsDecoding(false)
      }
    }

    loadSelectedAudio()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [selectedAsset?.id])

  async function handleNewProject() {
    const project = await saveAudioLabProject(createEmptyAudioLabProject({ title: 'Untitled AudioLab Project' }))
    setActiveProject(project)
    setSelectedAssetId('')
    setStatusMessage('New AudioLab project created. Import an audio source to build the waveform.')
    await refreshProjects(project.id)
  }

  async function handleOpenProject(id) {
    const project = await getAudioLabProject(id)
    if (!project) return
    setActiveProject(project)
    setSelectedAssetId(project.episode?.audioAssetId || project.sourceAssets?.[0]?.id || '')
    setStatusMessage(`Opened ${project.title || 'AudioLab project'}.`)
  }

  async function handleSaveProject(project = activeProject) {
    if (!project) return null
    const saved = await saveAudioLabProject(project)
    setActiveProject(saved)
    await refreshProjects(saved.id)
    setStatusMessage('Project saved. Originals preserved. Edit graph stored as JSON.')
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
      const baseProject = activeProject || createEmptyAudioLabProject({ title: asset.title })
      const title = baseProject.title === 'Untitled AudioLab Project' ? asset.title : baseProject.title
      const nextProject = {
        ...baseProject,
        title,
        sourceAssets: [asset, ...(baseProject.sourceAssets || []).filter((item) => item.id !== asset.id)],
        tracks: makeSingleTrackForAsset(asset),
        edits: Array.isArray(baseProject.edits) ? baseProject.edits : [],
        episode: {
          ...(baseProject.episode || {}),
          title: baseProject.episode?.title && baseProject.episode.title !== 'Untitled AudioLab Project' ? baseProject.episode.title : title,
          slug: baseProject.episode?.slug || slugifyAudioLab(title),
          audioAssetId: asset.id,
        },
      }

      const saved = await saveAudioLabProject(nextProject)
      setActiveProject(saved)
      setSelectedAssetId(asset.id)
      setPeaks(buildWaveformPeaks(decoded))
      setDuration(decoded.duration || 0)
      setStatusMessage(`Imported ${asset.filename}. Waveform generated from the preserved original.`)
      await refreshProjects(saved.id)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to import audio')
    } finally {
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
    const nextTime = Math.max(0, Math.min(duration || 0, Number(value) || 0))
    if (audioRef.current) audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  function updateProjectFields(fields) {
    if (!activeProject) return
    setActiveProject({ ...activeProject, ...fields })
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

    setActiveProject({ ...activeProject, episode: nextEpisode })
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
        podcastDuration: formatAudioLabDuration(asset?.duration || duration || 0),
        podcastSummary: description,
        relatedAssets: [
          {
            type: 'audiolab-project',
            projectId: project.id,
            assetId: asset?.id || '',
            filename: asset?.filename || '',
            duration: asset?.duration || duration || 0,
            note: 'Audio source is preserved in local AudioLab IndexedDB storage until an export/upload pipeline is added.',
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

  return (
    <AdminFrame>
      <main className="page wp-admin-screen audio-lab-page">
        <div className="wp-screen-header audio-lab-header">
          <div>
            <p className="audio-lab-eyebrow">Native SabotPress audio desk</p>
            <h1>AudioLab</h1>
            <p className="description">Phase 1: import, waveform rendering, playback transport, project save/reopen, and episode draft attachment.</p>
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
                  <select value={selectedAsset?.id || ''} onChange={(event) => setSelectedAssetId(event.target.value)}>
                    {activeProject.sourceAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.filename}</option>
                    ))}
                  </select>
                ) : (
                  <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>Choose audio</button>
                )}
              </div>
            </div>

            <div className="audio-lab-transport" aria-label="Playback transport">
              <button type="button" className="button button--primary audio-lab-play" onClick={handleTransportToggle} disabled={!audioUrl}>
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
                  <small>{selectedAsset ? `${formatBytes(selectedAsset.size)} · ${formatAudioLabDuration(selectedAsset.duration || duration)}` : 'Import audio'}</small>
                </div>
                <WaveformCanvas peaks={peaks} duration={duration} currentTime={currentTime} isLoading={isDecoding} onSeek={handleSeek} />
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
              </dl>
              <p className="description">Phase 1 does not destructively edit audio. The original file stays in IndexedDB. The project stores references, timeline data, and future edit operations as JSON. Sensible for once.</p>
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
