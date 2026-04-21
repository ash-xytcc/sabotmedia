import { Link } from 'react-router-dom'

export function AdminPage({ pieces }) {
  const total = pieces.length
  const needsReview = pieces.filter((piece) => piece.reviewFlags?.length).length
  const podcasts = pieces.filter((piece) => piece.type === 'podcast').length
  const printReady = pieces.filter((piece) => piece.hasPrintAssets).length

  return (
    <main className="page admin-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">admin / review / buildout</div>
        <h1>Admin</h1>
        <p className="project-hero__description">
          Operational surface for shaping imported content into a cleaner Sabot archive and future native publishing system.
        </p>
        <div className="project-hero__meta">
          <span>{total} total pieces</span>
          <span>{needsReview} need review</span>
          <span>{podcasts} podcasts</span>
          <span>{printReady} print-ready</span>
        </div>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <div className="admin-card__eyebrow">review lane</div>
          <h2>Review queue</h2>
          <p>Inspect imports that need cleanup, project reassignment, better excerpts, or richer format handling.</p>
          <Link className="button button--primary" to="/review">open review</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">project lane</div>
          <h2>Project routes</h2>
          <p>Browse public project lenses and verify archive distribution across Sabot’s publishing structure.</p>
          <Link className="button button--primary" to="/projects">open projects</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">next stage</div>
          <h2>Overrides + native tools</h2>
          <p>This page is the bridge toward real admin editing, not just archive rendering and manual override snippets.</p>
          <span className="admin-card__status">skeleton online</span>
        </article>
      </section>
    </main>
  )
}
