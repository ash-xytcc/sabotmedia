import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getImportedImage } from '../lib/getImportedImage'
import { loadLocalMediaItems } from '../lib/localMediaLibrary'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { AdminFrame } from './AdminRail'

const sourceOptions = [
  { id: 'upload', label: 'Upload Image' },
  { id: 'media', label: 'Media Library' },
  { id: 'post', label: 'CMS Post' },
]

const toolOptions = [
  { id: 'tile', label: 'Tile Sheet', shortLabel: 'T' },
  { id: 'split', label: 'Poster Split', shortLabel: 'S' },
  { id: 'page', label: 'Page Layout', shortLabel: 'P' },
  { id: 'zine', label: 'Half-Fold Zine', shortLabel: 'Z' },
]

const fitOptions = ['cover', 'contain']
const orientationOptions = ['portrait', 'landscape']
const imagePositionOptions = ['top', 'side', 'background']

function getPieceId(piece) {
  return String(piece?.id || piece?.slug || piece?.sourcePostId || piece?.title || '')
}

function getContentType(piece) {
  return piece?.contentType || piece?.type || piece?.sourcePostType || 'post'
}

function getPublishedAt(piece) {
  return piece?.publishedAt || piece?.date || piece?.createdAt || piece?.updatedAt || ''
}

function getPublishedAtLabel(piece) {
  const value = getPublishedAt(piece)
  if (!value) return ''
  const published = new Date(value)
  if (Number.isNaN(published.getTime())) return ''
  return published.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getFeaturedImage(piece) {
  return (
    piece?.featuredImage ||
    piece?.heroImage ||
    piece?.imageUrl ||
    piece?.image ||
    getImportedImage(piece) ||
    ''
  )
}

function isPublishedPiece(piece) {
  if (!piece || piece.hidden === true) return false
  const status = String(piece.status || '').toLowerCase()
  if (status) return status === 'published'
  return Boolean(getPublishedAt(piece))
}

function getPreviewHtml(piece) {
  return piece?.bodyHtml || piece?.contentHtml || piece?.content || piece?.body || ''
}

function getExcerpt(piece) {
  return piece?.excerpt || piece?.summary || piece?.description || ''
}

function getPlainTextFromHtml(html = '') {
  const value = String(html || '').trim()
  if (!value) return ''

  if (typeof DOMParser === 'undefined') {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  doc.querySelectorAll('script, style, noscript').forEach((node) => node.remove())
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

function truncateText(text = '', limit = 360) {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  if (value.length <= limit) return value
  const clipped = value.slice(0, limit).trim()
  const lastSpace = clipped.lastIndexOf(' ')
  return `${clipped.slice(0, lastSpace > 120 ? lastSpace : clipped.length).trim()}...`
}

function clampNumber(value, min, max) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return min
  return Math.min(max, Math.max(min, parsed))
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read image file'))
    reader.readAsDataURL(file)
  })
}

function makeDownloadName(label, extension) {
  const safe = String(label || 'printlab-output')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 52)
  return `${safe || 'printlab-output'}.${extension}`
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dedupeImageItems(items) {
  const seen = new Set()
  const next = []
  for (const item of items) {
    const url = String(item?.url || '').trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    next.push({ ...item, url })
  }
  return next
}

function renderParagraphs(text) {
  const paragraphs = String(text || '').split(/\n{2,}/).map((line) => line.trim()).filter(Boolean)
  if (!paragraphs.length) return null
  return paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>)
}

function getPostMediaItems(pieces = []) {
  return pieces.map((piece) => {
    const url = getFeaturedImage(piece)
    if (!url) return null
    const id = getPieceId(piece)
    return {
      id: `post-image-${id || url}`,
      url,
      title: piece.title || 'Post image',
      source: getContentType(piece),
      meta: getPublishedAtLabel(piece),
    }
  }).filter(Boolean)
}

