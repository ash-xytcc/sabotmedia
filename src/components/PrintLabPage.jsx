import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'

const PRINT_LAB_TOOLS = [
  {
    name: 'Export piece as print PDF',
    status: 'Scaffolded',
    notes: 'Uses each piece’s Print mode and browser print dialog. Dedicated export pipeline is not wired yet.',
    actionLabel: 'Open archive in print mode',
    to: '/archive',
  },
  {
    name: 'Zine / imposition scaffold',
    status: 'Scaffolded',
    notes: 'Planning surface for booklet signatures, folios, and pagination rules. No layout engine wired yet.',
    actionLabel: 'View scaffold notes',
    to: '/tools/print#zine-imposition',
  },
  {
    name: 'Button maker scaffold',
    status: 'Scaffolded',
    notes: 'Reserved for circular artboard prep and print-safe bleed presets. Export templates are not wired yet.',
    actionLabel: 'View scaffold notes',
    to: '/tools/print#button-maker',
  },
  {
    name: 'Poster tiler / rasterbator scaffold',
    status: 'Scaffolded',
    notes: 'Reserved for multi-page poster splitting and optional halftone raster modes. Rendering is not wired yet.',
    actionLabel: 'View scaffold notes',
    to: '/tools/print#poster-tiler',
  },
]

