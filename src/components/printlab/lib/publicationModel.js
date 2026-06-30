export function createPublicationPage(patch = {}) {
  const id = patch.id || `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const preset = patch.preset || patch.orientation || 'landscape'
  const width = Number(patch.width || patch.canvasSize?.width || 720)
  const height = Number(patch.height || patch.canvasSize?.height || 540)
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