function buildExportHtml(previewHtml, title) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title || 'Printlab Output')}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 24px; font-family: Arial, sans-serif; background: #e5e5e5; color: #111; }
    img { max-width: 100%; }
    .print-lab-preview { margin: 0 auto; background: #fffdf8; color: #111; border: 1px solid #ccc; padding: 24px; }
    .print-lab-tile-grid, .print-lab-split-grid, .print-lab-zine-spread { display: grid; gap: 10px; }
    .print-lab-page-preview { min-height: 720px; }
    .print-lab-split-panel { min-height: 280px; border: 1px solid #111; background-repeat: no-repeat; background-color: #fff; }
    .print-lab-zine-spread { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media print { body { margin: 0; background: #fff; } .print-lab-preview { border: 0; box-shadow: none; } }
  </style>
</head>
<body>
${previewHtml}
</body>
</html>`
}

export function PrintLabPage({ pieces = [] }) {
  const [nativePieces, setNativePieces] = useState([])
  const [nativeState, setNativeState] = useState('loading')
  const [localMedia, setLocalMedia] = useState([])
  const [sourceType, setSourceType] = useState('upload')
  const [selectedId, setSelectedId] = useState('')
  const [selectedMediaId, setSelectedMediaId] = useState('')
  const [uploadImage, setUploadImage] = useState(null)
  const [toolMode, setToolMode] = useState('tile')
  const [actionStatus, setActionStatus] = useState('')

  const [tileRows, setTileRows] = useState(3)
  const [tileColumns, setTileColumns] = useState(3)
  const [tileGap, setTileGap] = useState(8)
  const [tileFit, setTileFit] = useState('cover')
  const [tileCaption, setTileCaption] = useState('')

  const [splitWide, setSplitWide] = useState(2)
  const [splitTall, setSplitTall] = useState(2)
  const [splitFit, setSplitFit] = useState('cover')
  const [splitShowNumbers, setSplitShowNumbers] = useState(true)

  const [pageOrientation, setPageOrientation] = useState('portrait')
  const [pageTitle, setPageTitle] = useState('')
  const [pageBody, setPageBody] = useState('')
  const [pageImagePosition, setPageImagePosition] = useState('top')
  const [pageFooter, setPageFooter] = useState('')

  const [zineTitle, setZineTitle] = useState('')
  const [zineBody, setZineBody] = useState('')
  const [zineFooter, setZineFooter] = useState('')
  const [zineIncludeImage, setZineIncludeImage] = useState(true)

  const previewRef = useRef(null)
  const wordpressFeed = useWordPressPieces(pieces)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        setNativeState('loading')
        const loaded = await loadPublishedNativePieces()
        if (cancelled) return
        setNativePieces(Array.isArray(loaded) ? loaded : [])
        setNativeState('loaded')
      } catch {
        if (cancelled) return
        setNativePieces([])
        setNativeState('error')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setLocalMedia(loadLocalMediaItems())
  }, [])

  const publishedPieces = useMemo(() => {
    const importedPieces = (wordpressFeed.pieces || pieces).filter(isPublishedPiece)
    return mergeNativeAndImportedPieces(importedPieces, nativePieces)
      .filter(isPublishedPiece)
      .sort((a, b) => new Date(getPublishedAt(b) || 0) - new Date(getPublishedAt(a) || 0))
  }, [nativePieces, pieces, wordpressFeed.pieces])

  useEffect(() => {
    if (!publishedPieces.length) {
      setSelectedId('')
      return
    }

    setSelectedId((current) => (
      publishedPieces.some((piece) => getPieceId(piece) === current)
        ? current
        : getPieceId(publishedPieces[0])
    ))
  }, [publishedPieces])

  const mediaItems = useMemo(() => {
    const localItems = localMedia.map((item) => ({
      id: item.id,
      url: item.url || item.dataUrl,
      title: item.title || item.filename || 'Uploaded media',
      source: item.source || 'local-upload',
      meta: item.filename || '',
    }))
    return dedupeImageItems([...localItems, ...getPostMediaItems(publishedPieces)])
  }, [localMedia, publishedPieces])

  useEffect(() => {
    if (!mediaItems.length) {
      setSelectedMediaId('')
      return
    }

    setSelectedMediaId((current) => (
      mediaItems.some((item) => item.id === current) ? current : mediaItems[0].id
    ))
  }, [mediaItems])

  const selectedPiece = publishedPieces.find((piece) => getPieceId(piece) === selectedId) || null
  const selectedMedia = mediaItems.find((item) => item.id === selectedMediaId) || null
  const selectedPostImage = getFeaturedImage(selectedPiece)
  const selectedPostHtml = getPreviewHtml(selectedPiece)
  const selectedPostBody = useMemo(() => getPlainTextFromHtml(selectedPostHtml), [selectedPostHtml])
  const selectedPostExcerpt = getExcerpt(selectedPiece)
  const selectedPostTitle = selectedPiece?.title || ''
  const isLoading = nativeState === 'loading' && wordpressFeed.state === 'loading' && !publishedPieces.length

  useEffect(() => {
    if (sourceType !== 'post' || !selectedPiece) return

    const title = selectedPostTitle || 'Untitled'
    const body = selectedPostBody || selectedPostExcerpt || ''
    const footer = ['SABOT MEDIA', getContentType(selectedPiece), getPublishedAtLabel(selectedPiece)]
      .filter(Boolean)
      .join(' / ')

    setPageTitle(title)
    setPageBody(body)
    setPageFooter(footer)
    setZineTitle(title)
    setZineBody(body)
    setZineFooter(footer || 'SABOT MEDIA / PRINTLAB')
    setTileCaption(title)
  }, [selectedPiece, selectedPostBody, selectedPostExcerpt, selectedPostTitle, sourceType])

  const currentImage = useMemo(() => {
    if (sourceType === 'upload') return uploadImage
    if (sourceType === 'media') return selectedMedia
    if (sourceType === 'post' && selectedPiece) {
      return selectedPostImage ? {
        id: getPieceId(selectedPiece),
        url: selectedPostImage,
        title: selectedPostTitle || 'Post image',
        source: getContentType(selectedPiece),
      } : null
    }
    return null
  }, [selectedMedia, selectedPiece, selectedPostImage, selectedPostTitle, sourceType, uploadImage])

  const currentImageUrl = currentImage?.url || ''
  const currentImageTitle = currentImage?.title || ''
  const pageHasContent = Boolean(currentImageUrl || pageTitle.trim() || pageBody.trim() || pageFooter.trim())
  const zineHasContent = Boolean((zineIncludeImage && currentImageUrl) || zineTitle.trim() || zineBody.trim() || zineFooter.trim())
  const hasUsableOutput = (
    (toolMode === 'tile' && Boolean(currentImageUrl)) ||
    (toolMode === 'split' && Boolean(currentImageUrl)) ||
    (toolMode === 'page' && pageHasContent) ||
    (toolMode === 'zine' && zineHasContent)
  )

  const currentTextContent = useMemo(() => {
    if (toolMode === 'tile') {
      return [
        tileCaption ? `Caption: ${tileCaption}` : '',
        currentImageTitle ? `Image: ${currentImageTitle}` : '',
        currentImageUrl ? `URL: ${currentImageUrl}` : '',
      ].filter(Boolean).join('\n')
    }

    if (toolMode === 'split') {
      return [
        currentImageTitle ? `Image: ${currentImageTitle}` : '',
        currentImageUrl ? `URL: ${currentImageUrl}` : '',
        `Pages: ${splitWide} wide x ${splitTall} tall`,
      ].filter(Boolean).join('\n')
    }

    if (toolMode === 'page') {
      return [pageTitle, pageBody, pageFooter].filter(Boolean).join('\n\n')
    }

    return [zineTitle, zineBody, zineFooter].filter(Boolean).join('\n\n')
  }, [
    currentImageTitle,
    currentImageUrl,
    pageBody,
    pageFooter,
    pageTitle,
    splitTall,
    splitWide,
    tileCaption,
    toolMode,
    zineBody,
    zineFooter,
    zineTitle,
  ])

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setActionStatus('Choose an image file.')
      event.target.value = ''
      return
    }

    const url = await readImageFile(file)
    const title = file.name.replace(/\.[^.]+$/, '')
    setUploadImage({
      id: `upload-${Date.now()}`,
      url,
      title,
      source: 'upload',
      meta: file.name,
    })
    setSourceType('upload')
    if (!tileCaption.trim()) setTileCaption(title)
    setActionStatus('')
    event.target.value = ''
  }

  async function handleCopyHtml() {
    if (!hasUsableOutput || !previewRef.current) return
    const html = previewRef.current.outerHTML

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(html)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = html
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      setActionStatus('Preview HTML copied.')
    } catch {
      setActionStatus('Copy failed.')
    }
  }

  function handleDownloadHtml() {
    if (!hasUsableOutput || !previewRef.current) return
    const html = buildExportHtml(previewRef.current.outerHTML, pageTitle || zineTitle || currentImageTitle || 'Printlab Output')
    downloadFile(makeDownloadName(pageTitle || zineTitle || currentImageTitle || toolMode, 'html'), html, 'text/html;charset=utf-8')
    setActionStatus('HTML downloaded.')
  }

  function handleDownloadText() {
    if (!hasUsableOutput) return
    downloadFile(makeDownloadName(pageTitle || zineTitle || currentImageTitle || toolMode, 'txt'), currentTextContent, 'text/plain;charset=utf-8')
    setActionStatus('Text downloaded.')
  }

  function handlePrint() {
    if (!hasUsableOutput) return
    window.print()
  }

  function renderSourcePanel() {
    return (
      <aside className="print-lab-source-pane" aria-label="Printlab source">
        <div className="print-lab-pane-header">
          <h2>Source</h2>
          <span>{sourceOptions.find((option) => option.id === sourceType)?.label}</span>
        </div>

        <div className="print-lab-pane-body">
          <label className="print-lab-field">
            <span>Source type</span>
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              {sourceOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>

          {sourceType === 'upload' ? (
            <div className="print-lab-source-section">
              <label className="print-lab-field">
                <span>Image upload</span>
                <input type="file" accept="image/*" onChange={handleUpload} />
              </label>
              {uploadImage ? (
                <div className="print-lab-source-summary">
                  <img src={uploadImage.url} alt="" />
                  <strong>{uploadImage.title}</strong>
                  <span>{uploadImage.meta}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {sourceType === 'media' ? (
            <div className="print-lab-source-section">
              {mediaItems.length ? (
                <div className="print-lab-source-list" role="listbox" aria-label="Existing images">
                  {mediaItems.map((item) => {
                    const selected = item.id === selectedMediaId
                    return (
                      <button
                        className={`print-lab-source-row${selected ? ' is-selected' : ''}`}
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => setSelectedMediaId(item.id)}
                      >
                        <img className="print-lab-source-row__thumb" src={item.url} alt="" loading="lazy" />
                        <span className="print-lab-source-row__content">
                          <strong>{item.title || 'Untitled image'}</strong>
                          <span className="print-lab-source-row__meta">
                            <span>{item.source || 'image'}</span>
                            {item.meta ? <span>{item.meta}</span> : null}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="print-lab-empty-note">No existing images are available.</p>
              )}
            </div>
          ) : null}

          {sourceType === 'post' ? (
            <div className="print-lab-source-section">
              {isLoading ? <p className="print-lab-empty-note">Loading published posts...</p> : null}
              {!isLoading && !publishedPieces.length ? (
                <p className="print-lab-empty-note">No published posts are available.</p>
              ) : null}
              {publishedPieces.length ? (
                <div className="print-lab-source-list" role="listbox" aria-label="CMS posts">
                  {publishedPieces.map((piece) => {
                    const id = getPieceId(piece)
                    const image = getFeaturedImage(piece)
                    const selected = id === selectedId
                    return (
                      <button
                        className={`print-lab-source-row${selected ? ' is-selected' : ''}`}
                        key={id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => setSelectedId(id)}
                      >
                        {image ? (
                          <img className="print-lab-source-row__thumb" src={image} alt="" loading="lazy" />
                        ) : (
                          <span className="print-lab-source-row__thumb print-lab-source-row__thumb--empty" aria-hidden="true">
                            {getContentType(piece).slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="print-lab-source-row__content">
                          <strong>{piece.title || 'Untitled'}</strong>
                          <span className="print-lab-source-row__meta">
                            <span>{getContentType(piece)}</span>
                            {getPublishedAtLabel(piece) ? <span>{getPublishedAtLabel(piece)}</span> : null}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    )
  }

  function renderToolControls() {
    return (
      <aside className="print-lab-tool-panel" aria-label="Printlab controls">
        <div className="print-lab-pane-header">
          <h2>Tools</h2>
          <span>{toolOptions.find((option) => option.id === toolMode)?.label}</span>
        </div>

        <div className="print-lab-tool-scroll">
          <fieldset className="print-lab-control-group">
            <legend>Mode</legend>
            <div className="print-lab-layout-selector">
              {toolOptions.map((option) => (
                <button
                  className={toolMode === option.id ? 'is-active' : ''}
                  key={option.id}
                  type="button"
                  aria-pressed={toolMode === option.id}
                  onClick={() => setToolMode(option.id)}
                >
                  <span>{option.shortLabel}</span>
                  <strong>{option.label}</strong>
                </button>
              ))}
            </div>
          </fieldset>

          {toolMode === 'tile' ? (
            <fieldset className="print-lab-control-group">
              <legend>Tile Sheet</legend>
              <div className="print-lab-control-grid">
                <label className="print-lab-field">
                  <span>Rows</span>
                  <input type="number" min="1" max="10" value={tileRows} onChange={(event) => setTileRows(clampNumber(event.target.value, 1, 10))} />
                </label>
                <label className="print-lab-field">
                  <span>Columns</span>
                  <input type="number" min="1" max="10" value={tileColumns} onChange={(event) => setTileColumns(clampNumber(event.target.value, 1, 10))} />
                </label>
                <label className="print-lab-field">
                  <span>Gap</span>
                  <input type="number" min="0" max="48" value={tileGap} onChange={(event) => setTileGap(clampNumber(event.target.value, 0, 48))} />
                </label>
              </div>
              <label className="print-lab-field">
                <span>Fit mode</span>
                <select value={tileFit} onChange={(event) => setTileFit(event.target.value)}>
                  {fitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="print-lab-field">
                <span>Caption</span>
                <input value={tileCaption} onChange={(event) => setTileCaption(event.target.value)} />
              </label>
            </fieldset>
          ) : null}

          {toolMode === 'split' ? (
            <fieldset className="print-lab-control-group">
              <legend>Poster Split</legend>
              <div className="print-lab-control-grid">
                <label className="print-lab-field">
                  <span>Pages wide</span>
                  <input type="number" min="1" max="4" value={splitWide} onChange={(event) => setSplitWide(clampNumber(event.target.value, 1, 4))} />
                </label>
                <label className="print-lab-field">
                  <span>Pages tall</span>
                  <input type="number" min="1" max="4" value={splitTall} onChange={(event) => setSplitTall(clampNumber(event.target.value, 1, 4))} />
                </label>
              </div>
              <label className="print-lab-field">
                <span>Fit mode</span>
                <select value={splitFit} onChange={(event) => setSplitFit(event.target.value)}>
                  {fitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="print-lab-toggle">
                <input type="checkbox" checked={splitShowNumbers} onChange={(event) => setSplitShowNumbers(event.target.checked)} />
                <span>Show page numbers</span>
              </label>
            </fieldset>
          ) : null}

          {toolMode === 'page' ? (
            <fieldset className="print-lab-control-group">
              <legend>Page Layout</legend>
              <label className="print-lab-field">
                <span>Orientation</span>
                <select value={pageOrientation} onChange={(event) => setPageOrientation(event.target.value)}>
                  {orientationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="print-lab-field">
                <span>Title</span>
                <input value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} />
              </label>
              <label className="print-lab-field">
                <span>Body text</span>
                <textarea rows="7" value={pageBody} onChange={(event) => setPageBody(event.target.value)} />
              </label>
              <label className="print-lab-field">
                <span>Image position</span>
                <select value={pageImagePosition} onChange={(event) => setPageImagePosition(event.target.value)}>
                  {imagePositionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="print-lab-field">
                <span>Footer/source</span>
                <input value={pageFooter} onChange={(event) => setPageFooter(event.target.value)} />
              </label>
            </fieldset>
          ) : null}

          {toolMode === 'zine' ? (
            <fieldset className="print-lab-control-group">
              <legend>Half-Fold Zine</legend>
              <label className="print-lab-field">
                <span>Cover title</span>
                <input value={zineTitle} onChange={(event) => setZineTitle(event.target.value)} />
              </label>
              <label className="print-lab-field">
                <span>Inside text</span>
                <textarea rows="7" value={zineBody} onChange={(event) => setZineBody(event.target.value)} />
              </label>
              <label className="print-lab-field">
                <span>Colophon/footer</span>
                <input value={zineFooter} onChange={(event) => setZineFooter(event.target.value)} />
              </label>
              <label className="print-lab-toggle">
                <input type="checkbox" checked={zineIncludeImage} onChange={(event) => setZineIncludeImage(event.target.checked)} />
                <span>Include image</span>
              </label>
            </fieldset>
          ) : null}

          {!hasUsableOutput ? (
            <p className="print-lab-empty-note">Add text or select an image source to enable output actions.</p>
          ) : null}

          <div className="print-lab-actions">
            <button className="button button--primary print-lab-print-button" type="button" disabled={!hasUsableOutput} onClick={handlePrint}>
              Print
            </button>
            <button className="button" type="button" disabled={!hasUsableOutput} onClick={handleCopyHtml}>
              Copy HTML
            </button>
            <button className="button" type="button" disabled={!hasUsableOutput} onClick={handleDownloadHtml}>
              Download HTML
            </button>
            <button className="button" type="button" disabled={!hasUsableOutput} onClick={handleDownloadText}>
              Download Text
            </button>
          </div>
          {actionStatus ? <p className="print-lab-action-status" role="status">{actionStatus}</p> : null}
        </div>
      </aside>
    )
  }

  function renderTilePreview() {
    const count = tileRows * tileColumns
    return (
      <article
        className="print-lab-preview print-lab-output print-lab-preview--tile-sheet"
        ref={previewRef}
        style={{
          '--tile-columns': tileColumns,
          '--tile-gap': `${tileGap}px`,
        }}
      >
        {currentImageUrl ? (
          <div className="print-lab-tile-grid">
            {Array.from({ length: count }).map((_, index) => (
              <figure className="print-lab-tile" key={`tile-${index}`}>
                <img src={currentImageUrl} alt="" style={{ objectFit: tileFit }} />
                {tileCaption.trim() ? <figcaption>{tileCaption}</figcaption> : null}
              </figure>
            ))}
          </div>
        ) : (
          <p className="print-lab-preview-empty">Select or upload an image to build a tile sheet.</p>
        )}
      </article>
    )
  }

  function renderSplitPreview() {
    const panels = Array.from({ length: splitWide * splitTall })
    const backgroundSize = splitFit === 'contain'
      ? `${splitWide * 100}% auto`
      : `${splitWide * 100}% ${splitTall * 100}%`

    return (
      <article
        className="print-lab-preview print-lab-output print-lab-preview--poster-split"
        ref={previewRef}
        style={{
          '--split-columns': splitWide,
        }}
      >
        {currentImageUrl ? (
          <div className="print-lab-split-grid">
            {panels.map((_, index) => {
              const column = index % splitWide
              const row = Math.floor(index / splitWide)
              const x = splitWide === 1 ? 50 : (column / (splitWide - 1)) * 100
              const y = splitTall === 1 ? 50 : (row / (splitTall - 1)) * 100
              return (
                <section
                  className="print-lab-split-panel"
                  key={`split-${index}`}
                  style={{
                    backgroundImage: `url("${currentImageUrl}")`,
                    backgroundPosition: `${x}% ${y}%`,
                    backgroundSize,
                  }}
                >
                  {splitShowNumbers ? <span>{index + 1}</span> : null}
                </section>
              )
            })}
          </div>
        ) : (
          <p className="print-lab-preview-empty">Select or upload an image to split a poster across pages.</p>
        )}
      </article>
    )
  }

  function renderPagePreview() {
    const hasImage = Boolean(currentImageUrl)
    return (
      <article
        className={`print-lab-preview print-lab-output print-lab-page-preview print-lab-page-preview--${pageOrientation} print-lab-page-preview--image-${pageImagePosition}`}
        ref={previewRef}
      >
        {pageHasContent ? (
          <>
            {hasImage && pageImagePosition === 'background' ? (
              <div className="print-lab-page-background" style={{ backgroundImage: `url("${currentImageUrl}")` }} />
            ) : null}

            <div className="print-lab-page-content">
              {hasImage && pageImagePosition === 'top' ? (
                <figure className="print-lab-page-image">
                  <img src={currentImageUrl} alt="" />
                </figure>
              ) : null}

              <div className="print-lab-page-main">
                <header className="print-lab-page-header">
                  {pageTitle.trim() ? <h2>{pageTitle}</h2> : null}
                </header>

                <div className="print-lab-page-body">
                  {hasImage && pageImagePosition === 'side' ? (
                    <figure className="print-lab-page-image print-lab-page-image--side">
                      <img src={currentImageUrl} alt="" />
                    </figure>
                  ) : null}
                  {renderParagraphs(pageBody)}
                </div>
              </div>
            </div>

            {pageFooter.trim() ? <footer className="print-lab-page-footer">{pageFooter}</footer> : null}
          </>
        ) : (
          <p className="print-lab-preview-empty">Add text or choose an image to compose a page layout.</p>
        )}
      </article>
    )
  }

  function renderZinePreview() {
    const coverTitle = zineTitle.trim() || truncateText(zineBody, 90)
    const hasImage = zineIncludeImage && currentImageUrl

    return (
      <article className="print-lab-preview print-lab-output print-lab-preview--half-fold-zine" ref={previewRef}>
        {zineHasContent ? (
          <div className="print-lab-zine-spread">
            <section className="print-lab-zine-panel print-lab-zine-panel--cover">
              <span>Half-Fold Zine</span>
              {coverTitle ? <h2>{coverTitle}</h2> : null}
              {zineFooter.trim() ? <p>{zineFooter}</p> : null}
            </section>
            <section className="print-lab-zine-panel print-lab-zine-panel--inside">
              {hasImage ? (
                <figure>
                  <img src={currentImageUrl} alt="" />
                </figure>
              ) : null}
              <div className="print-lab-zine-copy">
                {renderParagraphs(zineBody)}
              </div>
            </section>
          </div>
        ) : (
          <p className="print-lab-preview-empty">Add text or image source to build a half-fold zine.</p>
        )}
      </article>
    )
  }

  function renderPreview() {
    if (toolMode === 'tile') return renderTilePreview()
    if (toolMode === 'split') return renderSplitPreview()
    if (toolMode === 'page') return renderPagePreview()
    return renderZinePreview()
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen print-lab-page">
        <div className="wp-screen-header print-lab-screen-header">
          <h1>Printlab</h1>
          <Link className="button" to="/content">Back to Posts</Link>
        </div>

        <section className="print-lab-desk" aria-label="Printlab production lab">
          {renderSourcePanel()}

          <div className="print-lab-preview-wrap" aria-live="polite">
            {renderPreview()}
          </div>

          {renderToolControls()}
        </section>
      </main>
    </AdminFrame>
  )
}
