import { buildIframeEmbed, buildMediaEmbed } from './lib/adminEditorEmbeds'

const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable="true"]'
const TEXT_EDITOR_SELECTOR = '.native-content-editor__textarea'
const CARET_MARKER_ATTR = 'data-sabot-media-caret'
const INSPECTOR_ID = 'sabot-editor-context-inspector'
let savedVisualRange = null
let savedTextSelection = null
let pendingBodyMediaPick = false
let caretMarker = null

function isAdminPostEditor() {
  if (typeof window === 'undefined') return false
  return /\/(wp-admin\/post-new\.php|wp-admin\/native-bridge|native-bridge)(?:\/|$)/.test(window.location.pathname)
}

function editorElement() {
  return document.querySelector(VISUAL_EDITOR_SELECTOR)
}

function rememberVisualSelection() {
  if (!isAdminPostEditor()) return
  const editor = editorElement()
  const selection = window.getSelection?.()
  if (!editor || !selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return
  savedVisualRange = range.cloneRange()
}

function rememberTextSelection(event) {
  const textarea = event.target?.closest?.(TEXT_EDITOR_SELECTOR)
  if (!textarea || textarea.getAttribute('contenteditable') === 'true') return
  savedTextSelection = {
    element: textarea,
    start: textarea.selectionStart ?? textarea.value.length,
    end: textarea.selectionEnd ?? textarea.value.length,
  }
}

function removeCaretMarker() {
  if (caretMarker?.isConnected) caretMarker.remove()
  document.querySelectorAll(`[${CARET_MARKER_ATTR}]`).forEach((node) => node.remove())
  caretMarker = null
}

function placeCaretMarker() {
  const editor = editorElement()
  if (!editor) return false
  rememberVisualSelection()
  const selection = window.getSelection?.()
  let range = savedVisualRange
  if ((!range || !editor.contains(range.commonAncestorContainer)) && selection?.rangeCount) {
    const current = selection.getRangeAt(0)
    if (editor.contains(current.commonAncestorContainer)) range = current.cloneRange()
  }
  if (!range || !editor.contains(range.commonAncestorContainer)) return false

  removeCaretMarker()
  const markerRange = range.cloneRange()
  markerRange.collapse(false)
  const marker = document.createElement('span')
  marker.setAttribute(CARET_MARKER_ATTR, '1')
  marker.setAttribute('aria-hidden', 'true')
  marker.style.display = 'inline-block'
  marker.style.width = '0'
  marker.style.height = '0'
  marker.style.overflow = 'hidden'
  marker.style.lineHeight = '0'
  markerRange.insertNode(marker)
  caretMarker = marker
  return true
}

function captureEditorSelection({ withMarker = false } = {}) {
  rememberVisualSelection()
  const textarea = document.querySelector(TEXT_EDITOR_SELECTOR)
  if (textarea && document.activeElement === textarea) {
    savedTextSelection = {
      element: textarea,
      start: textarea.selectionStart ?? textarea.value.length,
      end: textarea.selectionEnd ?? textarea.value.length,
    }
  }
  if (withMarker) placeCaretMarker()
}

document.addEventListener('selectionchange', rememberVisualSelection)
document.addEventListener('keyup', rememberTextSelection, true)
document.addEventListener('mouseup', rememberTextSelection, true)
document.addEventListener('focusin', rememberTextSelection, true)
document.addEventListener('input', rememberTextSelection, true)

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

function selectedLegacyMediaData() {
  const button = document.querySelector('.wp-media-modal .wp-media-item.is-selected')
  if (!button) return null
  const url = button.getAttribute('data-media-url') || ''
  if (!url) return null
  return {
    url,
    title: button.getAttribute('data-media-title') || 'Media',
    mediaType: (button.getAttribute('data-media-type') || '').toLowerCase(),
    mimeType: (button.getAttribute('data-media-mime') || '').toLowerCase(),
  }
}

function selectedMediaData() {
  return selectedReactMediaData() || selectedLegacyMediaData()
}

function restoreVisualSelection(editor) {
  const selection = window.getSelection?.()
  if (!selection) return null
  if (caretMarker?.isConnected && editor.contains(caretMarker)) {
    const range = document.createRange()
    range.setStartBefore(caretMarker)
    range.collapse(true)
    caretMarker.remove()
    caretMarker = null
    selection.removeAllRanges()
    selection.addRange(range)
    savedVisualRange = range.cloneRange()
    return range
  }
  if (savedVisualRange && editor.contains(savedVisualRange.commonAncestorContainer)) {
    selection.removeAllRanges()
    selection.addRange(savedVisualRange)
    return savedVisualRange
  }
  return null
}

function dispatchEditorInput(editor, inputType = 'insertHTML', data = null) {
  const inputEvent = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, inputType, data })
    : new Event('input', { bubbles: true })
  editor.dispatchEvent(inputEvent)
  editor.dispatchEvent(new Event('blur', { bubbles: true }))
}

