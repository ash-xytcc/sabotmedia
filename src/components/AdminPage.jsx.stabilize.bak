import { Link } from 'react-router-dom'
import { usePublicEdit } from './PublicEditContext'
import { EditableText } from './EditableText'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { getConfiguredBlock, getConfiguredText } from '../lib/publicConfig'
import { getFeaturedPiece, buildProjectFeaturedMap, countFeaturedSources } from '../lib/projectFeatured'
import { buildProjectMap } from '../lib/content'
import { AdminPublicConfigCard } from './AdminPublicConfigCard'
import { AdminWorkflowCard } from './AdminWorkflowCard'

export function AdminPage({ pieces }) {
  const total = pieces.length
  const needsReview = pieces.filter((piece) => piece.reviewFlags?.length).length
  const podcasts = pieces.filter((piece) => piece.type === 'podcast').length
  const printReady = pieces.filter((piece) => piece.hasPrintAssets).length
  const { changedFields, effectiveConfig, loadState, saveState, canSave, permissionState } = usePublicEdit()
  const resolvedConfig = useResolvedConfig()
  const heroBlock = getConfiguredBlock(resolvedConfig, 'admin.hero')
  const cardsBlock = getConfiguredBlock(resolvedConfig, 'admin.cards')
  const featuredBlock = getConfiguredBlock(resolvedConfig, 'admin.featured')

  const configuredTextFields = Object.keys(effectiveConfig?.text || {}).length
  const configuredStyleFields = Object.keys(effectiveConfig?.styles || {}).length

  const reviewEyebrow = getConfiguredText(resolvedConfig, cardsBlock?.reviewEyebrowField || 'admin.card.reviewEyebrow', 'review lane')
  const reviewTitle = getConfiguredText(resolvedConfig, cardsBlock?.reviewTitleField || 'admin.card.reviewTitle', 'Review queue')
  const reviewBody = getConfiguredText(resolvedConfig, cardsBlock?.reviewBodyField || 'admin.card.reviewBody', 'Inspect imports that need cleanup, project reassignment, better excerpts, or richer format handling.')
  const reviewAction = getConfiguredText(resolvedConfig, cardsBlock?.reviewActionField || 'admin.card.reviewAction', 'open review')

  const publicConfigEyebrow = getConfiguredText(resolvedConfig, cardsBlock?.publicConfigEyebrowField || 'admin.card.publicConfigEyebrow', 'public config')
  const publicConfigTitle = getConfiguredText(resolvedConfig, cardsBlock?.publicConfigTitleField || 'admin.card.publicConfigTitle', 'Inline public edits')
  const publicConfigAction = getConfiguredText(resolvedConfig, cardsBlock?.publicConfigActionField || 'admin.card.publicConfigAction', 'open draft')

  const projectEyebrow = getConfiguredText(resolvedConfig, cardsBlock?.projectEyebrowField || 'admin.card.projectEyebrow', 'project lane')
  const projectTitle = getConfiguredText(resolvedConfig, cardsBlock?.projectTitleField || 'admin.card.projectTitle', 'Project routes')
  const projectBody = getConfiguredText(resolvedConfig, cardsBlock?.projectBodyField || 'admin.card.projectBody', 'Browse public project lenses and verify archive distribution across Sabot’s publishing structure.')
  const projectAction = getConfiguredText(resolvedConfig, cardsBlock?.projectActionField || 'admin.card.projectAction', 'open projects')

  const overrideEyebrow = getConfiguredText(resolvedConfig, cardsBlock?.overrideEyebrowField || 'admin.card.overrideEyebrow', 'override lane')
  const overrideTitle = getConfiguredText(resolvedConfig, cardsBlock?.overrideTitleField || 'admin.card.overrideTitle', 'Override layer')
  const overrideBody = getConfiguredText(resolvedConfig, cardsBlock?.overrideBodyField || 'admin.card.overrideBody', 'Inspect manual metadata overrides used to patch imported archive entries before deeper editing lands.')
  const overrideAction = getConfiguredText(resolvedConfig, cardsBlock?.overrideActionField || 'admin.card.overrideAction', 'open overrides')

  const podcastEyebrow = getConfiguredText(resolvedConfig, cardsBlock?.podcastEyebrowField || 'admin.card.podcastEyebrow', 'podcast lane')
  const podcastTitle = getConfiguredText(resolvedConfig, cardsBlock?.podcastTitleField || 'admin.card.podcastTitle', 'Podcast enrichment')
  const podcastBody = getConfiguredText(resolvedConfig, cardsBlock?.podcastBodyField || 'admin.card.podcastBody', 'Prepare summaries, transcript excerpts, and source notes for podcast entries before native transcription is wired in.')
  const podcastAction = getConfiguredText(resolvedConfig, cardsBlock?.podcastActionField || 'admin.card.podcastAction', 'open podcast bridge')

  const globalFeaturedLabel = getConfiguredText(resolvedConfig, featuredBlock?.globalLabelField || 'admin.featured.globalLabel', 'global featured piece')
  const projectFeaturedLabel = getConfiguredText(resolvedConfig, featuredBlock?.projectLabelField || 'admin.featured.projectLabel', 'project featured pieces')
  const explicitCountLabel = getConfiguredText(resolvedConfig, featuredBlock?.explicitCountLabelField || 'admin.featured.explicitCountLabel', 'explicit')
  const fallbackCountLabel = getConfiguredText(resolvedConfig, featuredBlock?.fallbackCountLabelField || 'admin.featured.fallbackCountLabel', 'fallback')

  const globalFeatured = getFeaturedPiece(pieces)
  const projectMap = buildProjectMap(pieces)
  const featuredMap = buildProjectFeaturedMap(pieces, projectMap)
  const featuredCounts = countFeaturedSources(featuredMap)

  return (
    <main className="page admin-page">
      <section className="project-hero">
        <EditableText as="div" className="project-hero__eyebrow" field={heroBlock?.eyebrowField || 'admin.hero.eyebrow'}>
          admin / review / buildout
        </EditableText>
        <EditableText as="h1" field={heroBlock?.titleField || 'admin.hero.title'}>
          Admin
        </EditableText>
        <EditableText as="p" className="project-hero__description" field={heroBlock?.descriptionField || 'admin.hero.description'}>
          Operational surface for shaping imported content into a cleaner Sabot archive and future native publishing system.
        </EditableText>
        <div className="project-hero__meta">
          <span>{total} total pieces</span>
          <span>{needsReview} need review</span>
          <span>{podcasts} podcasts</span>
          <span>{printReady} print-ready</span>
          <span>load: {loadState}</span>
          <span>save: {saveState}</span>
          <span>perm: {permissionState}</span>
          <span>can save: {canSave ? 'yes' : 'no'}</span>
        </div>
      </section>

      <section className="review-summary-grid">
        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">{globalFeaturedLabel}</div>
          <ul>
            <li><span>source</span><strong>{globalFeatured?.source || 'none'}</strong></li>
            <li><span>title</span><strong>{globalFeatured?.piece?.title || 'none'}</strong></li>
            <li><span>slug</span><strong>{globalFeatured?.piece?.slug || 'none'}</strong></li>
          </ul>
        </article>

        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">{projectFeaturedLabel}</div>
          <ul>
            <li><span>{explicitCountLabel}</span><strong>{featuredCounts.explicit}</strong></li>
            <li><span>{fallbackCountLabel}</span><strong>{featuredCounts.fallback}</strong></li>
          </ul>
        </article>
      </section>

      <AdminWorkflowCard />

      <AdminPublicConfigCard />

      <section className="admin-grid">
        <article className="admin-card">
          <div className="admin-card__eyebrow">{reviewEyebrow}</div>
          <h2>{reviewTitle}</h2>
          <p>{reviewBody}</p>
          <Link className="button button--primary" to="/review">{reviewAction}</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">{publicConfigEyebrow}</div>
          <h2>{publicConfigTitle}</h2>
          <p>{changedFields.length} unsaved draft fields. {configuredTextFields} configured text fields. {configuredStyleFields} configured style fields.</p>
          <Link className="button button--primary" to="/draft">{publicConfigAction}</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">{projectEyebrow}</div>
          <h2>{projectTitle}</h2>
          <p>{projectBody}</p>
          <Link className="button button--primary" to="/projects">{projectAction}</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">{overrideEyebrow}</div>
          <h2>{overrideTitle}</h2>
          <p>{overrideBody}</p>
          <Link className="button button--primary" to="/overrides">{overrideAction}</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">{podcastEyebrow}</div>
          <h2>{podcastTitle}</h2>
          <p>{podcastBody}</p>
          <Link className="button button--primary" to="/podcasts">{podcastAction}</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">native lane</div>
          <h2>Native publishing bridge</h2>
          <p>Define and compose native content with richer blocks, reusable media assets, and real public rendering instead of staying trapped in imported archive logic.</p>
          <Link className="button button--primary" to="/native-bridge">open bridge</Link>
        </article>

        <article className="admin-card">
          <div className="admin-card__eyebrow">public lane</div>
          <h2>Native updates surface</h2>
          <p>Review the real public rendering lane for published native entries and verify that publishing now appears on a live route.</p>
          <Link className="button button--primary" to="/updates">open updates</Link>
        </article>
      </section>
    </main>
  )
}
