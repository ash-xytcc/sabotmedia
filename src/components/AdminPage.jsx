import { Link } from 'react-router-dom'
import { EditableText } from './EditableText'
import { AdminPublicConfigCard } from './AdminPublicConfigCard'
import { useResolvedConfig } from '../lib/useResolvedConfig'

export function AdminPage({ pieces = [] }) {
  const { getText, getBlock } = useResolvedConfig()

  const heroBlock = getBlock('admin.hero', {
    eyebrowField: 'admin.hero.eyebrow',
    titleField: 'admin.hero.title',
    descriptionField: 'admin.hero.description',
  })

  const stats = {
    total: Array.isArray(pieces) ? pieces.length : 0,
    podcasts: Array.isArray(pieces) ? pieces.filter((piece) => piece?.type === 'podcast').length : 0,
    projects: Array.isArray(pieces)
      ? new Set(pieces.map((piece) => String(piece?.primaryProject || '').trim()).filter(Boolean)).size
      : 0,
  }

  const createTitle = getText('admin.sections.create.title', 'Create')
  const createBody = getText(
    'admin.sections.create.body',
    'Write and shape new public pieces, then review how they will read on the live site.'
  )

  const publishTitle = getText('admin.sections.publish.title', 'Publish')
  const publishBody = getText(
    'admin.sections.publish.body',
    'Check the public-facing site, recent posts, and piece rendering before and after publishing.'
  )

  const archiveTitle = getText('admin.sections.archive.title', 'Archive')
  const archiveBody = getText(
    'admin.sections.archive.body',
    'Browse imported material, older projects, and existing public pieces without digging through the full tool sprawl.'
  )

  const systemTitle = getText('admin.sections.system.title', 'System')
  const systemBody = getText(
    'admin.sections.system.body',
    'Use backup and deeper controls only when needed. These are backstage tools, not the product.'
  )

  return (
    <main className="page admin-page admin-page--creator">
      <section className="project-hero admin-page__hero">
        <EditableText
          as="div"
          className="project-hero__eyebrow"
          field={heroBlock?.eyebrowField || 'admin.hero.eyebrow'}
        >
          creator / publishing / backstage
        </EditableText>

        <EditableText as="h1" field={heroBlock?.titleField || 'admin.hero.title'}>
          Creator Panel
        </EditableText>

        <EditableText
          as="p"
          className="project-hero__description"
          field={heroBlock?.descriptionField || 'admin.hero.description'}
        >
          Use this space to create new media, review what the public sees, and manage the archive without wandering through every internal tool at once.
        </EditableText>

        <div className="project-hero__meta">
          <span>{stats.total} pieces</span>
          <span>{stats.projects} project lanes</span>
          <span>{stats.podcasts} podcasts</span>
        </div>
      </section>

      <section className="creator-panel-grid">
        <article className="creator-panel-card creator-panel-card--primary">
          <div className="creator-panel-card__eyebrow">create</div>
          <h2>{createTitle}</h2>
          <p>{createBody}</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/native-bridge">Open editor</Link>
            <Link className="button" to="/draft">Open draft</Link>
          </div>
        </article>

        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">publish</div>
          <h2>{publishTitle}</h2>
          <p>{publishBody}</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/">View homepage</Link>
            <Link className="button" to="/updates">Recent posts</Link>
          </div>
        </article>

        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">archive</div>
          <h2>{archiveTitle}</h2>
          <p>{archiveBody}</p>
          <div className="creator-panel-card__actions">
            <Link className="button button--primary" to="/archive">Browse archive</Link>
            <Link className="button" to="/projects">Projects</Link>
          </div>
        </article>

        <article className="creator-panel-card">
          <div className="creator-panel-card__eyebrow">system</div>
          <h2>{systemTitle}</h2>
          <p>{systemBody}</p>
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
          <div className="creator-panel-secondary__eyebrow">public configuration</div>
          <AdminPublicConfigCard />
        </article>
      </section>
    </main>
  )
}
