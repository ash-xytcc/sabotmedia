import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { resolveNativeBodyHtml } from '../lib/nativePublicFeed'
import { renderImportedBody } from '../lib/renderImportedBody'
import { AdminFrame } from './AdminRail'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'

function getPublishedAtLabel(piece) {
  if (!piece?.publishedAt) return '—'
  const published = new Date(piece.publishedAt)
  if (Number.isNaN(published.getTime())) return '—'
  return published.toLocaleDateString()
}

function isPublishedPiece(piece) {
  if (piece?.status) return piece.status === 'published'
  return Boolean(piece?.publishedAt)
}

export function PrintLabPage({ pieces = [] }) {
  const [selectedSlugs, setSelectedSlugs] = useState([])
  const publishedPieces = useMemo(
    () => [...pieces].filter(isPublishedPiece).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    [pieces]
  )

  return (
    <AdminFrame>
      <main className="page wp-admin-screen print-lab-page">
        <div className="wp-screen-header print-lab-screen-header">
          <h1>Print Lab</h1>
          <Link className="button" to="/content">Back to Posts</Link>
        </div>

        <section className="wp-meta-box">
          <h2>Published posts</h2>
          <p className="description">
            Select published posts to stage source material for upcoming print workflows.
          </p>

          <p className="print-lab-selection-count" aria-live="polite">
            {selectedSlugs.length} selected
          </p>

          <div className="print-lab-post-list" role="list">
            {publishedPieces.map((piece) => (
              <label className="print-lab-post-card" key={piece.slug}>
                <input
                  type="checkbox"
                  checked={selectedSlugs.includes(piece.slug)}
                  onChange={(event) => {
                    setSelectedSlugs((current) => (
                      event.target.checked
                        ? [...new Set([...current, piece.slug])]
                        : current.filter((slug) => slug !== piece.slug)
                    ))
                  }}
                />
                {piece.featuredImage ? (
                  <img className="print-lab-post-card__thumb" src={piece.featuredImage} alt="" loading="lazy" />
                ) : (
                  <div className="print-lab-post-card__thumb print-lab-post-card__thumb--empty" aria-hidden="true">No image</div>
                )}
                <div className="print-lab-post-card__content">
                  <h3>{piece.title || 'Untitled'}</h3>
                  <p><strong>Status:</strong> Published</p>
                  <p><strong>Published:</strong> {getPublishedAtLabel(piece)}</p>
                  <p><strong>Type:</strong> {piece.type || piece.sourcePostType || 'post'}</p>
                </div>
              </label>
            ))}
            {!publishedPieces.length ? <p className="description">No published posts available.</p> : null}
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}
