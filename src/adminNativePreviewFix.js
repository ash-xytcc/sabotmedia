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

function escapeHtml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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
  const body = editorBody()
  const status = fieldValue('Publication status') || 'draft'
  const workflowState = fieldValue('Editorial workflow') || status || 'draft'
  const contentType = fieldValue('Content type') || 'dispatch'
  const author = fieldValue('Author') || 'Sabot Media'
  const excerpt = String(document.querySelector('[name="excerpt"], .native-content-editor__excerpt textarea')?.value || '').trim()

  return {
    id: `preview-${slug || Date.now()}`,
    title: title || 'Untitled draft',
    slug,
    body: sanitizePreviewHtml(body),
    excerpt,
    status,
    workflowState,
    contentType,
    author,
    updatedAt: new Date().toISOString(),
  }
}

function buildPreviewDocument(snapshot) {
  const title = escapeHtml(snapshot.title || 'Untitled draft')
  const body = snapshot.body || '<p>No body content yet.</p>'
  const excerpt = snapshot.excerpt ? `<p class="preview-subtitle">${escapeHtml(snapshot.excerpt)}</p>` : ''
  const author = escapeHtml(snapshot.author || 'Sabot Media')
  const status = escapeHtml(snapshot.status || 'draft')
  const workflow = escapeHtml(snapshot.workflowState || 'draft')
  const contentType = escapeHtml(snapshot.contentType || 'entry')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview: ${title}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      color: #151515;
      background: #f5f1e8;
      line-height: 1.65;
    }
    .preview-admin-note {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #fff;
      background: #1d2327;
    }
    .preview-admin-note strong { color: #fff; }
    .preview-shell {
      width: min(860px, calc(100vw - 32px));
      margin: 42px auto 80px;
      padding: clamp(22px, 5vw, 54px);
      background: #fffaf0;
      border: 1px solid rgba(0,0,0,0.18);
      box-shadow: 0 20px 60px rgba(0,0,0,0.12);
    }
    .preview-kicker {
      font: 700 12px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #7a1f1f;
      margin: 0 0 12px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: clamp(34px, 7vw, 64px);
      line-height: 0.98;
      letter-spacing: -0.04em;
    }
    .preview-subtitle {
      margin: 12px 0 20px;
      max-width: 64ch;
      font-size: 1.22rem;
      color: #3a3a3a;
    }
    .preview-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0 34px;
      font: 700 12px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #555;
    }
    .preview-meta span {
      border: 1px solid #c9c1af;
      border-radius: 999px;
      padding: 5px 9px;
      background: #fff;
    }
    .preview-body {
      font-size: clamp(18px, 2vw, 22px);
    }
    .preview-body p { margin: 0 0 1.15em; }
    .preview-body a { color: #005ea8; text-decoration-thickness: 0.08em; text-underline-offset: 0.16em; }
    .preview-body img, .preview-body video, .preview-body iframe { max-width: 100%; height: auto; }
    .preview-body figure { margin: 2rem 0; }
    .preview-body figcaption { font-size: 0.85em; color: #555; }
    .preview-body blockquote {
      margin: 1.6rem 0;
      padding-left: 1rem;
      border-left: 4px solid #8b1a1a;
      color: #333;
    }
    @media (max-width: 640px) {
      .preview-shell { width: auto; margin: 18px 12px 48px; padding: 22px; }
      .preview-admin-note { position: static; flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="preview-admin-note">
    <strong>Live editor preview</strong>
    <span>This is rendered directly from the current editor tab. Nothing was published.</span>
  </div>
  <main class="preview-shell">
    <p class="preview-kicker">${contentType} / ${status} / ${workflow}</p>
    <h1>${title}</h1>
    ${excerpt}
    <div class="preview-meta"><span>${author}</span><span>${new Date(snapshot.updatedAt).toLocaleString()}</span></div>
    <article class="preview-body">${body}</article>
  </main>
</body>
</html>`
}

function openPreview(snapshot) {
  const previewWindow = window.open('', '_blank')
  if (!previewWindow) {
    window.alert('Preview was blocked by your browser. Allow popups for this site and click Preview again.')
    return
  }

  previewWindow.document.open()
  previewWindow.document.write(buildPreviewDocument(snapshot))
  previewWindow.document.close()
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