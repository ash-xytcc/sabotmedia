const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable]'
const BLOCKED_ELEMENTS = 'script, style, meta, link, iframe, object, embed, form, input, button, textarea, select'
const DROP_STYLE_PROPERTIES = [
  'background',
  'background-color',
  'color',
  'font-family',
  'font-size',
  'font-variant',
  'font-stretch',
  'letter-spacing',
  'text-decoration-color',
  'text-shadow',
]

function normalizePastedHtml(raw = '') {
  const parser = new DOMParser()
  const doc = parser.parseFromString(String(raw || ''), 'text/html')
  doc.querySelectorAll(BLOCKED_ELEMENTS).forEach((node) => node.remove())

  for (const element of doc.body.querySelectorAll('*')) {
    for (const attribute of Array.from(element.attributes || [])) {
      const name = attribute.name.toLowerCase()
      const value = String(attribute.value || '')
      if (name.startsWith('on') || name === 'class' || name === 'id' || name === 'bgcolor' || name.startsWith('data-')) {
        element.removeAttribute(attribute.name)
        continue
      }
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) {
        element.removeAttribute(attribute.name)
      }
    }

    if (element.hasAttribute('style')) {
      for (const property of DROP_STYLE_PROPERTIES) element.style.removeProperty(property)
      if (!element.getAttribute('style')?.trim()) element.removeAttribute('style')
    }
  }

  return doc.body.innerHTML
}

function selectionBelongsTo(editor) {
  const selection = window.getSelection()
  if (!selection?.rangeCount) return false
  return editor.contains(selection.getRangeAt(0).commonAncestorContainer)
}

function putCaretAtEnd(editor) {
  editor.focus()
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

function insertHtmlAtSelection(editor, html) {
  if (!selectionBelongsTo(editor)) putCaretAtEnd(editor)

  // execCommand is deprecated as a general API, but insertHTML still gives
  // contentEditable the browser-native undo transaction that Range insertion
  // does not reliably preserve across Chromium/Firefox.
  if (document.execCommand?.('insertHTML', false, html)) return

  const selection = window.getSelection()
  if (!selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const fragment = range.createContextualFragment(html)
  const lastNode = fragment.lastChild
  range.insertNode(fragment)
  if (lastNode) {
    range.setStartAfter(lastNode)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

function handlePaste(event) {
  const editor = event.target instanceof Element ? event.target.closest(VISUAL_EDITOR_SELECTOR) : null
  if (!editor) return

  const html = event.clipboardData?.getData('text/html') || ''
  if (!html.trim()) return

  const normalized = normalizePastedHtml(html)
  if (!normalized.trim()) return

  event.preventDefault()
  insertHtmlAtSelection(editor, normalized)
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: null }))
}

document.addEventListener('paste', handlePaste, true)

export { normalizePastedHtml }
