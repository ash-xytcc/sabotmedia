import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getImportedImage } from '../lib/getImportedImage'
import { renderImportedBody } from '../lib/renderImportedBody'
import { splitDisplayTitle } from '../lib/content'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { getPieceDisplaySettings, resolveFirstReadableMode } from '../lib/publicDisplayModes'

function getPieceBySlug(pieces, slug) {
  return (Array.isArray(pieces) ? pieces : []).find((piece) => piece?.slug === slug) || null
}

function PublicationModeSwitch({ slug }) {
  return (
    <nav className="publication-mode-switch" aria-label="reading modes">
      <Link className="publication-mode-switch__link" to={`/post/${slug}`}>Read</Link>
      <Link className="publication-mode-switch__link" to={`/post/${slug}?mode=experience`}>Experience</Link>
      <Link className="publication-mode-switch__link is-active" to={`/piece/${slug}/print`}>Print</Link>
    </nav>
  )
}

const DEFAULT_PRINT_OPTIONS = {
  showMetadata: true,
  showFeaturedImage: true,
  showExcerpt: true,
  showColophon: true,
}

export function PrintPage({ pieces = [] }) {
  const { slug = '' } = useParams()
  const [nativePieces, setNativePieces] = useState([])
  const [printOptions, setPrintOptions] = useState(DEFAULT_PRINT_OPTIONS)

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

  const display = splitDisplayTitle(piece)
  const heroImage = getImportedImage(piece)
  const bodyNodes = renderImportedBody(piece.bodyHtml || '', 'print')
  const excerpt = display.subtitle || piece.subtitle || piece.excerpt || ''
  const sourceLabel = piece.sourceUrl || piece.sourcePostType || ''
  const siteTitle = 'Sabot Media'

  const metadataItems = [
    { label: 'Site', value: siteTitle },
    { label: 'Post', value: display.title || piece.title || '' },
    { label: 'Date', value: piece.publishedDateLabel || '' },
    {
      label: 'Author / Source',
      value: [piece.author, sourceLabel].map((item) => String(item || '').trim()).filter(Boolean).join(' · '),
    },
    { label: 'URL slug', value: piece.slug || '' },
  ].filter((item) => String(item.value || '').trim())

  const handleToggle = (key) => (event) => {
    const checked = Boolean(event?.target?.checked)
    setPrintOptions((current) => ({ ...current, [key]: checked }))
  }

  return (
    <main className="page print-page">
      <header className="print-header">
        <div className="print-header__actions">
          <PublicationModeSwitch slug={piece.slug} />
          <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
        <fieldset className="print-header__controls" aria-label="print layout options">
          <label><input type="checkbox" checked={printOptions.showMetadata} onChange={handleToggle('showMetadata')} /> Show metadata</label>
          <label><input type="checkbox" checked={printOptions.showFeaturedImage} onChange={handleToggle('showFeaturedImage')} /> Show featured image</label>
          <label><input type="checkbox" checked={printOptions.showExcerpt} onChange={handleToggle('showExcerpt')} /> Show excerpt</label>
          <label><input type="checkbox" checked={printOptions.showColophon} onChange={handleToggle('showColophon')} /> Show colophon</label>
        </fieldset>

        <div className="print-header__eyebrow">{piece.primaryProject || piece.type || 'publication'}</div>
        <h1>{display.title || piece.title || piece.slug}</h1>
        {printOptions.showExcerpt && excerpt ? (
          <p>{excerpt}</p>
        ) : null}
        <div className="print-header__meta">
          <span>{piece.author || 'Sabot Media'}</span>
          {piece.publishedDateLabel ? <span>{piece.publishedDateLabel}</span> : null}
        </div>
      </header>

      {printOptions.showMetadata && metadataItems.length ? (
        <section className="print-meta-block" aria-label="print metadata">
          <h2>Print metadata</h2>
          <dl>
            {metadataItems.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {printOptions.showFeaturedImage && heroImage ? (
        <section className="print-hero">
          <img className="print-hero__image" src={heroImage} alt={display.title || piece.title || piece.slug} />
        </section>
      ) : null}

      <section className="print-wrap">
        <div className="piece-body__content">
          {bodyNodes.length ? bodyNodes : <p className="post-body__paragraph">{piece.excerpt || ''}</p>}
        </div>
      </section>

      {printOptions.showColophon ? (
        <section className="print-colophon" aria-label="publication colophon">
          <h2>Colophon</h2>
          <p>{siteTitle} print layout. Prepared for physical distribution and archive.</p>
          <p>
            Source: {piece.sourceUrl ? <a href={piece.sourceUrl}>{piece.sourceUrl}</a> : 'native publication feed'}.
            {piece.slug ? ` Slug: ${piece.slug}.` : ''}
          </p>
        </section>
      ) : null}
    </main>
  )
}
