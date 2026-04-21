import { Link } from 'react-router-dom'
import { splitDisplayTitle } from '../lib/content'

function buildOverrideSnippet(piece) {
  const out = {
    primaryProject: piece.primaryProject,
    primaryProjectSlug: piece.primaryProjectSlug,
    type: piece.type,
  }

  if (!piece.subtitle || piece.subtitle.length < 8) {
    out.subtitle = 'replace me'
  }

  if (!piece.excerpt || piece.excerpt.length < 40) {
    out.excerpt = 'replace me'
  }

  if (!piece.featured) {
    out.featured = false
  }

  return `"${piece.slug}": ${JSON.stringify(out, null, 2)}`
}

export function ReviewQueuePage({ pieces }) {
  const queued = pieces.filter((piece) => piece.reviewFlags?.length)

  return (
    <main className="page review-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">review / overrides / cleanup</div>
        <h1>Review Queue</h1>
        <p className="project-hero__description">
          Imported pieces that probably need metadata cleanup, project reassignment, or richer handling.
        </p>
        <div className="project-hero__meta">
          <span>{queued.length} pieces need review</span>
          <span>local override system enabled</span>
        </div>
      </section>

      <section className="review-queue">
        {queued.map((piece) => {
          const display = splitDisplayTitle(piece)
          return (
            <article className="review-card" key={piece.slug}>
              <div className="review-card__meta">
                <span>{piece.primaryProject || 'General'}</span>
                <span>{piece.type}</span>
                <span>{piece.publishedDateLabel}</span>
              </div>

              <h2>
                <Link to={`/piece/${piece.slug}`}>{display.title}</Link>
              </h2>

              {display.subtitle ? <p className="review-card__subtitle">{display.subtitle}</p> : null}
              {piece.excerpt ? <p className="review-card__excerpt">{piece.excerpt}</p> : null}

              <div className="review-card__flags">
                {piece.reviewFlags.map((flag) => (
                  <span key={flag} className="review-flag">{flag}</span>
                ))}
              </div>

              <pre className="review-card__snippet">{buildOverrideSnippet(piece)}</pre>
            </article>
          )
        })}
      </section>
    </main>
  )
}
