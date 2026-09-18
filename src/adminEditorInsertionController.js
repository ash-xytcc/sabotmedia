import { buildIframeEmbed, buildMediaEmbed } from './lib/adminEditorEmbeds'

const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable="true"]'
const TEXT_EDITOR_SELECTOR = '.native-content-editor__textarea'
const TOOLBAR_SELECTOR = '.native-content-editor__toolbar'

let mediaBookmark = null
let linkBookmark = null
let pendingBodyMediaPick = false

function isAdminPostEditor() {
  if (typeof window === 'undefined') return false
  return /\/(wp-admin\/post-new\.php|wp-admin\/native-bridge|native-bridge)(?:\/|$)/.test(window.location.pathname)
}

function visualEditor() {
  return document.querySelector(VISUAL_EDITOR_SELECTOR)
}

function textEditor() {
  return document.querySelector(TEXT_EDITOR_SELECTOR)
}

function selectionRange(editor) {
  const selection = window.getSelection && window.getSelection()
  if (!editor || !selection || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null
  return range
}

function topLevelChild(node, editor) {
  if (!node || !editor) return null
  let current = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  if (!current || !editor.contains(current)) return null
  while (current.parentElement && current.parentElement !== editor) current = current.parentElement
  return current.parentElement === editor ? current : null
}

function textOffset(root, container, offset) {
  const range = document.createRange()
  range.selectNodeContents(root)
  try {
    range.setEnd(container, offset)
  } catch (error) {
    return null
  }
  return range.toString().length
}

function isEmptyBlock(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false
  if (String(node.textContent || '').replace(/\u200b/g, '').trim()) return false
  return !node.querySelector('img, audio, video, iframe, figure, hr')
}

function captureVisualMediaBookmark() {
  const editor = visualEditor()
  const range = selectionRange(editor)
  if (!editor || !range) return null

  const collapsed = range.cloneRange()
  collapsed.collapse(false)

  if (collapsed.startContainer === editor) {
    return {
      kind: 'visual',
      boundaryIndex: collapsed.startOffset,
      textOffset: textOffset(editor, collapsed.startContainer, collapsed.startOffset) || 0,
    }
  }

  const block = topLevelChild(collapsed.startContainer, editor)
  const children = Array.from(editor.childNodes)
  const blockIndex = block ? children.indexOf(block) : -1
  const globalOffset = textOffset(editor, collapsed.startContainer, collapsed.startOffset)

  if (blockIndex < 0) {
    return {
      kind: 'visual',
      boundaryIndex: children.length,
      textOffset: Number.isFinite(globalOffset) ? globalOffset : 0,
    }
  }

  return {
    kind: 'visual',
    boundaryIndex: isEmptyBlock(block) ? blockIndex : blockIndex + 1,
    textOffset: Number.isFinite(globalOffset) ? globalOffset : 0,
    blockText: String(block.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
  }
}

function captureVisualLinkBookmark() {
  const editor = visualEditor()
  const range = selectionRange(editor)
  if (!editor || !range) return null
  const start = textOffset(editor, range.startContainer, range.startOffset)
  const end = textOffset(editor, range.endContainer, range.endOffset)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { kind: 'visual-link', start: start, end: end }
}

function captureTextBookmark() {
  const textarea = textEditor()
  if (!textarea) return null
  return {
    kind: 'text',
    start: textarea.selectionStart == null ? textarea.value.length : textarea.selectionStart,
    end: textarea.selectionEnd == null ? textarea.value.length : textarea.selectionEnd,
  }
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
    const length = node.nodeValue ? node.nodeValue.length : 0
    if (!startNode && startOffset <= consumed + length) {
      startNode = node
      start = Math.max(0, Math.min(length, startOffset - consumed))
    }
    if (endOffset <= consumed + length) {
      endNode = node
      end = Math.max(0, Math.min(length, endOffset - consumed))
      break
    }
    consumed += length
    node = walker.nextNode()
  }

  const range = document.createRange()
  if (!startNode) {
    range.selectNodeContents(editor)
    range.collapse(false)
    return range
  }
  if (!endNode) {
    endNode = startNode
    end = start
  }
  range.setStart(startNode, start)
  range.setEnd(endNode, end)
  return range
}

function dispatchEditorSync(editor, inputType) {
  if (!editor) return
  let inputEvent
  if (typeof InputEvent === 'function') inputEvent = new InputEvent('input', { bubbles: true, inputType: inputType || 'insertHTML' })
  else inputEvent = new Event('input', { bubbles: true })
  editor.dispatchEvent(inputEvent)

  let focusEvent
  if (typeof FocusEvent === 'function') focusEvent = new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
  else focusEvent = new Event('focusout', { bubbles: true })
  editor.dispatchEvent(focusEvent)
}

function placeCaretAtStart(editor, node) {
  if (!editor || !node) return
  const selection = window.getSelection && window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  if (editor.focus) editor.focus({ preventScroll: true })
}

function createFragment(markup) {
  const template = document.createElement('template')
  template.innerHTML = String(markup || '').trim()
  const fragment = template.content
  const figures = fragment.querySelectorAll('figure.sabot-embed')
  for (const figure of figures) figure.setAttribute('contenteditable', 'false')
  return fragment
}

function resolveBoundaryIndex(editor, bookmark) {
  const children = Array.from(editor.childNodes)
  let index = bookmark && Number.isInteger(bookmark.boundaryIndex) ? bookmark.boundaryIndex : children.length
  index = Math.max(0, Math.min(children.length, index))

  if (bookmark && bookmark.blockText && index > 0) {
    const expected = bookmark.blockText
    const before = children[index - 1]
    const actual = String(before && before.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)
    if (actual !== expected) {
      const match = children.findIndex(function (child) {
        return String(child && child.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) === expected
      })
      if (match >= 0) index = isEmptyBlock(children[match]) ? match : match + 1
    }
  }

  return index
}

function insertVisualMarkup(markup, bookmark) {
  const editor = visualEditor()
  if (!editor || !markup) return false
  const fragment = createFragment(markup)
  const insertedNodes = Array.from(fragment.childNodes)
  if (!insertedNodes.length) return false

  const boundaryIndex = resolveBoundaryIndex(editor, bookmark)
  const reference = editor.childNodes[boundaryIndex] || null
  if (reference) editor.insertBefore(fragment, reference)
  else editor.appendChild(fragment)

  let landing = null
  for (const node of insertedNodes) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P' && isEmptyBlock(node)) landing = node
  }
  if (!landing) {
    landing = document.createElement('p')
    landing.appendChild(document.createElement('br'))
    const last = insertedNodes[insertedNodes.length - 1]
    if (last && last.parentNode) last.parentNode.insertBefore(landing, last.nextSibling)
    else editor.appendChild(landing)
  }

  placeCaretAtStart(editor, landing)
  dispatchEditorSync(editor, 'insertHTML')
  return true
}

