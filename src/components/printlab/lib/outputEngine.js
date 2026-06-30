function normalizePage(page, index) {
  if (!page) return null
  const width = Number(page.width || page.canvasSize?.width || 720)
  const height = Number(page.height || page.canvasSize?.height || 540)
  const background = page.background || page.backgroundColor || '#fffdf8'
  return {
    ...page,
    pageNumber: index + 1,
    label: page.label || page.title || `Page ${index + 1}`,
    title: page.title || page.label || `Page ${index + 1}`,
    width,
    height,
    canvasSize: { width, height },
    background,
    backgroundColor: background,
    blocks: Array.isArray(page.blocks) ? page.blocks : [],
  }
}

function getFirstTextBlock(page, index = 0) {
  return (page?.blocks || []).filter((block) => block.type === 'text')[index] || null
}

function getFirstImageBlock(page) {
  return (page?.blocks || []).find((block) => block.type === 'image' && block.src) || null
}

function cleanText(value = '') {
  return String(value || '').trim()
}

export const printlabOutputTypes = {
  canvas: 'canvas',
  page: 'page',
  split: 'split',
  tile: 'tile',
  zine: 'zine',
}

export function getReaderOrderPages(publication) {
  const pages = Array.isArray(publication?.pages) ? publication.pages : []
  return pages.map((page, index) => normalizePage(page, index)).filter(Boolean)
}

export function getCanvasOutput({
  publication,
  activePageId,
  canvasSize,
  canvasBackground,
  canvasBlocks,
} = {}) {
  const pages = getReaderOrderPages(publication)
  const activePage = pages.find((page) => page.id === activePageId) || pages[0] || null
  return {
    type: printlabOutputTypes.canvas,
    label: activePage ? `${activePage.label} canvas / ${(activePage.blocks || []).length} blocks` : 'Canvas',
    pages,
    activePage,
    canvasSize: canvasSize || activePage?.canvasSize || { width: 720, height: 540 },
    canvasBackground: canvasBackground || activePage?.background || '#fffdf8',
    canvasBlocks: Array.isArray(canvasBlocks) ? canvasBlocks : (activePage?.blocks || []),
  }
}

export function getTileOutput({
  publication,
  rows = 3,
  columns = 3,
  gap = 8,
  fit = 'cover',
  caption = '',
  imageUrl = '',
  missingSourceMessage = '',
} = {}) {
  const count = Math.max(1, Number(rows || 1) * Number(columns || 1))
  return {
    type: printlabOutputTypes.tile,
    label: `${rows}x${columns} tile sheet`,
    pages: getReaderOrderPages(publication),
    rows,
    columns,
    gap,
    fit,
    caption,
    imageUrl,
    missingSourceMessage,
    tiles: Array.from({ length: count }).map((_, index) => ({
      id: `tile-${index}`,
      index,
      imageUrl,
      fit,
      caption,
    })),
  }
}

export function getPosterOutput({
  publication,
  wide = 2,
  tall = 2,
  fit = 'cover',
  showNumbers = true,
  imageUrl = '',
  missingSourceMessage = '',
} = {}) {
  const panelCount = Math.max(1, Number(wide || 1) * Number(tall || 1))
  const backgroundSize = fit === 'contain'
    ? `${Number(wide || 1) * 100}% auto`
    : `${Number(wide || 1) * 100}% ${Number(tall || 1) * 100}%`
  return {
    type: printlabOutputTypes.split,
    label: `${wide}x${tall} poster split`,
    pages: getReaderOrderPages(publication),
    wide,
    tall,
    fit,
    showNumbers,
    imageUrl,
    missingSourceMessage,
    backgroundSize,
    panels: Array.from({ length: panelCount }).map((_, index) => {
      const column = index % wide
      const row = Math.floor(index / wide)
      const x = wide === 1 ? 50 : (column / (wide - 1)) * 100
      const y = tall === 1 ? 50 : (row / (tall - 1)) * 100
      return {
        id: `split-${index}`,
        index,
        column,
        row,
        number: index + 1,
        objectPosition: `${x}% ${y}%`,
      }
    }),
  }
}