function insertHtmlIntoVisualEditor(markup) {
  const editor = editorElement()
  if (!editor || !markup) return false
  const selection = window.getSelection?.()
  let range = restoreVisualSelection(editor)

  if (!range) {
    range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
  }

  range.deleteContents()
  const fragment = range.createContextualFragment(markup)
  const lastNode = fragment.lastChild
  range.insertNode(fragment)

  if (lastNode && selection) {
    const nextRange = document.createRange()
    nextRange.setStartAfter(lastNode)
    nextRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(nextRange)
    savedVisualRange = nextRange.cloneRange()
  }

  editor.focus()
  dispatchEditorInput(editor, 'insertHTML', markup)
  return true
}

function insertTextIntoTextarea(markup) {
  const textarea = savedTextSelection?.element?.isConnected
    ? savedTextSelection.element
    : document.querySelector(TEXT_EDITOR_SELECTOR)
  if (!textarea || !markup) return false
  const start = savedTextSelection?.element === textarea
    ? savedTextSelection.start
    : (textarea.selectionStart ?? textarea.value.length)
  const end = savedTextSelection?.element === textarea
    ? savedTextSelection.end
    : (textarea.selectionEnd ?? textarea.value.length)
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
  savedTextSelection = { element: textarea, start: cursor, end: cursor }
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
  return true
}

function insertMarkup(markup) {
  const visual = editorElement()
  if (visual) return insertHtmlIntoVisualEditor(markup)
  return insertTextIntoTextarea(markup)
}

function closeReactMediaModal() {
  const modal = document.querySelector('.media-picker-modal')
  if (!modal) return
  const closeButton = [...modal.querySelectorAll('button')]
    .find((button) => button.textContent?.trim().toLowerCase() === 'close')
  closeButton?.click()
}

function handlePointerDown(event) {
  if (!isAdminPostEditor()) return
  const button = event.target?.closest?.('button')
  if (!button) return
  const label = button.textContent?.trim().toLowerCase() || ''

  if (button.classList.contains('native-content-editor__add-media') || label === 'add media') {
    captureEditorSelection({ withMarker: true })
    pendingBodyMediaPick = true
    return
  }

  if (label === 'choose from media') pendingBodyMediaPick = false
}

function handleSelectClick(event) {
  if (!isAdminPostEditor() || !pendingBodyMediaPick) return
  const button = event.target?.closest?.('button')
  if (!button) return
  const label = button.textContent?.trim().toLowerCase() || ''
  const reactModal = button.closest('.media-picker-modal')
  const legacyModal = button.closest('.wp-media-modal')
  const isUseSelected = reactModal && label === 'use selected media'
  const isLegacySelect = legacyModal && label === 'select'
  if (!isUseSelected && !isLegacySelect) return

  const media = selectedMediaData()
  if (!media) return
  const markup = buildMediaEmbed(media)
  if (!markup) return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  insertMarkup(markup)
  pendingBodyMediaPick = false
  removeCaretMarker()
  if (reactModal) closeReactMediaModal()
  else {
    const closeButton = [...legacyModal.querySelectorAll('button')]
      .find((candidate) => candidate.textContent?.trim().toLowerCase() === 'close')
    closeButton?.click()
  }
}

function handleModalClose(event) {
  const button = event.target?.closest?.('button')
  if (!button?.closest?.('.media-picker-modal, .wp-media-modal')) return
  const label = button.textContent?.trim().toLowerCase() || ''
  if (label === 'close' || label === 'cancel') {
    pendingBodyMediaPick = false
    removeCaretMarker()
  }
}

function addEmbedButton() {
  if (!isAdminPostEditor()) return
  const toolbar = document.querySelector('.native-content-editor__toolbar')
  if (!toolbar || toolbar.querySelector('[data-sabot-embed-button]')) return
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'button'
  button.dataset.sabotEmbedButton = '1'
  button.textContent = 'embed'
  button.title = 'Embed an iframe or URL at the cursor'
  button.addEventListener('mousedown', (event) => {
    captureEditorSelection({ withMarker: true })
    event.preventDefault()
  })
  button.addEventListener('click', () => {
    const raw = window.prompt('Paste an iframe embed code or URL')
    if (!raw) {
      removeCaretMarker()
      return
    }
    const markup = buildIframeEmbed(raw)
    if (!markup) {
      removeCaretMarker()
      window.alert('That embed needs an http(s) or site-relative URL.')
      return
    }
    insertMarkup(markup)
    removeCaretMarker()
  })
  toolbar.appendChild(button)
}

