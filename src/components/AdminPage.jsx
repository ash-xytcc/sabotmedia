import { Link } from 'react-router-dom'
import { usePublicEdit } from './PublicEditContext'

export function AdminPage({ pieces }) {
  const total = pieces.length
  const needsReview = pieces.filter((piece) => piece.reviewFlags?.length).length
  const podcasts = pieces.filter((piece) => piece.type === 'podcast').length
  const printReady = pieces.filter((piece) => piece.hasPrintAssets).length
  const { changedFields, effectiveConfig, loadState, saveState } = usePublicEdit()

  const configuredTextFields = Object.keys(effectiveConfig?.text || {}).length
  const configuredStyleFields = Object.keys(effectiveConfig?.styles || {}).length

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
          <span>load: {loadState}</span>
          <span>save: {saveState}</span>
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
          <div className="admin-card__eyebrow">public config</div>
          <h2>Inline public edits</h2>
          <p>{changedFields.length} unsaved draft fields. {configuredTextFields} configured text fields. {configuredStyleFields} configured style fields.</p>
          <Link className="button button--primary" to="/draft">open draft</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">project lane</div>
          <h2>Project routes</h2>
          <p>Browse public project lenses and verify archive distribution across Sabot’s publishing structure.</p>
          <Link className="button button--primary" to="/projects">open projects</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">override lane</div>
          <h2>Override layer</h2>
          <p>Inspect manual metadata overrides used to patch imported archive entries before deeper editing lands.</p>
          <Link className="button button--primary" to="/overrides">open overrides</Link>
        </article>
      </section>
    </main>
  )
}
