const EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable]'
const SAFE_TAGS = new Set(['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption', 'hr', 'pre', 'code'])
const DROP_TAGS = new Set(['script', 'style', 'meta', 'link', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'])

function cleanUrl(value = '', image = false) {
  const url = String(value || '').trim()
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url
  if (!image && url.startsWith('#')) return url
  if (!image && /^(mailto:|tel:)/i.test(url)) return url
  return /^https?:\/\//i.test(url) ? url : ''
}

function isBold(element) {
  const weight = String(element?.style?.fontWeight || '').toLowerCase()
  const numeric = Number.parseInt(weight, 10)
  return weight === 'bold' || weight === 'bolder' || (Number.isFinite(numeric) && numeric >= 600)
}

function isItalic(element) {
  return /^(italic|oblique)$/i.test(String(element?.style?.fontStyle || ''))
}

function cleanChildren(source, output) {
  const fragment = output.createDocumentFragment()
  for (const child of Array.from(source.childNodes || [])) {
    const clean = cleanNode(child, output)
    if (clean) fragment.append(clean)
  }
  return fragment
}

function wrap(fragment, tag, output) {
  const element = output.createElement(tag)
  element.append(fragment)
  const next = output.createDocumentFragment()
  next.append(element)
  return next
}

function cleanNode(node, output) {
  if (!node) return null
  if (node.nodeType === 3) return output.createTextNode(node.textContent || '')
  if (node.nodeType !== 1) return null

  const sourceTag = String(node.tagName || '').toLowerCase()
  if (DROP_TAGS.has(sourceTag)) return null

  let children = cleanChildren(node, output)
  if (isBold(node) && !['b', 'strong'].includes(sourceTag)) children = wrap(children, 'strong', output)
  if (isItalic(node) && !['i', 'em'].includes(sourceTag)) children = wrap(children, 'em', output)

  const tag = sourceTag === 'b' ? 'strong' : sourceTag === 'i' ? 'em' : sourceTag
  if (tag === 'span' || tag === 'font' || !SAFE_TAGS.has(tag)) return children

  if (tag === 'img') {
    const src = cleanUrl(node.getAttribute('src'), true)
    if (!src) return null
    const image = output.createElement('img')
    image.src = src
    const alt = node.getAttribute('alt')
    if (alt) image.alt = alt
    return image
  }

  if (tag === 'br' || tag === 'hr') return output.createElement(tag)

  if (tag === 'a') {
    const href = cleanUrl(node.getAttribute('href'))
    if (!href) return children
    const link = output.createElement('a')
    link.href = href
    if (/^https?:\/\//i.test(href)) {
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
    link.append(children)
    return link
  }

  const element = output.createElement(tag)
  element.append(children)
  return element
}

function sanitizePastedHtml(raw = '') {
  const parser = new DOMParser()
  const source = parser.parseFromString(String(raw || ''), 'text/html')
  const output = document.implementation.createHTMLDocument('')
  const container = output.createElement('div')
  container.append(cleanChildren(source.body, output))
  return container.innerHTML
}

function insertHtml(editor, html) {
  editor.focus()
  const selection = window.getSelection()
  let range = selection?.rangeCount ? selection.getRangeAt(0) : null
  if (!range || !editor.contains(range.commonAncestorContainer)) {
    range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  if (document.execCommand?.('insertHTML', false, html)) return

  range.deleteContents()
  const fragment = range.createContextualFragment(html)
  const last = fragment.lastChild
  range.insertNode(fragment)
  if (last && selection) {
    range.setStartAfter(last)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

function handlePaste(event) {
  const editor = event.target instanceof Element ? event.target.closest(EDITOR_SELECTOR) : null
  if (!editor) return
  const html = event.clipboardData?.getData('text/html') || ''
  if (!html.trim()) return

  const clean = sanitizePastedHtml(html)
  if (!clean.trim()) return

  event.preventDefault()
  event.stopImmediatePropagation()
  insertHtml(editor, clean)
  const input = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: null })
    : new Event('input', { bubbles: true })
  editor.dispatchEvent(input)
}

if (typeof document !== 'undefined') document.addEventListener('paste', handlePaste, true)

export { sanitizePastedHtml }
