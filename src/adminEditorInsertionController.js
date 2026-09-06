import { buildIframeEmbed, buildMediaEmbed } from './lib/adminEditorEmbeds'

const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable="true"]'
const TEXT_EDITOR_SELECTOR = '.native-content-editor__textarea'
const TOOLBAR_SELECTOR = '.native-content-editor__toolbar'

let visualBookmark = null
let textBookmark = null
let pendingBodyMediaPick = false
let mediaBookmark = null
let linkBookmark = null

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

function rangeInsideEditor(range, editor = visualEditor()) {
  return Boolean(
    editor
    && range
    && range.startContainer?.isConnected
    && range.endContainer?.isConnected
    && editor.contains(range.startContainer)
    && editor.contains(range.endContainer)
  )
}

function textOffset(root, container, offset) {
  const range = document.createRange()
  range.selectNodeContents(root)
  try {
    range.setEnd(container, offset)
  } catch {
    return null
  }
  return range.toString().length
}

function topLevelChild(node, editor) {
  if (!node || !editor) return null
  let current = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  if (!current || !editor.contains(current)) return null
  while (current.parentElement && current.parentElement !== editor) current = current.parentElement
  return current.parentElement === editor ? current : null
}

function offsetInsideBlock(block, container, offset) {
  if (!block || !container) return null
  const range = document.createRange()
  range.selectNodeContents(block)
  try {
    range.setEnd(container, offset)
  } catch {
    return null
  }
  return range.toString().length
}

function captureVisualBookmark() {
  const editor = visualEditor()
  const selection = window.getSelection?.()
  if (!editor || !selection?.rangeCount) return visualBookmark
  const range = selection.getRangeAt(0)
  if (!rangeInsideEditor(range, editor)) return visualBookmark

  const start = textOffset(editor, range.startContainer, range.startOffset)
  const end = textOffset(editor, range.endContainer, range.endOffset)
  const endBlock = topLevelChild(range.endContainer, editor)
  const children = Array.from(editor.childNodes)
  const blockIndex = endBlock ? children.indexOf(endBlock) : -1
  const blockOffset = endBlock ? offsetInsideBlock(endBlock, range.endContainer, range.endOffset) : null

  visualBookmark = {
    start: Number.isFinite(start) ? start : 0,
    end: Number.isFinite(end) ? end : Number.isFinite(start) ? start : 0,
    collapsed: range.collapsed,
    blockIndex,
    blockOffset: Number.isFinite(blockOffset) ? blockOffset : null,
  }
  return visualBookmark
}

function captureTextBookmark(event) {
  const textarea = event?.target?.closest?.(TEXT_EDITOR_SELECTOR) || textEditor()
  if (!textarea || document.activeElement !== textarea) return textBookmark
  textBookmark = {
    start: textarea.selectionStart ?? textarea.value.length,
    end: textarea.selectionEnd ?? textarea.value.length,
  }
  return textBookmark
}

function rangeFromTextOffsets(editor, startOffset, endOffset = startOffset) {
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

function restoreVisualRange(bookmark = visualBookmark) {
  const editor = visualEditor()
  if (!editor || !bookmark) return null
  return rangeFromTextOffsets(editor, bookmark.start ?? 0, bookmark.end ?? bookmark.start ?? 0)
}

function dispatchCanonicalSync(editor, inputType = 'insertHTML') {
  if (!editor) return
  const inputEvent = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, inputType })
    : new Event('input', { bubbles: true })
  editor.dispatchEvent(inputEvent)
  const focusout = typeof FocusEvent === 'function'
    ? new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    : new Event('focusout', { bubbles: true })
  editor.dispatchEvent(focusout)
}

function placeCaret(range, editor) {
  const selection = window.getSelection?.()
  if (!selection || !range) return
  selection.removeAllRanges()
  selection.addRange(range)
  editor?.focus?.({ preventScroll: true })
  captureVisualBookmark()
}

function insertVisualLink(href, bookmark = linkBookmark || visualBookmark) {
  const editor = visualEditor()
  if (!editor || !href) return false
  const range = restoreVisualRange(bookmark)
  if (!range) return false

  const anchor = document.createElement('a')
  anchor.href = href
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'

  try {
    if (range.collapsed) {
      anchor.textContent = href
      range.insertNode(anchor)
    } else {
      const fragment = range.extractContents()
      anchor.append(fragment)
      range.insertNode(anchor)
    }
  } catch {
    placeCaret(range, editor)
    document.execCommand('createLink', false, href)
    dispatchCanonicalSync(editor, 'insertLink')
    return true
  }

  const after = document.createRange()
  after.setStartAfter(anchor)
  after.collapse(true)
  placeCaret(after, editor)
  dispatchCanonicalSync(editor, 'insertLink')
  return true
}