export function getPageLayoutOutput({
  publication,
  activePageId,
  usePublicationContent = true,
  orientation = 'portrait',
  imagePosition = 'top',
  title = '',
  body = '',
  footer = '',
  imageUrl = '',
  sourceTitle = '',
  sourceBody = '',
  sourceFooter = '',
  starterBody = '',
  truncateText = (value) => value,
} = {}) {
  const pages = getReaderOrderPages(publication)
  const activePage = pages.find((page) => page.id === activePageId) || pages[0] || null
  const titleBlock = usePublicationContent ? getFirstTextBlock(activePage, 0) : null
  const bodyBlock = usePublicationContent ? getFirstTextBlock(activePage, 1) : null
  const imageBlock = usePublicationContent ? getFirstImageBlock(activePage) : null
  const resolvedTitle = cleanText(title) || cleanText(titleBlock?.text) || cleanText(sourceTitle) || 'Flyer / Article Title'
  const resolvedBody = cleanText(body) || cleanText(bodyBlock?.text) || cleanText(truncateText(sourceBody || '', 520)) || starterBody
  const resolvedFooter = cleanText(footer) || cleanText(sourceFooter) || 'Footer / source line'
  const resolvedImageUrl = imageUrl || imageBlock?.src || ''
  const hasContent = Boolean(resolvedImageUrl || cleanText(title) || cleanText(body) || cleanText(footer) || titleBlock || bodyBlock || imageBlock)
  return {
    type: printlabOutputTypes.page,
    label: `${orientation} page layout`,
    pages,
    activePage,
    orientation,
    imagePosition,
    hasContent,
    imageUrl: resolvedImageUrl,
    titleText: resolvedTitle,
    bodyContent: resolvedBody,
    footerText: resolvedFooter,
  }
}

export function getHalfFoldOutput({
  publication,
  usePublicationContent = true,
  title = '',
  body = '',
  footer = '',
  imageUrl = '',
  includeImage = true,
  hasContent = false,
  truncateText = (value) => value,
} = {}) {
  const pages = getReaderOrderPages(publication)
  const spreads = []
  for (let index = 0; index < pages.length; index += 2) {
    spreads.push({
      id: `half-fold-${index / 2 + 1}`,
      label: `Spread ${index / 2 + 1}`,
      left: pages[index] || null,
      right: pages[index + 1] || null,
      leftLabel: pages[index] ? `Page ${pages[index].pageNumber}` : 'Blank',
      rightLabel: pages[index + 1] ? `Page ${pages[index + 1].pageNumber}` : 'Blank',
    })
  }
  const firstPage = pages[0] || null
  const secondPage = pages[1] || null
  const publicationCoverTitle = usePublicationContent ? cleanText(getFirstTextBlock(firstPage, 0)?.text) : ''
  const publicationInsideText = usePublicationContent
    ? (cleanText(getFirstTextBlock(secondPage, 0)?.text) || cleanText(getFirstTextBlock(firstPage, 1)?.text))
    : ''
  const explicitCoverTitle = cleanText(title) || publicationCoverTitle || cleanText(truncateText(body, 90))
  const coverTitle = explicitCoverTitle || cleanText(firstPage?.title)
  const insideText = cleanText(body) || publicationInsideText
  const imageBlock = usePublicationContent ? (getFirstImageBlock(secondPage) || getFirstImageBlock(firstPage)) : null
  const resolvedImageUrl = includeImage ? (imageUrl || imageBlock?.src || '') : ''
  return {
    type: printlabOutputTypes.zine,
    label: `${Math.max(1, spreads.length)} half-fold spread${spreads.length === 1 ? '' : 's'}`,
    pages,
    spreads,
    zineHasContent: hasContent || Boolean(explicitCoverTitle || insideText || resolvedImageUrl || cleanText(footer)),
    coverTitle,
    footer,
    hasImage: Boolean(resolvedImageUrl),
    imageUrl: resolvedImageUrl,
    body: insideText,
  }
}

export function getHalfFoldSpreads(publication) {
  return getHalfFoldOutput({ publication }).spreads
}

export function getOutputLabel(mode, publication) {
  const pageCount = getReaderOrderPages(publication).length
  if (mode === 'zine' || mode === 'half-fold') {
    return `${Math.max(1, Math.ceil(pageCount / 2))} half-fold spread${pageCount <= 2 ? '' : 's'}`
  }
  if (mode === 'canvas') return `Reader order / ${pageCount} page${pageCount === 1 ? '' : 's'}`
  return `Reader order / ${pageCount} page${pageCount === 1 ? '' : 's'}`
}