function ensureInspectorStyles() {
  if (document.getElementById(`${INSPECTOR_ID}-styles`)) return
  const style = document.createElement('style')
  style.id = `${INSPECTOR_ID}-styles`
  style.textContent = `
    .native-content-editor__visual .sabot-embed--pdf { width: 100%; max-width: 100%; }
    .native-content-editor__visual .sabot-embed--pdf iframe { display: block; width: 100%; min-height: 65vh; border: 1px solid #9b9b9b; background: #fff; }
    .native-content-editor__visual .sabot-embed--audio audio,
    .native-content-editor__visual .sabot-embed--video video { width: 100%; }
    #${INSPECTOR_ID} { position: fixed; z-index: 1000000; width: min(330px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; padding: 12px; border: 1px solid #777; background: #fff; color: #111; box-shadow: 0 10px 34px rgba(0,0,0,.28); font: 13px/1.35 system-ui, sans-serif; }
    #${INSPECTOR_ID} h3 { margin: 0 0 8px; font-size: 14px; }
    #${INSPECTOR_ID} label { display: grid; gap: 4px; margin: 8px 0; }
    #${INSPECTOR_ID} input, #${INSPECTOR_ID} select, #${INSPECTOR_ID} textarea { box-sizing: border-box; width: 100%; font: inherit; }
    #${INSPECTOR_ID} .sabot-editor-inspector__actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    #${INSPECTOR_ID} .sabot-editor-inspector__danger { color: #a00; }
  `
  document.head.appendChild(style)
}

function safeEditableUrl(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/')) return raw
  try {
    const parsed = new URL(raw)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''
  } catch {
    return ''
  }
}

function editorMediaTarget(target) {
  const editor = editorElement()
  if (!editor || !target || !editor.contains(target)) return null
  const hit = target.closest('img, audio, video, iframe, a, figure')
  if (!hit || !editor.contains(hit)) return null
  const figure = hit.closest('figure')
  const primary = hit.tagName === 'FIGURE'
    ? hit.querySelector('img, audio, video, iframe, a')
    : hit
  if (!primary) return null
  const tag = primary.tagName.toLowerCase()
  const kind = tag === 'iframe' && figure?.classList.contains('sabot-embed--pdf') ? 'pdf' : tag
  return { editor, primary, figure, container: figure || primary, kind }
}

function currentCaption(target) {
  return target.figure?.querySelector('figcaption')?.textContent?.trim() || ''
}

function currentWidthPercent(target) {
  const raw = parseFloat(target.container.style.width || '')
  if (Number.isFinite(raw)) return Math.min(100, Math.max(20, Math.round(raw)))
  return 100
}

function currentHeight(target) {
  if (target.primary.tagName !== 'IFRAME') return 0
  const inline = parseFloat(target.primary.style.height || target.primary.getAttribute('height') || '')
  if (Number.isFinite(inline) && inline > 0) return Math.round(inline)
  return Math.max(320, Math.round(target.primary.getBoundingClientRect().height || 640))
}

function closeInspector() {
  document.getElementById(INSPECTOR_ID)?.remove()
}

function syncContextEdit(editor) {
  dispatchEditorInput(editor, 'formatBackColor', null)
}

function setCaption(target, value) {
  if (!target.figure) return
  let caption = target.figure.querySelector('figcaption')
  const text = String(value || '').trim()
  if (!text) {
    caption?.remove()
    return
  }
  if (!caption) {
    caption = document.createElement('figcaption')
    target.figure.appendChild(caption)
  }
  caption.textContent = text
}

function applyAlignment(target, alignment) {
  const node = target.container
  if (alignment === 'left') {
    node.style.marginLeft = '0'
    node.style.marginRight = 'auto'
  } else if (alignment === 'right') {
    node.style.marginLeft = 'auto'
    node.style.marginRight = '0'
  } else {
    node.style.marginLeft = 'auto'
    node.style.marginRight = 'auto'
  }
}

