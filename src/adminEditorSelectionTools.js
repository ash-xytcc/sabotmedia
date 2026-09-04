const TOOLBAR_BUTTON_SELECTOR = '.native-content-editor__toolbar button'
const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable]'

function preserveVisualSelection(event) {
  const button = event.target?.closest?.(TOOLBAR_BUTTON_SELECTOR)
  if (!button) return
  const editor = document.querySelector(VISUAL_EDITOR_SELECTOR)
  if (!editor) return
  const selection = window.getSelection?.()
  if (!selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return

  // Keep the contentEditable selection alive until the React click handler runs.
  // Preventing the mousedown focus change still allows the button's click event.
  event.preventDefault()
}

document.addEventListener('mousedown', preserveVisualSelection, true)