function insertTextLink(href) {
  const textarea = textEditor()
  if (!textarea || !href) return false
  const bookmark = textBookmark || {
    start: textarea.selectionStart ?? textarea.value.length,
    end: textarea.selectionEnd ?? textarea.value.length,
  }
  const start = bookmark.start
  const end = bookmark.end
  const selected = textarea.value.slice(start, end)
  const label = selected || href
  const markup = `[${label}](${href})`
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  const nextValue = `${textarea.value.slice(0, start)}${markup}${textarea.value.slice(end)}`
  if (setter) setter.call(textarea, nextValue)
  else textarea.value = nextValue
  const cursor = start + markup.length
  textarea.selectionStart = cursor
  textarea.selectionEnd = cursor
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
  textBookmark = { start: cursor, end: cursor }
  return true
}

function fragmentMeaningful(fragment) {
  if (!fragment) return false
  if (String(fragment.textContent || '').replace(/\u200b/g, '').trim()) return true
  return Boolean(fragment.querySelector?.('img, audio, video, iframe, hr, figure, br'))
}

function isEmptyLandingParagraph(node) {
  if (!(node instanceof Element) || node.tagName !== 'P') return false
  const text = String(node.textContent || '').replace(/\u200b/g, '').trim()
  if (text) return false
  return !node.querySelector('img, audio, video, iframe, a')
}

function fragmentFromMarkup(markup) {
  const template = document.createElement('template')
  template.innerHTML = String(markup || '').trim()
  const fragment = template.content
  const last = fragment.lastElementChild
  if (isEmptyLandingParagraph(last)) last.remove()
  fragment.querySelectorAll('figure.sabot-embed').forEach((figure) => figure.setAttribute('contenteditable', 'false'))
  return fragment
}

function insertFragmentBefore(referenceNode, fragment) {
  const parent = referenceNode?.parentNode
  if (!parent) return []
  const nodes = Array.from(fragment.childNodes)
  parent.insertBefore(fragment, referenceNode)
  return nodes
}

function appendFragment(parent, fragment) {
  const nodes = Array.from(fragment.childNodes)
  parent.appendChild(fragment)
  return nodes
}

function makeLandingParagraph() {
  const p = document.createElement('p')
  p.appendChild(document.createElement('br'))
  return p
}

function setCaretAtStart(node, editor) {
  if (!node) return
  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(true)
  placeCaret(range, editor)
}

function insertVisualMarkupAtBookmark(markup, bookmark = mediaBookmark || visualBookmark) {
  const editor = visualEditor()
  if (!editor || !markup) return false

  const fragment = fragmentFromMarkup(markup)
  if (!fragment.childNodes.length) return false

  let range = restoreVisualRange(bookmark)
  if (!range) {
    const nodes = appendFragment(editor, fragment)
    const landing = makeLandingParagraph()
    editor.appendChild(landing)
    setCaretAtStart(landing, editor)
    dispatchCanonicalSync(editor)
    return Boolean(nodes.length)
  }

  range.collapse(false)

  const mediaAncestor = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer.closest?.('figure.sabot-embed')
    : range.startContainer.parentElement?.closest?.('figure.sabot-embed')
  if (mediaAncestor && editor.contains(mediaAncestor)) {
    const nodes = Array.from(fragment.childNodes)
    mediaAncestor.after(fragment)
    const landing = makeLandingParagraph()
    const last = nodes[nodes.length - 1] || mediaAncestor
    last.after(landing)
    setCaretAtStart(landing, editor)
    dispatchCanonicalSync(editor)
    return true
  }

  if (range.startContainer === editor) {
    const reference = editor.childNodes[range.startOffset] || null
    const nodes = reference ? insertFragmentBefore(reference, fragment) : appendFragment(editor, fragment)
    let landing = null
    if (reference instanceof Element && isEmptyLandingParagraph(reference)) landing = reference
    if (!landing) {
      landing = makeLandingParagraph()
      const last = nodes[nodes.length - 1]
      if (last?.parentNode) last.after(landing)
      else editor.appendChild(landing)
    }
    setCaretAtStart(landing, editor)
    dispatchCanonicalSync(editor)
    return true
  }

  const block = topLevelChild(range.startContainer, editor)
  if (!block) {
    appendFragment(editor, fragment)
    const landing = makeLandingParagraph()
    editor.appendChild(landing)
    setCaretAtStart(landing, editor)
    dispatchCanonicalSync(editor)
    return true
  }

  if (block.matches?.('figure.sabot-embed, ul, ol, table')) {
    const nodes = Array.from(fragment.childNodes)
    block.after(fragment)
    const landing = makeLandingParagraph()
    const last = nodes[nodes.length - 1] || block
    last.after(landing)
    setCaretAtStart(landing, editor)
    dispatchCanonicalSync(editor)
    return true
  }

  const splitTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE'])
  if (!splitTags.has(block.tagName)) {
    const nodes = Array.from(fragment.childNodes)
    block.after(fragment)
    const landing = makeLandingParagraph()
    const last = nodes[nodes.length - 1] || block
    last.after(landing)
    setCaretAtStart(landing, editor)
    dispatchCanonicalSync(editor)
    return true
  }

  const beforeRange = document.createRange()
  beforeRange.selectNodeContents(block)
  beforeRange.setEnd(range.startContainer, range.startOffset)
  const afterRange = document.createRange()
  afterRange.selectNodeContents(block)
  afterRange.setStart(range.startContainer, range.startOffset)
  const beforeContents = beforeRange.cloneContents()
  const afterContents = afterRange.cloneContents()
  const beforeBlock = block.cloneNode(false)
  const afterBlock = block.cloneNode(false)
  beforeBlock.removeAttribute('contenteditable')
  afterBlock.removeAttribute('contenteditable')
  beforeBlock.appendChild(beforeContents)
  afterBlock.appendChild(afterContents)

  const parent = block.parentNode
  if (!parent) return false
  if (fragmentMeaningful(beforeBlock)) parent.insertBefore(beforeBlock, block)
  const insertedNodes = Array.from(fragment.childNodes)
  parent.insertBefore(fragment, block)
  const hasAfter = fragmentMeaningful(afterBlock)
  if (hasAfter) parent.insertBefore(afterBlock, block)
  block.remove()

  if (hasAfter) {
    setCaretAtStart(afterBlock, editor)
  } else {
    const landing = makeLandingParagraph()
    const last = insertedNodes[insertedNodes.length - 1]
    if (last?.parentNode) last.after(landing)
    else editor.appendChild(landing)
    setCaretAtStart(landing, editor)
  }
  dispatchCanonicalSync(editor)
  return true
}

