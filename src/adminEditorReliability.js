import { classicEditorBodyToHtml } from './lib/classicEditorBody'

const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable="true"]'
const TEXT_EDITOR_SELECTOR = '.native-content-editor__textarea'
const MEDIA_ROW_SELECTOR = '.native-content-editor__media-row'
const ADD_MEDIA_SELECTOR = '.native-content-editor__add-media'
const STATS_CLASS = 'native-content-editor__stats'
const IMPORT_BUTTON_CLASS = 'native-content-editor__import-markdown'
const IMPORT_INPUT_CLASS = 'native-content-editor__markdown-input'

const pendingSync = new WeakSet()
let refreshQueued = false

function visualEditor() {
  return document.querySelector(VISUAL_EDITOR_SELECTOR)
}

function textEditor() {
  return document.querySelector(TEXT_EDITOR_SELECTOR)
}

function dispatchCanonicalSync(editor) {
  if (!editor?.isConnected) return
  const event = typeof FocusEvent === 'function'
    ? new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    : new Event('focusout', { bubbles: true })
  editor.dispatchEvent(event)
}

function scheduleCanonicalSync(editor) {
  if (!editor || pendingSync.has(editor)) return
  pendingSync.add(editor)
  queueMicrotask(() => {
    pendingSync.delete(editor)
    dispatchCanonicalSync(editor)
    updateEditorStats()
  })
}

function plainTextFromHtml(html = '') {
  if (!String(html || '').trim()) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(String(html), 'text/html')
  return doc.body.textContent || ''
}

function readableTextFromEditor() {
  const visual = visualEditor()
  if (visual) return visual.innerText || visual.textContent || ''

  const textarea = textEditor()
  if (!textarea) return ''
  const source = textarea.value || ''
  try {
    return plainTextFromHtml(classicEditorBodyToHtml(source))
  } catch {
    return source
      .replace(/<[^>]*>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^[#>*+-]+\s*/gm, '')
      .replace(/[*_~`]/g, '')
  }
}

function countWords(text = '') {
  const value = String(text || '').trim()
  if (!value) return 0

  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
    let count = 0
    for (const segment of segmenter.segment(value)) {
      if (segment.isWordLike) count += 1
    }
    return count
  }

  return value.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length || 0
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value)
}

function ensureStatsElement() {
  const editor = visualEditor() || textEditor()
  if (!editor) return null

  const anchor = editor.closest('.native-content-editor__visual-wrap') || editor
  const parent = anchor.parentElement
  if (!parent) return null

  let stats = parent.querySelector(`:scope > .${STATS_CLASS}`)
  if (!stats) {
    stats = document.createElement('div')
    stats.className = STATS_CLASS
    stats.setAttribute('role', 'status')
    stats.setAttribute('aria-live', 'polite')
    anchor.insertAdjacentElement('afterend', stats)
  } else if (stats.previousElementSibling !== anchor) {
    anchor.insertAdjacentElement('afterend', stats)
  }
  return stats
}

function updateEditorStats() {
  const stats = ensureStatsElement()
  if (!stats) return

  const readable = readableTextFromEditor().replace(/\s+/g, ' ').trim()
  const words = countWords(readable)
  const characters = readable.length
  const nextText = `${formatNumber(words)} ${words === 1 ? 'word' : 'words'} · ${formatNumber(characters)} ${characters === 1 ? 'character' : 'characters'}`
  if (stats.textContent !== nextText) stats.textContent = nextText
}

function ensureMarkdownControls() {
  const row = document.querySelector(MEDIA_ROW_SELECTOR)
  if (!row) return

  let input = row.querySelector(`.${IMPORT_INPUT_CLASS}`)
  if (!input) {
    input = document.createElement('input')
    input.className = IMPORT_INPUT_CLASS
    input.type = 'file'
    input.accept = '.md,.markdown,text/markdown,text/plain'
    input.hidden = true
    row.append(input)
  }

  if (!row.querySelector(`.${IMPORT_BUTTON_CLASS}`)) {
    const button = document.createElement('button')
    button.className = `button ${IMPORT_BUTTON_CLASS}`
    button.type = 'button'
    button.textContent = 'Import Markdown'
    button.setAttribute('aria-label', 'Import Markdown file')

    const addMedia = row.querySelector(ADD_MEDIA_SELECTOR)
    if (addMedia) addMedia.insertAdjacentElement('afterend', button)
    else row.prepend(button)
  }
}

function hasEditorContent() {
  const visual = visualEditor()
  if (visual) return Boolean((visual.innerText || visual.textContent || '').trim() || visual.querySelector('img, video, audio, iframe, figure'))
  const textarea = textEditor()
  return Boolean(textarea?.value?.trim())
}

function setTextareaValue(textarea, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
  if (setter) setter.call(textarea, value)
  else textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.dispatchEvent(new Event('change', { bubbles: true }))
}

function putCaretAtEnd(editor) {
  editor.focus()
  const selection = window.getSelection?.()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

async function importMarkdownFile(file) {
  if (!file) return
  if (!/\.(md|markdown)$/i.test(file.name || '')) {
    window.alert('Choose a .md or .markdown file.')
    return
  }

  if (hasEditorContent() && !window.confirm('Replace the current editor body with this Markdown file?')) return

  const markdown = await file.text()
  const textarea = textEditor()
  if (textarea) {
    setTextareaValue(textarea, markdown)
    textarea.focus()
    updateEditorStats()
    return
  }

  const visual = visualEditor()
  if (!visual) return
  visual.innerHTML = classicEditorBodyToHtml(markdown)
  const inputEvent = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: null })
    : new Event('input', { bubbles: true })
  visual.dispatchEvent(inputEvent)
  putCaretAtEnd(visual)
  scheduleCanonicalSync(visual)
}

function handleInput(event) {
  const visual = event.target instanceof Element ? event.target.closest(VISUAL_EDITOR_SELECTOR) : null
  if (visual) scheduleCanonicalSync(visual)
  else if (event.target?.matches?.(TEXT_EDITOR_SELECTOR)) updateEditorStats()
}

function handleClick(event) {
  const button = event.target?.closest?.(`.${IMPORT_BUTTON_CLASS}`)
  if (!button) return
  event.preventDefault()
  button.closest(MEDIA_ROW_SELECTOR)?.querySelector(`.${IMPORT_INPUT_CLASS}`)?.click()
}

async function handleChange(event) {
  const input = event.target?.matches?.(`.${IMPORT_INPUT_CLASS}`) ? event.target : null
  if (!input) return
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    await importMarkdownFile(file)
  } catch (error) {
    console.error('Markdown import failed', error)
    window.alert('Could not import that Markdown file.')
  }
}

function refreshEditorExtras() {
  refreshQueued = false
  ensureMarkdownControls()
  updateEditorStats()
}

function queueRefresh() {
  if (refreshQueued) return
  refreshQueued = true
  requestAnimationFrame(refreshEditorExtras)
}

function boot() {
  document.addEventListener('input', handleInput, true)
  document.addEventListener('click', handleClick, true)
  document.addEventListener('change', handleChange, true)

  const observer = new MutationObserver(queueRefresh)
  observer.observe(document.body, { childList: true, subtree: true })
  queueRefresh()
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
}

export { countWords, readableTextFromEditor }
