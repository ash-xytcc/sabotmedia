import { getImportedImage } from './getImportedImage'
import { loadNativeCollection } from './nativePublicContent'

export function isPublishedNativeEntry(item) {
  if (!item) return false
  const status = String(item.status || '')
  if (!['published', 'scheduled'].includes(status)) return false
  if (item.scheduledFor) {
    const ms = new Date(item.scheduledFor).getTime()
    if (Number.isFinite(ms) && ms > Date.now()) return false
  }
  return true
}

export function normalizeNativePublicPiece(item) {
  const publishedAt = item.publishedAt || item.updatedAt || new Date().toISOString()
  const type =
    item.contentType === 'podcast'
      ? 'podcast'
      : item.contentType === 'print'
        ? 'print'
        : item.contentType === 'publicBlock'
          ? 'publicBlock'
          : 'article'

  const image =
    item.featuredImage ||
    item.heroImage ||
    item.imageUrl ||
    item.image ||
    getImportedImage(item) ||
    ''

  return {
    ...item,
    id: item.id || item.slug,
    slug: item.slug || item.id,
    title: item.title || item.slug || 'Untitled',
    excerpt: item.excerpt || item.body || '',
    subtitle: '',
    author: item.author || 'Sabot Media',
    publishedAt,
    publishedDateLabel: formatDateLabel(publishedAt),
    type,
    contentType: type,
    target: item.target || 'general',
    primaryProject: item.target || 'General',
    primaryProjectSlug: item.target || 'general',
    tags: Array.isArray(item.tags) ? item.tags : [],
    bodyHtml: richBodyToHtml(item),
    richBody: Array.isArray(item.richBody) ? item.richBody : [],
    sourceKind: 'native',
    sourcePostType: 'native',
    sourcePostId: item.id,
    featuredImage: image,
    heroImage: image,
    imageUrl: image,
    href: `/post/${item.slug || item.id}`,
    relatedAssets: [],
    relatedPrintLinks: [],
    hasPrintAssets: Boolean(item.hasPrintAssets || type === 'print'),
    hidden: false,
    reviewFlags: [],
  }
}

export async function loadPublishedNativePieces() {
  const items = await loadNativeCollection({ includeFuture: 1 })
  return items
    .filter(isPublishedNativeEntry)
    .map(normalizeNativePublicPiece)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
}

export function mergeNativeAndImportedPieces(importedPieces = [], nativePieces = []) {
  const byKey = new Map()

  for (const item of importedPieces || []) {
    byKey.set(`imported:${item.slug || item.id}`, item)
  }

  for (const item of nativePieces || []) {
    byKey.set(`native:${item.slug || item.id}`, item)
  }

  return [...byKey.values()]
    .filter((item) => item?.hidden !== true)
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0))
}

function richBodyToHtml(item) {
  const blocks = Array.isArray(item.richBody) ? item.richBody : []
  if (!blocks.length) {
    const body = String(item.body || '').trim()
    return body ? `<p>${escapeHtml(body)}</p>` : ''
  }

  return blocks.map((block) => {
    const text = escapeHtml(block.text || '')
    if (block.type === 'heading') return `<h2>${text}</h2>`
    if (block.type === 'quote') return `<blockquote>${text}</blockquote>`
    if (block.type === 'image') {
      const url = escapeAttr(block.url || '')
      const alt = escapeAttr(block.alt || '')
      const caption = escapeHtml(block.caption || '')
      return `<figure>${url ? `<img src="${url}" alt="${alt}" />` : ''}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
    }
    if (block.type === 'embed') {
      const url = escapeAttr(block.url || '')
      const caption = escapeHtml(block.caption || block.url || '')
      return url ? `<p><a href="${url}">${caption}</a></p>` : ''
    }
    return `<p>${text}</p>`
  }).join('\n')
}

function formatDateLabel(value) {
  const d = new Date(value || '')
  if (!Number.isFinite(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}
