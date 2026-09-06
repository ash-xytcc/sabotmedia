const VISUAL_EDITOR_SELECTOR = '.native-content-editor__visual[contenteditable="true"]'
const MEDIA_MARKER_SELECTOR = '[data-sabot-media-caret]'
const MEDIA_BLOCK_SELECTOR = 'figure.sabot-embed'

let repairQueued = false

function getEditor() {
  return document.querySelector(VISUAL_EDITOR_SELECTOR)
}

function topLevelChild(node, editor) {
  if (!node || !editor || !editor.contains(node)) return null
  let current = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  if (!current) return null
  while (current.parentElement && current.parentElement !== editor) current = current.parentElement
  return current.parentElement === editor ? current : null
}

function fragmentHasMeaningfulContent(fragment) {
  if (!fragment) return false
  if (String(fragment.textContent || '').replace(/\u200b/g, '').trim()) return true
  return Boolean(fragment.querySelector?.('img, audio, video, iframe, hr, figure'))
}

function markerHasContentBefore(marker, block) {
  if (!marker || !block) return false
  try {
    const range = document.createRange()
    range.selectNodeContents(block)
    range.setEndBefore(marker)
    return fragmentHasMeaningfulContent(range.cloneContents())
  } catch {
    return true
  }
}

function normalizeMediaMarker() {
  const editor = getEditor()
  const marker = editor?.querySelector(MEDIA_MARKER_SELECTOR)
  if (!editor || !marker) return false

  const mediaAncestor = marker.closest(MEDIA_BLOCK_SELECTOR)
  const block = topLevelChild(mediaAncestor || marker, editor)
  if (!block || block === marker) return false

  if (mediaAncestor || markerHasContentBefore(marker, block)) {
    block.insertAdjacentElement('afterend', marker)
  } else {
    editor.insertBefore(marker, block)
  }
  return true
}

function unwrap(node) {
  const parent = node?.parentNode
  if (!parent) return
  while (node.firstChild) parent.insertBefore(node.firstChild, node)
  node.remove()
}

function ensureLandingParagraph(figure) {
  if (!figure?.parentElement) return
  const next = figure.nextElementSibling
  if (next?.matches?.('p, div, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, figure')) return
  const paragraph = document.createElement('p')
  paragraph.appendChild(document.createElement('br'))
  figure.insertAdjacentElement('afterend', paragraph)
}

function repairMediaBlocks() {
  repairQueued = false
  const editor = getEditor()
  if (!editor) return

  for (const figure of [...editor.querySelectorAll(MEDIA_BLOCK_SELECTOR)]) {
    const media = figure.querySelector('iframe, audio, video, img')
    if (!media) {
      unwrap(figure)
      continue
    }

    if (figure.parentElement !== editor) {
      const containingBlock = topLevelChild(figure, editor)
      if (containingBlock && containingBlock !== figure) {
        containingBlock.insertAdjacentElement('afterend', figure)
      }
    }

    figure.setAttribute('contenteditable', 'false')
    ensureLandingParagraph(figure)
  }
}

function queueRepair() {
  if (repairQueued) return
  repairQueued = true
  queueMicrotask(repairMediaBlocks)
}

function isMediaInsertionButton(button) {
  if (!button) return false
  const label = button.textContent?.trim().toLowerCase() || ''
  return button.classList.contains('native-content-editor__add-media')
    || button.hasAttribute('data-sabot-embed-button')
    || label === 'add media'
    || label === 'embed'
}

function handlePointerDown(event) {
  const button = event.target?.closest?.('button')
  if (!isMediaInsertionButton(button)) return

  // adminFileMediaInsert places its marker earlier in the same mousedown.
  // Move that marker to a safe top-level block boundary before the modal or
  // prompt steals focus. This keeps generated embeds where the caret actually
  // was and prevents a figure from being inserted inside a paragraph/figure.
  queueMicrotask(() => {
    normalizeMediaMarker()
    queueRepair()
  })
}

function handleEditorInput(event) {
  if (!event.target?.closest?.(VISUAL_EDITOR_SELECTOR)) return
  queueRepair()
}

function boot() {
  document.addEventListener('mousedown', handlePointerDown, false)
  document.addEventListener('input', handleEditorInput, true)

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.target?.closest?.(VISUAL_EDITOR_SELECTOR) || mutation.target?.matches?.(VISUAL_EDITOR_SELECTOR))) {
      queueRepair()
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  queueRepair()
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
}
