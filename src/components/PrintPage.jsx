import { Link, useParams } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { splitDisplayTitle } from '../lib/content'

export function PrintPage({ pieces }) {
  const { slug } = useParams()
  const piece = pieces.find((entry) => entry.slug === slug)

  if (!piece) {
    return (
      <main className="page print-page">
      <PublicationTopbar />
        <div className="missing-state">
          <h1>Print view unavailable</h1>
          <p>This piece could not be found in the imported archive.</p>
        </div>
      </main>
    )
  }

  const display = splitDisplayTitle(piece)

  return (
    <main className="page print-page">
      <PublicationTopbar />
      <header className="piece-header">
        <div className="piece-header__eyebrow">{piece.primaryProject}</div>
        <h1>{display.title}</h1>
        {display.subtitle ? <p className="piece-header__subtitle">{display.subtitle}</p> : null}
        <div className="hero__meta">
          <span>{piece.type}</span>
          <span>{piece.publishedDateLabel}</span>
          <span>{piece.author}</span>
        </div>

        <nav className="mode-toggle">
          <Link to={`/post/${piece.slug}`}>reading</Link>
          <Link to={`/post/${piece.slug}?mode=experience`}>experience</Link>
          <Link to={`/piece/${piece.slug}/print`}>print</Link>
        </nav>
      </header>

      <section className="print-layout">
        <article className="print-body-wrap" dangerouslySetInnerHTML={{ __html: piece.bodyHtml }} />
      </section>
    </main>
  )
}
