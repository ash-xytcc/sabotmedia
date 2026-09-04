const TOOLBAR_BUTTON_SELECTOR = '.native-content-editor__toolbar button'
const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable]'
let savedVisualRange = null

function getEditor() {
  return document.querySelector(VISUAL_EDITOR_SELECTOR)
}

function rememberVisualSelection() {
  const editor = getEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection?.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return null
  savedVisualRange = range.cloneRange()
  return savedVisualRange
}

function restoreVisualSelection() {
  const editor = getEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection || !savedVisualRange) return null
  if (!editor.contains(savedVisualRange.commonAncestorContainer)) return null
  editor.focus()
  selection.removeAllRanges()
  selection.addRange(savedVisualRange)
  return savedVisualRange
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
  rememberVisualSelection()
  syncEditor(editor, inputType)
  return true
}

function preserveVisualSelection(event) {
  const button = event.target?.closest?.(TOOLBAR_BUTTON_SELECTOR)
  if (!button) return
  if (!rememberVisualSelection()) return

  // Keep the contentEditable selection alive until the toolbar action runs.
  event.preventDefault()
}

function handleToolbarLink(event) {
  const button = event.target?.closest?.(TOOLBAR_BUTTON_SELECTOR)
  if (!button) return
  const label = button.textContent?.trim().toLowerCase() || ''
  if (label !== 'link') return
  const editor = getEditor()
  if (!editor || !savedVisualRange) return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  const href = window.prompt('Enter URL for link', 'https://')
  if (!href) return
  runCommand('createLink', href, 'createLink')
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
    rememberVisualSelection()
    const href = window.prompt('Enter URL for link', 'https://')
    if (!href) return
    runCommand('createLink', href, 'createLink')
  }
}

document.addEventListener('selectionchange', rememberVisualSelection)
document.addEventListener('mousedown', preserveVisualSelection, true)
document.addEventListener('click', handleToolbarLink, true)
document.addEventListener('keydown', handleEditorShortcut, true)
