export function clampAudioTime(value, duration = 0) {
  const max = Math.max(0, Number(duration) || 0)
  const next = Number(value)
  if (!Number.isFinite(next)) return 0
  return Math.max(0, Math.min(max, next))
}

export function normalizeAudioSelection(start, end, duration = 0) {
  const a = clampAudioTime(start, duration)
  const b = clampAudioTime(end, duration)
  const selectionStart = Math.min(a, b)
  const selectionEnd = Math.max(a, b)

  return {
    start: selectionStart,
    end: selectionEnd,
    duration: Math.max(0, selectionEnd - selectionStart),
    hasSelection: selectionEnd - selectionStart > 0.01,
  }
}

export function makeAudioEditOperation(type, assetId, start, end) {
  return {
    id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: String(type || ''),
    assetId: String(assetId || ''),
    start: Math.max(0, Number(start) || 0),
    end: Math.max(0, Number(end) || 0),
    createdAt: new Date().toISOString(),
  }
}

function createBuffer(numberOfChannels, length, sampleRate) {
  const safeChannels = Math.max(1, Number(numberOfChannels) || 1)
  const safeLength = Math.max(1, Math.floor(Number(length) || 1))
  const safeRate = Math.max(8000, Number(sampleRate) || 44100)

  if (typeof AudioBuffer !== 'undefined') {
    return new AudioBuffer({ numberOfChannels: safeChannels, length: safeLength, sampleRate: safeRate })
  }

  const OfflineAudioContextCtor = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext)
  if (!OfflineAudioContextCtor) throw new Error('This browser cannot create rendered audio buffers')
  const context = new OfflineAudioContextCtor(safeChannels, safeLength, safeRate)
  return context.createBuffer(safeChannels, safeLength, safeRate)
}

function copyRange(sourceBuffer, targetBuffer, sourceStartFrame, sourceEndFrame, targetStartFrame) {
  const channels = Math.min(sourceBuffer.numberOfChannels, targetBuffer.numberOfChannels)
  const sourceStart = Math.max(0, Math.floor(sourceStartFrame))
  const sourceEnd = Math.min(sourceBuffer.length, Math.max(sourceStart, Math.floor(sourceEndFrame)))
  const targetStart = Math.max(0, Math.floor(targetStartFrame))
  const frameCount = Math.min(sourceEnd - sourceStart, targetBuffer.length - targetStart)

  if (frameCount <= 0) return

  for (let channel = 0; channel < channels; channel += 1) {
    const source = sourceBuffer.getChannelData(channel)
    const target = targetBuffer.getChannelData(channel)
    target.set(source.subarray(sourceStart, sourceStart + frameCount), targetStart)
  }
}

function cloneBuffer(sourceBuffer) {
  const next = createBuffer(sourceBuffer.numberOfChannels, sourceBuffer.length, sourceBuffer.sampleRate)
  copyRange(sourceBuffer, next, 0, sourceBuffer.length, 0)
  return next
}

function renderDelete(buffer, startSeconds, endSeconds) {
  const selection = normalizeAudioSelection(startSeconds, endSeconds, buffer.duration)
  if (!selection.hasSelection) return cloneBuffer(buffer)

  const sampleRate = buffer.sampleRate
  const startFrame = Math.max(0, Math.floor(selection.start * sampleRate))
  const endFrame = Math.min(buffer.length, Math.ceil(selection.end * sampleRate))
  const removed = Math.max(0, endFrame - startFrame)
  const nextLength = Math.max(1, buffer.length - removed)
  const next = createBuffer(buffer.numberOfChannels, nextLength, sampleRate)

  copyRange(buffer, next, 0, startFrame, 0)
  copyRange(buffer, next, endFrame, buffer.length, startFrame)
  return next
}

function renderSilence(buffer, startSeconds, endSeconds) {
  const selection = normalizeAudioSelection(startSeconds, endSeconds, buffer.duration)
  const next = cloneBuffer(buffer)
  if (!selection.hasSelection) return next

  const startFrame = Math.max(0, Math.floor(selection.start * buffer.sampleRate))
  const endFrame = Math.min(next.length, Math.ceil(selection.end * buffer.sampleRate))

  for (let channel = 0; channel < next.numberOfChannels; channel += 1) {
    const data = next.getChannelData(channel)
    data.fill(0, startFrame, endFrame)
  }

  return next
}

function renderTrim(buffer, startSeconds, endSeconds) {
  const selection = normalizeAudioSelection(startSeconds, endSeconds, buffer.duration)
  if (!selection.hasSelection) return cloneBuffer(buffer)

  const sampleRate = buffer.sampleRate
  const startFrame = Math.max(0, Math.floor(selection.start * sampleRate))
  const endFrame = Math.min(buffer.length, Math.ceil(selection.end * sampleRate))
  const nextLength = Math.max(1, endFrame - startFrame)
  const next = createBuffer(buffer.numberOfChannels, nextLength, sampleRate)
  copyRange(buffer, next, startFrame, endFrame, 0)
  return next
}

export function getEditsForAsset(edits = [], assetId = '') {
  return (Array.isArray(edits) ? edits : [])
    .filter((edit) => !assetId || String(edit.assetId || '') === String(assetId))
    .filter((edit) => ['delete', 'silence', 'trim'].includes(String(edit.type || '')))
}

export function renderAudioEditGraph(sourceBuffer, edits = [], assetId = '') {
  if (!sourceBuffer) throw new Error('No source buffer to render')

  const relevantEdits = getEditsForAsset(edits, assetId)
  let current = cloneBuffer(sourceBuffer)

  for (const edit of relevantEdits) {
    const type = String(edit.type || '')
    if (type === 'delete') current = renderDelete(current, edit.start, edit.end)
    if (type === 'silence') current = renderSilence(current, edit.start, edit.end)
    if (type === 'trim') current = renderTrim(current, edit.start, edit.end)
  }

  return current
}

export function encodeWav(audioBuffer) {
  if (!audioBuffer) throw new Error('No rendered audio to export')

  const numberOfChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numberOfChannels * bytesPerSample
  const dataSize = audioBuffer.length * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  function writeString(offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  const channelData = []
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    channelData.push(audioBuffer.getChannelData(channel))
  }

  let offset = 44
  for (let frame = 0; frame < audioBuffer.length; frame += 1) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame] || 0))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([view], { type: 'audio/wav' })
}

export function makeAudioDownloadName(label = 'audiolab-export', extension = 'wav') {
  const safe = String(label || 'audiolab-export')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56)

  return `${safe || 'audiolab-export'}.${extension}`
}
