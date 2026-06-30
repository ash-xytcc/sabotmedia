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
  { id: 'canvas', label: 'Canvas', shortLabel: 'C' },
]

const fitOptions = ['cover', 'contain', 'stretch']
const orientationOptions = ['portrait', 'landscape']
const imagePositionOptions = ['top', 'side', 'background']
const defaultCanvasSize = { width: 720, height: 540 }
const canvasPresetOptions = {
  landscape: { label: 'Landscape', width: 720, height: 540 },
  portrait: { label: 'Portrait', width: 540, height: 720 },
  square: { label: 'Square', width: 620, height: 620 },
}
const canvasResizeHandles = [
  { id: 'nw', cursor: 'nwse-resize' },
  { id: 'n', cursor: 'ns-resize' },
  { id: 'ne', cursor: 'nesw-resize' },
  { id: 'e', cursor: 'ew-resize' },
  { id: 'se', cursor: 'nwse-resize' },
  { id: 's', cursor: 'ns-resize' },
  { id: 'sw', cursor: 'nesw-resize' },
  { id: 'w', cursor: 'ew-resize' },
]

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

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makeCanvasBlock(type, patch = {}) {
  const base = {
    id: `canvas-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: patch.title || (type === 'image' ? 'Image' : 'Text'),
    x: type === 'image' ? 390 : 42,
    y: type === 'image' ? 58 : 46,
    width: type === 'image' ? 280 : 330,
    height: type === 'image' ? 260 : 92,
    text: 'New text',
    src: '',
    title: type === 'image' ? 'Image' : 'Text',
    fontSize: type === 'text' ? 28 : 16,
    fontWeight: type === 'text' ? 800 : 600,
    lineHeight: 1.12,
    color: '#111111',
    align: 'left',
    opacity: 1,
    fit: 'cover',
    mediaX: patch.x ?? (type === 'image' ? 390 : 42),
    mediaY: patch.y ?? (type === 'image' ? 58 : 46),
    mediaWidth: patch.width ?? (type === 'image' ? 280 : 330),
    mediaHeight: patch.height ?? (type === 'image' ? 260 : 92),
    cropLeft: 0,
    cropRight: 0,
    cropTop: 0,
    cropBottom: 0,
  }
  return { ...base, ...patch }
}

function clampCanvasBlock(block, canvasSize = defaultCanvasSize) {
  const minWidth = 70
  const minHeight = 42
  const width = clampValue(Number(block.width || minWidth), minWidth, canvasSize.width)
  const height = clampValue(Number(block.height || minHeight), minHeight, canvasSize.height)
  return {
    ...block,
    width,
    height,
    x: clampValue(Number(block.x || 0), 0, Math.max(0, canvasSize.width - width)),
    y: clampValue(Number(block.y || 0), 0, Math.max(0, canvasSize.height - height)),
  }
}

function isCanvasCropBlock(block) {
  return block?.type === 'image'
}

function getCanvasMediaFrame(block) {
  if (!isCanvasCropBlock(block)) return null
  const frameX = Number(block?.x || 0)
  const frameY = Number(block?.y || 0)
  const frameWidth = Math.max(1, Number(block?.width || 1))
  const frameHeight = Math.max(1, Number(block?.height || 1))
  return {
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    mediaX: Number(block?.mediaX ?? frameX),
    mediaY: Number(block?.mediaY ?? frameY),
    mediaWidth: Math.max(1, Number(block?.mediaWidth || frameWidth)),
    mediaHeight: Math.max(1, Number(block?.mediaHeight || frameHeight)),
  }
}

function deriveCanvasCropPatch(frame) {
  const cropLeft = Math.max(0, Math.round(frame.frameX - frame.mediaX))
  const cropTop = Math.max(0, Math.round(frame.frameY - frame.mediaY))
  const cropRight = Math.max(0, Math.round((frame.mediaX + frame.mediaWidth) - (frame.frameX + frame.frameWidth)))
  const cropBottom = Math.max(0, Math.round((frame.mediaY + frame.mediaHeight) - (frame.frameY + frame.frameHeight)))
  return {
    x: frame.frameX,
    y: frame.frameY,
    width: frame.frameWidth,
    height: frame.frameHeight,
    mediaX: frame.mediaX,
    mediaY: frame.mediaY,
    mediaWidth: frame.mediaWidth,
    mediaHeight: frame.mediaHeight,
    cropLeft,
    cropRight,
    cropTop,
    cropBottom,
  }
}

function applyCanvasCropDrag(resizeState, handle, dx, dy) {
  const minVisible = 24
  const mediaLeft = Number(resizeState?.mediaX ?? resizeState?.x ?? 0)
  const mediaTop = Number(resizeState?.mediaY ?? resizeState?.y ?? 0)
  const mediaWidth = Math.max(1, Number(resizeState?.mediaWidth || resizeState?.width || 1))
  const mediaHeight = Math.max(1, Number(resizeState?.mediaHeight || resizeState?.height || 1))
  const mediaRight = mediaLeft + mediaWidth
  const mediaBottom = mediaTop + mediaHeight
  let frameLeft = Number(resizeState?.x || 0)
  let frameTop = Number(resizeState?.y || 0)
  let frameRight = frameLeft + Math.max(1, Number(resizeState?.width || 1))
  let frameBottom = frameTop + Math.max(1, Number(resizeState?.height || 1))

  if (handle.includes('w')) frameLeft = clampValue(frameLeft + dx, mediaLeft, frameRight - minVisible)
  if (handle.includes('e')) frameRight = clampValue(frameRight + dx, frameLeft + minVisible, mediaRight)
  if (handle.includes('n')) frameTop = clampValue(frameTop + dy, mediaTop, frameBottom - minVisible)
  if (handle.includes('s')) frameBottom = clampValue(frameBottom + dy, frameTop + minVisible, mediaBottom)

  return deriveCanvasCropPatch({
    frameX: frameLeft,
    frameY: frameTop,
    frameWidth: frameRight - frameLeft,
    frameHeight: frameBottom - frameTop,
    mediaX: mediaLeft,
    mediaY: mediaTop,
    mediaWidth,
    mediaHeight,
  })
}

function buildCanvasStarterBlocks({ title, body, imageUrl, imageTitle }) {
  const blocks = [
    makeCanvasBlock('text', {
      id: 'canvas-title',
      title: 'Title',
      text: title || imageTitle || 'Printlab Canvas',
      x: 42,
      y: 44,
      width: imageUrl ? 324 : 636,
      height: 96,
      fontSize: 30,
      fontWeight: 800,
      lineHeight: 1.05,
    }),
  ]

  if (body) {
    blocks.push(makeCanvasBlock('text', {
      id: 'canvas-body',
      title: 'Body',
      text: body,
      x: 44,
      y: 160,
      width: imageUrl ? 314 : 632,
      height: 240,
      fontSize: 15,
      fontWeight: 500,
      lineHeight: 1.38,
    }))
  }

  if (imageUrl) {
    blocks.push(makeCanvasBlock('image', {
      id: 'canvas-image',
      title: imageTitle || 'Image',
      src: imageUrl,
      x: 388,
      y: 58,
      width: 286,
      height: 350,
      fit: 'cover',
    }))
  }

  return blocks
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
    .print-lab-split-panel__print-image { display: none; width: 100%; height: 100%; }
    .print-lab-zine-spread { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .print-lab-preview--canvas { width: 100%; max-width: none; padding: 0; background: #1f2937; overflow: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .print-lab-canvas-viewport { display: grid; place-items: center; min-height: 540px; padding: 20px; overflow: auto; background: #1f2937; }
    .print-lab-canvas-shell { position: relative; flex: 0 0 auto; margin: auto; }
    .print-lab-canvas-stage { position: relative; background-color: #fff; overflow: hidden; transform-origin: top left; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .print-lab-canvas-block { position: absolute; box-sizing: border-box; overflow: hidden; }
    .print-lab-canvas-block img { position: absolute; display: block; max-width: none; }
    .print-lab-canvas-text { width: 100%; height: 100%; overflow: hidden; white-space: pre-wrap; }
    .print-lab-canvas-block__label, .print-lab-canvas-resize { display: none; }
    @media print { body { margin: 0; background: #fff; } .print-lab-preview { border: 0; box-shadow: none; } .print-lab-preview--poster-split { padding: 0; } .print-lab-split-grid { display: block; } .print-lab-split-panel { width: 100%; height: 9.5in; break-after: page; background-image: none !important; } .print-lab-split-panel__print-image { display: block; object-fit: cover; } .print-lab-preview--canvas { background: #fff !important; overflow: visible !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; } .print-lab-canvas-viewport { display: block; min-height: 0; height: auto; padding: 0; overflow: visible; background: #fff !important; } .print-lab-canvas-shell { width: auto !important; height: auto !important; margin: 0 auto !important; } .print-lab-canvas-stage { margin: 0 auto; transform: none !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; } }
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
  const [canvasPreset, setCanvasPreset] = useState('landscape')
  const [canvasBackground, setCanvasBackground] = useState('#fffdf8')
  const [canvasBlocks, setCanvasBlocks] = useState([])
  const [selectedCanvasBlockId, setSelectedCanvasBlockId] = useState('')
  const [canvasInteraction, setCanvasInteraction] = useState(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasSourceOpen, setCanvasSourceOpen] = useState(false)
  const [canvasToolsOpen, setCanvasToolsOpen] = useState(true)

  const previewRef = useRef(null)
  const canvasRef = useRef(null)
  const canvasViewportRef = useRef(null)
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
  const currentTool = toolOptions.find((option) => option.id === toolMode) || toolOptions[0]
  const needsImageSource = toolMode === 'tile' || toolMode === 'split'
  const canvasSize = canvasPresetOptions[canvasPreset] || canvasPresetOptions.landscape
  const selectedCanvasBlock = canvasBlocks.find((block) => block.id === selectedCanvasBlockId) || null

  useEffect(() => {
    const title = sourceType === 'post'
      ? (selectedPostTitle || 'Untitled')
      : (currentImageTitle || pageTitle || zineTitle || 'Printlab Canvas')
    const body = sourceType === 'post'
      ? truncateText(selectedPostBody || selectedPostExcerpt || '', 360)
      : ''
    const nextBlocks = buildCanvasStarterBlocks({
      title,
      body,
      imageUrl: currentImageUrl,
      imageTitle: currentImageTitle,
    })

    setCanvasBlocks(nextBlocks.map((block) => clampCanvasBlock(block, canvasSize)))
    setSelectedCanvasBlockId(nextBlocks[0]?.id || '')
    setCanvasInteraction(null)
  }, [
    currentImageTitle,
    currentImageUrl,
    pageTitle,
    selectedPostBody,
    selectedPostExcerpt,
    selectedPostTitle,
    sourceType,
    zineTitle,
  ])

  const sourceStatus = useMemo(() => {
    if (!currentImageUrl) return 'No source selected'
    if (sourceType === 'upload') return 'Uploaded image'
    if (sourceType === 'media') return 'Media image'
    if (sourceType === 'post') return 'Post source'
    return 'Image source'
  }, [currentImageUrl, sourceType])
  const outputHint = useMemo(() => {
    if (toolMode === 'tile') return `${tileRows}x${tileColumns} tile sheet`
    if (toolMode === 'split') return `${splitWide}x${splitTall} poster split`
    if (toolMode === 'page') return `${pageOrientation} page layout`
    if (toolMode === 'zine') return '8.5x11 landscape half-fold'
    return `${canvasSize.label} canvas / ${canvasBlocks.length} blocks`
  }, [canvasBlocks.length, canvasSize.label, pageOrientation, splitTall, splitWide, tileColumns, tileRows, toolMode])
  const missingSourceMessage = toolMode === 'split'
    ? 'Select or upload an image to split a poster across printable pages.'
    : 'Select or upload an image to build a tile sheet.'
  const pageHasContent = Boolean(currentImageUrl || pageTitle.trim() || pageBody.trim() || pageFooter.trim())
  const zineHasContent = Boolean((zineIncludeImage && currentImageUrl) || zineTitle.trim() || zineBody.trim() || zineFooter.trim())
  const hasUsableOutput = (
    (toolMode === 'tile' && Boolean(currentImageUrl)) ||
    (toolMode === 'split' && Boolean(currentImageUrl)) ||
    (toolMode === 'page' && pageHasContent) ||
    (toolMode === 'zine' && zineHasContent) ||
    (toolMode === 'canvas' && canvasBlocks.length > 0)
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

    if (toolMode === 'zine') {
      return [zineTitle, zineBody, zineFooter].filter(Boolean).join('\n\n')
    }

    return canvasBlocks.map((block) => (
      block.type === 'image'
        ? `Image: ${block.title || currentImageTitle || block.src}`
        : block.text
    )).filter(Boolean).join('\n\n')
  }, [
    canvasBlocks,
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

  function updateCanvasBlock(id, patchOrFn) {
    setCanvasBlocks((blocks) => blocks.map((block) => {
      if (block.id !== id) return block
      const patch = typeof patchOrFn === 'function' ? patchOrFn(block) : patchOrFn
      return clampCanvasBlock({ ...block, ...patch }, canvasSize)
    }))
  }

  function setCanvasZoomClamped(value) {
    setCanvasZoom(clampValue(Number(value) || 1, 0.2, 2))
  }

  function fitCanvasToViewport() {
    const rect = canvasViewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const availableWidth = Math.max(240, rect.width - 40)
    const availableHeight = Math.max(240, rect.height - 40)
    const nextZoom = clampValue(Math.min(availableWidth / canvasSize.width, availableHeight / canvasSize.height), 0.18, 1.25)
    setCanvasZoom(nextZoom)
    canvasViewportRef.current.scrollTo({ left: 0, top: 0 })
  }

  function addCanvasTextBlock() {
    const block = clampCanvasBlock(makeCanvasBlock('text', {
      text: 'New text block',
      x: 72,
      y: 72,
      width: 260,
      height: 86,
      fontSize: 24,
    }), canvasSize)
    setCanvasBlocks((blocks) => [...blocks, block])
    setSelectedCanvasBlockId(block.id)
  }

  function addCanvasImageBlock() {
    if (!currentImageUrl) return
    const block = clampCanvasBlock(makeCanvasBlock('image', {
      src: currentImageUrl,
      title: currentImageTitle || 'Image',
      name: currentImageTitle || 'Image',
      x: Math.max(24, canvasSize.width - 330),
      y: 92,
      width: 260,
      height: 220,
    }), canvasSize)
    setCanvasBlocks((blocks) => [...blocks, block])
    setSelectedCanvasBlockId(block.id)
  }

  function deleteSelectedCanvasBlock() {
    if (!selectedCanvasBlockId) return
    setCanvasBlocks((blocks) => blocks.filter((block) => block.id !== selectedCanvasBlockId))
    setSelectedCanvasBlockId('')
  }

  function duplicateSelectedCanvasBlock() {
    if (!selectedCanvasBlock) return
    const duplicate = clampCanvasBlock({
      ...selectedCanvasBlock,
      id: `canvas-${selectedCanvasBlock.type}-${Date.now()}`,
      title: `${selectedCanvasBlock.title || selectedCanvasBlock.type} Copy`,
      name: `${selectedCanvasBlock.name || selectedCanvasBlock.type} Copy`,
      x: Number(selectedCanvasBlock.x || 0) + 24,
      y: Number(selectedCanvasBlock.y || 0) + 24,
    }, canvasSize)
    setCanvasBlocks((blocks) => [...blocks, duplicate])
    setSelectedCanvasBlockId(duplicate.id)
  }

  function moveSelectedCanvasBlock(direction) {
    if (!selectedCanvasBlockId) return
    setCanvasBlocks((blocks) => {
      const index = blocks.findIndex((block) => block.id === selectedCanvasBlockId)
      if (index < 0) return blocks
      const next = blocks.slice()
      if (direction === 'up' && index < next.length - 1) {
        ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      }
      if (direction === 'down' && index > 0) {
        ;[next[index], next[index - 1]] = [next[index - 1], next[index]]
      }
      return next
    })
  }

  function changeCanvasPreset(nextPreset) {
    const nextSize = canvasPresetOptions[nextPreset] || canvasPresetOptions.landscape
    const currentSize = canvasSize
    const scaleX = nextSize.width / currentSize.width
    const scaleY = nextSize.height / currentSize.height
    setCanvasPreset(nextPreset)
    setCanvasBlocks((blocks) => blocks.map((block) => clampCanvasBlock({
      ...block,
      x: Number(block.x || 0) * scaleX,
      y: Number(block.y || 0) * scaleY,
      width: Number(block.width || 1) * scaleX,
      height: Number(block.height || 1) * scaleY,
      mediaX: Number(block.mediaX ?? block.x ?? 0) * scaleX,
      mediaY: Number(block.mediaY ?? block.y ?? 0) * scaleY,
      mediaWidth: Number(block.mediaWidth ?? block.width ?? 1) * scaleX,
      mediaHeight: Number(block.mediaHeight ?? block.height ?? 1) * scaleY,
      cropLeft: Number(block.cropLeft || 0) * scaleX,
      cropRight: Number(block.cropRight || 0) * scaleX,
      cropTop: Number(block.cropTop || 0) * scaleY,
      cropBottom: Number(block.cropBottom || 0) * scaleY,
    }, nextSize)))
    window.setTimeout(fitCanvasToViewport, 0)
  }

  function getCanvasPoint(event) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: clampValue(((event.clientX - rect.left) / rect.width) * canvasSize.width, 0, canvasSize.width),
      y: clampValue(((event.clientY - rect.top) / rect.height) * canvasSize.height, 0, canvasSize.height),
    }
  }

  function startCanvasDrag(event, block) {
    if (event.button !== undefined && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedCanvasBlockId(block.id)
    const point = getCanvasPoint(event)
    const mediaFrame = getCanvasMediaFrame(block)
    setCanvasInteraction({
      type: 'drag',
      id: block.id,
      startX: point.x,
      startY: point.y,
      x: Number(block.x || 0),
      y: Number(block.y || 0),
      width: Number(block.width || 1),
      height: Number(block.height || 1),
      mediaX: Number(mediaFrame?.mediaX ?? block.mediaX ?? block.x ?? 0),
      mediaY: Number(mediaFrame?.mediaY ?? block.mediaY ?? block.y ?? 0),
      mediaWidth: Number(mediaFrame?.mediaWidth ?? block.mediaWidth ?? block.width ?? 1),
      mediaHeight: Number(mediaFrame?.mediaHeight ?? block.mediaHeight ?? block.height ?? 1),
      cropLeft: Number(block.cropLeft || 0),
      cropRight: Number(block.cropRight || 0),
      cropTop: Number(block.cropTop || 0),
      cropBottom: Number(block.cropBottom || 0),
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
    })
  }

  function startCanvasResize(event, block, handle) {
    if (event.button !== undefined && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedCanvasBlockId(block.id)
    const point = getCanvasPoint(event)
    const mediaFrame = getCanvasMediaFrame(block)
    const isCropHandle = isCanvasCropBlock(block) && handle.length === 1
    setCanvasInteraction({
      type: 'resize',
      mode: isCropHandle ? 'crop' : 'resize',
      id: block.id,
      handle,
      startX: point.x,
      startY: point.y,
      x: Number(block.x || 0),
      y: Number(block.y || 0),
      width: Number(block.width || 1),
      height: Number(block.height || 1),
      mediaX: Number(mediaFrame?.mediaX ?? block.mediaX ?? block.x ?? 0),
      mediaY: Number(mediaFrame?.mediaY ?? block.mediaY ?? block.y ?? 0),
      mediaWidth: Number(mediaFrame?.mediaWidth ?? block.mediaWidth ?? block.width ?? 1),
      mediaHeight: Number(mediaFrame?.mediaHeight ?? block.mediaHeight ?? block.height ?? 1),
      cropLeft: Number(block.cropLeft || 0),
      cropRight: Number(block.cropRight || 0),
      cropTop: Number(block.cropTop || 0),
      cropBottom: Number(block.cropBottom || 0),
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
    })
  }

  useEffect(() => {
    if (!canvasInteraction) return undefined

    function handleMove(event) {
      const point = getCanvasPoint(event)
      const dx = point.x - canvasInteraction.startX
      const dy = point.y - canvasInteraction.startY
      const bounds = {
        width: canvasInteraction.canvasWidth || canvasSize.width,
        height: canvasInteraction.canvasHeight || canvasSize.height,
      }

      updateCanvasBlock(canvasInteraction.id, (block) => {
        if (canvasInteraction.type === 'drag') {
          const nextX = clampValue(canvasInteraction.x + dx, 0, Math.max(0, bounds.width - canvasInteraction.width))
          const nextY = clampValue(canvasInteraction.y + dy, 0, Math.max(0, bounds.height - canvasInteraction.height))
          if (isCanvasCropBlock(block)) {
            return deriveCanvasCropPatch({
              frameX: nextX,
              frameY: nextY,
              frameWidth: Number(canvasInteraction.width || 1),
              frameHeight: Number(canvasInteraction.height || 1),
              mediaX: Number(canvasInteraction.mediaX ?? canvasInteraction.x ?? 0) + (nextX - Number(canvasInteraction.x || 0)),
              mediaY: Number(canvasInteraction.mediaY ?? canvasInteraction.y ?? 0) + (nextY - Number(canvasInteraction.y || 0)),
              mediaWidth: Number(canvasInteraction.mediaWidth || canvasInteraction.width || 1),
              mediaHeight: Number(canvasInteraction.mediaHeight || canvasInteraction.height || 1),
            })
          }
          return {
            x: nextX,
            y: nextY,
          }
        }

        if (canvasInteraction.mode === 'crop' && isCanvasCropBlock(block)) {
          return applyCanvasCropDrag(canvasInteraction, canvasInteraction.handle, dx, dy)
        }

        const minWidth = 70
        const minHeight = 42
        let nextX = canvasInteraction.x
        let nextY = canvasInteraction.y
        let nextWidth = canvasInteraction.width
        let nextHeight = canvasInteraction.height

        if (canvasInteraction.handle.includes('e')) nextWidth = canvasInteraction.width + dx
        if (canvasInteraction.handle.includes('s')) nextHeight = canvasInteraction.height + dy
        if (canvasInteraction.handle.includes('w')) {
          nextX = canvasInteraction.x + dx
          nextWidth = canvasInteraction.width - dx
        }
        if (canvasInteraction.handle.includes('n')) {
          nextY = canvasInteraction.y + dy
          nextHeight = canvasInteraction.height - dy
        }

        if (nextWidth < minWidth) {
          if (canvasInteraction.handle.includes('w')) nextX -= minWidth - nextWidth
          nextWidth = minWidth
        }
        if (nextHeight < minHeight) {
          if (canvasInteraction.handle.includes('n')) nextY -= minHeight - nextHeight
          nextHeight = minHeight
        }

        nextX = clampValue(nextX, 0, Math.max(0, bounds.width - minWidth))
        nextY = clampValue(nextY, 0, Math.max(0, bounds.height - minHeight))
        nextWidth = clampValue(nextWidth, minWidth, bounds.width - nextX)
        nextHeight = clampValue(nextHeight, minHeight, bounds.height - nextY)
        if (isCanvasCropBlock(block)) {
          const baseWidth = Math.max(1, Number(canvasInteraction.width || 1))
          const baseHeight = Math.max(1, Number(canvasInteraction.height || 1))
          const scaleX = nextWidth / baseWidth
          const scaleY = nextHeight / baseHeight
          const cropOffsetX = Number(canvasInteraction.x || 0) - Number(canvasInteraction.mediaX || 0)
          const cropOffsetY = Number(canvasInteraction.y || 0) - Number(canvasInteraction.mediaY || 0)
          return {
            x: nextX,
            y: nextY,
            width: nextWidth,
            height: nextHeight,
            mediaX: nextX - cropOffsetX * scaleX,
            mediaY: nextY - cropOffsetY * scaleY,
            mediaWidth: Math.max(minWidth, Number(canvasInteraction.mediaWidth || canvasInteraction.width || 1) * scaleX),
            mediaHeight: Math.max(minHeight, Number(canvasInteraction.mediaHeight || canvasInteraction.height || 1) * scaleY),
            cropLeft: Math.max(0, Number(canvasInteraction.cropLeft || 0) * scaleX),
            cropRight: Math.max(0, Number(canvasInteraction.cropRight || 0) * scaleX),
            cropTop: Math.max(0, Number(canvasInteraction.cropTop || 0) * scaleY),
            cropBottom: Math.max(0, Number(canvasInteraction.cropBottom || 0) * scaleY),
          }
        }
        return { x: nextX, y: nextY, width: nextWidth, height: nextHeight }
      })
    }

    function handleUp() {
      setCanvasInteraction(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [canvasInteraction, canvasSize])

  useEffect(() => {
    if (toolMode !== 'canvas') return undefined
    const timer = window.setTimeout(fitCanvasToViewport, 0)
    const handleResize = () => fitCanvasToViewport()
    window.addEventListener('resize', handleResize)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [toolMode, canvasPreset, canvasSize.width, canvasSize.height])

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
    const collapsed = toolMode === 'canvas' && !canvasSourceOpen
    return (
      <aside className={`print-lab-source-pane${collapsed ? ' is-collapsed' : ''}`} aria-label="Printlab source">
        <div className="print-lab-pane-header">
          <h2>Source</h2>
          <span>{sourceOptions.find((option) => option.id === sourceType)?.label}</span>
          {toolMode === 'canvas' ? (
            <button className="button print-lab-pane-toggle" type="button" onClick={() => setCanvasSourceOpen((open) => !open)}>
              {canvasSourceOpen ? 'Hide' : 'Show'}
            </button>
          ) : null}
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
    const collapsed = toolMode === 'canvas' && !canvasToolsOpen
    return (
      <aside className={`print-lab-tool-panel${collapsed ? ' is-collapsed' : ''}`} aria-label="Printlab controls">
        <div className="print-lab-pane-header">
          <h2>Tools</h2>
          <span>{toolOptions.find((option) => option.id === toolMode)?.label}</span>
          {toolMode === 'canvas' ? (
            <button className="button print-lab-pane-toggle" type="button" onClick={() => setCanvasToolsOpen((open) => !open)}>
              {canvasToolsOpen ? 'Hide' : 'Show'}
            </button>
          ) : null}
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
                  aria-label={`Use ${option.label}`}
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

          {toolMode === 'canvas' ? (
            <fieldset className="print-lab-control-group">
              <legend>Canvas</legend>
              <div className="print-lab-canvas-document">
                <label className="print-lab-field">
                  <span>Page preset</span>
                  <select value={canvasPreset} onChange={(event) => changeCanvasPreset(event.target.value)}>
                    {Object.entries(canvasPresetOptions).map(([id, option]) => (
                      <option key={id} value={id}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="print-lab-field print-lab-color-field">
                  <span>Background</span>
                  <input type="color" value={canvasBackground} onChange={(event) => setCanvasBackground(event.target.value)} />
                </label>
              </div>
              <div className="print-lab-canvas-tools">
                <button className="button" type="button" onClick={addCanvasTextBlock}>Add Text</button>
                <button className="button" type="button" disabled={!currentImageUrl} onClick={addCanvasImageBlock}>Add Image</button>
                <button className="button" type="button" disabled={!selectedCanvasBlock} onClick={duplicateSelectedCanvasBlock}>Duplicate</button>
                <button className="button" type="button" disabled={!selectedCanvasBlock} onClick={deleteSelectedCanvasBlock}>Delete</button>
                <button className="button" type="button" disabled={!selectedCanvasBlock} onClick={() => moveSelectedCanvasBlock('down')}>Send Back</button>
                <button className="button" type="button" disabled={!selectedCanvasBlock} onClick={() => moveSelectedCanvasBlock('up')}>Bring Forward</button>
              </div>
              {selectedCanvasBlock ? (
                <div className="print-lab-canvas-inspector">
                  <strong>{selectedCanvasBlock.title || selectedCanvasBlock.name || (selectedCanvasBlock.type === 'image' ? 'Image block' : 'Text block')}</strong>
                  <div className="print-lab-control-grid">
                    <label className="print-lab-field">
                      <span>X</span>
                      <input type="number" value={Math.round(selectedCanvasBlock.x)} onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { x: Number(event.target.value || 0) })} />
                    </label>
                    <label className="print-lab-field">
                      <span>Y</span>
                      <input type="number" value={Math.round(selectedCanvasBlock.y)} onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { y: Number(event.target.value || 0) })} />
                    </label>
                    <label className="print-lab-field">
                      <span>Width</span>
                      <input type="number" min="70" value={Math.round(selectedCanvasBlock.width)} onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { width: Number(event.target.value || 70) })} />
                    </label>
                    <label className="print-lab-field">
                      <span>Height</span>
                      <input type="number" min="42" value={Math.round(selectedCanvasBlock.height)} onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { height: Number(event.target.value || 42) })} />
                    </label>
                  </div>
                  {selectedCanvasBlock.type === 'text' ? (
                    <>
                      <label className="print-lab-field">
                        <span>Text</span>
                        <textarea
                          rows="4"
                          value={selectedCanvasBlock.text}
                          onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { text: event.target.value })}
                        />
                      </label>
                      <div className="print-lab-control-grid">
                        <label className="print-lab-field">
                          <span>Font size</span>
                          <input type="number" min="8" max="96" value={selectedCanvasBlock.fontSize || 16} onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { fontSize: clampNumber(event.target.value, 8, 96) })} />
                        </label>
                        <label className="print-lab-field print-lab-color-field">
                          <span>Color</span>
                          <input type="color" value={selectedCanvasBlock.color || '#111111'} onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { color: event.target.value })} />
                        </label>
                      </div>
                      <label className="print-lab-toggle">
                        <input
                          type="checkbox"
                          checked={Number(selectedCanvasBlock.fontWeight || 500) >= 700}
                          onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { fontWeight: event.target.checked ? 800 : 500 })}
                        />
                        <span>Bold</span>
                      </label>
                      <label className="print-lab-field">
                        <span>Alignment</span>
                        <select value={selectedCanvasBlock.align || 'left'} onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { align: event.target.value })}>
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                    </>
                  ) : (
                    <label className="print-lab-field">
                      <span>Image fit</span>
                      <select
                        value={selectedCanvasBlock.fit || 'cover'}
                        onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { fit: event.target.value })}
                      >
                        {fitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              ) : (
                <p className="print-lab-empty-note">Select a canvas block to edit its content.</p>
              )}
              <div className="print-lab-canvas-layers">
                <strong>Layers</strong>
                {canvasBlocks.slice().reverse().map((block, index) => (
                  <button
                    className={block.id === selectedCanvasBlockId ? 'is-selected' : ''}
                    key={block.id}
                    type="button"
                    onClick={() => setSelectedCanvasBlockId(block.id)}
                  >
                    <span>{block.title || block.name || block.type}</span>
                    <small>{block.type} #{canvasBlocks.length - index}</small>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {!hasUsableOutput ? (
            <p className="print-lab-empty-note">
              {needsImageSource ? missingSourceMessage : 'Add text or select source material to enable output actions.'}
            </p>
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
          <p className="print-lab-preview-empty">{missingSourceMessage}</p>
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
              const objectPosition = `${x}% ${y}%`
              return (
                <section
                  className="print-lab-split-panel"
                  key={`split-${index}`}
                  style={{
                    backgroundImage: `url("${currentImageUrl}")`,
                    backgroundPosition: objectPosition,
                    backgroundSize,
                  }}
                >
                  <img
                    className="print-lab-split-panel__print-image"
                    src={currentImageUrl}
                    alt=""
                    style={{
                      objectFit: 'cover',
                      objectPosition,
                    }}
                  />
                  {splitShowNumbers ? <span>{index + 1}</span> : null}
                </section>
              )
            })}
          </div>
        ) : (
          <p className="print-lab-preview-empty">{missingSourceMessage}</p>
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

  function renderCanvasPreview() {
    return (
      <article className="print-lab-preview print-lab-output print-lab-preview--canvas" ref={previewRef}>
        <div
          className="print-lab-canvas-viewport"
          ref={canvasViewportRef}
        >
          <div
            className="print-lab-canvas-shell"
            style={{
              width: `${canvasSize.width * canvasZoom}px`,
              height: `${canvasSize.height * canvasZoom}px`,
            }}
          >
          <div
            className="print-lab-canvas-stage"
            ref={canvasRef}
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              transform: `scale(${canvasZoom})`,
              backgroundColor: canvasBackground,
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
            onPointerDown={() => setSelectedCanvasBlockId('')}
          >
            {canvasBlocks.map((block) => {
              const selected = block.id === selectedCanvasBlockId
              const blockWidth = Math.max(1, Number(block.width || 1))
              const blockHeight = Math.max(1, Number(block.height || 1))
              const mediaFrame = getCanvasMediaFrame(block)
              const fit = block.fit || 'cover'
              const blockStyle = {
                left: `${Number(block.x || 0)}px`,
                top: `${Number(block.y || 0)}px`,
                width: `${blockWidth}px`,
                height: `${blockHeight}px`,
                opacity: block.opacity ?? 1,
              }
              const mediaStyle = block.type === 'image' && mediaFrame ? (
                fit === 'stretch'
                  ? {
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                  }
                  : {
                    left: `${mediaFrame.mediaX - Number(block.x || 0)}px`,
                    top: `${mediaFrame.mediaY - Number(block.y || 0)}px`,
                    width: `${mediaFrame.mediaWidth}px`,
                    height: `${mediaFrame.mediaHeight}px`,
                    objectFit: fit,
                  }
              ) : null

              return (
                <div
                  className={`print-lab-canvas-block print-lab-canvas-block--${block.type}${selected ? ' is-selected' : ''}`}
                  key={block.id}
                  style={blockStyle}
                  onPointerDown={(event) => startCanvasDrag(event, block)}
                >
                  {block.type === 'image' ? (
                    <img src={block.src} alt="" draggable={false} style={mediaStyle} />
                  ) : (
                    <div
                      className="print-lab-canvas-text"
                      contentEditable={selected}
                      suppressContentEditableWarning
                      onPointerDown={(event) => {
                        if (selected && event.detail > 1) {
                          event.stopPropagation()
                          return
                        }
                        startCanvasDrag(event, block)
                      }}
                      onBlur={(event) => updateCanvasBlock(block.id, { text: event.currentTarget.innerText })}
                      style={{
                        color: block.color,
                        fontSize: `${block.fontSize}px`,
                        fontWeight: block.fontWeight,
                        lineHeight: block.lineHeight,
                        textAlign: block.align || 'left',
                      }}
                    >
                      {block.text}
                    </div>
                  )}
                  {selected ? (
                    <>
                      <span className="print-lab-canvas-block__label">{block.title || block.type}</span>
                      {canvasResizeHandles.map((handle) => {
                        const actionLabel = block.type === 'image' && handle.id.length === 1 ? 'Crop image' : 'Resize block'
                        return (
                          <span
                            aria-label={`${actionLabel}: ${handle.id}`}
                            className={`print-lab-canvas-resize print-lab-canvas-resize--${handle.id}`}
                            key={handle.id}
                            role="button"
                            tabIndex="-1"
                            title={actionLabel}
                            style={{ cursor: handle.cursor }}
                            onPointerDown={(event) => startCanvasResize(event, block, handle.id)}
                          />
                        )
                      })}
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
          </div>
        </div>
      </article>
    )
  }

  function renderPreview() {
    if (toolMode === 'tile') return renderTilePreview()
    if (toolMode === 'split') return renderSplitPreview()
    if (toolMode === 'page') return renderPagePreview()
    if (toolMode === 'zine') return renderZinePreview()
    return renderCanvasPreview()
  }

  return (
    <AdminFrame>
      <main className={`page wp-admin-screen print-lab-page${toolMode === 'canvas' ? ' print-lab-page--canvas-mode' : ''}`}>
        <div className="wp-screen-header print-lab-screen-header">
          <h1>Printlab</h1>
          <Link className="button" to="/content">Back to Posts</Link>
        </div>

        <section
          className={`print-lab-desk${toolMode === 'canvas' ? ' print-lab-desk--canvas-mode' : ''}${toolMode === 'canvas' && !canvasSourceOpen ? ' is-source-collapsed' : ''}${toolMode === 'canvas' && !canvasToolsOpen ? ' is-tools-collapsed' : ''}`}
          aria-label="Printlab production lab"
        >
          {renderSourcePanel()}

          <div className="print-lab-preview-wrap" aria-live="polite">
            <div className={toolMode === 'canvas' ? 'print-lab-canvas-topbar' : 'print-lab-preview-status'}>
              <div>
                <span>Preview</span>
                <strong>{currentTool.label}</strong>
              </div>
              <div>
                <span>Source</span>
                <strong>{sourceStatus}</strong>
              </div>
              <div>
                <span>Output</span>
                <strong>{outputHint}</strong>
              </div>
              {toolMode === 'canvas' ? (
                <div className="print-lab-canvas-zoombar" aria-label="Canvas zoom controls">
                  <button className="button" type="button" onClick={() => setCanvasSourceOpen((open) => !open)} aria-pressed={canvasSourceOpen}>Source</button>
                  <button className="button" type="button" onClick={fitCanvasToViewport}>Fit</button>
                  <button className="button" type="button" onClick={() => setCanvasZoomClamped(canvasZoom - 0.1)} aria-label="Zoom out">-</button>
                  <button className="button" type="button" onClick={() => setCanvasZoomClamped(1)}>100%</button>
                  <button className="button" type="button" onClick={() => setCanvasZoomClamped(canvasZoom + 0.1)} aria-label="Zoom in">+</button>
                  <button className="button" type="button" onClick={() => setCanvasToolsOpen((open) => !open)} aria-pressed={canvasToolsOpen}>Tools</button>
                  <span>{Math.round(canvasZoom * 100)}%</span>
                </div>
              ) : null}
            </div>
            {renderPreview()}
          </div>

          {renderToolControls()}
        </section>
      </main>
    </AdminFrame>
  )
}
