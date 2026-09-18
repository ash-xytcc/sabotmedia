const TOOLBAR_BUTTON_SELECTOR = '.native-content-editor__toolbar button'
const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable]'
let savedVisualRange = null
let savedLinkRange = null
let savedLinkOffsets = null

function getEditor() {
  return document.querySelector(VISUAL_EDITOR_SELECTOR)
}

function rangeBelongsToEditor(range, editor = getEditor()) {
  return Boolean(
    editor
    && range
    && range.startContainer?.isConnected
    && range.endContainer?.isConnected
    && editor.contains(range.startContainer)
    && editor.contains(range.endContainer)
  )
}

function currentEditorRange(editor = getEditor()) {
  const selection = window.getSelection?.()
  if (!editor || !selection?.rangeCount) return null
  const range = selection.getRangeAt(0)
  return rangeBelongsToEditor(range, editor) ? range : null
}

function rememberVisualSelection() {
  const editor = getEditor()
  const range = currentEditorRange(editor)
  if (!range) return null
  savedVisualRange = range.cloneRange()
  return savedVisualRange
}

function textOffsetFromEditorStart(editor, container, offset) {
  const range = document.createRange()
  range.selectNodeContents(editor)
  try {
    range.setEnd(container, offset)
  } catch {
    return null
  }
  return range.toString().length
}

function captureLinkSelection() {
  const editor = getEditor()
  if (!editor) return null

  const range = currentEditorRange(editor)
    || (rangeBelongsToEditor(savedVisualRange, editor) ? savedVisualRange : null)
  if (!range) return null

  const start = textOffsetFromEditorStart(editor, range.startContainer, range.startOffset)
  const end = textOffsetFromEditorStart(editor, range.endContainer, range.endOffset)

  savedLinkRange = range.cloneRange()
  savedVisualRange = range.cloneRange()
  savedLinkOffsets = Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null
  return savedLinkRange
}

function rangeFromTextOffsets(editor, startOffset, endOffset) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  let consumed = 0
  let startNode = null
  let start = 0
  let endNode = null
  let end = 0

  while (node) {
    const length = node.nodeValue?.length || 0
    if (!startNode && startOffset <= consumed + length) {
      startNode = node
      start = Math.max(0, startOffset - consumed)
    }
    if (endOffset <= consumed + length) {
      endNode = node
      end = Math.max(0, endOffset - consumed)
      break
    }
    consumed += length
    node = walker.nextNode()
  }

  if (!startNode) {
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    return range
  }
  if (!endNode) {
    endNode = startNode
    end = start
  }

  const range = document.createRange()
  range.setStart(startNode, Math.min(start, startNode.nodeValue?.length || 0))
  range.setEnd(endNode, Math.min(end, endNode.nodeValue?.length || 0))
  return range
}

function syncEditor(editor, inputType = 'formatBold') {
  if (!editor) return
  const inputEvent = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, inputType })
    : new Event('input', { bubbles: true })
  editor.dispatchEvent(inputEvent)
}

function restoreVisualSelection() {
  const editor = getEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection || !rangeBelongsToEditor(savedVisualRange, editor)) return null
  editor.focus({ preventScroll: true })
  selection.removeAllRanges()
  selection.addRange(savedVisualRange)
  return savedVisualRange
}

function runCommand(command, value = null, inputType = 'formatBold') {
  const editor = getEditor()
  if (!editor) return false
  restoreVisualSelection()
  document.execCommand(command, false, value)
  rememberVisualSelection()
  syncEditor(editor, inputType)
  return true
}

function getSavedLinkRange(editor) {
  if (rangeBelongsToEditor(savedLinkRange, editor)) return savedLinkRange.cloneRange()
  if (savedLinkOffsets && Number.isFinite(savedLinkOffsets.start) && Number.isFinite(savedLinkOffsets.end)) {
    return rangeFromTextOffsets(editor, savedLinkOffsets.start, savedLinkOffsets.end)
  }
  if (rangeBelongsToEditor(savedVisualRange, editor)) return savedVisualRange.cloneRange()

  const fallback = document.createRange()
  fallback.selectNodeContents(editor)
  fallback.collapse(false)
  return fallback
}

function clearSavedLinkSelection() {
  savedLinkRange = null
  savedLinkOffsets = null
}

function insertLinkAtSavedSelection(href) {
  const editor = getEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection || !href) return false

  const range = getSavedLinkRange(editor)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'

  if (range.collapsed) anchor.textContent = href
  else anchor.append(range.extractContents())

  range.insertNode(anchor)
  const after = document.createRange()
  after.setStartAfter(anchor)
  after.collapse(true)
  selection.removeAllRanges()
  selection.addRange(after)
  savedVisualRange = after.cloneRange()
  clearSavedLinkSelection()
  editor.focus({ preventScroll: true })
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
    if (captureLinkSelection()) event.preventDefault()
    return
  }
  if (!rememberVisualSelection()) return
  event.preventDefault()
}

function handleToolbarLink(event) {
  const button = event.target?.closest?.(TOOLBAR_BUTTON_SELECTOR)
  if (!button || toolbarAction(button) !== 'link' || (!savedLinkRange && !savedLinkOffsets)) return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  const href = window.prompt('Enter URL for link', 'https://')
  if (!href) {
    clearSavedLinkSelection()
    return
  }
  insertLinkAtSavedSelection(href)
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
    if (!captureLinkSelection()) return
    const href = window.prompt('Enter URL for link', 'https://')
    if (!href) {
      clearSavedLinkSelection()
      return
    }
    insertLinkAtSavedSelection(href)
  }
}

function handleEditorInteraction(event) {
  const editor = event.target?.closest?.(VISUAL_EDITOR_SELECTOR)
  if (!editor) return
  rememberVisualSelection()
}

document.addEventListener('selectionchange', rememberVisualSelection)
document.addEventListener('mouseup', handleEditorInteraction, true)
document.addEventListener('keyup', handleEditorInteraction, true)
document.addEventListener('beforeinput', handleEditorInteraction, true)
document.addEventListener('mousedown', preserveVisualSelection, true)
document.addEventListener('click', handleToolbarLink, true)
document.addEventListener('keydown', handleEditorShortcut, true)