function setTextareaValue(textarea, value) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
  if (descriptor && descriptor.set) descriptor.set.call(textarea, value)
  else textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

function insertTextMarkup(markup, bookmark) {
  const textarea = textEditor()
  if (!textarea || !markup) return false
  const start = bookmark && Number.isInteger(bookmark.start) ? bookmark.start : textarea.value.length
  const end = bookmark && Number.isInteger(bookmark.end) ? bookmark.end : start
  const prefix = start > 0 && textarea.value[start - 1] !== '\n' ? '\n' : ''
  const suffix = end < textarea.value.length && textarea.value[end] !== '\n' ? '\n' : ''
  const inserted = prefix + markup + suffix
  setTextareaValue(textarea, textarea.value.slice(0, start) + inserted + textarea.value.slice(end))
  const cursor = start + inserted.length
  textarea.selectionStart = cursor
  textarea.selectionEnd = cursor
  textarea.focus()
  return true
}

function insertMediaMarkup(markup) {
  if (mediaBookmark && mediaBookmark.kind === 'text') return insertTextMarkup(markup, mediaBookmark)
  return insertVisualMarkup(markup, mediaBookmark)
}

function insertVisualLink(href, bookmark) {
  const editor = visualEditor()
  if (!editor || !href || !bookmark) return false
  const range = rangeFromTextOffsets(editor, bookmark.start, bookmark.end)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'

  if (range.collapsed) anchor.textContent = href
  else anchor.appendChild(range.extractContents())
  range.insertNode(anchor)

  const selection = window.getSelection && window.getSelection()
  if (selection) {
    const after = document.createRange()
    after.setStartAfter(anchor)
    after.collapse(true)
    selection.removeAllRanges()
    selection.addRange(after)
  }
  if (editor.focus) editor.focus({ preventScroll: true })
  dispatchEditorSync(editor, 'insertLink')
  return true
}