function showContextInspector(event, target) {
  ensureInspectorStyles()
  closeInspector()

  const panel = document.createElement('div')
  panel.id = INSPECTOR_ID
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', `Edit ${target.kind}`)
  const maxLeft = Math.max(12, window.innerWidth - 350)
  const maxTop = Math.max(12, window.innerHeight - 430)
  panel.style.left = `${Math.min(Math.max(12, event.clientX), maxLeft)}px`
  panel.style.top = `${Math.min(Math.max(12, event.clientY), maxTop)}px`

  const src = target.primary.getAttribute(target.kind === 'a' ? 'href' : 'src') || ''
  const label = target.kind === 'a'
    ? target.primary.textContent || ''
    : target.kind === 'img'
      ? target.primary.getAttribute('alt') || ''
      : currentCaption(target)
  const width = currentWidthPercent(target)
  const height = currentHeight(target)
  const mediaSizing = ['img', 'audio', 'video', 'iframe', 'pdf'].includes(target.kind)
  const hasHeight = target.primary.tagName === 'IFRAME'

  panel.innerHTML = `
    <h3>Edit ${target.kind === 'a' ? 'link' : target.kind.toUpperCase()}</h3>
    <label><span>URL</span><input data-field="url" value=""></label>
    <label><span>${target.kind === 'a' ? 'Link text' : target.kind === 'img' ? 'Alt text' : 'Caption'}</span><textarea data-field="label" rows="2"></textarea></label>
    ${mediaSizing ? `<label><span>Width: <output data-width-output>${width}%</output></span><input data-field="width" type="range" min="20" max="100" step="5" value="${width}"></label>` : ''}
    ${hasHeight ? `<label><span>Height (px)</span><input data-field="height" type="number" min="180" max="1800" step="20" value="${height}"></label>` : ''}
    ${mediaSizing ? '<label><span>Alignment</span><select data-field="align"><option value="left">Left</option><option value="center" selected>Center</option><option value="right">Right</option></select></label>' : ''}
    <div class="sabot-editor-inspector__actions">
      <button type="button" class="button button--primary" data-action="apply">Apply</button>
      <button type="button" class="button" data-action="cancel">Cancel</button>
      <button type="button" class="button sabot-editor-inspector__danger" data-action="remove">Remove</button>
    </div>
  `

  const urlInput = panel.querySelector('[data-field="url"]')
  const labelInput = panel.querySelector('[data-field="label"]')
  urlInput.value = src
  labelInput.value = label
  const widthInput = panel.querySelector('[data-field="width"]')
  const widthOutput = panel.querySelector('[data-width-output]')
  widthInput?.addEventListener('input', () => { widthOutput.textContent = `${widthInput.value}%` })

  panel.addEventListener('click', (clickEvent) => {
    const action = clickEvent.target?.closest?.('[data-action]')?.dataset?.action
    if (!action) return
    if (action === 'cancel') {
      closeInspector()
      return
    }
    if (action === 'remove') {
      target.container.remove()
      syncContextEdit(target.editor)
      closeInspector()
      return
    }
    if (action !== 'apply') return

    const nextUrl = safeEditableUrl(urlInput.value)
    if (!nextUrl) {
      window.alert('Use an http(s) or site-relative URL.')
      return
    }
    if (target.kind === 'a') {
      target.primary.setAttribute('href', nextUrl)
      target.primary.textContent = labelInput.value || nextUrl
    } else {
      target.primary.setAttribute('src', nextUrl)
      if (target.kind === 'img') target.primary.setAttribute('alt', labelInput.value || '')
      else setCaption(target, labelInput.value)
    }

    if (mediaSizing && widthInput) {
      const nextWidth = Math.min(100, Math.max(20, Number(widthInput.value) || 100))
      target.container.style.width = `${nextWidth}%`
      target.container.style.maxWidth = '100%'
      target.primary.style.maxWidth = '100%'
      if (target.primary.tagName !== 'IMG') target.primary.style.width = '100%'
      applyAlignment(target, panel.querySelector('[data-field="align"]')?.value || 'center')
    }
    if (hasHeight) {
      const heightInput = panel.querySelector('[data-field="height"]')
      const nextHeight = Math.min(1800, Math.max(180, Number(heightInput?.value) || 640))
      target.primary.style.height = `${nextHeight}px`
      target.primary.setAttribute('height', String(nextHeight))
    }

    syncContextEdit(target.editor)
    closeInspector()
  })

  document.body.appendChild(panel)
  urlInput.focus()
  urlInput.select()
}

function handleEditorContextMenu(event) {
  if (!isAdminPostEditor()) return
  const target = editorMediaTarget(event.target)
  if (!target) return
  event.preventDefault()
  event.stopPropagation()
  showContextInspector(event, target)
}

function handleDocumentPointer(event) {
  const panel = document.getElementById(INSPECTOR_ID)
  if (!panel || panel.contains(event.target)) return
  closeInspector()
}

document.addEventListener('mousedown', handlePointerDown, true)
window.addEventListener('click', handleSelectClick, true)
window.addEventListener('click', handleModalClose, true)
document.addEventListener('contextmenu', handleEditorContextMenu, true)
document.addEventListener('mousedown', handleDocumentPointer, false)

const observer = new MutationObserver(() => {
  addEmbedButton()
  ensureInspectorStyles()
})
observer.observe(document.documentElement, { childList: true, subtree: true })
addEmbedButton()
ensureInspectorStyles()