function insertTextMarkupAtBookmark(markup) {
  const textarea = textEditor()
  if (!textarea || !markup) return false
  const bookmark = mediaBookmark || textBookmark || {
    start: textarea.selectionStart ?? textarea.value.length,
    end: textarea.selectionEnd ?? textarea.value.length,
  }
  const start = bookmark.start
  const end = bookmark.end
  const prefix = start > 0 && textarea.value[start - 1] !== '\n' ? '\n' : ''
  const suffix = end < textarea.value.length && textarea.value[end] !== '\n' ? '\n' : ''
  const inserted = `${prefix}${markup}${suffix}`
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  const nextValue = `${textarea.value.slice(0, start)}${inserted}${textarea.value.slice(end)}`
  if (setter) setter.call(textarea, nextValue)
  else textarea.value = nextValue
  const cursor = start + inserted.length
  textarea.selectionStart = cursor
  textarea.selectionEnd = cursor
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
  textBookmark = { start: cursor, end: cursor }
  return true
}

function insertMarkupAtBookmark(markup) {
  if (visualEditor()) return insertVisualMarkupAtBookmark(markup)
  return insertTextMarkupAtBookmark(markup)
}

function selectedReactMediaData() {
  const modal = document.querySelector('.media-picker-modal')
  if (!modal) return null
  const selectedTile = modal.querySelector('.media-library-tile.is-selected')
  if (!selectedTile) return null
  const title = selectedTile.querySelector('.media-library-tile__meta strong')?.textContent?.trim() || 'Media'
  const typeLabel = selectedTile.querySelector('.media-library-tile__meta small')?.textContent?.trim() || ''
  const mediaType = typeLabel.split('·')[0].trim().toLowerCase()
  const details = modal.querySelector('.media-attachment-details')
  const labels = [...(details?.querySelectorAll('label') || [])]
  const field = (name) => labels.find((label) => label.querySelector('span')?.textContent?.trim().toLowerCase() === name)
  const url = field('public url')?.querySelector('input')?.value?.trim() || ''
  const caption = field('caption / link text')?.querySelector('textarea')?.value?.trim() || ''
  const alt = field('alt text')?.querySelector('input')?.value?.trim() || ''
  const facts = [...(details?.querySelectorAll('.media-attachment-details__facts span') || [])]
    .map((node) => node.textContent?.trim() || '')
  const mimeType = facts
    .flatMap((value) => value.split('·').map((part) => part.trim()))
    .find((value) => /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(value)) || ''
  if (!url) return null
  return { url, title, alt, caption, mediaType, mimeType }
}

