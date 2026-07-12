const RESPONSIVE_FALLBACK_QUALITY = 'better'

function isAudioLabRoute() {
  return typeof window !== 'undefined' && /\/wp-admin\/audiolab(?:\/|$)/.test(window.location.pathname)
}

function transcriptShell() {
  return document.querySelector('.audio-lab-task-shell')
}

function statusElement(shell) {
  return shell?.querySelector?.('#audio-lab-transcript-status') || null
}

function setStatus(shell, message) {
  const status = statusElement(shell)
  if (status) status.textContent = String(message || '')
}

function getQualitySelect(shell = transcriptShell()) {
  return shell?.querySelector?.('#audio-lab-local-model-quality') || null
}

function addResponsiveNotice(shell = transcriptShell()) {
  const select = getQualitySelect(shell)
  const actions = shell?.querySelector?.('.audio-lab-local-transcript-actions')
  if (!shell || !select || !actions || shell.querySelector('.audio-lab-transcript-responsive-note')) return

  const note = document.createElement('p')
  note.className = 'description audio-lab-transcript-responsive-note'
  note.textContent = 'Best local is now guarded because it can freeze Chrome on long interviews. Better local is used for responsive browser transcription; choose Fast draft if the page still complains.'
  actions.insertAdjacentElement('afterend', note)
}

function tuneQualitySelect(shell = transcriptShell()) {
  const select = getQualitySelect(shell)
  if (!select) return false

  const best = Array.from(select.options || []).find((option) => option.value === 'best')
  if (best) {
    best.textContent = 'Best local — disabled in browser; use Better local'
    best.disabled = true
  }

  if (select.value === 'best') {
    select.value = RESPONSIVE_FALLBACK_QUALITY
    try { window.localStorage.setItem('audioLab.localTranscriptionQuality', RESPONSIVE_FALLBACK_QUALITY) } catch { /* ignore */ }
  }

  addResponsiveNotice(shell)
  return true
}

function guardTranscribeClick(event) {
  if (!isAudioLabRoute()) return
  const button = event.target?.closest?.('#audio-lab-transcribe-run')
  if (!button) return
  const shell = button.closest('.audio-lab-task-shell') || transcriptShell()
  const select = getQualitySelect(shell)
  if (!select) return

  if (select.value === 'best') {
    select.value = RESPONSIVE_FALLBACK_QUALITY
    try { window.localStorage.setItem('audioLab.localTranscriptionQuality', RESPONSIVE_FALLBACK_QUALITY) } catch { /* ignore */ }
    setStatus(shell, 'Best local was switched to Better local so Chrome does not freeze every chunk. Tiny mercy from the machine.')
  }
}

function scheduleTune(delay = 120) {
  window.setTimeout(() => tuneQualitySelect(), delay)
}

function startObserver() {
  if (typeof MutationObserver === 'undefined') return
  const observer = new MutationObserver(() => {
    if (!isAudioLabRoute()) return
    tuneQualitySelect()
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

window.addEventListener('click', guardTranscribeClick, true)
window.addEventListener('load', () => {
  startObserver()
  scheduleTune(100)
  scheduleTune(650)
})
window.addEventListener('popstate', () => scheduleTune(120))
window.addEventListener('audiolab:navigation', () => scheduleTune(120))
window.addEventListener('audiolab-task-navigation', () => scheduleTune(120))
scheduleTune(250)
scheduleTune(1000)
