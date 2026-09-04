import { buildIframeEmbed, buildMediaEmbed } from './lib/adminEditorEmbeds'

const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable="true"]'
const TEXT_EDITOR_SELECTOR = '.native-content-editor__textarea'
let savedVisualRange = null
let savedTextSelection = null
let pendingBodyMediaPick = false

function isAdminPostEditor() {
  if (typeof window === 'undefined') return false
  return /\/(wp-admin\/post-new\.php|wp-admin\/native-bridge|native-bridge)(?:\/|$)/.test(window.location.pathname)
}

function rememberVisualSelection() {
  if (!isAdminPostEditor()) return
  const editor = document.querySelector(VISUAL_EDITOR_SELECTOR)
  const selection = window.getSelection?.()
  if (!editor || !selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return
  savedVisualRange = range.cloneRange()
}

function rememberTextSelection(event) {
  const textarea = event.target?.closest?.(TEXT_EDITOR_SELECTOR)
  if (!textarea || textarea.getAttribute('contenteditable') === 'true') return
  savedTextSelection = {
    element: textarea,
    start: textarea.selectionStart ?? textarea.value.length,
    end: textarea.selectionEnd ?? textarea.value.length,
  }
}

function captureEditorSelection() {
  rememberVisualSelection()
  const textarea = document.querySelector(TEXT_EDITOR_SELECTOR)
  if (textarea && document.activeElement === textarea) {
    savedTextSelection = {
      element: textarea,
      start: textarea.selectionStart ?? textarea.value.length,
      end: textarea.selectionEnd ?? textarea.value.length,
    }
  }
}

document.addEventListener('selectionchange', rememberVisualSelection)
document.addEventListener('keyup', rememberTextSelection, true)
document.addEventListener('mouseup', rememberTextSelection, true)
document.addEventListener('focusin', rememberTextSelection, true)
document.addEventListener('input', rememberTextSelection, true)

function selectedReactMediaData() {
  const modal = document.querySelector('.media-picker-modal')
  if (!modal) return null
  const selectedTile = modal.querySelector('.media-library-tile.is-selected')
  if (!selectedTile) return null

  const title = selectedTile.querySelector('.media-library-tile__meta strong')?.textContent?.trim() || 'Media'
  const typeLabel = selectedTile.querySelector('.media-library-tile__meta small')?.textContent?.trim() || ''
  const mediaType = typeLabel.split('·')[0].trim().toLowerCase()
  const details = modal.querySelector('.media-attachment-details')
  const publicUrlLabel = [...(details?.querySelectorAll('label') || [])]
    .find((label) => label.querySelector('span')?.textContent?.trim().toLowerCase() === 'public url')
  const url = publicUrlLabel?.querySelector('input')?.value?.trim() || ''
  const captionLabel = [...(details?.querySelectorAll('label') || [])]
    .find((label) => label.querySelector('span')?.textContent?.trim().toLowerCase() === 'caption / link text')
  const caption = captionLabel?.querySelector('textarea')?.value?.trim() || ''
  const altLabel = [...(details?.querySelectorAll('label') || [])]
    .find((label) => label.querySelector('span')?.textContent?.trim().toLowerCase() === 'alt text')
  const alt = altLabel?.querySelector('input')?.value?.trim() || ''
  const facts = [...(details?.querySelectorAll('.media-attachment-details__facts span') || [])]
    .map((node) => node.textContent?.trim() || '')
  const mimeType = facts
    .flatMap((value) => value.split('·').map((part) => part.trim()))
    .find((value) => /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(value)) || ''

  if (!url) return null
  return { url, title, alt, caption, mediaType, mimeType }
}

function selectedLegacyMediaData() {
  const button = document.querySelector('.wp-media-modal .wp-media-item.is-selected')
  if (!button) return null
  const url = button.getAttribute('data-media-url') || ''
  if (!url) return null
  return {
    url,
    title: button.getAttribute('data-media-title') || 'Media',
    mediaType: (button.getAttribute('data-media-type') || '').toLowerCase(),
    mimeType: (button.getAttribute('data-media-mime') || '').toLowerCase(),
  }
}

function selectedMediaData() {
  return selectedReactMediaData() || selectedLegacyMediaData()
}

function restoreVisualSelection(editor) {
  const selection = window.getSelection?.()
  if (!selection) return null
  if (savedVisualRange && editor.contains(savedVisualRange.commonAncestorContainer)) {
    selection.removeAllRanges()
    selection.addRange(savedVisualRange)
    return savedVisualRange
  }
  return null
}

function insertHtmlIntoVisualEditor(markup) {
  const editor = document.querySelector(VISUAL_EDITOR_SELECTOR)
  if (!editor || !markup) return false
  const selection = window.getSelection?.()
  let range = restoreVisualSelection(editor)

  if (!range) {
    range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
  }

  range.deleteContents()
  const fragment = range.createContextualFragment(markup)
  const lastNode = fragment.lastChild
  range.insertNode(fragment)

  if (lastNode && selection) {
    const nextRange = document.createRange()
    nextRange.setStartAfter(lastNode)
    nextRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(nextRange)
    savedVisualRange = nextRange.cloneRange()
  }

  editor.focus()
  const inputEvent = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, inputType: 'insertHTML', data: markup })
    : new Event('input', { bubbles: true })
  editor.dispatchEvent(inputEvent)
  editor.dispatchEvent(new Event('blur', { bubbles: true }))
  return true
}

