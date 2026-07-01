export function createPublicationPage(patch = {}) {
  const id = patch.id || `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const preset = patch.preset || patch.orientation || 'portrait'
  const width = Number(patch.width || patch.canvasSize?.width || 540)
  const height = Number(patch.height || patch.canvasSize?.height || 720)
  const background = patch.background || patch.backgroundColor || '#fffdf8'
  return {
    id,
    label: patch.label || patch.title || 'Page',
    title: patch.title || patch.label || 'Page',
    preset,
    width,
    height,
    canvasSize: patch.canvasSize || { width, height },
    orientation: patch.orientation || preset,
    background,
    backgroundColor: background,
    blocks: Array.isArray(patch.blocks) ? patch.blocks : [],
  }
}

function cleanPostText(text = '') {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function splitTextIntoPageChunks(text = '', maxChars = 900) {
  const paragraphs = cleanPostText(text).split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const chunks = []
  let current = ''

  paragraphs.forEach((paragraph) => {
    if (paragraph.length > maxChars) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      const sentences = paragraph.match(/[^.!?]+[.!?]+|\S.+$/g) || [paragraph]
      sentences.forEach((sentence) => {
        const next = current ? `${current} ${sentence.trim()}` : sentence.trim()
        if (next.length > maxChars && current) {
          chunks.push(current)
          current = sentence.trim()
        } else {
          current = next
        }
      })
      return
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph
    if (next.length > maxChars && current) {
      chunks.push(current)
      current = paragraph
    } else {
      current = next
    }
  })

  if (current) chunks.push(current)
  return chunks.length ? chunks : []
}

export function buildPublicationPagesFromPost({
  title = '',
  body = '',
  excerpt = '',
  imageUrl = '',
  footer = '',
  background = '#fffdf8',
} = {}) {
  const pageWidth = 540
  const pageHeight = 720
  const safeTitle = cleanPostText(title) || 'Untitled'
  const chunks = splitTextIntoPageChunks(body || excerpt, 820)
  const pages = [
    createPublicationPage({
      label: 'Cover',
      title: 'Cover',
      preset: 'portrait',
      width: pageWidth,
      height: pageHeight,
      background,
      backgroundColor: background,
      blocks: [
        {
          id: 'post-cover-title',
          type: 'text',
          title: 'Title',
          name: 'Title',
          text: safeTitle,
          x: 44,
          y: imageUrl ? 382 : 170,
          width: 452,
          height: 148,
          fontSize: 40,
          fontFamily: 'system',
          fontWeight: 800,
          lineHeight: 1.04,
          color: '#111111',
          align: 'left',
          opacity: 1,
        },
        ...(imageUrl ? [{
          id: 'post-cover-image',
          type: 'image',
          title: 'Featured image',
          name: 'Featured image',
          src: imageUrl,
          x: 44,
          y: 48,
          width: 452,
          height: 300,
          opacity: 1,
          fit: 'cover',
          mediaX: 44,
          mediaY: 48,
          mediaWidth: 452,
          mediaHeight: 300,
          cropLeft: 0,
          cropRight: 0,
          cropTop: 0,
          cropBottom: 0,
        }] : []),
      ],
    }),
  ]

  chunks.forEach((chunk, index) => {
    pages.push(createPublicationPage({
      label: `Article ${index + 1}`,
      title: `Article ${index + 1}`,
      preset: 'portrait',
      width: pageWidth,
      height: pageHeight,
      background,
      backgroundColor: background,
      blocks: [
        {
          id: `post-page-kicker-${index + 1}`,
          type: 'text',
          title: 'Section label',
          name: 'Section label',
          text: safeTitle,
          x: 44,
          y: 42,
          width: 452,
          height: 40,
          fontSize: 13,
          fontFamily: 'system',
          fontWeight: 800,
          lineHeight: 1.15,
          color: '#555555',
          align: 'left',
          opacity: 1,
        },
        {
          id: `post-page-body-${index + 1}`,
          type: 'text',
          title: 'Article text',
          name: 'Article text',
          text: chunk,
          x: 44,
          y: 98,
          width: 452,
          height: 540,
          fontSize: 16,
          fontFamily: 'serif',
          fontWeight: 500,
          lineHeight: 1.38,
          color: '#111111',
          align: 'left',
          opacity: 1,
        },
      ],
    }))
  })

  if (footer) {
    pages.push(createPublicationPage({
      label: 'Colophon',
      title: 'Colophon',
      preset: 'portrait',
      width: pageWidth,
      height: pageHeight,
      background,
      backgroundColor: background,
      blocks: [
        {
          id: 'post-colophon',
          type: 'text',
          title: 'Colophon',
          name: 'Colophon',
          text: footer,
          x: 54,
          y: 270,
          width: 432,
          height: 180,
          fontSize: 18,
          fontFamily: 'system',
          fontWeight: 700,
          lineHeight: 1.3,
          color: '#111111',
          align: 'center',
          opacity: 1,
        },
      ],
    }))
  }

  return pages
}

export function createEmptyPublication(patch = {}) {
  const firstPage = createPublicationPage({ id: 'page-1', label: 'Page 1', title: 'Page 1' })
  const pages = Array.isArray(patch.pages) && patch.pages.length ? patch.pages : [firstPage]
  return {
    id: patch.id || `publication-${Date.now()}`,
    title: patch.title || 'Untitled Publication',
    pages,
    activePageId: patch.activePageId || pages[0]?.id || firstPage.id,
    assets: Array.isArray(patch.assets) ? patch.assets : [],
    outputSettings: {
      mode: patch.outputSettings?.mode || 'reader',
      format: patch.outputSettings?.format || 'letter',
    },
  }
}

export function getActivePage(publication) {
  const pages = Array.isArray(publication?.pages) ? publication.pages : []
  return pages.find((page) => page.id === publication?.activePageId) || pages[0] || null
}

export function duplicatePublicationPage(publication, pageId = publication?.activePageId) {
  const pages = Array.isArray(publication?.pages) ? publication.pages : []
  const index = pages.findIndex((page) => page.id === pageId)
  if (index < 0) return publication
  const source = pages[index]
  const duplicate = createPublicationPage({
    ...source,
    id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: `${source.label || 'Page'} Copy`,
    title: `${source.title || source.label || 'Page'} Copy`,
    blocks: (source.blocks || []).map((block) => ({
      ...block,
      id: `${block.id || block.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    })),
  })
  const nextPages = pages.slice()
  nextPages.splice(index + 1, 0, duplicate)
  return { ...publication, pages: nextPages, activePageId: duplicate.id }
}

export function deletePublicationPage(publication, pageId = publication?.activePageId) {
  const pages = Array.isArray(publication?.pages) ? publication.pages : []
  if (pages.length <= 1) return publication
  const index = pages.findIndex((page) => page.id === pageId)
  const nextPages = pages.filter((page) => page.id !== pageId)
  const nextActive = nextPages[Math.max(0, Math.min(index, nextPages.length - 1))] || nextPages[0]
  return { ...publication, pages: nextPages, activePageId: nextActive?.id || '' }
}
