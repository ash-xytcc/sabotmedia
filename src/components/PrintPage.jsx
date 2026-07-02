import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { renderImportedBody } from '../lib/renderImportedBody'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { getPieceDisplaySettings, resolveFirstReadableMode } from '../lib/publicDisplayModes'
import { attachPostAssets } from '../assets/assetSystem'
import { normalizePost } from '../models/publication'
import { DEFAULT_PRINT_OPTIONS, PrintLayouts, printEngine } from '../print/printEngine'

function getPieceBySlug(pieces, slug) {
  return (Array.isArray(pieces) ? pieces : []).find((piece) => piece?.slug === slug) || null
}

export function PrintPage({ pieces = [] }) {
  const { slug = '' } = useParams()
  const [nativePieces, setNativePieces] = useState([])
  const [printOptions, setPrintOptions] = useState(DEFAULT_PRINT_OPTIONS)
  const printLayout = PrintLayouts.ARTICLE

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

  const piece = getPieceBySlug(mergedPieces, slug)

  if (!piece) {
    return <Navigate to="/archive" replace />
  }

  const displaySettings = getPieceDisplaySettings(piece)
  if (!displaySettings.enablePrintMode) {
    const nextMode = displaySettings.defaultMode === 'experience' && displaySettings.enableExperienceMode
      ? 'experience'
      : resolveFirstReadableMode(displaySettings)
    return <Navigate to={nextMode === 'experience' ? `/post/${piece.slug}?mode=experience` : `/post/${piece.slug}`} replace />
  }

  const post = attachPostAssets(normalizePost(piece))
  const printDocument = printEngine.render(post, { layout: printLayout, options: printOptions })
  const bodyNodes = renderImportedBody(printDocument.bodyHtml || '', 'print')

  const handleToggle = (key) => (event) => {
    const checked = Boolean(event?.target?.checked)
    setPrintOptions((current) => ({ ...current, [key]: checked }))
  }

  return (
    <main className="page print-page">
      <header className="print-header">
        <div className="print-header__actions">
          <Link className="print-header__back-link" to={`/post/${piece.slug}`}>Back to article</Link>
          <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
        <fieldset className="print-header__controls" aria-label="print layout options">
          <label><input type="checkbox" checked={printOptions.showMetadata} onChange={handleToggle('showMetadata')} /> Show metadata</label>
          <label><input type="checkbox" checked={printOptions.showFeaturedImage} onChange={handleToggle('showFeaturedImage')} /> Show featured image</label>
          <label><input type="checkbox" checked={printOptions.showExcerpt} onChange={handleToggle('showExcerpt')} /> Show excerpt</label>
          <label><input type="checkbox" checked={printOptions.showColophon} onChange={handleToggle('showColophon')} /> Show colophon</label>
        </fieldset>

        <div className="print-header__eyebrow">{printDocument.eyebrow}</div>
        <h1>{printDocument.title || piece.slug}</h1>
        {printOptions.showExcerpt && printDocument.excerpt ? (
          <p>{printDocument.excerpt}</p>
        ) : null}
        <div className="print-header__meta">
          <span>{printDocument.author}</span>
          {printDocument.publishedDateLabel ? <span>{printDocument.publishedDateLabel}</span> : null}
        </div>
      </header>

      {printOptions.showFeaturedImage && printDocument.hero?.url ? (
        <section className="print-hero">
          <img className="print-hero__image" src={printDocument.hero.url} alt={printDocument.title || piece.slug} />
        </section>
      ) : null}

      <section className="print-wrap">
        <div className="piece-body__content">
          {bodyNodes.length ? bodyNodes : <p className="post-body__paragraph">{printDocument.excerpt || ''}</p>}
        </div>
      </section>

      {printOptions.showColophon ? (
        <footer className="print-colophon">
          <strong>Sabot Media</strong>
          <span>{piece.slug ? `/post/${piece.slug}` : ''}</span>
        </footer>
      ) : null}
    </main>
  )
}
