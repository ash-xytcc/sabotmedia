import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getImportedImage } from '../../lib/getImportedImage'
import { AdminFrame } from '../AdminRail'
import { usePrintlabSources } from './hooks/usePrintlabSources'
import {
  applyCanvasCropDrag,
  buildCanvasStarterBlocks,
  canvasPresetOptions,
  clampCanvasBlock,
  deriveCanvasCropPatch,
  getCanvasMediaFrame,
  getUploadedFontFaceCss,
  googleCanvasFontOptions,
  isCanvasCropBlock,
  makeCanvasBlock,
  systemCanvasFontOptions,
} from './lib/canvasMath'
import { buildExportHtml } from './lib/exportHtml'
import {
  getCanvasOutput,
  getHalfFoldOutput,
  getPageLayoutOutput,
  getPosterOutput,
  getReaderOrderPages,
  getTileOutput,
} from './lib/outputEngine'
import {
  createEmptyPublication,
  createPublicationPage,
  deletePublicationPage as removePublicationPage,
  duplicatePublicationPage as copyPublicationPage,
  getActivePage,
} from './lib/publicationModel'
import { CanvasRenderer } from './renderers/CanvasRenderer'
import { HalfFoldRenderer } from './renderers/HalfFoldRenderer'
import { PageLayoutRenderer } from './renderers/PageLayoutRenderer'
import { PosterSplitRenderer } from './renderers/PosterSplitRenderer'
import { TileSheetRenderer } from './renderers/TileSheetRenderer'

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
const printlabGoogleFontsHref = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&family=Libre+Baskerville:wght@400;700&family=Merriweather:wght@400;700;900&family=Oswald:wght@400;500;600;700&family=Playfair+Display:wght@400;700;900&family=Roboto+Condensed:wght@400;700&family=Source+Serif+4:wght@400;600;700;900&family=Space+Mono:wght@400;700&display=swap'
const fontUploadAccept = '.ttf,.otf,.woff,.woff2'

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

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read image file'))
    reader.readAsDataURL(file)
  })
}

function readFontFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read font file'))
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

function renderParagraphs(text) {
  const paragraphs = String(text || '').split(/\n{2,}/).map((line) => line.trim()).filter(Boolean)
  if (!paragraphs.length) return null
  return paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>)
}

