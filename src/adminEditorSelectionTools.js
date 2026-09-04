const TOOLBAR_BUTTON_SELECTOR = '.native-content-editor__toolbar button'
const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable]'
let savedVisualRange = null
let selectionLocked = false
let linkBookmark = null
let bookmarkId = 0

function getEditor() {
  return document.querySelector(VISUAL_EDITOR_SELECTOR)
}

function rangeBelongsToEditor(range, editor = getEditor()) {
  return Boolean(editor && range && editor.contains(range.commonAncestorContainer))
}

function rememberVisualSelection() {
  if (selectionLocked) return savedVisualRange
  const editor = getEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection?.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!rangeBelongsToEditor(range, editor)) return null
  savedVisualRange = range.cloneRange()
  return savedVisualRange
}

function restoreRange(range) {
  const editor = getEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection || !rangeBelongsToEditor(range, editor)) return null
  editor.focus()
  selection.removeAllRanges()
  selection.addRange(range)
  savedVisualRange = range.cloneRange()
  return range
}

function restoreVisualSelection() {
  return restoreRange(savedVisualRange)
}

function syncEditor(editor, inputType = 'formatBold') {
  if (!editor) return
  const inputEvent = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, inputType })
    : new Event('input', { bubbles: true })
  editor.dispatchEvent(inputEvent)
}

function runCommand(command, value = null, inputType = 'formatBold') {
  const editor = getEditor()
  if (!editor) return false
  restoreVisualSelection()
  document.execCommand(command, false, value)
  selectionLocked = false
  rememberVisualSelection()
  syncEditor(editor, inputType)
  return true
}

function clearLinkBookmark() {
  linkBookmark?.start?.remove?.()
  linkBookmark?.end?.remove?.()
  linkBookmark = null
  selectionLocked = false
}

function makeBookmarkMarker(kind, id) {
  const marker = document.createElement('span')
  marker.setAttribute('data-sabot-toolbar-link-bookmark', `${kind}:${id}`)
  marker.setAttribute('aria-hidden', 'true')
  marker.style.display = 'none'
  return marker
}

function captureLinkBookmark() {
  const editor = getEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection?.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!rangeBelongsToEditor(range, editor)) return null

  clearLinkBookmark()
  selectionLocked = true
  const id = ++bookmarkId
  const start = makeBookmarkMarker('start', id)
  const end = makeBookmarkMarker('end', id)
  const text = selection.toString()

  const endRange = range.cloneRange()
  endRange.collapse(false)
  endRange.insertNode(end)

  const startRange = range.cloneRange()
  startRange.collapse(true)
  startRange.insertNode(start)

  linkBookmark = { start, end, text }
  return linkBookmark
}

function bookmarkRange() {
  const editor = getEditor()
  const start = linkBookmark?.start
  const end = linkBookmark?.end
  if (!editor || !start?.isConnected || !end?.isConnected || !editor.contains(start) || !editor.contains(end)) return null
  const range = document.createRange()
  range.setStartAfter(start)
  range.setEndBefore(end)
  return range
}

function insertLinkAtBookmark(href) {
  const editor = getEditor()
  const range = bookmarkRange()
  if (!editor || !range || !href) return false

  const anchor = document.createElement('a')
  anchor.href = href
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'

  if (range.collapsed) {
    anchor.textContent = href
  } else {
    anchor.append(range.extractContents())
  }

  range.insertNode(anchor)
  const after = document.createRange()
  after.setStartAfter(anchor)
  after.collapse(true)

  linkBookmark.start.remove()
  linkBookmark.end.remove()
  linkBookmark = null
  selectionLocked = false

  editor.focus()
  const selection = window.getSelection?.()
  selection?.removeAllRanges()
  selection?.addRange(after)
  savedVisualRange = after.cloneRange()
  syncEditor(editor, 'insertLink')
  return true
}

function toolbarAction(button) {
  return button?.textContent?.trim().toLowerCase() || ''
}

function preserveVisualSelection(event) {
  const button = event.target?.closest?.(TOOLBAR_BUTTON_SELECTOR)
  if (!button) return
  if (toolbarAction(button) === 'link') {
    if (captureLinkBookmark()) event.preventDefault()
    return
  }
  if (!rememberVisualSelection()) return
  event.preventDefault()
}

function handleToolbarLink(event) {
  const button = event.target?.closest?.(TOOLBAR_BUTTON_SELECTOR)
  if (!button || toolbarAction(button) !== 'link' || !linkBookmark) return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  const href = window.prompt('Enter URL for link', 'https://')
  if (!href) {
    clearLinkBookmark()
    return
  }
  insertLinkAtBookmark(href)
}

function handleEditorShortcut(event) {
  const editor = event.target?.closest?.(VISUAL_EDITOR_SELECTOR)
  if (!editor) return
  const modified = event.ctrlKey || event.metaKey
  if (!modified || event.altKey) return

  const key = String(event.key || '').toLowerCase()
  if (key === 'z') {
    event.preventDefault()
    if (event.shiftKey) runCommand('redo', null, 'historyRedo')
    else runCommand('undo', null, 'historyUndo')
    return
  }
  if (key === 'y') {
    event.preventDefault()
    runCommand('redo', null, 'historyRedo')
    return
  }
  if (key === 'b') {
    event.preventDefault()
    runCommand('bold', null, 'formatBold')
    return
  }
  if (key === 'i') {
    event.preventDefault()
    runCommand('italic', null, 'formatItalic')
    return
  }
  if (key === 'k') {
    event.preventDefault()
    if (!captureLinkBookmark()) return
    const href = window.prompt('Enter URL for link', 'https://')
    if (!href) {
      clearLinkBookmark()
      return
    }
    insertLinkAtBookmark(href)
  }
}

document.addEventListener('selectionchange', rememberVisualSelection)
document.addEventListener('mousedown', preserveVisualSelection, true)
document.addEventListener('click', handleToolbarLink, true)
document.addEventListener('keydown', handleEditorShortcut, true)
