const ALLOWED_TAGS = new Set(['A', 'B', 'BR', 'DIV', 'EM', 'I', 'LI', 'OL', 'P', 'STRONG', 'UL'])

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeHref(value = '') {
  const href = String(value || '').trim()
  if (!href) return ''
  if (/^(javascript|data):/i.test(href)) return ''
  return href
}

export function plainTextToEditableHtml(value = '') {
  const normalized = String(value || '').replace(/\r\n/g, '\n').trim()
  if (!normalized) return ''

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br>')
      return `<p>${lines}</p>`
    })
    .join('')
}

export function editableHtmlToPlainText(html = '') {
  if (typeof document === 'undefined') return String(html || '').replace(/<[^>]+>/g, ' ')
  const node = document.createElement('div')
  node.innerHTML = sanitizeEditableHtml(html)
  return node.innerText || node.textContent || ''
}

export function sanitizeEditableHtml(html = '', options = {}) {
  if (typeof document === 'undefined') {
    return options.multiline === false ? escapeHtml(html).trim() : plainTextToEditableHtml(html)
  }

  const template = document.createElement('template')
  template.innerHTML = String(html || '')

  function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '')
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createTextNode('')
    }

    const tag = node.tagName
    const children = Array.from(node.childNodes).map(sanitizeNode)

    if (!ALLOWED_TAGS.has(tag)) {
      const fragment = document.createDocumentFragment()
      for (const child of children) fragment.appendChild(child)
      return fragment
    }

    const element = document.createElement(tag.toLowerCase())
    if (tag === 'A') {
      const href = normalizeHref(node.getAttribute('href'))
      if (href) {
        element.setAttribute('href', href)
        if (/^https?:\/\//i.test(href)) {
          element.setAttribute('rel', 'noopener noreferrer')
          element.setAttribute('target', '_blank')
        }
      }
    }

    for (const child of children) element.appendChild(child)
    return element
  }

  const out = document.createElement('div')
  for (const child of Array.from(template.content.childNodes)) {
    out.appendChild(sanitizeNode(child))
  }

  return normalizeEditableHtml(out.innerHTML, options)
}

export function normalizeEditableHtml(html = '', { multiline = true } = {}) {
  const value = String(html || '')
    .replace(/<div><br><\/div>/gi, '<br>')
    .replace(/<div>/gi, '<p>')
    .replace(/<\/div>/gi, '</p>')
    .replace(/(<br>\s*){3,}/gi, '<br><br>')
    .trim()

  if (!value) return ''
  if (!multiline) {
    return value
      .replace(/<\/?(p|div|ul|ol|li)[^>]*>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  if (/<(p|ul|ol|br)\b/i.test(value)) return value
  return plainTextToEditableHtml(value)
}

export function insertPlainTextAsEditableHtml(text = '') {
  const html = plainTextToEditableHtml(text)
  if (!html) return

  if (document.queryCommandSupported?.('insertHTML')) {
    document.execCommand('insertHTML', false, html)
    return
  }

  const selection = window.getSelection()
  if (!selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const template = document.createElement('template')
  template.innerHTML = html
  range.insertNode(template.content)
}
