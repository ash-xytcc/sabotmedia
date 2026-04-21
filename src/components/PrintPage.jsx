import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

export function PrintPage({ pieces }) {
  const { slug } = useParams()
  const piece = useMemo(() => pieces.find((entry) => entry.slug === slug), [pieces, slug])

  if (!piece) {
    return (
      <main className="page print-page">
        <div className="missing-state">
          <h1>Print view unavailable</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="page print-page">
      <article className="print-shell">
        <header className="print-header">
          <div className="print-header__meta">{piece.primaryProject} · {piece.publishedDateLabel}</div>
          <h1>{piece.title}</h1>
          {piece.subtitle && <p>{piece.subtitle}</p>}
          <div className="print-header__actions">
            <Link to={`/piece/${piece.slug}`}>Back to reading mode</Link>
          </div>
        </header>

        <section className="print-quote">
          <span>This is not a conclusion.</span>
          <span>It is a beginning.</span>
        </section>

        <section className="print-body" dangerouslySetInnerHTML={{ __html: piece.bodyHtml }} />
      </article>
    </main>
  )
}