export function PrintLabPage({ pieces = [] }) {
  const {
    publishedPieces,
    mediaItems,
    selectedPiece,
    selectedPostBody,
    selectedPostExcerpt,
    selectedPostTitle,
    currentImage,
    sourceType,
    setSourceType,
    selectedId,
    setSelectedId,
    selectedMediaId,
    setSelectedMediaId,
    uploadImage,
    setUploadImage,
    isLoading,
  } = usePrintlabSources(pieces)
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
  const [publication, setPublication] = useState(() => createEmptyPublication({ title: 'Printlab Publication' }))
  const [publicationDirty, setPublicationDirty] = useState(false)
  const [selectedCanvasBlockId, setSelectedCanvasBlockId] = useState('')
  const [canvasInteraction, setCanvasInteraction] = useState(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasSourceOpen, setCanvasSourceOpen] = useState(false)
  const [canvasToolsOpen, setCanvasToolsOpen] = useState(true)
  const [uploadedCanvasFonts, setUploadedCanvasFonts] = useState([])

  const previewRef = useRef(null)
  const canvasRef = useRef(null)
  const canvasViewportRef = useRef(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById('printlab-google-fonts')) return
    const preconnectGoogle = document.createElement('link')
    preconnectGoogle.id = 'printlab-google-fonts-preconnect-google'
    preconnectGoogle.rel = 'preconnect'
    preconnectGoogle.href = 'https://fonts.googleapis.com'
    const preconnectStatic = document.createElement('link')
    preconnectStatic.id = 'printlab-google-fonts-preconnect-static'
    preconnectStatic.rel = 'preconnect'
    preconnectStatic.href = 'https://fonts.gstatic.com'
    preconnectStatic.crossOrigin = ''
    const stylesheet = document.createElement('link')
    stylesheet.id = 'printlab-google-fonts'
    stylesheet.rel = 'stylesheet'
    stylesheet.href = printlabGoogleFontsHref
    document.head.append(preconnectGoogle, preconnectStatic, stylesheet)
  }, [])

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

  const currentImageUrl = currentImage?.url || ''
  const currentImageTitle = currentImage?.title || ''
  const currentTool = toolOptions.find((option) => option.id === toolMode) || toolOptions[0]
  const needsImageSource = toolMode === 'tile' || toolMode === 'split'
  const publicationPages = Array.isArray(publication.pages) ? publication.pages : []
  const activePage = getActivePage(publication) || createPublicationPage({ id: 'page-1', label: 'Page 1' })
  const canvasPreset = activePage.preset || 'landscape'
  const presetSize = canvasPresetOptions[canvasPreset] || canvasPresetOptions.landscape
  const canvasSize = {
    ...presetSize,
    width: Number(activePage.width || activePage.canvasSize?.width || presetSize.width),
    height: Number(activePage.height || activePage.canvasSize?.height || presetSize.height),
  }
  const canvasBackground = activePage.background || activePage.backgroundColor || '#fffdf8'
  const canvasBlocks = Array.isArray(activePage.blocks) ? activePage.blocks : []
  const selectedCanvasBlock = canvasBlocks.find((block) => block.id === selectedCanvasBlockId) || null
  const uploadedFontFaceCss = useMemo(() => getUploadedFontFaceCss(uploadedCanvasFonts), [uploadedCanvasFonts])
  const readerOrderPages = useMemo(() => getReaderOrderPages(publication), [publication])

  function updateActiveCanvasPage(patchOrFn, options = {}) {
    const { markDirty = true } = options
    if (markDirty) setPublicationDirty(true)
    setPublication((current) => {
      const pages = Array.isArray(current.pages) && current.pages.length
        ? current.pages
        : [createPublicationPage({ id: 'page-1', label: 'Page 1' })]
      const activeId = current.activePageId || pages[0]?.id
      return {
        ...current,
        activePageId: activeId,
        pages: pages.map((page) => {
          if (page.id !== activeId) return page
          const patch = typeof patchOrFn === 'function' ? patchOrFn(page) : patchOrFn
          const nextPage = { ...page, ...patch }
          const width = Number(nextPage.width || nextPage.canvasSize?.width || canvasSize.width)
          const height = Number(nextPage.height || nextPage.canvasSize?.height || canvasSize.height)
          const background = nextPage.background || nextPage.backgroundColor || '#fffdf8'
          return {
            ...nextPage,
            width,
            height,
            canvasSize: { width, height },
            background,
            backgroundColor: background,
          }
        }),
      }
    })
  }

  function setCanvasBlocks(patchOrFn, options) {
    updateActiveCanvasPage((page) => {
      const blocks = Array.isArray(page.blocks) ? page.blocks : []
      const nextBlocks = typeof patchOrFn === 'function' ? patchOrFn(blocks) : patchOrFn
      return { blocks: Array.isArray(nextBlocks) ? nextBlocks : blocks }
    }, options)
  }

  function setCanvasBackground(nextBackground) {
    updateActiveCanvasPage({ background: nextBackground, backgroundColor: nextBackground })
  }

  function updatePublicationTitle(nextTitle) {
    setPublicationDirty(true)
    setPublication((current) => ({
      ...current,
      title: nextTitle,
    }))
  }

  function selectPublicationPage(pageId) {
    const page = publicationPages.find((item) => item.id === pageId)
    if (!page) return
    setPublication((current) => ({ ...current, activePageId: pageId }))
    setSelectedCanvasBlockId(page.blocks?.[0]?.id || '')
    setCanvasInteraction(null)
    window.setTimeout(fitCanvasToViewport, 0)
  }

  function addPublicationPage() {
    const nextIndex = publicationPages.length + 1
    const nextPreset = toolMode === 'zine' ? 'portrait' : canvasPreset
    const nextSize = canvasPresetOptions[nextPreset] || canvasSize
    const page = createPublicationPage({
      label: `Page ${nextIndex}`,
      title: `Page ${nextIndex}`,
      preset: nextPreset,
      width: nextSize.width,
      height: nextSize.height,
      background: canvasBackground,
      backgroundColor: canvasBackground,
      blocks: [],
    })
    setPublicationDirty(true)
    setPublication((current) => ({
      ...current,
      pages: [...(Array.isArray(current.pages) ? current.pages : []), page],
      activePageId: page.id,
    }))
    setSelectedCanvasBlockId('')
    setCanvasInteraction(null)
    window.setTimeout(fitCanvasToViewport, 0)
  }

  function duplicateActivePublicationPage() {
    setPublicationDirty(true)
    setPublication((current) => copyPublicationPage(current, current.activePageId))
    setSelectedCanvasBlockId('')
    setCanvasInteraction(null)
    window.setTimeout(fitCanvasToViewport, 0)
  }

  function deleteActivePublicationPage() {
    if (publicationPages.length <= 1) return
    setPublicationDirty(true)
    setPublication((current) => removePublicationPage(current, current.activePageId))
    setSelectedCanvasBlockId('')
    setCanvasInteraction(null)
    window.setTimeout(fitCanvasToViewport, 0)
  }

  function renameActivePublicationPage(nextLabel) {
    updateActiveCanvasPage({ label: nextLabel, title: nextLabel })
  }

  useEffect(() => {
    if (publicationDirty) return
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

    setCanvasBlocks(nextBlocks.map((block) => clampCanvasBlock(block, canvasSize)), { markDirty: false })
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
    publicationDirty,
  ])

  const sourceStatus = useMemo(() => {
    if (!currentImageUrl) return 'No source selected'
    if (sourceType === 'upload') return 'Uploaded image'
    if (sourceType === 'media') return 'Media image'
    if (sourceType === 'post') return 'Post source'
    return 'Image source'
  }, [currentImageUrl, sourceType])
  const missingSourceMessage = toolMode === 'split'
    ? 'Select or upload an image to split a poster across printable pages.'
    : 'Select or upload an image to build a tile sheet.'
  const zineHasContent = Boolean((zineIncludeImage && currentImageUrl) || zineTitle.trim() || zineBody.trim() || zineFooter.trim())
  const tileOutput = useMemo(() => getTileOutput({
    publication,
    rows: tileRows,
    columns: tileColumns,
    gap: tileGap,
    fit: tileFit,
    caption: tileCaption,
    imageUrl: currentImageUrl,
    missingSourceMessage,
  }), [currentImageUrl, missingSourceMessage, publication, tileCaption, tileColumns, tileFit, tileGap, tileRows])
  const posterOutput = useMemo(() => getPosterOutput({
    publication,
    wide: splitWide,
    tall: splitTall,
    fit: splitFit,
    showNumbers: splitShowNumbers,
    imageUrl: currentImageUrl,
    missingSourceMessage,
  }), [currentImageUrl, missingSourceMessage, publication, splitFit, splitShowNumbers, splitTall, splitWide])
  const pageLayoutOutput = useMemo(() => getPageLayoutOutput({
    publication,
    activePageId: publication.activePageId,
    usePublicationContent: publicationDirty || Boolean(currentImageUrl) || sourceType === 'post',
    orientation: pageOrientation,
    imagePosition: pageImagePosition,
    title: pageTitle,
    body: pageBody,
    footer: pageFooter,
    imageUrl: currentImageUrl,
    sourceTitle: selectedPostTitle && sourceType === 'post' ? selectedPostTitle : '',
    sourceBody: sourceType === 'post' ? (selectedPostBody || selectedPostExcerpt) : '',
    sourceFooter: sourceType === 'post' ? 'Source: CMS post' : '',
    starterBody: 'Use this page layout for a flyer, article handout, one-sheet, or announcement. Add body copy in Tools and choose an image source to compose a print-ready page.',
    truncateText,
  }), [
    currentImageUrl,
    pageBody,
    pageFooter,
    pageImagePosition,
    pageOrientation,
    pageTitle,
    publication,
    publicationDirty,
    selectedPostBody,
    selectedPostExcerpt,
    selectedPostTitle,
    sourceType,
  ])
  const halfFoldOutput = useMemo(() => getHalfFoldOutput({
    publication,
    usePublicationContent: publicationDirty || Boolean(currentImageUrl) || sourceType === 'post',
    title: zineTitle,
    body: zineBody,
    footer: zineFooter,
    imageUrl: currentImageUrl,
    includeImage: zineIncludeImage,
    hasContent: zineHasContent,
    truncateText,
  }), [currentImageUrl, publication, publicationDirty, sourceType, zineBody, zineFooter, zineHasContent, zineIncludeImage, zineTitle])
  const canvasOutput = useMemo(() => getCanvasOutput({
    publication,
    activePageId: publication.activePageId,
    canvasSize,
    canvasBackground,
    canvasBlocks,
  }), [canvasBackground, canvasBlocks, canvasSize, publication])
  const currentOutput = (
    toolMode === 'tile' ? tileOutput
      : toolMode === 'split' ? posterOutput
        : toolMode === 'page' ? pageLayoutOutput
          : toolMode === 'zine' ? halfFoldOutput
            : canvasOutput
  )
  const outputHint = currentOutput.label
  const hasUsableOutput = (
    (toolMode === 'tile' && Boolean(tileOutput.imageUrl)) ||
    (toolMode === 'split' && Boolean(posterOutput.imageUrl)) ||
    (toolMode === 'page' && Boolean(pageLayoutOutput.hasContent)) ||
    (toolMode === 'zine' && Boolean(halfFoldOutput.zineHasContent)) ||
    (toolMode === 'canvas' && canvasOutput.canvasBlocks.length > 0)
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
      return [pageLayoutOutput.titleText, pageLayoutOutput.bodyContent, pageLayoutOutput.footerText].filter(Boolean).join('\n\n')
    }

    if (toolMode === 'zine') {
      return halfFoldOutput.sheets.map((sheet) => (
        [
          sheet.label,
          ...sheet.panels.map((panel) => `${panel.label}: ${panel.page?.label || panel.positionLabel}`),
        ].join('\n')
      )).join('\n\n')
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
    pageLayoutOutput,
    pageTitle,
    halfFoldOutput,
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
    updateActiveCanvasPage((page) => ({
      preset: nextPreset,
      width: nextSize.width,
      height: nextSize.height,
      canvasSize: { width: nextSize.width, height: nextSize.height },
      blocks: (page.blocks || []).map((block) => clampCanvasBlock({
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
      }, nextSize)),
    }))
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

  async function handleFontUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) {
      setActionStatus('Choose a TTF, OTF, WOFF, or WOFF2 font file.')
      event.target.value = ''
      return
    }

    try {
      const dataUrl = await readFontFile(file)
      const name = file.name.replace(/\.[^.]+$/, '') || 'Uploaded font'
      const family = `PrintlabUploadedFont${Date.now()}`
      const font = { name, family, dataUrl }
      setUploadedCanvasFonts((fonts) => [...fonts, font])
      if (selectedCanvasBlock?.type === 'text') {
        updateCanvasBlock(selectedCanvasBlock.id, { fontFamily: family })
      }
      setActionStatus(`${name} added to font menu.`)
    } catch {
      setActionStatus('Font upload failed.')
    } finally {
      event.target.value = ''
    }
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
    const html = buildExportHtml(previewRef.current.outerHTML, pageTitle || zineTitle || currentImageTitle || 'Printlab Output', { fontsHref: printlabGoogleFontsHref })
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
              ) : (
                <p className="print-lab-empty-note print-lab-empty-note--compact">Choose an image to use in Tile Sheet, Poster Split, Page Layout, Zine, or Canvas.</p>
              )}
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
          <h2>Output</h2>
          <span>{toolOptions.find((option) => option.id === toolMode)?.label}</span>
          {toolMode === 'canvas' ? (
            <button className="button print-lab-pane-toggle" type="button" onClick={() => setCanvasToolsOpen((open) => !open)}>
              {canvasToolsOpen ? 'Hide' : 'Show'}
            </button>
          ) : null}
        </div>

        <div className="print-lab-tool-scroll">
          <fieldset className="print-lab-control-group">
            <legend>Output view</legend>
            <div className="print-lab-output-summary">
              <strong>{currentTool.label}</strong>
              <span>{outputHint}</span>
            </div>
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
              <legend>Half-Fold Print Layout</legend>
              <div className="print-lab-output-summary">
                <strong>{halfFoldOutput.label}</strong>
                <span>{halfFoldOutput.sheetSize.label} / fold at center</span>
              </div>
              <div className="print-lab-imposition-list">
                {halfFoldOutput.sheets.map((sheet) => (
                  <div className="print-lab-imposition-sheet" key={sheet.id}>
                    <strong>{sheet.label}</strong>
                    {sheet.panels.map((panel) => (
                      panel.page ? (
                        <button
                          className={panel.page.id === publication.activePageId ? 'is-active' : ''}
                          key={panel.id}
                          type="button"
                          onClick={() => selectPublicationPage(panel.page.id)}
                        >
                          <span>{panel.side}</span>
                          <strong>{panel.positionLabel}</strong>
                          <small>{panel.page.label}</small>
                        </button>
                      ) : (
                        <div className="print-lab-imposition-blank" key={panel.id}>
                          <span>{panel.side}</span>
                          <strong>{panel.positionLabel}</strong>
                        </div>
                      )
                    ))}
                  </div>
                ))}
              </div>
            </fieldset>
          ) : null}

          {toolMode === 'canvas' ? (
            <fieldset className="print-lab-control-group">
              <legend>Publication</legend>
              <div className="print-lab-publication-panel">
                <div className="print-lab-publication-panel__header">
                  <strong>{publication.title || 'Untitled Publication'}</strong>
                  <span>{publicationPages.length} page{publicationPages.length === 1 ? '' : 's'}</span>
                </div>
                <label className="print-lab-field">
                  <span>Publication title</span>
                  <input value={publication.title || ''} onChange={(event) => updatePublicationTitle(event.target.value)} />
                </label>
                <label className="print-lab-field">
                  <span>Active page label</span>
                  <input value={activePage.label || ''} onChange={(event) => renameActivePublicationPage(event.target.value)} />
                </label>
                <div className="print-lab-page-list print-lab-page-list--cards" role="listbox" aria-label="Publication pages">
                  {publicationPages.map((page, index) => (
                    <button
                      className={page.id === publication.activePageId ? 'is-selected' : ''}
                      key={page.id}
                      type="button"
                      role="option"
                      aria-selected={page.id === publication.activePageId}
                      onClick={() => selectPublicationPage(page.id)}
                    >
                      <span
                        className="print-lab-page-card-thumb"
                        style={{ backgroundColor: page.background || page.backgroundColor || '#fffdf8' }}
                        aria-hidden="true"
                      >
                        {(page.blocks || []).slice(0, 4).map((block) => (
                          <span
                            className={`print-lab-page-card-block print-lab-page-card-block--${block.type}`}
                            key={block.id}
                            style={{
                              left: `${Math.max(4, Math.min(82, ((Number(block.x || 0) / Math.max(1, Number(page.width || page.canvasSize?.width || canvasSize.width))) * 100)))}%`,
                              top: `${Math.max(4, Math.min(82, ((Number(block.y || 0) / Math.max(1, Number(page.height || page.canvasSize?.height || canvasSize.height))) * 100)))}%`,
                            }}
                          />
                        ))}
                      </span>
                      <span className="print-lab-page-card-copy">
                        <span>{page.label || `Page ${index + 1}`}</span>
                        <small>{canvasPresetOptions[page.preset]?.label || page.orientation || 'Page'} / {(page.blocks || []).length} blocks</small>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="print-lab-page-actions">
                  <button className="button" type="button" onClick={addPublicationPage}>Add Page</button>
                  <button className="button" type="button" onClick={duplicateActivePublicationPage}>Duplicate Page</button>
                  <button className="button" type="button" disabled={publicationPages.length <= 1} onClick={deleteActivePublicationPage}>Delete Page</button>
                </div>
              </div>
              <div className="print-lab-reader-order-panel">
                <div className="print-lab-reader-order-panel__header">
                  <strong>Reader Order</strong>
                  <span>{readerOrderPages.length} page{readerOrderPages.length === 1 ? '' : 's'}</span>
                </div>
                <ol className="print-lab-reader-order-list">
                  {readerOrderPages.map((page) => (
                    <li className={page.id === publication.activePageId ? 'is-active' : ''} key={page.id}>
                      <button type="button" onClick={() => selectPublicationPage(page.id)}>
                        <span>Page {page.pageNumber}</span>
                        <strong>{page.label || page.title || `Page ${page.pageNumber}`}</strong>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
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
                          <span>Font family</span>
                          <select
                            value={selectedCanvasBlock.fontFamily || 'system'}
                            onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { fontFamily: event.target.value })}
                          >
                            <optgroup label="System fonts">
                              {systemCanvasFontOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Google Fonts">
                              {googleCanvasFontOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </optgroup>
                            {uploadedCanvasFonts.length ? (
                              <optgroup label="Uploaded fonts">
                                {uploadedCanvasFonts.map((font) => (
                                  <option key={font.family} value={font.family}>{font.name}</option>
                                ))}
                              </optgroup>
                            ) : null}
                          </select>
                        </label>
                        <label className="print-lab-field">
                          <span>Font size</span>
                          <input type="number" min="8" max="96" value={selectedCanvasBlock.fontSize || 16} onChange={(event) => updateCanvasBlock(selectedCanvasBlock.id, { fontSize: clampNumber(event.target.value, 8, 96) })} />
                        </label>
                      </div>
                      <label className="print-lab-field">
                        <span>Upload font</span>
                        <input type="file" accept={fontUploadAccept} onChange={handleFontUpload} />
                      </label>
                      <div className="print-lab-control-grid">
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
    return (
      <TileSheetRenderer
        previewRef={previewRef}
        output={tileOutput}
      />
    )
  }

  function renderSplitPreview() {
    return (
      <PosterSplitRenderer
        previewRef={previewRef}
        output={posterOutput}
      />
    )
  }

  function renderPagePreview() {
    return (
      <PageLayoutRenderer
        previewRef={previewRef}
        output={pageLayoutOutput}
        renderParagraphs={renderParagraphs}
        uploadedCanvasFonts={uploadedCanvasFonts}
      />
    )
  }

  function renderZinePreview() {
    return (
      <HalfFoldRenderer
        previewRef={previewRef}
        output={halfFoldOutput}
        uploadedCanvasFonts={uploadedCanvasFonts}
        onSelectPage={selectPublicationPage}
      />
    )
  }

  function renderCanvasPreview() {
    return (
      <CanvasRenderer
        previewRef={previewRef}
        output={canvasOutput}
        uploadedFontFaceCss={uploadedFontFaceCss}
        canvasViewportRef={canvasViewportRef}
        canvasRef={canvasRef}
        canvasZoom={canvasZoom}
        selectedCanvasBlockId={selectedCanvasBlockId}
        setSelectedCanvasBlockId={setSelectedCanvasBlockId}
        uploadedCanvasFonts={uploadedCanvasFonts}
        startCanvasDrag={startCanvasDrag}
        startCanvasResize={startCanvasResize}
        updateCanvasBlock={updateCanvasBlock}
      />
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
