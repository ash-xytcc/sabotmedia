import {
  getAudioLabProject,
  listAudioLabProjects,
  makeAudioLabId,
  normalizeAudioLabProject,
  saveAudioLabProject,
} from './lib/audioLabStore'

const MIN_REGION_SECONDS = 0.03
const DIRECT_MODES = new Set(['select', 'move', 'gain'])

function isAudioLabRoute() {
  return typeof window !== 'undefined' && /\/wp-admin\/audiolab(?:\/|$)/.test(window.location.pathname)
}

function page() {
  return document.querySelector('.audio-lab-page')
}

function shell() {
  return document.querySelector('.audio-lab-timeline-shell')
}

function audioElement() {
  return page()?.querySelector('audio') || null
}

function parseTime(value = '') {
  const cleaned = String(value || '').replace('/', '').trim()
  const parts = cleaned.split(':').map(Number)
  if (parts.some((part) => !Number.isFinite(part))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return Number(cleaned) || 0
}

function formatTime(seconds = 0) {
  const safe = Math.max(0, Number(seconds) || 0)
  const mins = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  const hundredths = Math.floor((safe % 1) * 100)
  return `${mins}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`
}

function currentTime() {
  const audio = audioElement()
  if (audio && Number.isFinite(audio.currentTime)) return Math.max(0, audio.currentTime)
  return parseTime(page()?.querySelector('.audio-lab-time-readout strong')?.textContent || '')
}

function durationSeconds() {
  const audio = audioElement()
  if (audio && Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration
  const readout = page()?.querySelector('.audio-lab-time-readout span')?.textContent || ''
  return parseTime(readout)
}

function selectionInputs() {
  const fields = Array.from(page()?.querySelectorAll('.audio-lab-selection-fields input') || [])
  return { start: fields[0] || null, end: fields[1] || null }
}

function getSelection() {
  const { start, end } = selectionInputs()
  const a = Number(start?.value || 0)
  const b = Number(end?.value || 0)
  return {
    start: Math.max(0, Math.min(a, b)),
    end: Math.max(0, Math.max(a, b)),
  }
}

function hasSelection(selection = getSelection()) {
  return selection.end - selection.start > MIN_REGION_SECONDS
}

function setNativeValue(input, value) {
  if (!input) return
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  if (setter) setter.call(input, String(value))
  else input.value = String(value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function setSelection(start, end) {
  const inputs = selectionInputs()
  setNativeValue(inputs.start, Number(start || 0).toFixed(2))
  setNativeValue(inputs.end, Number(end || 0).toFixed(2))
}

function findButton(text) {
  const target = String(text || '').trim().toLowerCase()
  return Array.from(page()?.querySelectorAll('button, .button') || [])
    .find((button) => String(button.textContent || button.getAttribute('aria-label') || '').trim().toLowerCase() === target && !button.disabled)
}

function findLabeledInput(labelText) {
  const needle = String(labelText || '').toLowerCase()
  return Array.from(page()?.querySelectorAll('.audio-lab-project-sidebar label') || [])
    .find((label) => String(label.textContent || '').toLowerCase().includes(needle))
    ?.querySelector('input') || null
}

function selectedClipButton() {
  return page()?.querySelector('.audio-lab-clip.is-selected') || null
}

function ensureClipSelected() {
  if (selectedClipButton()) return true
  const first = page()?.querySelector('.audio-lab-clip')
  if (!first) return false
  first.click()
  return false
}

function timelineStartInput() {
  ensureClipSelected()
  return findLabeledInput('Timeline start')
}

function clipGainInput() {
  ensureClipSelected()
  return findLabeledInput('Clip gain')
}

function setClipTimelineStart(value) {
  const input = timelineStartInput()
  if (!input) return false
  setNativeValue(input, Math.max(0, Number(value) || 0).toFixed(2))
  return true
}

function bumpClipGain(multiplier) {
  const input = clipGainInput()
  if (!input) return false
  const current = Math.max(0, Number(input.value || 1) || 1)
  const next = Math.max(0, Math.min(6, current * multiplier))
  setNativeValue(input, next.toFixed(2))
  showStatus(`Selected clip gain ${next.toFixed(2)}x`)
  return true
}

function setMode(mode) {
  const root = page()
  const safe = DIRECT_MODES.has(mode) ? mode : 'select'
  if (root) root.dataset.audiolabDirectMode = safe
  toolbar()?.querySelectorAll('[data-direct-mode]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.directMode === safe)
  })
  showStatus(safe === 'select' ? 'Drag waveform to select. Use the direct buttons for edits.' : safe === 'move' ? 'Move mode: drag the waveform horizontally to move the selected clip.' : 'Gain mode: drag up/down on the waveform to make the selection or selected clip louder/quieter.')
}

function getMode() {
  return page()?.dataset.audiolabDirectMode || 'select'
}

function toolbar() {
  return page()?.querySelector('.audio-lab-direct-toolbar') || null
}

function showStatus(message) {
  const note = toolbar()?.querySelector('.audio-lab-direct-toolbar__status')
  if (note) note.textContent = message
}

function stripProjectHistory(project) {
  return JSON.parse(JSON.stringify({ ...project, history: [], redoStack: [] }))
}

function withHistory(before, next) {
  return normalizeAudioLabProject({
    ...next,
    history: [...(before.history || []), stripProjectHistory(before)].slice(-30),
    redoStack: [],
  })
}

async function saveVisibleProject() {
  findButton('Save Project')?.click?.()
  await new Promise((resolve) => window.setTimeout(resolve, 650))
}

async function activeSavedProject() {
  const params = new URLSearchParams(window.location.search || '')
  const id = params.get('project') || ''
  if (id) {
    const project = await getAudioLabProject(id)
    if (project) return project
  }
  const projects = await listAudioLabProjects()
  return projects[0] || null
}

function clipDuration(clip = {}) {
  return Math.max(0, Number(clip.sourceEnd || 0) - Number(clip.sourceStart || 0))
}

function clipRange(clip = {}) {
  const start = Math.max(0, Number(clip.timelineStart || 0))
  return { start, end: start + clipDuration(clip) }
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return Math.min(aEnd, bEnd) - Math.max(aStart, bStart) > MIN_REGION_SECONDS
}

function findTargetClip(project, selection = getSelection()) {
  const selectedTrackId = project.transport?.selectedTrackId || ''
  const selectedClipId = project.transport?.selectedClipId || ''
  for (const track of project.tracks || []) {
    for (const clip of track.clips || []) {
      const range = clipRange(clip)
      if (track.id === selectedTrackId && clip.id === selectedClipId) return { track, clip, range }
    }
  }
  for (const track of project.tracks || []) {
    for (const clip of track.clips || []) {
      const range = clipRange(clip)
      if (hasSelection(selection) && rangesOverlap(selection.start, selection.end, range.start, range.end)) return { track, clip, range }
    }
  }
  const track = project.tracks?.[0]
  const clip = track?.clips?.[0]
  return clip ? { track, clip, range: clipRange(clip) } : null
}

function makeClipPiece(clip, patch = {}, id = clip.id) {
  return {
    ...clip,
    ...patch,
    id,
  }
}

function splitSelectionIntoClip(project, selection = getSelection()) {
  if (!hasSelection(selection)) throw new Error('Select a region first.')
  const target = findTargetClip(project, selection)
  if (!target) throw new Error('No clip overlaps the selected region.')
  const { track: targetTrack, clip: targetClip, range } = target
  const relStart = Math.max(0, selection.start - range.start)
  const relEnd = Math.min(clipDuration(targetClip), selection.end - range.start)
  if (relEnd - relStart <= MIN_REGION_SECONDS) throw new Error('Selection is too small to split into a clip.')

  const sourceStart = Number(targetClip.sourceStart || 0)
  const segmentId = makeAudioLabId('clip')
  const pieces = []
  if (relStart > MIN_REGION_SECONDS) {
    pieces.push(makeClipPiece(targetClip, {
      sourceEnd: sourceStart + relStart,
      name: `${targetClip.name || 'Clip'} intro`,
    }))
  }
  pieces.push(makeClipPiece(targetClip, {
    id: segmentId,
    timelineStart: range.start + relStart,
    sourceStart: sourceStart + relStart,
    sourceEnd: sourceStart + relEnd,
    name: `${targetClip.name || 'Clip'} selection`,
  }, segmentId))
  if (relEnd < clipDuration(targetClip) - MIN_REGION_SECONDS) {
    pieces.push(makeClipPiece(targetClip, {
      id: makeAudioLabId('clip'),
      timelineStart: range.start + relEnd,
      sourceStart: sourceStart + relEnd,
      name: `${targetClip.name || 'Clip'} tail`,
    }, makeAudioLabId('clip')))
  }

  const next = {
    ...project,
    tracks: (project.tracks || []).map((track) => track.id !== targetTrack.id ? track : {
      ...track,
      clips: (track.clips || []).flatMap((clip) => clip.id === targetClip.id ? pieces : [clip]),
    }),
    transport: {
      ...(project.transport || {}),
      selectedTrackId: targetTrack.id,
      selectedClipId: segmentId,
      playhead: selection.start,
      selectionStart: 0,
      selectionEnd: 0,
    },
  }
  return { project: next, segmentId }
}

function cutSelectionFromClip(project, selection = getSelection()) {
  if (!hasSelection(selection)) throw new Error('Select a region first.')
  const target = findTargetClip(project, selection)
  if (!target) throw new Error('No clip overlaps the selected region.')
  const { track: targetTrack, clip: targetClip, range } = target
  const relStart = Math.max(0, selection.start - range.start)
  const relEnd = Math.min(clipDuration(targetClip), selection.end - range.start)
  const removed = relEnd - relStart
  if (removed <= MIN_REGION_SECONDS) throw new Error('Selection is too small to cut.')

  const sourceStart = Number(targetClip.sourceStart || 0)
  const pieces = []
  if (relStart > MIN_REGION_SECONDS) {
    pieces.push(makeClipPiece(targetClip, { sourceEnd: sourceStart + relStart }))
  }
  if (relEnd < clipDuration(targetClip) - MIN_REGION_SECONDS) {
    pieces.push(makeClipPiece(targetClip, {
      id: relStart > MIN_REGION_SECONDS ? makeAudioLabId('clip') : targetClip.id,
      timelineStart: range.start + relStart,
      sourceStart: sourceStart + relEnd,
      name: relStart > MIN_REGION_SECONDS ? `${targetClip.name || 'Clip'} tail` : targetClip.name,
    }, relStart > MIN_REGION_SECONDS ? makeAudioLabId('clip') : targetClip.id))
  }

  const next = {
    ...project,
    tracks: (project.tracks || []).map((track) => {
      if (track.id !== targetTrack.id) return track
      return {
        ...track,
        clips: (track.clips || []).flatMap((clip) => {
          if (clip.id === targetClip.id) return pieces
          if (Number(clip.timelineStart || 0) >= selection.end) return [{ ...clip, timelineStart: Math.max(0, Number(clip.timelineStart || 0) - removed) }]
          return [clip]
        }),
      }
    }),
    transport: {
      ...(project.transport || {}),
      selectedClipId: pieces[0]?.id || '',
      playhead: selection.start,
      selectionStart: 0,
      selectionEnd: 0,
    },
  }
  return { project: next }
}

async function saveProjectTransform(transform, successMessage) {
  await saveVisibleProject()
  const before = await activeSavedProject()
  if (!before) throw new Error('No AudioLab project is open.')
  const result = transform(before)
  const nextProject = withHistory(before, result.project || result)
  const saved = await saveAudioLabProject(nextProject)
  showStatus(successMessage || 'Direct edit saved. Reloading editor…')
  window.setTimeout(() => {
    window.location.href = `/wp-admin/audiolab?project=${encodeURIComponent(saved.id)}`
  }, 250)
}

async function cutSelection() {
  const selection = getSelection()
  await saveProjectTransform((project) => cutSelectionFromClip(project, selection), `Cut ${formatTime(selection.start)}–${formatTime(selection.end)}. Reloading…`)
}

async function cutStartToPlayhead() {
  const end = Math.max(currentTime(), getSelection().end)
  if (end <= MIN_REGION_SECONDS) throw new Error('Move the playhead to the end of the dead silence first.')
  setSelection(0, end)
  await saveProjectTransform((project) => cutSelectionFromClip(project, { start: 0, end }), `Removed start silence through ${formatTime(end)}. Reloading…`)
}

async function makeSelectionClip() {
  const selection = getSelection()
  await saveProjectTransform((project) => splitSelectionIntoClip(project, selection), `Selection became a movable clip. Reloading…`)
}

async function addSelectionGain(gainDb) {
  const selection = getSelection()
  if (!hasSelection(selection)) {
    if (bumpClipGain(gainDb > 0 ? 1.18 : 0.85)) return
    throw new Error('Select a region or clip first.')
  }
  await saveProjectTransform((project) => ({
    ...project,
    effects: [
      ...(project.effects || []),
      {
        id: makeAudioLabId('effect'),
        type: 'amplify',
        scope: 'selection',
        start: selection.start,
        end: selection.end,
        params: { gainDb },
        enabled: true,
        createdAt: new Date().toISOString(),
      },
    ],
  }), `${gainDb > 0 ? 'Boosted' : 'Lowered'} selected region. Reloading…`)
}

function ensureToolbar() {
  if (!isAudioLabRoute()) return
  const root = page()
  const timeline = shell()
  if (!root || !timeline || toolbar()) return
  const bar = document.createElement('div')
  bar.className = 'audio-lab-direct-toolbar'
  bar.innerHTML = `
    <div class="audio-lab-direct-toolbar__modes" role="group" aria-label="Waveform mouse mode">
      <button type="button" data-direct-mode="select" class="is-active">Select</button>
      <button type="button" data-direct-mode="move">Move clip</button>
      <button type="button" data-direct-mode="gain">Gain drag</button>
    </div>
    <div class="audio-lab-direct-toolbar__actions" role="group" aria-label="Direct waveform edits">
      <button type="button" data-direct-action="cut-start">Cut 0→playhead</button>
      <button type="button" data-direct-action="cut-selection">Cut selection</button>
      <button type="button" data-direct-action="make-clip">Make movable clip</button>
      <button type="button" data-direct-action="quiet">Quieter</button>
      <button type="button" data-direct-action="loud">Louder</button>
    </div>
    <p class="audio-lab-direct-toolbar__status">Drag waveform to select. Use Move clip or Gain drag for mouse edits.</p>
  `
  timeline.appendChild(bar)
}

function handleToolbarClick(event) {
  if (!isAudioLabRoute()) return
  const modeButton = event.target?.closest?.('[data-direct-mode]')
  if (modeButton) {
    event.preventDefault()
    event.stopPropagation()
    setMode(modeButton.dataset.directMode)
    return
  }
  const actionButton = event.target?.closest?.('[data-direct-action]')
  if (!actionButton) return
  event.preventDefault()
  event.stopPropagation()
  const action = actionButton.dataset.directAction
  actionButton.disabled = true
  Promise.resolve()
    .then(() => {
      if (action === 'cut-start') return cutStartToPlayhead()
      if (action === 'cut-selection') return cutSelection()
      if (action === 'make-clip') return makeSelectionClip()
      if (action === 'quiet') return addSelectionGain(-3)
      if (action === 'loud') return addSelectionGain(3)
      return null
    })
    .catch((error) => showStatus(error.message || 'Direct edit failed.'))
    .finally(() => { actionButton.disabled = false })
}

let pointerState = null

function handleWaveformPointerDown(event) {
  if (!isAudioLabRoute()) return
  const waveform = event.target?.closest?.('.audio-lab-waveform')
  if (!waveform) return
  const mode = event.altKey ? 'move' : event.shiftKey ? 'gain' : getMode()
  if (mode !== 'move' && mode !== 'gain') return
  if (mode === 'move' && !ensureClipSelected()) {
    showStatus('Select a clip first, or use Make movable clip after selecting a region.')
    return
  }
  if (mode === 'gain' && !hasSelection() && !ensureClipSelected()) {
    showStatus('Select a region or clip before using gain drag.')
    return
  }
  const rect = waveform.getBoundingClientRect()
  pointerState = {
    mode,
    rect,
    startX: event.clientX,
    startY: event.clientY,
    startTime: Number(timelineStartInput()?.value || 0),
    startGain: Number(clipGainInput()?.value || 1),
    duration: durationSeconds(),
  }
  event.preventDefault()
  event.stopPropagation()
  waveform.setPointerCapture?.(event.pointerId)
  showStatus(mode === 'move' ? 'Dragging selected clip on waveform…' : 'Dragging gain on waveform…')
}

function handleWaveformPointerMove(event) {
  if (!pointerState || !isAudioLabRoute()) return
  const state = pointerState
  if (state.mode === 'move') {
    const deltaSeconds = ((event.clientX - state.startX) / Math.max(1, state.rect.width)) * Math.max(1, state.duration)
    const next = Math.max(0, state.startTime + deltaSeconds)
    setClipTimelineStart(next)
    showStatus(`Selected clip starts at ${formatTime(next)}.`)
  }
  if (state.mode === 'gain') {
    const dy = state.startY - event.clientY
    const db = Math.max(-12, Math.min(12, dy / 12))
    if (hasSelection()) showStatus(`${db >= 0 ? '+' : ''}${db.toFixed(1)} dB on selected region when released.`)
    else {
      const nextGain = Math.max(0, Math.min(6, state.startGain * Math.pow(2, db / 6)))
      const input = clipGainInput()
      if (input) setNativeValue(input, nextGain.toFixed(2))
      showStatus(`Selected clip gain ${nextGain.toFixed(2)}x.`)
    }
  }
}

function handleWaveformPointerUp(event) {
  if (!pointerState || !isAudioLabRoute()) return
  const state = pointerState
  pointerState = null
  if (state.mode === 'move') {
    showStatus('Clip moved. Preview re-rendering.')
    return
  }
  if (state.mode === 'gain' && hasSelection()) {
    const dy = state.startY - event.clientY
    const db = Math.max(-12, Math.min(12, dy / 12))
    if (Math.abs(db) > 0.4) addSelectionGain(Number(db.toFixed(1))).catch((error) => showStatus(error.message || 'Gain edit failed.'))
    else showStatus('Gain drag was too small to apply.')
  } else {
    showStatus('Clip gain changed. Preview re-rendering.')
  }
}

function handleKeydown(event) {
  if (!isAudioLabRoute()) return
  if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return
  if (event.key.toLowerCase() === 'v') setMode('select')
  if (event.key.toLowerCase() === 'm') setMode('move')
  if (event.key.toLowerCase() === 'g') setMode('gain')
  if ((event.key === 'Delete' || event.key === 'Backspace') && hasSelection()) {
    event.preventDefault()
    cutSelection().catch((error) => showStatus(error.message || 'Cut failed.'))
  }
}

function boot() {
  if (!isAudioLabRoute()) return
  ensureToolbar()
}

window.addEventListener('load', boot)
window.addEventListener('popstate', () => window.setTimeout(boot, 80))
window.addEventListener('audiolab:navigation', () => window.setTimeout(boot, 80))
window.addEventListener('audiolab-task-navigation', () => window.setTimeout(boot, 80))
window.setInterval(boot, 1200)
window.addEventListener('click', handleToolbarClick, true)
window.addEventListener('pointerdown', handleWaveformPointerDown, true)
window.addEventListener('pointermove', handleWaveformPointerMove, true)
window.addEventListener('pointerup', handleWaveformPointerUp, true)
window.addEventListener('pointercancel', handleWaveformPointerUp, true)
window.addEventListener('keydown', handleKeydown, true)
