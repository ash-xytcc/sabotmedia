import overrides from '../content/piece-overrides.json'
import { Link } from 'react-router-dom'
import { CopyButton } from './CopyButton'
import { EditableText } from './EditableText'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { getConfiguredBlock, getConfiguredText } from '../lib/publicConfig'

export function OverridesPage() {
  const resolvedConfig = useResolvedConfig()
  const heroBlock = getConfiguredBlock(resolvedConfig, 'overrides.hero')
  const metaBlock = getConfiguredBlock(resolvedConfig, 'overrides.meta')
  const emptyBlock = getConfiguredBlock(resolvedConfig, 'overrides.empty')

  const entryLabel = getConfiguredText(resolvedConfig, metaBlock?.entryLabelField || 'overrides.meta.entryLabel', 'override entries')
  const activeLabel = getConfiguredText(resolvedConfig, metaBlock?.activeLabelField || 'overrides.meta.activeLabel', 'piece-overrides.json is active')
  const emptyTitle = getConfiguredText(resolvedConfig, emptyBlock?.titleField || 'overrides.emptyTitle', 'No overrides yet')
  const emptyBody = getConfiguredText(resolvedConfig, emptyBlock?.bodyField || 'overrides.emptyBody', 'The override layer exists, but piece-overrides.json is still empty.')

  const entries = Object.entries(overrides || {}).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <main className="page overrides-page">
      <section className="project-hero">
        <EditableText as="div" className="project-hero__eyebrow" field={heroBlock?.eyebrowField || 'overrides.hero.eyebrow'}>
          overrides / local metadata / control layer
        </EditableText>
        <EditableText as="h1" field={heroBlock?.titleField || 'overrides.hero.title'}>
          Overrides
        </EditableText>
        <EditableText as="p" className="project-hero__description" field={heroBlock?.descriptionField || 'overrides.hero.description'}>
          Local metadata overrides layered on top of imported archive content. This is the current manual control surface before deeper admin editing lands.
        </EditableText>
        <div className="project-hero__meta">
          <span>{entries.length} {entryLabel}</span>
          <span>{activeLabel}</span>
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
          <h2>{emptyTitle}</h2>
          <p>{emptyBody}</p>
        </section>
      )}
    </main>
  )
}