function insertTextIntoTextarea(markup) {
  const textarea = savedTextSelection?.element?.isConnected
    ? savedTextSelection.element
    : document.querySelector(TEXT_EDITOR_SELECTOR)
  if (!textarea || !markup) return false
  const start = savedTextSelection?.element === textarea
    ? savedTextSelection.start
    : (textarea.selectionStart ?? textarea.value.length)
  const end = savedTextSelection?.element === textarea
    ? savedTextSelection.end
    : (textarea.selectionEnd ?? textarea.value.length)
  const prefix = start > 0 && textarea.value[start - 1] !== '\n' ? '\n' : ''
  const suffix = end < textarea.value.length && textarea.value[end] !== '\n' ? '\n' : ''
  const inserted = `${prefix}${markup}${suffix}`
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  const nextValue = `${textarea.value.slice(0, start)}${inserted}${textarea.value.slice(end)}`
  if (setter) setter.call(textarea, nextValue)
  else textarea.value = nextValue
  const cursor = start + inserted.length
  textarea.selectionStart = cursor
  textarea.selectionEnd = cursor
  savedTextSelection = { element: textarea, start: cursor, end: cursor }
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
  return true
}

function insertMarkup(markup) {
  const visual = document.querySelector(VISUAL_EDITOR_SELECTOR)
  if (visual) return insertHtmlIntoVisualEditor(markup)
  return insertTextIntoTextarea(markup)
}

function closeReactMediaModal() {
  const modal = document.querySelector('.media-picker-modal')
  if (!modal) return
  const closeButton = [...modal.querySelectorAll('button')]
    .find((button) => button.textContent?.trim().toLowerCase() === 'close')
  closeButton?.click()
}

function handlePointerDown(event) {
  if (!isAdminPostEditor()) return
  const button = event.target?.closest?.('button')
  if (!button) return
  const label = button.textContent?.trim().toLowerCase() || ''

  if (button.classList.contains('native-content-editor__add-media') || label === 'add media') {
    captureEditorSelection()
    pendingBodyMediaPick = true
    return
  }

  if (label === 'choose from media') pendingBodyMediaPick = false
}

function handleSelectClick(event) {
  if (!isAdminPostEditor() || !pendingBodyMediaPick) return
  const button = event.target?.closest?.('button')
  if (!button) return
  const label = button.textContent?.trim().toLowerCase() || ''
  const reactModal = button.closest('.media-picker-modal')
  const legacyModal = button.closest('.wp-media-modal')
  const isUseSelected = reactModal && label === 'use selected media'
  const isLegacySelect = legacyModal && label === 'select'
  if (!isUseSelected && !isLegacySelect) return

  const media = selectedMediaData()
  if (!media) return
  const markup = buildMediaEmbed(media)
  if (!markup) return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  insertMarkup(markup)
  pendingBodyMediaPick = false
  if (reactModal) closeReactMediaModal()
  else {
    const closeButton = [...legacyModal.querySelectorAll('button')]
      .find((candidate) => candidate.textContent?.trim().toLowerCase() === 'close')
    closeButton?.click()
  }
}

function handleModalClose(event) {
  const button = event.target?.closest?.('button')
  if (!button?.closest?.('.media-picker-modal, .wp-media-modal')) return
  const label = button.textContent?.trim().toLowerCase() || ''
  if (label === 'close' || label === 'cancel') pendingBodyMediaPick = false
}

function addEmbedButton() {
  if (!isAdminPostEditor()) return
  const toolbar = document.querySelector('.native-content-editor__toolbar')
  if (!toolbar || toolbar.querySelector('[data-sabot-embed-button]')) return
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'button'
  button.dataset.sabotEmbedButton = '1'
  button.textContent = 'embed'
  button.title = 'Embed an iframe or URL at the cursor'
  button.addEventListener('mousedown', (event) => {
    captureEditorSelection()
    event.preventDefault()
  })
  button.addEventListener('click', () => {
    const raw = window.prompt('Paste an iframe embed code or URL')
    if (!raw) return
    const markup = buildIframeEmbed(raw)
    if (!markup) {
      window.alert('That embed needs an http(s) or site-relative URL.')
      return
    }
    insertMarkup(markup)
  })
  toolbar.appendChild(button)
}

document.addEventListener('mousedown', handlePointerDown, true)
window.addEventListener('click', handleSelectClick, true)
window.addEventListener('click', handleModalClose, true)

const observer = new MutationObserver(addEmbedButton)
observer.observe(document.documentElement, { childList: true, subtree: true })
addEmbedButton()
