import { buildIframeEmbed, buildMediaEmbed } from './lib/adminEditorEmbeds'

const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable="true"]'
const TEXT_EDITOR_SELECTOR = '.native-content-editor__textarea'
let savedVisualRange = null
let savedTextSelection = null

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

document.addEventListener('selectionchange', rememberVisualSelection)
document.addEventListener('keyup', rememberTextSelection, true)
document.addEventListener('mouseup', rememberTextSelection, true)
document.addEventListener('focusin', rememberTextSelection, true)
document.addEventListener('input', rememberTextSelection, true)

function selectedMediaButton() {
  return document.querySelector('.wp-media-modal .wp-media-item.is-selected')
}

function selectedMediaData() {
  const button = selectedMediaButton()
  if (!button) return null
  const url = button.getAttribute('data-media-url') || ''
  const title = button.getAttribute('data-media-title') || 'Download file'
  const mediaType = (button.getAttribute('data-media-type') || '').toLowerCase()
  const mimeType = (button.getAttribute('data-media-mime') || '').toLowerCase()
  if (!url) return null
  return { url, title, mediaType, mimeType }
}

function restoreVisualSelection(editor) {
  const selection = window.getSelection?.()
  if (!selection) return null
  if (savedVisualRange && editor.contains(savedVisualRange.commonAncestorContainer)) {
    selection.removeAllRanges()
    selection.addRange(savedVisualRange)
    return savedVisualRange
  }
  if (selection.rangeCount) {
    const current = selection.getRangeAt(0)
    if (editor.contains(current.commonAncestorContainer)) return current
  }
  return null
}

function insertHtmlIntoVisualEditor(markup) {
  const editor = document.querySelector(VISUAL_EDITOR_SELECTOR)
  if (!editor || !markup) return false
  const selection = window.getSelection?.()
  const range = restoreVisualSelection(editor)

  if (range) {
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
  } else {
    editor.insertAdjacentHTML('beforeend', markup)
    const nextRange = document.createRange()
    nextRange.selectNodeContents(editor)
    nextRange.collapse(false)
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(nextRange)
    }
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
  textarea.value = `${textarea.value.slice(0, start)}${inserted}${textarea.value.slice(end)}`
  const cursor = start + inserted.length
  textarea.selectionStart = cursor
  textarea.selectionEnd = cursor
  savedTextSelection = { element: textarea, start: cursor, end: cursor }
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.dispatchEvent(new Event('change', { bubbles: true }))
  textarea.focus()
  return true
}

function insertMarkup(markup) {
  const visual = document.querySelector(VISUAL_EDITOR_SELECTOR)
  if (visual) return insertHtmlIntoVisualEditor(markup)
  return insertTextIntoTextarea(markup)
}

function closeMediaModal() {
  const closeButton = [...document.querySelectorAll('.wp-media-modal .button')].find((button) => button.textContent?.trim().toLowerCase() === 'close')
  closeButton?.click()
}

function handleSelectClick(event) {
  if (!isAdminPostEditor()) return
  const button = event.target?.closest?.('button')
  if (!button || button.textContent?.trim().toLowerCase() !== 'select') return
  if (!button.closest('.wp-media-modal')) return

  const media = selectedMediaData()
  if (!media) return

  const details = button.closest('.wp-media-modal__details')
  const caption = details?.querySelector('textarea')?.value?.trim?.() || ''
  const markup = buildMediaEmbed({ ...media, caption })
  if (!markup) return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  insertMarkup(markup)
  closeMediaModal()
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
  button.addEventListener('mousedown', (event) => event.preventDefault())
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

window.addEventListener('click', handleSelectClick, true)

const observer = new MutationObserver(addEmbedButton)
observer.observe(document.documentElement, { childList: true, subtree: true })
addEmbedButton()
