const PREVIEW_STORAGE_PREFIX = 'sabot-native-preview-v1:'

function isEditorRoute() {
  if (typeof window === 'undefined') return false
  return /\/(wp-admin\/post-new\.php|wp-admin\/native-bridge|native-bridge)(?:\/|$)/.test(window.location.pathname)
}

function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function textOf(node) {
  return String(node?.textContent || '').trim()
}

function fieldValue(labelText = '') {
  const labels = [...document.querySelectorAll('.wp-edit-screen label')]
  const label = labels.find((node) => textOf(node.querySelector('span') || node).toLowerCase() === labelText.toLowerCase())
  const control = label?.querySelector('input, select, textarea')
  return String(control?.value || '').trim()
}

function editorBody() {
  const visual = document.querySelector('.native-content-editor__visual[contenteditable="true"]')
  if (visual) return String(visual.innerHTML || '').trim()
  const textarea = document.querySelector('.native-content-editor__textarea')
  return String(textarea?.value || '').trim()
}

function editorTitle() {
  return String(document.querySelector('.native-content-editor__title-field input')?.value || '').trim()
}

function editorSlug(title = '') {
  const permalinkText = textOf(document.querySelector('.native-content-editor__permalink code'))
  return slugify(permalinkText || title)
}

function editorId(slug = '') {
  const params = new URLSearchParams(window.location.search || '')
  return params.get('edit') || params.get('import') || `preview-${slug || Date.now()}`
}

function collectPreviewSnapshot() {
  const title = editorTitle()
  const slug = editorSlug(title)
  const id = editorId(slug)
  const body = editorBody()
  const status = fieldValue('Publication status') || 'draft'
  const workflowState = fieldValue('Editorial workflow') || status || 'draft'
  const contentType = fieldValue('Content type') || 'dispatch'
  const author = fieldValue('Author') || 'Sabot Media'
  const excerpt = String(document.querySelector('[name="excerpt"], .native-content-editor__excerpt textarea')?.value || '').trim()

  return {
    id,
    title: title || 'Untitled draft',
    slug,
    body,
    bodyHtml: body,
    excerpt,
    status,
    workflowState,
    contentType,
    author,
    updatedAt: new Date().toISOString(),
  }
}

function openPreview(snapshot) {
  try {
    window.localStorage.setItem(`${PREVIEW_STORAGE_PREFIX}${snapshot.id}`, JSON.stringify(snapshot))
  } catch (error) {
    console.warn('Unable to persist editor preview snapshot.', error)
  }

  const previewPath = `/native-preview/${encodeURIComponent(snapshot.id)}?snapshot=1&t=${Date.now()}`
  const nextWindow = window.open(previewPath, '_blank', 'noopener,noreferrer')
  if (!nextWindow) window.location.assign(previewPath)
}

function handlePreviewClick(event) {
  if (!isEditorRoute()) return
  const button = event.target?.closest?.('button')
  if (!button) return
  if (button.textContent?.trim().toLowerCase() !== 'preview') return
  if (!button.closest('.native-content-editor__actions')) return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()

  openPreview(collectPreviewSnapshot())
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', handlePreviewClick, true)
}
