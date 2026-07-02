const STORAGE_KEY = 'sabot.publications.v2'

export const PAGE_SIZES = {
  portrait: { width: 816, height: 1056, label: 'Portrait' },
  landscape: { width: 1056, height: 816, label: 'Landscape' },
}

export const PAGE_KINDS = [
  { value: 'cover', label: 'Cover page' },
  { value: 'inside', label: 'Inside page' },
  { value: 'spread', label: 'Center spread' },
  { value: 'back-cover', label: 'Back cover' },
]

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function slugify(value = '') {
  return String(value || 'publication')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'publication'
}

export function createTextBlock(overrides = {}) {
  return {
    id: makeId('block'),
    type: 'text',
    x: 80,
    y: 90,
    width: 420,
    height: 120,
    text: 'New text block',
    fontSize: 28,
    ...overrides,
  }
}

export function createPage(kind = 'inside', order = 0, overrides = {}) {
  const titleByKind = {
    cover: 'Cover',
    inside: `Page ${order + 1}`,
    spread: 'Center Spread',
    'back-cover': 'Back Cover',
  }

  return {
    id: makeId('page'),
    issueId: '',
    sectionId: '',
    title: titleByKind[kind] || `Page ${order + 1}`,
    kind,
    orientation: kind === 'spread' ? 'landscape' : 'portrait',
    order,
    blocks: [createTextBlock({ text: titleByKind[kind] || 'New page' })],
    previewImage: '',
    thumbnail: '',
    updatedAt: nowIso(),
    ...overrides,
  }
}

export function createPublication(overrides = {}) {
  const createdAt = nowIso()
  const title = overrides.title || 'Untitled Zine'
  const issueId = makeId('issue')
  const sectionId = makeId('section')
  const pages = [
    createPage('cover', 0, { issueId, sectionId }),
    createPage('inside', 1, { issueId, sectionId }),
    createPage('spread', 2, { issueId, sectionId }),
    createPage('back-cover', 3, { issueId, sectionId }),
  ]

  return {
    id: makeId('pub'),
    type: 'publication',
    title,
    slug: slugify(title),
    status: 'draft',
    createdAt,
    updatedAt: createdAt,
    canvaLink: '',
    previewImages: [],
    thumbnails: [],
    issues: [{ id: issueId, title: 'Issue 1', order: 0 }],
    sections: [{ id: sectionId, issueId, title: 'Main', order: 0 }],
    pages,
    printEditions: [
      {
        id: makeId('print'),
        title: 'Print Edition',
        status: 'draft',
        readerOrder: pages.map((page) => page.id),
        printerOrder: buildPrinterOrder(pages),
        imposedBooklet: [],
        singlePages: [],
        printPdf: '',
        imposedPdf: '',
        updatedAt: createdAt,
      },
    ],
    digitalEditions: [
      {
        id: makeId('digital'),
        title: 'Digital Edition',
        status: 'draft',
        readerPdf: '',
        readerAssets: [],
        updatedAt: createdAt,
      },
    ],
    assets: {
      readerPdf: '',
      printPdf: '',
      imposedPdf: '',
      canvaLink: '',
      previewImages: [],
      thumbnails: [],
    },
    ...overrides,
  }
}

export function buildPrinterOrder(pages = []) {
  const ordered = [...pages].sort((a, b) => a.order - b.order)
  const ids = ordered.map((page) => page.id)
  const sheets = []
  for (let left = 0, right = ids.length - 1; left <= right; left += 1, right -= 1) {
    if (left === right) sheets.push([ids[left]])
    else sheets.push([ids[right], ids[left]])
  }
  return sheets.flat()
}

export function normalizePublication(publication) {
  const base = createPublication({ title: publication?.title || 'Untitled Zine' })
  const merged = { ...base, ...(publication || {}) }
  const pages = Array.isArray(merged.pages) ? merged.pages : []
  merged.pages = pages
    .map((page, index) => ({
      ...createPage(page?.kind || 'inside', index),
      ...page,
      order: Number.isFinite(page?.order) ? page.order : index,
      blocks: Array.isArray(page?.blocks) ? page.blocks : [],
    }))
    .sort((a, b) => a.order - b.order)
    .map((page, order) => ({ ...page, order }))
  merged.printEditions = Array.isArray(merged.printEditions) ? merged.printEditions : []
  merged.digitalEditions = Array.isArray(merged.digitalEditions) ? merged.digitalEditions : []
  merged.assets = { ...base.assets, ...(merged.assets || {}) }
  return merged
}

export function loadPublications() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(normalizePublication) : []
  } catch {
    return []
  }
}

export function savePublications(publications = []) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(publications.map(normalizePublication)))
}

export function savePublication(publication) {
  const normalized = normalizePublication({ ...publication, updatedAt: nowIso() })
  const current = loadPublications()
  const next = current.some((item) => item.id === normalized.id)
    ? current.map((item) => (item.id === normalized.id ? normalized : item))
    : [normalized, ...current]
  savePublications(next)
  return normalized
}

export function findPublication(idOrSlug) {
  return loadPublications().find((item) => item.id === idOrSlug || item.slug === idOrSlug) || null
}

export function duplicatePage(page, order) {
  return {
    ...page,
    id: makeId('page'),
    title: `${page.title || 'Page'} Copy`,
    order,
    blocks: (page.blocks || []).map((block) => ({ ...block, id: makeId('block') })),
    updatedAt: nowIso(),
  }
}

export function updatePublicationPages(publication, pages) {
  const orderedPages = pages.map((page, order) => ({ ...page, order, updatedAt: nowIso() }))
  const printEditions = (publication.printEditions || []).map((edition) => ({
    ...edition,
    readerOrder: orderedPages.map((page) => page.id),
    printerOrder: buildPrinterOrder(orderedPages),
    updatedAt: nowIso(),
  }))

  return {
    ...publication,
    pages: orderedPages,
    printEditions,
    updatedAt: nowIso(),
  }
}
