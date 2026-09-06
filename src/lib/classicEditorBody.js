function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

function sanitizeUrl(url = '', { allowFragments = true } = {}) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (allowFragments && value.startsWith('#')) return value
  if (value.startsWith('/')) return value
  if (value.startsWith('mailto:') || value.startsWith('tel:')) return value

  try {
    const parsed = new URL(value, 'https://example.invalid')
    const protocol = parsed.protocol.toLowerCase()
    if (protocol === 'http:' || protocol === 'https:') {
      if (value.startsWith('http://') || value.startsWith('https://')) return value
      if (value.startsWith('/')) return value
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return ''
  } catch {
    return ''
  }
}

function sanitizeMediaMetadata(node) {
  const attrs = []
  const mediaId = String(node.getAttribute('data-media-id') || '').trim()
  const mediaTitle = String(node.getAttribute('data-media-title') || '').trim()
  const mediaMime = String(node.getAttribute('data-media-mime') || '').trim().toLowerCase()

  if (mediaId) attrs.push(`data-media-id="${escapeAttr(mediaId)}"`)
  if (mediaTitle) attrs.push(`data-media-title="${escapeAttr(mediaTitle)}"`)
  if (/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mediaMime)) attrs.push(`data-media-mime="${escapeAttr(mediaMime)}"`)
  return attrs.length ? ` ${attrs.join(' ')}` : ''
}

function sanitizeFigureClass(node) {
  const allowed = new Set([
    'sabot-embed',
    'sabot-embed--audio',
    'sabot-embed--video',
    'sabot-embed--pdf',
    'sabot-embed--iframe',
  ])
  const classes = String(node.getAttribute('class') || '')
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => allowed.has(value))
  return classes.length ? ` class="${classes.map(escapeAttr).join(' ')}"` : ''
}

function inlineMarkdownToHtml(text = '') {
  let html = escapeHtml(text)

  html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_, label, href) => {
    const safeHref = sanitizeUrl(href)
    if (!safeHref) return escapeHtml(label)
    const external = /^https?:\/\//i.test(safeHref)
    return `<a href="${escapeAttr(safeHref)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`
  })

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  return html
}

function lineLooksLikeHtml(line = '') {
  return /<\s*\/?[a-z][^>]*>/i.test(line)
}

function markdownLikeToHtml(input = '') {
  const lines = String(input || '').replace(/\r\n?/g, '\n').split('\n')
  const chunks = []
  let paragraph = []
  let listType = ''
  let listItems = []

  function flushParagraph() {
    if (!paragraph.length) return
    chunks.push(`<p>${inlineMarkdownToHtml(paragraph.join(' ').trim())}</p>`)
    paragraph = []
  }

  function flushList() {
    if (!listType || !listItems.length) {
      listType = ''
      listItems = []
      return
    }
    chunks.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join('')}</${listType}>`)
    listType = ''
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      const level = Math.min(6, heading[1].length)
      chunks.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`)
      continue
    }

    const unordered = line.match(/^[-*]\s+(.+)$/)
    if (unordered) {
      flushParagraph()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(unordered[1])
      continue
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/)
    if (ordered) {
      flushParagraph()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(ordered[1])
      continue
    }

    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      flushParagraph()
      flushList()
      chunks.push(`<blockquote><p>${inlineMarkdownToHtml(quote[1] || '')}</p></blockquote>`)
      continue
    }

    if (lineLooksLikeHtml(line)) {
      flushParagraph()
      flushList()
      chunks.push(line)
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  flushList()

  return chunks.join('\n')
}