function insertTextLink(href, bookmark) {
  const textarea = textEditor()
  if (!textarea || !href || !bookmark) return false
  const start = bookmark.start
  const end = bookmark.end
  const selected = textarea.value.slice(start, end)
  const label = selected || href
  const markup = '[' + label + '](' + href + ')'
  setTextareaValue(textarea, textarea.value.slice(0, start) + markup + textarea.value.slice(end))
  const cursor = start + markup.length
  textarea.selectionStart = cursor
  textarea.selectionEnd = cursor
  textarea.focus()
  return true
}

function selectedReactMediaData() {
  const modal = document.querySelector('.media-picker-modal')
  if (!modal) return null
  const selectedTile = modal.querySelector('.media-library-tile.is-selected')
  if (!selectedTile) return null

  const titleNode = selectedTile.querySelector('.media-library-tile__meta strong')
  const typeNode = selectedTile.querySelector('.media-library-tile__meta small')
  const title = titleNode ? titleNode.textContent.trim() : 'Media'
  const typeLabel = typeNode ? typeNode.textContent.trim() : ''
  const mediaType = typeLabel.split('·')[0].trim().toLowerCase()
  const details = modal.querySelector('.media-attachment-details')
  const labels = Array.from(details ? details.querySelectorAll('label') : [])

  function field(name) {
    return labels.find(function (label) {
      const span = label.querySelector('span')
      return span && span.textContent.trim().toLowerCase() === name
    })
  }

  const urlField = field('public url')
  const captionField = field('caption / link text')
  const altField = field('alt text')
  const urlInput = urlField && urlField.querySelector('input')
  const captionInput = captionField && captionField.querySelector('textarea')
  const altInput = altField && altField.querySelector('input')
  const url = urlInput ? urlInput.value.trim() : ''
  const caption = captionInput ? captionInput.value.trim() : ''
  const alt = altInput ? altInput.value.trim() : ''
  const facts = Array.from(details ? details.querySelectorAll('.media-attachment-details__facts span') : [])
    .map(function (node) { return node.textContent ? node.textContent.trim() : '' })
  const parts = []
  for (const fact of facts) {
    for (const part of fact.split('·')) parts.push(part.trim())
  }
  const mimeType = parts.find(function (value) { return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(value) }) || ''

  if (!url) return null
  return { url: url, title: title, alt: alt, caption: caption, mediaType: mediaType, mimeType: mimeType }
}

function closeMediaModal() {
  const modal = document.querySelector('.media-picker-modal')
  if (!modal) return
  const buttons = Array.from(modal.querySelectorAll('button'))
  const close = buttons.find(function (button) { return button.textContent.trim().toLowerCase() === 'close' })
  if (close) close.click()
}

function buttonLabel(button) {
  return button && button.textContent ? button.textContent.trim().toLowerCase() : ''
}