function closeReactMediaModal() {
  const modal = document.querySelector('.media-picker-modal')
  const closeButton = [...(modal?.querySelectorAll('button') || [])]
    .find((button) => button.textContent?.trim().toLowerCase() === 'close')
  closeButton?.click()
}

function toolbarAction(button) {
  return button?.textContent?.trim().toLowerCase() || ''
}

function handlePointerDown(event) {
  if (!isAdminPostEditor()) return
  const button = event.target?.closest?.('button')
  if (!button) return
  const action = toolbarAction(button)

  if (button.classList.contains('native-content-editor__add-media') || action === 'add media') {
    mediaBookmark = visualEditor() ? captureVisualBookmark() : captureTextBookmark()
    pendingBodyMediaPick = true
    event.stopImmediatePropagation?.()
    return
  }

  if (button.closest(TOOLBAR_SELECTOR) && action === 'link') {
    linkBookmark = visualEditor() ? captureVisualBookmark() : captureTextBookmark()
    event.preventDefault()
    event.stopImmediatePropagation?.()
    return
  }

  if (button.hasAttribute('data-sabot-embed-button') || (button.closest(TOOLBAR_SELECTOR) && action === 'embed')) {
    mediaBookmark = visualEditor() ? captureVisualBookmark() : captureTextBookmark()
    event.preventDefault()
    event.stopImmediatePropagation?.()
  }
}

function handleClick(event) {
  if (!isAdminPostEditor()) return
  const button = event.target?.closest?.('button')
  if (!button) return
  const action = toolbarAction(button)

  if (button.closest(TOOLBAR_SELECTOR) && action === 'link') {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
    const href = window.prompt('Enter URL for link', 'https://')
    if (!href) return
    if (visualEditor()) insertVisualLink(href, linkBookmark)
    else insertTextLink(href)
    linkBookmark = null
    return
  }

  if (button.hasAttribute('data-sabot-embed-button') || (button.closest(TOOLBAR_SELECTOR) && action === 'embed')) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
    const raw = window.prompt('Paste an iframe embed code or URL')
    if (!raw) return
    const markup = buildIframeEmbed(raw)
    if (!markup) {
      window.alert('That embed needs an http(s) or site-relative URL.')
      return
    }
    insertMarkupAtBookmark(markup)
    mediaBookmark = null
    return
  }

  if (!pendingBodyMediaPick) return
  const reactModal = button.closest('.media-picker-modal')
  if (!reactModal || action !== 'use selected media') return
  const media = selectedReactMediaData()
  if (!media) return
  const markup = buildMediaEmbed(media)
  if (!markup) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation?.()
  insertMarkupAtBookmark(markup)
  pendingBodyMediaPick = false
  mediaBookmark = null
  closeReactMediaModal()
}

function handleKeydown(event) {
  if (!isAdminPostEditor()) return
  const editor = event.target?.closest?.(VISUAL_EDITOR_SELECTOR)
  const textarea = event.target?.closest?.(TEXT_EDITOR_SELECTOR)
  if (!editor && !textarea) return
  if (!(event.ctrlKey || event.metaKey) || event.altKey || String(event.key || '').toLowerCase() !== 'k') return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation?.()
  if (editor) linkBookmark = captureVisualBookmark()
  else linkBookmark = captureTextBookmark(event)
  const href = window.prompt('Enter URL for link', 'https://')
  if (!href) return
  if (editor) insertVisualLink(href, linkBookmark)
  else insertTextLink(href)
  linkBookmark = null
}

function handleSelectionChange() {
  if (!isAdminPostEditor()) return
  captureVisualBookmark()
}

function handleTextSelection(event) {
  if (!isAdminPostEditor()) return
  if (event.target?.matches?.(TEXT_EDITOR_SELECTOR)) captureTextBookmark(event)
}

function handleModalClose(event) {
  const button = event.target?.closest?.('button')
  if (!button?.closest?.('.media-picker-modal')) return
  const action = toolbarAction(button)
  if (action === 'close' || action === 'cancel') {
    pendingBodyMediaPick = false
    mediaBookmark = null
  }
}

function boot() {
  document.addEventListener('selectionchange', handleSelectionChange)
  document.addEventListener('keyup', handleTextSelection, true)
  document.addEventListener('mouseup', handleTextSelection, true)
  document.addEventListener('focusin', handleTextSelection, true)
  document.addEventListener('input', handleTextSelection, true)
  document.addEventListener('mousedown', handlePointerDown, true)
  document.addEventListener('click', handleClick, true)
  document.addEventListener('keydown', handleKeydown, true)
  document.addEventListener('click', handleModalClose, true)
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
}
