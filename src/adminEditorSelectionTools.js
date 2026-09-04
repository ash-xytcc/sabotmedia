const TOOLBAR_BUTTON_SELECTOR = '.native-content-editor__toolbar button'
const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable]'
let savedVisualRange = null
let pendingToolbarRange = null
let selectionLocked = false

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

function runCommand(command, value = null, inputType = 'formatBold', explicitRange = null) {
  const editor = getEditor()
  if (!editor) return false
  if (explicitRange) restoreRange(explicitRange)
  else restoreVisualSelection()
  document.execCommand(command, false, value)
  selectionLocked = false
  rememberVisualSelection()
  syncEditor(editor, inputType)
  return true
}

function preserveVisualSelection(event) {
  const button = event.target?.closest?.(TOOLBAR_BUTTON_SELECTOR)
  if (!button) return
  const range = rememberVisualSelection()
  if (!range) return

  // Snapshot the exact pre-click range. The URL prompt can move the browser's
  // live selection, so link creation must not rely on whatever selection exists
  // after the prompt closes.
  pendingToolbarRange = range.cloneRange()
  event.preventDefault()
}

function handleToolbarLink(event) {
  const button = event.target?.closest?.(TOOLBAR_BUTTON_SELECTOR)
  if (!button) return
  const label = button.textContent?.trim().toLowerCase() || ''
  if (label !== 'link') return
  const editor = getEditor()
  const linkRange = pendingToolbarRange?.cloneRange?.() || savedVisualRange?.cloneRange?.()
  pendingToolbarRange = null
  if (!editor || !rangeBelongsToEditor(linkRange, editor)) return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  selectionLocked = true
  const href = window.prompt('Enter URL for link', 'https://')
  if (!href) {
    selectionLocked = false
    restoreRange(linkRange)
    return
  }
  runCommand('createLink', href, 'createLink', linkRange)
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
    const linkRange = rememberVisualSelection()?.cloneRange?.()
    if (!linkRange) return
    selectionLocked = true
    const href = window.prompt('Enter URL for link', 'https://')
    if (!href) {
      selectionLocked = false
      restoreRange(linkRange)
      return
    }
    runCommand('createLink', href, 'createLink', linkRange)
  }
}

document.addEventListener('selectionchange', rememberVisualSelection)
document.addEventListener('mousedown', preserveVisualSelection, true)
document.addEventListener('click', handleToolbarLink, true)
document.addEventListener('keydown', handleEditorShortcut, true)
