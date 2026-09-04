const TOOLBAR_BUTTON_SELECTOR = '.native-content-editor__toolbar button'
const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable]'
let savedVisualRange = null
let savedLinkOffsets = null

function getEditor() {
  return document.querySelector(VISUAL_EDITOR_SELECTOR)
}

function rangeBelongsToEditor(range, editor = getEditor()) {
  return Boolean(editor && range && editor.contains(range.commonAncestorContainer))
}

function rememberVisualSelection() {
  const editor = getEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection?.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!rangeBelongsToEditor(range, editor)) return null
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

function captureLinkOffsets() {
  const editor = getEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection?.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!rangeBelongsToEditor(range, editor)) return null

  const start = textOffsetFromEditorStart(editor, range.startContainer, range.startOffset)
  const end = textOffsetFromEditorStart(editor, range.endContainer, range.endOffset)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null

  savedLinkOffsets = { start, end }
  savedVisualRange = range.cloneRange()
  return savedLinkOffsets
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
    const fallback = editor.lastChild || editor
    const range = document.createRange()
    range.selectNodeContents(fallback)
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
  if (!editor || !selection || !savedVisualRange || !rangeBelongsToEditor(savedVisualRange, editor)) return null
  editor.focus()
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

function insertLinkAtSavedOffsets(href) {
  const editor = getEditor()
  const selection = window.getSelection?.()
  const offsets = savedLinkOffsets
  if (!editor || !selection || !offsets || !href) return false

  const range = rangeFromTextOffsets(editor, offsets.start, offsets.end)
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
  savedLinkOffsets = null
  editor.focus()
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
    if (captureLinkOffsets()) event.preventDefault()
    return
  }
  if (!rememberVisualSelection()) return
  event.preventDefault()
}

function handleToolbarLink(event) {
  const button = event.target?.closest?.(TOOLBAR_BUTTON_SELECTOR)
  if (!button || toolbarAction(button) !== 'link' || !savedLinkOffsets) return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  const href = window.prompt('Enter URL for link', 'https://')
  if (!href) {
    savedLinkOffsets = null
    return
  }
  insertLinkAtSavedOffsets(href)
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
    if (!captureLinkOffsets()) return
    const href = window.prompt('Enter URL for link', 'https://')
    if (!href) {
      savedLinkOffsets = null
      return
    }
    insertLinkAtSavedOffsets(href)
  }
}

document.addEventListener('selectionchange', rememberVisualSelection)
document.addEventListener('mousedown', preserveVisualSelection, true)
document.addEventListener('click', handleToolbarLink, true)
document.addEventListener('keydown', handleEditorShortcut, true)
