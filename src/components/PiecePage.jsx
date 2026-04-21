import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

function ModeToggle({ slug, mode }) {
  return (
    <div className="mode-toggle" role="tablist" aria-label="Piece display mode">
      <Link className={mode === 'reading' ? 'is-active' : ''} to={`/piece/${slug}?mode=reading`}>Reading</Link>
      <Link className={mode === 'experience' ? 'is-active' : ''} to={`/piece/${slug}?mode=experience`}>Experience</Link>
      <Link to={`/piece/${slug}/print`}>Print</Link>
    </div>
  )
}

export function PiecePage({ pieces }) {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'experience' ? 'experience' : 'reading'
  const piece = useMemo(() => pieces.find((entry) => entry.slug === slug), [pieces, slug])

  if (!piece) {
    return (
      <main className="page piece-page">
        <div className="missing-state">
          <h1>Piece not found</h1>
          <p>This archive entry has not been imported yet or the slug changed during migration.</p>
        </div>
      </main>
    )
  }

  return (
    <main className={`page piece-page piece-page--${mode}`}>
      <article className="piece-shell">
        <header className="piece-header">
          <div className="piece-header__eyebrow">{piece.primaryProject}</div>
          <h1>{piece.title}</h1>
          {piece.subtitle && <p className="piece-header__subtitle">{piece.subtitle}</p>}
          <div className="piece-header__meta">
            <span>{piece.author || 'Sabot Media'}</span>
            <span>{piece.publishedDateLabel}</span>
            <span>{piece.type}</span>
          </div>
          <ModeToggle slug={piece.slug} mode={mode} />
        </header>

        <div className="piece-layout">
          <aside className="piece-sidebar">
            <div className="info-card">
              <div className="info-card__label">Projects</div>
              <ul>
                {piece.projects.map((project) => <li key={project}>{project}</li>)}
              </ul>
            </div>
            {piece.sourceUrl && (
              <div className="info-card">
                <div className="info-card__label">Source</div>
                <a href={piece.sourceUrl} target="_blank" rel="noreferrer">Original NoBlogs post</a>
              </div>
            )}
            {piece.relatedPrintLinks?.length > 0 && (
              <div className="info-card">
                <div className="info-card__label">Print assets</div>
                <ul>
                  {piece.relatedPrintLinks.map((asset) => (
                    <li key={asset.url}><a href={asset.url} target="_blank" rel="noreferrer">{asset.title}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          <section className="piece-body-wrap">
            {mode === 'experience' && (
              <div className="experience-banner">
                <div className="experience-banner__inner">
                  <span>THIS IS NOT A CONCLUSION.</span>
                  <span>IT IS A BEGINNING.</span>
                </div>
              </div>
            )}
            <div className="piece-body" dangerouslySetInnerHTML={{ __html: piece.bodyHtml }} />
          </section>
        </div>
      </article>
    </main>
  )
}
