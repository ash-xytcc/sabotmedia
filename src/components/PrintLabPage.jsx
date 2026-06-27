import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { renderImportedBody } from '../lib/renderImportedBody'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { AdminFrame } from './AdminRail'

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
  if (!value) return 'Unavailable'
  const published = new Date(value)
  if (Number.isNaN(published.getTime())) return 'Unavailable'
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

export function PrintLabPage({ pieces = [] }) {
  const [nativePieces, setNativePieces] = useState([])
  const [nativeState, setNativeState] = useState('loading')
  const [selectedId, setSelectedId] = useState('')
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
      } catch (err) {
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

  const selectedPiece = publishedPieces.find((piece) => getPieceId(piece) === selectedId) || null
  const selectedImage = getFeaturedImage(selectedPiece)
  const previewHtml = getPreviewHtml(selectedPiece)
  const isLoading = nativeState === 'loading' && wordpressFeed.state === 'loading' && !publishedPieces.length

  return (
    <AdminFrame>
      <main className="page wp-admin-screen print-lab-page">
        <div className="wp-screen-header print-lab-screen-header">
          <h1>Printlab</h1>
          <Link className="button" to="/content">Back to Posts</Link>
        </div>

        <section className="wp-meta-box print-lab-controls">
          <h2>Published source posts</h2>
          <p className="description">
            Choose a published post from the merged native and imported feed to preview its print source material.
          </p>

          {isLoading ? <p className="description">Loading published posts...</p> : null}

          {!isLoading && !publishedPieces.length ? (
            <p className="description">No published posts are available in the merged feed yet.</p>
          ) : null}

          {publishedPieces.length ? (
            <div className="print-lab-source-layout">
              <div className="print-lab-post-list" role="list" aria-label="Published posts">
                {publishedPieces.map((piece) => {
                  const id = getPieceId(piece)
                  const image = getFeaturedImage(piece)
                  const selected = id === selectedId

                  return (
                    <button
                      className={`print-lab-post-card${selected ? ' is-selected' : ''}`}
                      key={id}
                      type="button"
                      role="listitem"
                      aria-pressed={selected}
                      onClick={() => setSelectedId(id)}
                    >
                      {image ? (
                        <img className="print-lab-post-card__thumb" src={image} alt="" loading="lazy" />
                      ) : (
                        <span className="print-lab-post-card__thumb print-lab-post-card__thumb--empty" aria-hidden="true">No image</span>
                      )}
                      <span className="print-lab-post-card__content">
                        <strong>{piece.title || 'Untitled'}</strong>
                        <span>{getContentType(piece)}</span>
                        <span>{getPublishedAtLabel(piece)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="print-lab-preview-wrap" aria-live="polite">
                <h2>Preview</h2>
                {selectedPiece ? (
                  <article className="print-lab-preview print-lab-preview--single-page">
                    <header className="print-lab-preview__header">
                      <p className="print-lab-preview__eyebrow">
                        {getContentType(selectedPiece)} / {getPublishedAtLabel(selectedPiece)}
                      </p>
                      <h3>{selectedPiece.title || 'Untitled'}</h3>
                      {selectedPiece.excerpt ? <p className="print-lab-preview__excerpt">{selectedPiece.excerpt}</p> : null}
                    </header>

                    {selectedImage ? (
                      <figure className="print-lab-preview__hero">
                        <img src={selectedImage} alt="" />
                      </figure>
                    ) : null}

                    <div className="print-lab-preview__body post-body__content">
                      {previewHtml ? renderImportedBody(previewHtml, 'print') : <p>No body content is available for this post.</p>}
                    </div>
                  </article>
                ) : (
                  <p className="description">Select a published post to preview its source material.</p>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </AdminFrame>
  )
}