function handleMouseDown(event) {
  if (!isAdminPostEditor()) return
  const button = event.target && event.target.closest ? event.target.closest('button') : null
  if (!button) return
  const label = buttonLabel(button)

  if (button.classList.contains('native-content-editor__add-media') || label === 'add media') {
    mediaBookmark = visualEditor() ? captureVisualMediaBookmark() : captureTextBookmark()
    pendingBodyMediaPick = true
    event.preventDefault()
    return
  }

  if (button.closest(TOOLBAR_SELECTOR) && label === 'link') {
    linkBookmark = visualEditor() ? captureVisualLinkBookmark() : captureTextBookmark()
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }

  if (button.hasAttribute('data-sabot-embed-button') || (button.closest(TOOLBAR_SELECTOR) && label === 'embed')) {
    mediaBookmark = visualEditor() ? captureVisualMediaBookmark() : captureTextBookmark()
    event.preventDefault()
    event.stopImmediatePropagation()
  }
}

function handleClick(event) {
  if (!isAdminPostEditor()) return
  const button = event.target && event.target.closest ? event.target.closest('button') : null
  if (!button) return
  const label = buttonLabel(button)

  if (button.closest(TOOLBAR_SELECTOR) && label === 'link') {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    const href = window.prompt('Enter URL for link', 'https://')
    if (!href) {
      linkBookmark = null
      return
    }
    if (linkBookmark && linkBookmark.kind === 'text') insertTextLink(href, linkBookmark)
    else insertVisualLink(href, linkBookmark)
    linkBookmark = null
    return
  }

  if (button.hasAttribute('data-sabot-embed-button') || (button.closest(TOOLBAR_SELECTOR) && label === 'embed')) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    const raw = window.prompt('Paste an iframe embed code or URL')
    if (!raw) {
      mediaBookmark = null
      return
    }
    const markup = buildIframeEmbed(raw)
    if (!markup) {
      mediaBookmark = null
      window.alert('That embed needs an http(s) or site-relative URL.')
      return
    }
    insertMediaMarkup(markup)
    mediaBookmark = null
    return
  }

  if (!pendingBodyMediaPick) return
  const modal = button.closest('.media-picker-modal')
  if (!modal || label !== 'use selected media') return
  const media = selectedReactMediaData()
  if (!media) return
  const markup = buildMediaEmbed(media)
  if (!markup) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  insertMediaMarkup(markup)
  pendingBodyMediaPick = false
  mediaBookmark = null
  closeMediaModal()
}

function handleKeyDown(event) {
  if (!isAdminPostEditor()) return
  if (!(event.ctrlKey || event.metaKey) || event.altKey || String(event.key || '').toLowerCase() !== 'k') return
  const editor = event.target && event.target.closest ? event.target.closest(VISUAL_EDITOR_SELECTOR) : null
  const textarea = event.target && event.target.closest ? event.target.closest(TEXT_EDITOR_SELECTOR) : null
  if (!editor && !textarea) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  linkBookmark = editor ? captureVisualLinkBookmark() : captureTextBookmark()
  const href = window.prompt('Enter URL for link', 'https://')
  if (!href) {
    linkBookmark = null
    return
  }
  if (editor) insertVisualLink(href, linkBookmark)
  else insertTextLink(href, linkBookmark)
  linkBookmark = null
}

function handleModalClose(event) {
  const button = event.target && event.target.closest ? event.target.closest('button') : null
  if (!button || !button.closest('.media-picker-modal')) return
  const label = buttonLabel(button)
  if (label === 'close' || label === 'cancel') {
    pendingBodyMediaPick = false
    mediaBookmark = null
  }
}

function boot() {
  document.addEventListener('mousedown', handleMouseDown, true)
  document.addEventListener('click', handleClick, true)
  document.addEventListener('keydown', handleKeyDown, true)
  document.addEventListener('click', handleModalClose, true)
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
}
