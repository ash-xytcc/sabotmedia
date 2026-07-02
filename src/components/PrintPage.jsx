import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
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

function PublicationModeSwitch({ slug }) {
  return (
    <nav className="publication-mode-switch" aria-label="reading modes">
      <Link className="publication-mode-switch__link" to={`/post/${slug}`}>Read</Link>
      <Link className="publication-mode-switch__link" to={`/post/${slug}?mode=experience`}>Experience</Link>
      <Link className="publication-mode-switch__link is-active" to={`/post/${slug}/print`}>Print</Link>
    </nav>
  )
}

function PrintLayoutSwitch({ slug, layout = 'article' }) {
  return (
    <div className="print-layout-switch" role="group" aria-label="print layout">
      <Link className={`print-layout-switch__link${layout === 'article' ? ' is-active' : ''}`} to={`/post/${slug}/print`}>
        Article layout
      </Link>
      <Link className={`print-layout-switch__link${layout === 'zine-sheet' ? ' is-active' : ''}`} to={`/post/${slug}/print?layout=zine-sheet`}>
        Zine sheet
      </Link>
    </div>
  )
}

function PrintZineSheet({ printDocument }) {
  return (
    <section className="zine-sheet" aria-label="zine sheet preview">
      {printDocument.panels.map((panel) => {
        if (panel.kind === 'cover') {
          return (
            <article key={panel.id} className="zine-panel zine-panel--title">
              <div className="zine-panel__label">{panel.label}</div>
              <h2>{panel.title || printDocument.title || printDocument.slug}</h2>
              {panel.subtitle ? <p>{panel.subtitle}</p> : null}
            </article>
          )
        }

        if (panel.kind === 'image' && panel.image?.url) {
          return (
            <article key={panel.id} className="zine-panel zine-panel--image">
              <div className="zine-panel__label">{panel.label}</div>
              <figure className="zine-panel__figure">
                <img className="zine-panel__image" src={panel.image.url} alt={panel.title || printDocument.title || ''} />
              </figure>
            </article>
          )
        }

        if (panel.kind === 'metadata') {
          return (
            <article key={panel.id} className="zine-panel zine-panel--meta">
              <div className="zine-panel__label">{panel.label}</div>
              <ul>
                {panel.metadata.map((item) => (
                  <li key={item.label}><strong>{item.label}:</strong> {item.value}</li>
                ))}
              </ul>
            </article>
          )
        }

        const bodyNodes = renderImportedBody(panel.bodyHtml || '', 'print')
        return (
          <article key={panel.id} className="zine-panel zine-panel--body">
            <div className="zine-panel__label">{panel.label}</div>
            <div className="zine-panel__body piece-body__content">
              {bodyNodes.length ? bodyNodes : <p className="post-body__paragraph">{printDocument.excerpt || ''}</p>}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export function PrintPage({ pieces = [] }) {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [nativePieces, setNativePieces] = useState([])
  const [printOptions, setPrintOptions] = useState(DEFAULT_PRINT_OPTIONS)
  const requestedLayout = searchParams.get('layout')
  const printLayout = requestedLayout === PrintLayouts.ZINE_SHEET ? PrintLayouts.ZINE_SHEET : PrintLayouts.ARTICLE

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
    <main className={`page print-page${printLayout === PrintLayouts.ZINE_SHEET ? ' print-page--zine' : ''}`}>
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

      {printLayout === PrintLayouts.ZINE_SHEET ? (
        <PrintZineSheet printDocument={printDocument} />
      ) : (
        <>
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
        </>
      )}
    </main>
  )
}