function sanitizeNode(node) {
  if (!node) return ''

  if (node.nodeType === 3) {
    return escapeHtml(node.textContent || '')
  }

  if (node.nodeType !== 1) return ''

  const tag = String(node.tagName || '').toLowerCase()
  const children = Array.from(node.childNodes || []).map((child) => sanitizeNode(child)).join('')

  if (tag === 'script' || tag === 'style' || tag === 'object' || tag === 'embed') {
    return ''
  }

  if (tag === 'a') {
    const safeHref = sanitizeUrl(node.getAttribute('href') || '')
    if (!safeHref) return children
    const external = /^https?:\/\//i.test(safeHref)
    return `<a href="${escapeAttr(safeHref)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${children}</a>`
  }

  if (tag === 'img') {
    const src = sanitizeUrl(node.getAttribute('src') || '', { allowFragments: false })
    if (!src) return ''
    const alt = escapeAttr(node.getAttribute('alt') || '')
    return `<img src="${escapeAttr(src)}" alt="${alt}" />`
  }

  if (tag === 'source') {
    const src = sanitizeUrl(node.getAttribute('src') || '', { allowFragments: false })
    if (!src) return ''
    const type = String(node.getAttribute('type') || '').trim().toLowerCase()
    const typeAttr = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(type) ? ` type="${escapeAttr(type)}"` : ''
    return `<source src="${escapeAttr(src)}"${typeAttr} />`
  }

  if (tag === 'audio') {
    const src = sanitizeUrl(node.getAttribute('src') || '', { allowFragments: false })
    const hasSafeSource = /<source\b/i.test(children)
    if (!src && !hasSafeSource) return ''
    const preloadValue = String(node.getAttribute('preload') || 'metadata').toLowerCase()
    const preload = ['none', 'metadata', 'auto'].includes(preloadValue) ? preloadValue : 'metadata'
    const ariaLabel = String(node.getAttribute('aria-label') || node.getAttribute('title') || '').trim()
    const srcAttr = src ? ` src="${escapeAttr(src)}"` : ''
    const labelAttr = ariaLabel ? ` aria-label="${escapeAttr(ariaLabel)}"` : ''
    return `<audio controls preload="${preload}"${srcAttr}${labelAttr}${sanitizeMediaMetadata(node)}>${children}</audio>`
  }

  if (tag === 'video') {
    const src = sanitizeUrl(node.getAttribute('src') || '', { allowFragments: false })
    const hasSafeSource = /<source\b/i.test(children)
    if (!src && !hasSafeSource) return ''
    const preloadValue = String(node.getAttribute('preload') || 'metadata').toLowerCase()
    const preload = ['none', 'metadata', 'auto'].includes(preloadValue) ? preloadValue : 'metadata'
    const ariaLabel = String(node.getAttribute('aria-label') || node.getAttribute('title') || '').trim()
    const poster = sanitizeUrl(node.getAttribute('poster') || '', { allowFragments: false })
    const srcAttr = src ? ` src="${escapeAttr(src)}"` : ''
    const labelAttr = ariaLabel ? ` aria-label="${escapeAttr(ariaLabel)}"` : ''
    const posterAttr = poster ? ` poster="${escapeAttr(poster)}"` : ''
    return `<video controls preload="${preload}" playsinline${srcAttr}${posterAttr}${labelAttr}${sanitizeMediaMetadata(node)}>${children}</video>`
  }

  if (tag === 'iframe') {
    const src = sanitizeUrl(node.getAttribute('src') || '', { allowFragments: false })
    if (!src) return ''
    const title = String(node.getAttribute('title') || 'Embedded content').trim().slice(0, 240)
    const loading = String(node.getAttribute('loading') || 'lazy').toLowerCase() === 'eager' ? 'eager' : 'lazy'
    const requestedHeight = Number.parseInt(node.getAttribute('height') || '', 10)
    const height = Number.isFinite(requestedHeight) ? Math.min(1400, Math.max(240, requestedHeight)) : 560
    return `<iframe src="${escapeAttr(src)}" title="${escapeAttr(title || 'Embedded content')}" loading="${loading}" referrerpolicy="no-referrer" allowfullscreen width="100%" height="${height}"></iframe>`
  }

  if (tag === 'div') {
    const style = String(node.getAttribute('style') || '').toLowerCase()
    const align = style.match(/text-align\s*:\s*(left|center|right)/)
    if (align) return `<div style="text-align:${align[1]};">${children}</div>`
    // Browsers commonly create plain DIV blocks when Enter is pressed inside
    // contentEditable. Dropping the wrapper destroys paragraph/line boundaries
    // the next time the visual editor reloads the saved HTML.
    return `<div>${children}</div>`
  }

  if (tag === 'figure') {
    const hasMedia = Boolean(node.querySelector('img, audio, video, iframe'))
    if (!hasMedia) return children
    return `<figure${sanitizeFigureClass(node)}${sanitizeMediaMetadata(node)}>${children}</figure>`
  }

  const allowed = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'blockquote', 'figcaption', 'br', 'hr'])
  if (!allowed.has(tag)) return children

  if (tag === 'br' || tag === 'hr') return `<${tag} />`
  return `<${tag}>${children}</${tag}>`
}

function sanitizeHtml(html = '') {
  const value = String(html || '').trim()
  if (!value) return ''

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return value
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  return Array.from(doc.body.childNodes || []).map((node) => sanitizeNode(node)).join('')
}

export function classicEditorBodyToHtml(body = '') {
  const value = String(body || '').trim()
  if (!value) return ''
  const htmlCandidate = lineLooksLikeHtml(value) ? value : markdownLikeToHtml(value)
  return sanitizeHtml(htmlCandidate)
}
