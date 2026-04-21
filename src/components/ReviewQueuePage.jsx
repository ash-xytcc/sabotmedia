import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { splitDisplayTitle } from '../lib/content'
import { CopyButton } from './CopyButton'

function buildOverrideSnippet(piece) {
  const out = {
    primaryProject: piece.primaryProject,
    primaryProjectSlug: piece.primaryProjectSlug,
    type: piece.type,
  }

  if (!piece.subtitle || piece.subtitle.length < 8) out.subtitle = 'replace me'
  if (!piece.excerpt || piece.excerpt.length < 40) out.excerpt = 'replace me'
  if (piece.type === 'podcast' && !piece.audioSummary) out.audioSummary = 'replace me'
  if (piece.type === 'podcast' && !piece.transcriptExcerpt) out.transcriptExcerpt = 'replace me'
  if (!piece.featured) out.featured = false
  if (!piece.hidden) out.hidden = false

  return `"${piece.slug}": ${JSON.stringify(out, null, 2)}`
}

function getFlagOptions(pieces) {
  return [...new Set(
    pieces.flatMap((piece) => piece.reviewFlags || [])
  )].sort((a, b) => a.localeCompare(b))
}

function getProjectOptions(pieces) {
  return [...new Set(
    pieces.map((piece) => piece.primaryProject).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b))
}

function buildSummary(pieces) {
  const byProject = new Map()
  const byFlag = new Map()

  for (const piece of pieces) {
    const project = piece.primaryProject || 'General'
    byProject.set(project, (byProject.get(project) || 0) + 1)

    for (const flag of piece.reviewFlags || []) {
      byFlag.set(flag, (byFlag.get(flag) || 0) + 1)
    }
  }

  return {
    byProject: [...byProject.entries()].sort((a, b) => b[1] - a[1]),
    byFlag: [...byFlag.entries()].sort((a, b) => b[1] - a[1]),
  }
}

export function ReviewQueuePage({ pieces }) {
  const queued = useMemo(
    () => pieces.filter((piece) => piece.reviewFlags?.length),
    [pieces]
  )

  const [query, setQuery] = useState('')
  const [flagFilter, setFlagFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')

  const flagOptions = useMemo(() => getFlagOptions(queued), [queued])
  const projectOptions = useMemo(() => getProjectOptions(queued), [queued])
  const summary = useMemo(() => buildSummary(queued), [queued])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return queued.filter((piece) => {
      if (flagFilter !== 'all' && !(piece.reviewFlags || []).includes(flagFilter)) return false
      if (projectFilter !== 'all' && piece.primaryProject !== projectFilter) return false

      if (!q) return true

      const haystack = [
        piece.title,
        piece.subtitle,
        piece.excerpt,
        piece.primaryProject,
        ...(piece.reviewFlags || []),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [queued, query, flagFilter, projectFilter])

  return (
    <main className="page review-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">review / overrides / cleanup</div>
        <h1>Review Queue</h1>
        <p className="project-hero__description">
          Imported pieces that probably need metadata cleanup, project reassignment, or richer handling.
        </p>
        <div className="project-hero__meta">
          <span>{filtered.length} visible</span>
          <span>{queued.length} total flagged</span>
        </div>
      </section>

      <section className="review-summary-grid">
        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">by project</div>
          <ul>
            {summary.byProject.map(([name, count]) => (
              <li key={name}><span>{name}</span><strong>{count}</strong></li>
            ))}
          </ul>
        </article>

        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">by flag</div>
          <ul>
            {summary.byFlag.map(([name, count]) => (
              <li key={name}><span>{name}</span><strong>{count}</strong></li>
            ))}
          </ul>
        </article>
      </section>

      <section className="archive-controls">
        <label className="archive-control">
          <span>search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="title, flag, project..."
          />
        </label>

        <label className="archive-control">
          <span>flag</span>
          <select value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)}>
            <option value="all">all</option>
            {flagOptions.map((flag) => (
              <option key={flag} value={flag}>{flag}</option>
            ))}
          </select>
        </label>

        <label className="archive-control">
          <span>project</span>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">all</option>
            {projectOptions.map((project) => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="review-queue">
        {filtered.map((piece) => {
          const display = splitDisplayTitle(piece)
          const snippet = buildOverrideSnippet(piece)

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
                {(piece.reviewFlags || []).map((flag) => (
                  <span key={flag} className="review-flag">{flag}</span>
                ))}
              </div>

              <div className="review-card__actions">
                <CopyButton text={snippet} />
              </div>

              <pre className="review-card__snippet">{snippet}</pre>
            </article>
          )
        })}
      </section>
    </main>
  )
}
