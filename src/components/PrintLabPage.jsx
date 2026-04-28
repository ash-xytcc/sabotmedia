import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPieces } from '../lib/pieces'
import { getPieceDisplaySettings } from '../lib/publicDisplayModes'
import { AdminFrame } from './AdminRail'

function byNewestDate(a, b) {
  const aTime = Date.parse(a?.publishedDate || a?.date || '')
  const bTime = Date.parse(b?.publishedDate || b?.date || '')
  return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
}

export function PrintLabPage() {
  const pieces = useMemo(() => getPieces(), [])
  const printablePieces = useMemo(
    () => pieces
      .filter((piece) => getPieceDisplaySettings(piece).enablePrintMode)
      .sort(byNewestDate),
    [pieces]
  )

  const [selectedSlug, setSelectedSlug] = useState(() => printablePieces[0]?.slug || '')
  const [zineSheet, setZineSheet] = useState(false)
  const [posterMode, setPosterMode] = useState(false)

  const selectedPiece = useMemo(
    () => printablePieces.find((piece) => piece.slug === selectedSlug) || printablePieces[0] || null,
    [printablePieces, selectedSlug]
  )

  const printPath = selectedPiece ? `/piece/${selectedPiece.slug}/print` : '/archive?filter=print'
  const postPath = selectedPiece ? `/post/${selectedPiece.slug}` : '/archive'

  return (
    <AdminFrame>
      <main className="page wp-admin-screen print-lab-page">
        <div className="wp-screen-header">
          <h1>Print Lab</h1>
          <Link className="button" to="/tools">Back to Tools</Link>
        </div>

        <section className="wp-meta-box">
          <h2>Print workflow</h2>
          <p className="description">Choose a post, toggle layout helpers, and open the browser print dialog.</p>

          <div className="archive-controls" style={{ marginTop: 12 }}>
            <label className="archive-control" htmlFor="printlab-piece-select">
              <span>Post selection</span>
              <select
                id="printlab-piece-select"
                value={selectedPiece?.slug || ''}
                onChange={(event) => setSelectedSlug(event.target.value)}
                disabled={!printablePieces.length}
              >
                {printablePieces.length ? printablePieces.map((piece) => (
                  <option key={piece.slug} value={piece.slug}>{piece.title || piece.slug}</option>
                )) : <option value="">No print-enabled posts available</option>}
              </select>
            </label>

            <label className="archive-control" htmlFor="toggle-zine-sheet">
              <span>Zine sheet</span>
              <input
                id="toggle-zine-sheet"
                type="checkbox"
                checked={zineSheet}
                onChange={(event) => setZineSheet(event.target.checked)}
              />
            </label>

            <label className="archive-control" htmlFor="toggle-poster-mode">
              <span>Poster mode</span>
              <input
                id="toggle-poster-mode"
                type="checkbox"
                checked={posterMode}
                onChange={(event) => setPosterMode(event.target.checked)}
              />
            </label>
          </div>

          <div className="wp-row-actions" style={{ marginTop: 16 }}>
            <Link className="button" to={postPath}>Open article</Link>
            <Link className="button" to={printPath}>Open print layout</Link>
            <button type="button" className="button button--primary" onClick={() => window.print()}>
              Browser print
            </button>
          </div>
        </section>

        <section className="wp-meta-box" aria-live="polite">
          <h2>Layout preview controls</h2>
          <p className="description">
            Active toggles: {zineSheet ? 'Zine sheet on' : 'Zine sheet off'} · {posterMode ? 'Poster mode on' : 'Poster mode off'}
          </p>
          {selectedPiece ? (
            <ul>
              <li><strong>Selected post:</strong> {selectedPiece.title || selectedPiece.slug}</li>
              <li><strong>Print route:</strong> {printPath}</li>
              <li><strong>Article route:</strong> {postPath}</li>
            </ul>
          ) : (
            <p className="description">No print-enabled posts were found. Use <Link to="/archive?filter=print">Archive print filter</Link>.</p>
          )}
        </section>
      </main>
    </AdminFrame>
  )
}
