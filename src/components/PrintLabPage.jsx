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

function getExcerpt(piece) {
  return piece?.excerpt || piece?.summary || piece?.description || ''
}

const layoutOptions = [
  { id: 'article', label: 'Article', shortLabel: 'A' },
  { id: 'poster', label: 'Poster', shortLabel: 'P' },
  { id: 'zine', label: 'Zine Sheet', shortLabel: 'Z' },
]

export function PrintLabPage({ pieces = [] }) {
  const [nativePieces, setNativePieces] = useState([])
  const [nativeState, setNativeState] = useState('loading')
  const [selectedId, setSelectedId] = useState('')
  const [layout, setLayout] = useState('article')
  const [showImage, setShowImage] = useState(true)
  const [showMetadata, setShowMetadata] = useState(true)
  const [showExcerpt, setShowExcerpt] = useState(true)
  const [showColophon, setShowColophon] = useState(true)
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
  const selectedExcerpt = getExcerpt(selectedPiece)
  const selectedContentType = getContentType(selectedPiece)
  const selectedPublishedAt = getPublishedAtLabel(selectedPiece)
  const isLoading = nativeState === 'loading' && wordpressFeed.state === 'loading' && !publishedPieces.length
  const selectedTitle = selectedPiece?.title || 'Untitled'

  return (
    <AdminFrame>
      <main className="page wp-admin-screen print-lab-page">
        <div className="wp-screen-header print-lab-screen-header">
          <h1>Printlab</h1>
          <Link className="button" to="/content">Back to Posts</Link>
        </div>

        <section className="print-lab-status" aria-live="polite">
          {isLoading ? <p className="description">Loading published posts...</p> : null}

          {!isLoading && !publishedPieces.length ? (
            <p className="description">No published posts are available in the merged feed yet.</p>
          ) : null}
        </section>

        {publishedPieces.length ? (
          <section className="print-lab-desk" aria-label="Printlab production desk">
            <aside className="print-lab-source-pane" aria-label="Published source posts">
              <div className="print-lab-pane-header">
                <h2>Sources</h2>
                <span>{publishedPieces.length}</span>
              </div>

              <div className="print-lab-post-list" role="listbox" aria-label="Published posts">
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
                          {getPublishedAt(piece) ? <span>{getPublishedAtLabel(piece)}</span> : null}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </aside>

            <div className="print-lab-preview-wrap" aria-live="polite">
              <article className={`print-lab-preview print-lab-preview--${layout}`}>
                {selectedPiece ? (
                  <>
                    <header className="print-lab-preview__header">
                      {showMetadata ? (
                        <p className="print-lab-preview__eyebrow">
                          {selectedContentType} / {selectedPublishedAt}
                        </p>
                      ) : null}
                      <h2>{selectedTitle}</h2>
                      {showExcerpt && selectedExcerpt ? (
                        <p className="print-lab-preview__excerpt">{selectedExcerpt}</p>
                      ) : null}
                    </header>

                    {showImage && selectedImage ? (
                      <figure className="print-lab-preview__hero">
                        <img src={selectedImage} alt="" />
                      </figure>
                    ) : null}

                    <div className="print-lab-preview__body post-body__content">
                      {previewHtml ? renderImportedBody(previewHtml, 'print') : <p>No body content is available for this post.</p>}
                    </div>

                    {showColophon ? (
                      <footer className="print-lab-preview__colophon">
                        <strong>SABOT MEDIA</strong>
                        <span>Printlab proof / {selectedContentType} / {selectedPublishedAt}</span>
                      </footer>
                    ) : null}
                  </>
                ) : (
                  <p className="description">Select a published post to preview its source material.</p>
                )}
              </article>
            </div>

            <aside className="print-lab-tool-panel" aria-label="Print controls">
              <div className="print-lab-pane-header">
                <h2>Controls</h2>
              </div>

              <fieldset className="print-lab-control-group">
                <legend>Layout</legend>
                <div className="print-lab-layout-selector">
                  {layoutOptions.map((option) => (
                    <button
                      className={layout === option.id ? 'is-active' : ''}
                      key={option.id}
                      type="button"
                      aria-pressed={layout === option.id}
                      onClick={() => setLayout(option.id)}
                    >
                      <span>{option.shortLabel}</span>
                      <strong>{option.label}</strong>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="print-lab-control-group">
                <legend>Include</legend>
                <label className="print-lab-toggle">
                  <input type="checkbox" checked={showImage} onChange={(event) => setShowImage(event.target.checked)} />
                  <span>Show image</span>
                </label>
                <label className="print-lab-toggle">
                  <input type="checkbox" checked={showMetadata} onChange={(event) => setShowMetadata(event.target.checked)} />
                  <span>Show metadata</span>
                </label>
                <label className="print-lab-toggle">
                  <input type="checkbox" checked={showExcerpt} onChange={(event) => setShowExcerpt(event.target.checked)} />
                  <span>Show excerpt</span>
                </label>
                <label className="print-lab-toggle">
                  <input type="checkbox" checked={showColophon} onChange={(event) => setShowColophon(event.target.checked)} />
                  <span>Show colophon</span>
                </label>
              </fieldset>

              <button className="button button--primary print-lab-print-button" type="button" onClick={() => window.print()}>
                Print
              </button>
            </aside>
          </section>
        ) : null}
      </main>
    </AdminFrame>
  )
}
