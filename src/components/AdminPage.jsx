import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'

const CREATE_TYPES = [
  {
    key: 'article',
    label: 'Article / Dispatch',
    description: 'Write and publish a new written piece.',
    to: '/native-bridge?new=article',
  },
  {
    key: 'podcast',
    label: 'Podcast',
    description: 'Create a podcast entry and then enrich it in the podcast workspace.',
    to: '/native-bridge?new=podcast',
  },
  {
    key: 'print',
    label: 'Print / Zine',
    description: 'Prepare print-oriented material and archive metadata.',
    to: '/native-bridge?new=print',
  },
  {
    key: 'block',
    label: 'Public Block',
    description: 'Create a homepage or public-surface content block.',
    to: '/native-bridge?new=publicBlock',
  },
]

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

  const published = Array.isArray(pieces)
    ? pieces.filter((piece) => piece?.publishedAt).length
    : 0

  const printCount = Array.isArray(pieces)
    ? pieces.filter((piece) => piece?.hasPrintAssets).length
    : 0

  return (
    <AdminFrame>
    <main className="page admin-page admin-page--creator">
      <section className="project-hero admin-page__hero">
        <div className="project-hero__eyebrow">creator / publishing / backstage</div>
        <h1>Creator Panel</h1>
        <p className="project-hero__description">
          Start something new, manage what is in motion, and only dip into deeper system tools when you actually need them.
        </p>

        <div className="project-hero__meta">
          <span>{total} pieces</span>
          <span>{published} published</span>
          <span>{projects} project lanes</span>
          <span>{podcasts} podcasts</span>
          <span>{printCount} print-linked</span>
        </div>
      </section>

      <section className="creator-add-new">
        <article className="creator-panel-card creator-panel-card--primary creator-panel-card--new">
          <div className="creator-panel-card__eyebrow">add new</div>
          <h2>Add New</h2>
          <p>
            Choose what you want to make, then drop into the right creation flow instead of wandering through backstage tools.
          </p>

          <div className="creator-type-grid">
            {CREATE_TYPES.map((type) => (
              <Link key={type.key} className="creator-type-card" to={type.to}>
                <strong>{type.label}</strong>
                <span>{type.description}</span>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="creator-panel-grid creator-panel-grid--workflow">
        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">content</div>
          <h2>Content Workflow</h2>
          <p>Work on drafts, review items, and publishing-ready content from one place.</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/content">Open content queue</Link>
            <Link className="button" to="/review">Review queue</Link>
          </div>
        </article>

        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">site</div>
          <h2>Site Editor</h2>
          <p>Edit the public site live, then inspect or save draft changes from the website editing flow.</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/draft">Site draft + changes</Link>
            <Link className="button" to="/">Open live homepage</Link>
          </div>
        </article>

        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">podcasts</div>
          <h2>Podcast Workflow</h2>
          <p>Create, enrich, and clean up podcast pieces instead of burying them in generic archive tooling.</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/native-bridge?new=podcast">New podcast</Link>
            <Link className="button" to="/podcasts">Podcast workspace</Link>
          </div>
        </article>

        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">advanced</div>
          <h2>Advanced</h2>
          <p>Use overrides, backup, taxonomy, and other deeper controls only when the normal workflow is not enough.</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/overrides">Overrides</Link>
            <Link className="button" to="/system-backup">Backup</Link>
          </div>
        </article>
      </section>

      <section className="creator-panel-secondary">
        <article className="creator-panel-secondary__card">
          <div className="creator-panel-secondary__eyebrow">deeper tools</div>
          <div className="creator-panel-secondary__links">
            <Link to="/review">Review queue</Link>
            <Link to="/podcasts">Podcast workspace</Link>
            <Link to="/content">Content queue</Link>
            <Link to="/draft">Site draft</Link>
            <Link to="/overrides">Overrides</Link>
            <Link to="/system-backup">Backup</Link>
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
            The public site is the product. This panel should help you make and manage work, not force you to understand every internal system before you can publish.
          </p>
        </article>
      </section>
    </main>
    </AdminFrame>
  )
}
