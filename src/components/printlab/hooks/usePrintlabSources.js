import { useEffect, useMemo, useState } from 'react'
import { getImportedImage } from '../../../lib/getImportedImage'
import { loadLocalMediaItems } from '../../../lib/localMediaLibrary'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../../../lib/nativePublicFeed'
import { useWordPressPieces } from '../../../lib/useWordPressPieces'

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
  return (
    piece?.bodyHtml ||
    piece?.contentHtml ||
    piece?.content ||
    piece?.body ||
    piece?.bodyText ||
    piece?.body_plain ||
    piece?.plainText ||
    piece?.text ||
    ''
  )
}

function getExcerpt(piece) {
  return piece?.excerpt || piece?.summary || piece?.description || piece?.subtitle || ''
}

function getPlainTextFromHtml(html = '') {
  const value = String(html || '').trim()
  if (!value) return ''
  const withBlockBreaks = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|figure)>/gi, '\n\n')

  if (typeof DOMParser === 'undefined') {
    return withBlockBreaks
      .replace(/<[^>]*>/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(withBlockBreaks, 'text/html')
  doc.querySelectorAll('script, style, noscript').forEach((node) => node.remove())
  return (doc.body.textContent || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function dedupeImageItems(items) {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.url) return false
    const key = item.url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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

export function usePrintlabSources(pieces = []) {
  const [nativePieces, setNativePieces] = useState([])
  const [nativeState, setNativeState] = useState('loading')
  const [localMedia, setLocalMedia] = useState([])
  const [sourceType, setSourceType] = useState('upload')
  const [selectedId, setSelectedId] = useState('')
  const [selectedMediaId, setSelectedMediaId] = useState('')
  const [uploadImage, setUploadImage] = useState(null)
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

  return {
    publishedPieces,
    mediaItems,
    selectedPiece,
    selectedMedia,
    selectedPostImage,
    selectedPostHtml,
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
  }
}
