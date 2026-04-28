import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { getImportedImage } from '../lib/getImportedImage'
import { renderImportedBody } from '../lib/renderImportedBody'
import { splitDisplayTitle } from '../lib/content'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { getPieceDisplaySettings, resolveFirstReadableMode } from '../lib/publicDisplayModes'

function getPieceBySlug(pieces, slug) {
  return (Array.isArray(pieces) ? pieces : []).find((piece) => piece?.slug === slug) || null
}

function chunkNodes(nodes = [], size = 4) {
  const normalizedSize = Number.isFinite(size) && size > 0 ? size : 4
  const chunks = []
  for (let i = 0; i < nodes.length; i += normalizedSize) {
    chunks.push(nodes.slice(i, i + normalizedSize))
  }
  return chunks
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

function PrintLayoutSwitch({ slug, layout = 'article' }) {
  return (
    <div className="print-layout-switch" role="group" aria-label="print layout">
      <Link className={`print-layout-switch__link${layout === 'article' ? ' is-active' : ''}`} to={`/piece/${slug}/print`}>
        Article layout
      </Link>
      <Link className={`print-layout-switch__link${layout === 'zine-sheet' ? ' is-active' : ''}`} to={`/piece/${slug}/print?layout=zine-sheet`}>
        Zine sheet
      </Link>
    </div>
  )
}

function PrintZineSheet({ piece, display, heroImage, bodyNodes }) {
  const bodyPanels = chunkNodes(bodyNodes, 4)

  return (
    <section className="zine-sheet" aria-label="zine sheet preview">
      <article className="zine-panel zine-panel--title">
        <div className="zine-panel__label">Panel 1 · Cover</div>
        <h2>{display.title || piece.title || piece.slug}</h2>
        {(display.subtitle || piece.subtitle || piece.excerpt) ? <p>{display.subtitle || piece.subtitle || piece.excerpt}</p> : null}
      </article>

      {heroImage ? (
        <article className="zine-panel zine-panel--image">
          <div className="zine-panel__label">Panel 2 · Featured image</div>
          <figure className="zine-panel__figure">
            <img className="zine-panel__image" src={heroImage} alt={display.title || piece.title || piece.slug} />
          </figure>
        </article>
      ) : null}

      <article className="zine-panel zine-panel--meta">
        <div className="zine-panel__label">Panel 3 · Metadata</div>
        <ul>
          <li><strong>Author:</strong> {piece.author || 'Sabot Media'}</li>
          {piece.publishedDateLabel ? <li><strong>Published:</strong> {piece.publishedDateLabel}</li> : null}
          <li><strong>Section:</strong> {piece.primaryProject || piece.type || 'publication'}</li>
          <li><strong>Slug:</strong> {piece.slug}</li>
        </ul>
      </article>

      {bodyPanels.length ? bodyPanels.map((panelNodes, index) => (
        <article key={`zine-panel-body-${index}`} className="zine-panel zine-panel--body">
          <div className="zine-panel__label">Panel {index + 4} · Body</div>
          <div className="zine-panel__body piece-body__content">{panelNodes}</div>
        </article>
      )) : (
        <article className="zine-panel zine-panel--body">
          <div className="zine-panel__label">Panel 4 · Body</div>
          <div className="zine-panel__body piece-body__content">
            <p className="post-body__paragraph">{piece.excerpt || ''}</p>
          </div>
        </article>
      )}
    </section>
  )
}

export function PrintPage({ pieces = [] }) {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [nativePieces, setNativePieces] = useState([])
  const requestedLayout = searchParams.get('layout')
  const printLayout = requestedLayout === 'zine-sheet' ? 'zine-sheet' : 'article'

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
    <main className={`page print-page${printLayout === 'zine-sheet' ? ' print-page--zine' : ''}`}>
      <header className="print-header">
        <div className="print-header__actions">
          <PublicationModeSwitch slug={piece.slug} />
          <PrintLayoutSwitch slug={piece.slug} layout={printLayout} />
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

      {printLayout === 'zine-sheet' ? (
        <PrintZineSheet piece={piece} display={display} heroImage={heroImage} bodyNodes={bodyNodes} />
      ) : (
        <>
          {heroImage ? (
            <section className="print-hero">
              <img className="print-hero__image" src={heroImage} alt={display.title || piece.title || piece.slug} />
            </section>
          ) : null}

          <section className="print-wrap">
            <div className="piece-body__content">
              {bodyNodes.length ? bodyNodes : <p className="post-body__paragraph">{piece.excerpt || ''}</p>}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
