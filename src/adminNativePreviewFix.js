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

function checkedTerms(sectionTitle = '') {
  const headings = [...document.querySelectorAll('.wp-meta-box h2')]
  const heading = headings.find((node) => textOf(node).toLowerCase() === sectionTitle.toLowerCase())
  const section = heading?.closest('.wp-meta-box')
  if (!section) return []
  return [...section.querySelectorAll('label')]
    .filter((label) => label.querySelector('input[type="checkbox"]')?.checked)
    .map((label) => textOf(label.querySelector('span') || label))
    .filter(Boolean)
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
  return slugify(permalinkText || title || `preview-${Date.now()}`)
}

function editorId(slug = '') {
  const params = new URLSearchParams(window.location.search || '')
  return params.get('edit') || params.get('import') || `preview-${slug || Date.now()}`
}

function sanitizePreviewHtml(value = '') {
  const raw = String(value || '')
  if (!raw.trim()) return ''
  if (typeof DOMParser === 'undefined') {
    return raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
      .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html')
  doc.querySelectorAll('script').forEach((node) => node.remove())
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of Array.from(el.attributes || [])) {
      const name = String(attr.name || '').toLowerCase()
      const attrValue = String(attr.value || '')
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
        continue
      }
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(attrValue)) {
        el.setAttribute(attr.name, '#')
      }
    }
  }
  return doc.body.innerHTML
}

function collectPreviewSnapshot() {
  const title = editorTitle()
  const slug = editorSlug(title)
  const id = editorId(slug)
  const body = sanitizePreviewHtml(editorBody())
  const status = fieldValue('Publication status') || 'draft'
  const workflowState = fieldValue('Editorial workflow') || status || 'draft'
  const contentType = fieldValue('Content type') || 'dispatch'
  const author = fieldValue('Author') || 'Sabot Media'
  const excerpt = String(document.querySelector('[name="excerpt"], .native-content-editor__excerpt textarea')?.value || '').trim()
  const categories = checkedTerms('Categories')
  const collections = checkedTerms('Collections')

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
    categories,
    projects: categories,
    collections,
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    isPreviewSnapshot: true,
  }
}

function openPreview(snapshot) {
  try {
    window.localStorage.setItem(`${PREVIEW_STORAGE_PREFIX}${snapshot.id}`, JSON.stringify(snapshot))
  } catch (error) {
    console.warn('Unable to persist editor preview snapshot.', error)
    window.alert('Preview could not be saved in this browser tab. Try again after freeing browser storage.')
    return
  }

  const previewPath = `/post/${encodeURIComponent(snapshot.slug || snapshot.id)}?preview=${encodeURIComponent(snapshot.id)}&mode=read&t=${Date.now()}`
  const previewWindow = window.open(previewPath, '_blank')
  if (!previewWindow) {
    window.alert('Preview was blocked by your browser. Allow popups for this site and click Preview again.')
  }
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