function stripHtml(value = '') {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractFirstParagraph(piece) {
  const body = piece?.bodyHtml || ''
  const text = body
    .replace(/<\/h\d>/gi, '\n\n')
    .replace(/<\/blockquote>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => stripHtml(paragraph))
    .filter(Boolean)

  return paragraphs[0] || stripHtml(piece?.excerpt || '') || stripHtml(piece?.title || '')
}

export function PrintLabPage({ pieces = [] }) {
  const [layoutMode, setLayoutMode] = useState('poster')
  const [sourceTextMode, setSourceTextMode] = useState('title')
  const [selectedSlug, setSelectedSlug] = useState('')
  const [useFeaturedImage, setUseFeaturedImage] = useState(true)
  const [nativePieces, setNativePieces] = useState([])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const loaded = await loadPublishedNativePieces()
      if (!cancelled) setNativePieces(loaded)
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const wordpressFeed = useWordPressPieces(pieces)
  const livePieces = wordpressFeed.pieces || pieces
  const mergedPieces = useMemo(
    () => mergeNativeAndImportedPieces(Array.isArray(livePieces) ? livePieces : [], nativePieces),
    [livePieces, nativePieces]
  )

  const posterPieces = useMemo(() => {
    return [...mergedPieces]
      .filter((piece) => piece?.slug && (piece?.title || piece?.excerpt || piece?.bodyHtml))
      .sort((a, b) => new Date(b?.publishedAt || 0).getTime() - new Date(a?.publishedAt || 0).getTime())
  }, [mergedPieces])

  useEffect(() => {
    if (!posterPieces.length) {
      if (selectedSlug) setSelectedSlug('')
      return
    }
    if (!selectedSlug || !posterPieces.some((piece) => piece.slug === selectedSlug)) {
      setSelectedSlug(posterPieces[0].slug)
    }
  }, [posterPieces, selectedSlug])

  const selectedPiece = posterPieces.find((piece) => piece.slug === selectedSlug) || null
  const sourceText = useMemo(() => {
    if (!selectedPiece) return ''
    if (sourceTextMode === 'excerpt') return stripHtml(selectedPiece.excerpt || '')
    if (sourceTextMode === 'firstParagraph') return extractFirstParagraph(selectedPiece)
    return stripHtml(selectedPiece.title || '')
  }, [selectedPiece, sourceTextMode])

  const posterBackgroundImage = useMemo(() => {
    if (!selectedPiece || !useFeaturedImage) return ''
    return getImportedImage(selectedPiece) || ''
  }, [selectedPiece, useFeaturedImage])

  return (
    <AdminFrame>
      <main className="page wp-admin-screen print-lab-page">
        <div className="wp-screen-header">
          <h1>Print Lab</h1>
          <Link className="button button--primary" to="/tools">Back to Tools</Link>
        </div>

        <section className="wp-meta-box">
          <h2>Layout mode</h2>
          <div className="print-lab-controls__row">
            <label className="print-lab-controls__field" htmlFor="print-layout-mode">
              <span>Mode</span>
              <select id="print-layout-mode" value={layoutMode} onChange={(event) => setLayoutMode(event.target.value)}>
                <option value="poster">Poster</option>
                <option value="scaffold">Scaffold cards</option>
              </select>
            </label>
          </div>
        </section>

        {layoutMode === 'poster' ? (
          <section className="wp-meta-box print-lab-poster" id="poster-layout-mode">
            <div className="print-lab-poster__header">
              <h2>Agitprop poster preview</h2>
              <button type="button" className="button button--primary" onClick={() => window.print()}>Print poster</button>
            </div>
            <p className="description">Generates poster copy from real post content and sends the layout to your browser print dialog.</p>

            <div className="print-lab-controls">
              <label className="print-lab-controls__field" htmlFor="poster-piece-select">
                <span>Post</span>
                <select
                  id="poster-piece-select"
                  value={selectedSlug}
                  onChange={(event) => setSelectedSlug(event.target.value)}
                  disabled={!posterPieces.length}
                >
                  {posterPieces.length ? (
                    posterPieces.map((piece) => (
                      <option key={piece.slug} value={piece.slug}>{piece.title || piece.slug}</option>
                    ))
                  ) : (
                    <option value="">No posts available</option>
                  )}
                </select>
              </label>

              <label className="print-lab-controls__field" htmlFor="poster-source-text-select">
                <span>Source text</span>
                <select id="poster-source-text-select" value={sourceTextMode} onChange={(event) => setSourceTextMode(event.target.value)}>
                  <option value="title">Title</option>
                  <option value="excerpt">Excerpt</option>
                  <option value="firstParagraph">First paragraph</option>
                </select>
              </label>

              <label className="print-lab-controls__checkbox" htmlFor="poster-featured-image-toggle">
                <input
                  id="poster-featured-image-toggle"
                  type="checkbox"
                  checked={useFeaturedImage}
                  onChange={(event) => setUseFeaturedImage(event.target.checked)}
                />
                <span>Use featured image as background</span>
              </label>
            </div>

            <article
              className="poster-preview"
              data-has-image={posterBackgroundImage ? 'true' : 'false'}
              style={posterBackgroundImage ? { '--poster-image': `url(${posterBackgroundImage})` } : undefined}
            >
              <div className="poster-preview__overlay" />
              <div className="poster-preview__content">
                <p className="poster-preview__kicker">Sabot Media</p>
                <h3>{sourceText || 'Select a post to begin.'}</h3>
                {selectedPiece?.author || selectedPiece?.publishedDateLabel ? (
                  <p className="poster-preview__meta">
                    {selectedPiece?.author || 'Sabot Media'}
                    {selectedPiece?.publishedDateLabel ? ` • ${selectedPiece.publishedDateLabel}` : ''}
                  </p>
                ) : null}
              </div>
            </article>
          </section>
        ) : (
          <>
            <section className="wp-meta-box">
              <h2>Publication print scaffolds</h2>
              <p className="description">
                Print Lab tracks publication-focused tooling. Items marked scaffolded are intentionally not wired to completed exports.
              </p>

              <div className="print-lab-grid">
                {PRINT_LAB_TOOLS.map((tool) => (
                  <article className="print-lab-card" key={tool.name}>
                    <h3>{tool.name}</h3>
                    <p><strong>Status:</strong> {tool.status}</p>
                    <p>{tool.notes}</p>
                    <Link className="button" to={tool.to}>{tool.actionLabel}</Link>
                  </article>
                ))}
              </div>
            </section>

            <section className="wp-meta-box" id="zine-imposition">
              <h2>Zine / imposition scaffold</h2>
              <p className="description">Target: signature planning (4/8/16 page), duplex folding map, and page-order proofing.</p>
            </section>

            <section className="wp-meta-box" id="button-maker">
              <h2>Button maker scaffold</h2>
              <p className="description">Target: circular templates, text-safe ring guides, and pin-back bleed helpers.</p>
            </section>

            <section className="wp-meta-box" id="poster-tiler">
              <h2>Poster tiler / rasterbator scaffold</h2>
              <p className="description">Target: poster splitting across paper sizes, registration marks, and optional raster effects.</p>
            </section>
          </>
        )}
      </main>
    </AdminFrame>
  )
}
