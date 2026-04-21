import overrides from '../content/piece-overrides.json'
import { Link } from 'react-router-dom'
import { CopyButton } from './CopyButton'

export function OverridesPage() {
  const entries = Object.entries(overrides || {}).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <main className="page overrides-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">overrides / local metadata / control layer</div>
        <h1>Overrides</h1>
        <p className="project-hero__description">
          Local metadata overrides layered on top of imported archive content. This is the current manual control surface before deeper admin editing lands.
        </p>
        <div className="project-hero__meta">
          <span>{entries.length} override entries</span>
          <span>piece-overrides.json is active</span>
        </div>
      </section>

      {entries.length ? (
        <section className="review-queue">
          {entries.map(([slug, data]) => {
            const snippet = JSON.stringify({ [slug]: data }, null, 2)

            return (
              <article className="review-card" key={slug}>
                <div className="review-card__meta">
                  <span>override entry</span>
                  <span>{slug}</span>
                </div>

                <h2>
                  <Link to={`/piece/${slug}`}>{slug}</Link>
                </h2>

                <div className="review-card__actions">
                  <CopyButton text={snippet} />
                </div>

                <pre className="review-card__snippet">{snippet}</pre>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="missing-state">
          <h2>No overrides yet</h2>
          <p>The override layer exists, but piece-overrides.json is still empty.</p>
        </section>
      )}
    </main>
  )
}
