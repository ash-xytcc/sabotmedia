import { Link, Navigate, useParams } from 'react-router-dom'
import { getImportedImage } from '../lib/getImportedImage'
import { renderImportedBody } from '../lib/renderImportedBody'
import { splitDisplayTitle } from '../lib/content'

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

export function PrintPage({ pieces = [] }) {
  const { slug = '' } = useParams()
  const piece = getPieceBySlug(pieces, slug)

  if (!piece) {
    return <Navigate to="/archive" replace />
  }

  const display = splitDisplayTitle(piece)
  const heroImage = getImportedImage(piece)
  const bodyNodes = renderImportedBody(piece.bodyHtml || '', 'print')

  return (
    <main className="page print-page">
      <header className="print-header">
        <div className="print-header__actions">
          <PublicationModeSwitch slug={piece.slug} />
          <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
        </div>

        <div className="print-header__eyebrow">{piece.primaryProject || piece.type || 'publication'}</div>
        <h1>{display.title || piece.title || piece.slug}</h1>
        {display.subtitle || piece.subtitle || piece.excerpt ? (
          <p>{display.subtitle || piece.subtitle || piece.excerpt}</p>
        ) : null}
        <div className="print-header__meta">
          <span>{piece.author || 'Sabot Media'}</span>
          {piece.publishedDateLabel ? <span>{piece.publishedDateLabel}</span> : null}
        </div>
      </header>

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
    </main>
  )
}
