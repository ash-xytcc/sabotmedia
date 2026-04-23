import { Link } from 'react-router-dom'

export function AdminPage({ pieces = [] }) {
  const total = Array.isArray(pieces) ? pieces.length : 0
  const podcasts = Array.isArray(pieces)
    ? pieces.filter((piece) => piece?.type === 'podcast').length
    : 0
  const projects = Array.isArray(pieces)
    ? new Set(
        pieces
          .map((piece) => String(piece?.primaryProject || '').trim())
          .filter(Boolean)
      ).size
    : 0

  return (
    <main className="page admin-page admin-page--creator">
      <section className="project-hero admin-page__hero">
        <div className="project-hero__eyebrow">creator / publishing / backstage</div>
        <h1>Creator Panel</h1>
        <p className="project-hero__description">
          Use this space to create new media, review what the public sees, and manage archive and system tools without wandering through every internal surface at once.
        </p>

        <div className="project-hero__meta">
          <span>{total} pieces</span>
          <span>{projects} project lanes</span>
          <span>{podcasts} podcasts</span>
        </div>
      </section>

      <section className="creator-panel-grid">
        <article className="creator-panel-card creator-panel-card--primary">
          <div className="creator-panel-card__eyebrow">create</div>
          <h2>Create</h2>
          <p>Write, edit, and shape new public pieces before they go live.</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/native-bridge">Open editor</Link>
            <Link className="button" to="/draft">Open draft</Link>
          </div>
        </article>

        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">publish</div>
          <h2>Publish</h2>
          <p>Check the public-facing site and recent posts before and after publishing.</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/">View homepage</Link>
            <Link className="button" to="/updates">Recent posts</Link>
          </div>
        </article>

        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">archive</div>
          <h2>Archive</h2>
          <p>Browse imported material, older projects, and existing public pieces.</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/archive">Browse archive</Link>
            <Link className="button" to="/projects">Projects</Link>
          </div>
        </article>

        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">system</div>
          <h2>System</h2>
          <p>Use backup and deeper controls only when needed. These are backstage tools, not the product.</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/system-backup">Backup</Link>
            <Link className="button" to="/overrides">Overrides</Link>
          </div>
        </article>
      </section>

      <section className="creator-panel-secondary">
        <article className="creator-panel-secondary__card">
          <div className="creator-panel-secondary__eyebrow">quick links</div>
          <div className="creator-panel-secondary__links">
            <Link to="/review">Review queue</Link>
            <Link to="/podcasts">Podcast tools</Link>
            <Link to="/taxonomy">Taxonomy</Link>
            <Link to="/roles">Roles</Link>
            <Link to="/audit-log">Audit log</Link>
            <Link to="/analytics">Analytics</Link>
            <Link to="/design-system">Design system</Link>
            <Link to="/platform-map">Platform map</Link>
          </div>
        </article>

        <article className="creator-panel-secondary__card">
          <div className="creator-panel-secondary__eyebrow">notes</div>
          <p>
            Keep the public site simple. Use the homepage, archive, and post pages as the real product surface.
            Everything here exists to support publishing, not compete with it.
          </p>
        </article>
      </section>
    </main>
  )
}
