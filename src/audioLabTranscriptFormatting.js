import {
  getAudioLabProject,
  listAudioLabProjects,
  saveAudioLabProject,
} from './lib/audioLabStore'

const FORMAT_VERSION = 'interview-paragraphs-v1'

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

function normalizeWhitespace(value = '') {
  return String(value || '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sentenceCount(value = '') {
  return (String(value || '').match(/[.!?](?:\s|$)/g) || []).length
}

function wordCount(value = '') {
  return String(value || '').split(/\s+/).filter(Boolean).length
}

function looksLikeHostPrompt(text = '') {
  const value = String(text || '').trim().toLowerCase()
  return /^(so|yeah|cool|right|okay|ok|that makes sense|i love that|i wonder|this honestly|on that note|thank you|very cool|more broadly|how do you|what barriers|do you see|can you|could you)\b/.test(value)
    || value.includes('?')
}

function shouldBreakTurn(current, nextCue) {
  if (!current || !nextCue) return false
  const currentText = current.parts.join(' ')
  const nextText = String(nextCue.text || '').trim()
  const gap = Number(nextCue.start || 0) - Number(current.end || 0)
  if (gap > 2.4 && wordCount(currentText) > 18) return true
  if (current.speaker === 'Host' && currentText.includes('?')) return true
  if (current.speaker === 'Guest' && looksLikeHostPrompt(nextText)) return true
  if (wordCount(currentText) > 115 && sentenceCount(currentText) >= 3) return true
  return false
}

function nextSpeakerAfterBreak(current, nextCue) {
  if (!current) return looksLikeHostPrompt(nextCue?.text || '') ? 'Host' : 'Guest'
  const currentText = current.parts.join(' ')
  const nextText = String(nextCue?.text || '').trim()
  if (current.speaker === 'Host' && currentText.includes('?')) return 'Guest'
  if (current.speaker === 'Guest' && looksLikeHostPrompt(nextText)) return 'Host'
  return current.speaker === 'Host' ? 'Guest' : 'Host'
}

function cueSort(a, b) {
  return Number(a?.start || 0) - Number(b?.start || 0)
}

function cueToCleanText(cue = {}) {
  return normalizeWhitespace(cue.text || '')
}

function buildInterviewTurns(cues = []) {
  const ordered = cues
    .filter((cue) => String(cue?.text || '').trim())
    .slice()
    .sort(cueSort)

  const turns = []
  let current = null
  let speaker = 'Host'

  for (let index = 0; index < ordered.length; index += 1) {
    const cue = ordered[index]
    const text = cueToCleanText(cue)
    if (!text) continue

    if (!current) {
      speaker = looksLikeHostPrompt(text) || index === 0 ? 'Host' : 'Guest'
      current = {
        speaker,
        start: Number(cue.start || 0),
        end: Number(cue.end || cue.start || 0),
        parts: [text],
      }
      continue
    }

    if (shouldBreakTurn(current, cue)) {
      turns.push(current)
      speaker = nextSpeakerAfterBreak(current, cue)
      current = {
        speaker,
        start: Number(cue.start || 0),
        end: Number(cue.end || cue.start || 0),
        parts: [text],
      }
      continue
    }

    current.parts.push(text)
    current.end = Number(cue.end || cue.start || current.end || 0)
  }

  if (current) turns.push(current)
  return turns
}

function splitTextIntoParagraphs(text = '') {
  const sentences = normalizeWhitespace(text)
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (!sentences.length) return []

  const paragraphs = []
  let current = []
  for (const sentence of sentences) {
    current.push(sentence)
    const words = wordCount(current.join(' '))
    if (words > 85 || current.length >= 4 || sentence.includes('?')) {
      paragraphs.push(current.join(' '))
      current = []
    }
  }
  if (current.length) paragraphs.push(current.join(' '))
  return paragraphs
}

function formatTurnsAsMarkdown(turns = []) {
  return turns
    .map((turn) => {
      const body = normalizeWhitespace(turn.parts.join(' '))
      if (!body) return ''
      return `**${turn.speaker}:** ${body}`
    })
    .filter(Boolean)
    .join('\n\n')
}

function formatPlainTranscript(text = '') {
  return splitTextIntoParagraphs(text).join('\n\n')
}

function formatTranscript(project = {}) {
  const transcript = project.transcript || {}
  const cues = Array.isArray(transcript.cues) ? transcript.cues : []
  const turns = buildInterviewTurns(cues)
  const formattedText = turns.length
    ? formatTurnsAsMarkdown(turns)
    : formatPlainTranscript(transcript.text || '')

  if (!formattedText) return null

  const cueSpeakerMap = new Map()
  for (const turn of turns) {
    const normalizedParts = new Set(turn.parts.map((part) => normalizeWhitespace(part).toLowerCase()))
    cues.forEach((cue) => {
      const text = cueToCleanText(cue).toLowerCase()
      if (normalizedParts.has(text)) cueSpeakerMap.set(cue.id || `${cue.start}-${cue.end}-${text}`, turn.speaker)
    })
  }

  const nextCues = cues.map((cue) => {
    const key = cue.id || `${cue.start}-${cue.end}-${cueToCleanText(cue).toLowerCase()}`
    return {
      ...cue,
      speaker: cueSpeakerMap.get(key) || cue.speaker || '',
    }
  })

  return {
    ...transcript,
    text: formattedText,
    cues: nextCues,
    formatted: true,
    formatVersion: FORMAT_VERSION,
    speakerMode: turns.length ? 'host-guest-heuristic' : 'paragraphs-only',
    updatedAt: new Date().toISOString(),
  }
}

async function formatAndSaveTranscript(shell = document.querySelector('.audio-lab-task-shell'), { force = false } = {}) {
  if (!isAudioLabRoute()) return null
  const project = await getActiveProject()
  if (!project?.transcript) throw new Error('No transcript is available to format yet.')
  if (!force && project.transcript.formatVersion === FORMAT_VERSION) return project.transcript

  const nextTranscript = formatTranscript(project)
  if (!nextTranscript) throw new Error('No transcript text or timestamp cues are available to format.')

  const saved = await saveAudioLabProject({ ...project, transcript: nextTranscript })
  const textarea = shell?.querySelector?.('#audio-lab-transcript-text')
  if (textarea) textarea.value = nextTranscript.text || ''
  setStatus(shell, `Formatted transcript into paragraphs${nextTranscript.speakerMode === 'host-guest-heuristic' ? ' with rough Host / Guest labels' : ''}.`)
  toast(shell, `Transcript formatted for ${saved.title || 'AudioLab project'}.`)
  return nextTranscript
}

function injectFormattingButton(shell, project = {}) {
  if (!shell || shell.dataset.transcriptFormatterEnhanced === 'true') return
  const actions = shell.querySelector('.audio-lab-local-transcript-actions')
  if (!actions) return
  shell.dataset.transcriptFormatterEnhanced = 'true'

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'button'
  button.id = 'audio-lab-transcript-format-speakers'
  button.textContent = 'Format speakers / paragraphs'

  const exportAnchor = actions.querySelector('[data-audio-lab-export]')
  actions.insertBefore(button, exportAnchor || null)

  button.addEventListener('click', () => {
    formatAndSaveTranscript(shell, { force: true }).catch((error) => {
      setStatus(shell, error.message || 'Transcript formatting failed.')
      toast(shell, error.message || 'Transcript formatting failed.')
    })
  })
}

async function enhanceOpenTranscriptShell() {
  if (!isAudioLabRoute()) return
  const shell = document.querySelector('.audio-lab-task-shell')
  if (!shell || !shell.querySelector('#audio-lab-transcribe-run')) return
  const project = await getActiveProject()
  injectFormattingButton(shell, project)
}

function scheduleAutoFormat() {
  window.setTimeout(() => {
    const shell = document.querySelector('.audio-lab-task-shell')
    formatAndSaveTranscript(shell, { force: false }).catch(() => {
      // Formatting is an enhancement. Do not nag the user if no transcript exists yet.
    })
  }, 250)
}

window.addEventListener('load', () => window.setTimeout(enhanceOpenTranscriptShell, 120))
window.addEventListener('popstate', () => window.setTimeout(enhanceOpenTranscriptShell, 120))
window.addEventListener('audiolab:navigation', () => window.setTimeout(enhanceOpenTranscriptShell, 120))
window.addEventListener('audiolab-task-navigation', () => {
  window.setTimeout(enhanceOpenTranscriptShell, 120)
  scheduleAutoFormat()
})
window.setTimeout(enhanceOpenTranscriptShell, 300)
