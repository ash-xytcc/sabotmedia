import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { splitDisplayTitle, buildProjectMap } from '../lib/content'
import { CopyButton } from './CopyButton'
import { EditableText } from './EditableText'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { getConfiguredBlock, getConfiguredText } from '../lib/publicConfig'
import { getFeaturedPieceForProject } from '../lib/projectFeatured'

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

function buildQuickOverride(piece, form) {
  const out = {}

  if (form.project) {
    out.primaryProject = form.project
    out.primaryProjectSlug = slugifyProject(form.project)
  }

  if (form.subtitle.trim()) out.subtitle = form.subtitle.trim()
  if (form.excerpt.trim()) out.excerpt = form.excerpt.trim()
  if (form.heroImage.trim()) out.heroImage = form.heroImage.trim()
  if (form.audioSummary.trim()) out.audioSummary = form.audioSummary.trim()
  if (form.transcriptExcerpt.trim()) out.transcriptExcerpt = form.transcriptExcerpt.trim()
  if (form.hidden) out.hidden = true
  if (form.featured) out.featured = true
  if (form.clearFeatured) out.featured = false

  return {
    [piece.slug]: out,
  }
}

function slugifyProject(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function groupPieces(items, groupMode) {
  if (groupMode === 'project') {
    const groups = new Map()
    for (const item of items) {
      const key = item.primaryProject || 'General'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }
    return [...groups.entries()]
  }

  if (groupMode === 'flag') {
    const groups = new Map()
    for (const item of items) {
      const flags = item.reviewFlags?.length ? item.reviewFlags : ['unflagged']
      for (const flag of flags) {
        if (!groups.has(flag)) groups.set(flag, [])
        groups.get(flag).push(item)
      }
    }
    return [...groups.entries()]
  }

  return [['all results', items]]
}

function OverrideBuilder({
  piece,
  projectOptions,
  toolBlock,
  resolvedConfig,
}) {
  const subtitlePlaceholder = getConfiguredText(resolvedConfig, toolBlock?.subtitlePlaceholderField || 'review.overrideTools.subtitlePlaceholder', 'subtitle')
  const excerptPlaceholder = getConfiguredText(resolvedConfig, toolBlock?.excerptPlaceholderField || 'review.overrideTools.excerptPlaceholder', 'excerpt')
  const heroImagePlaceholder = getConfiguredText(resolvedConfig, toolBlock?.heroImagePlaceholderField || 'review.overrideTools.heroImagePlaceholder', 'hero image url')
  const projectLabel = getConfiguredText(resolvedConfig, toolBlock?.projectLabelField || 'review.overrideTools.projectLabel', 'project reassignment')
  const hideLabel = getConfiguredText(resolvedConfig, toolBlock?.hideLabelField || 'review.overrideTools.hideLabel', 'hidden')
  const featuredLabel = getConfiguredText(resolvedConfig, toolBlock?.featuredLabelField || 'review.overrideTools.featuredLabel', 'featured')
  const heroImageLabel = getConfiguredText(resolvedConfig, toolBlock?.heroImageLabelField || 'review.overrideTools.heroImageLabel', 'hero image')
  const audioSummaryLabel = getConfiguredText(resolvedConfig, toolBlock?.audioSummaryLabelField || 'review.overrideTools.audioSummaryLabel', 'audio summary')
  const transcriptLabel = getConfiguredText(resolvedConfig, toolBlock?.transcriptLabelField || 'review.overrideTools.transcriptLabel', 'transcript excerpt')
  const copySnippetAction = getConfiguredText(resolvedConfig, toolBlock?.copySnippetActionField || 'review.overrideTools.copySnippetAction', 'copy override snippet')
  const copyJsonAction = getConfiguredText(resolvedConfig, toolBlock?.copyJsonActionField || 'review.overrideTools.copyJsonAction', 'copy override json')
  const clearAction = getConfiguredText(resolvedConfig, toolBlock?.clearActionField || 'review.overrideTools.clearAction', 'clear builder')
  const generatedLabel = getConfiguredText(resolvedConfig, toolBlock?.generatedLabelField || 'review.overrideTools.generatedLabel', 'generated override')
  const explicitAction = getConfiguredText(resolvedConfig, toolBlock?.explicitActionField || 'review.overrideTools.explicitAction', 'make explicit feature')
  const unfeatureAction = getConfiguredText(resolvedConfig, toolBlock?.unfeatureActionField || 'review.overrideTools.unfeatureAction', 'clear featured flag')

  const [form, setForm] = useState({
    project: piece.primaryProject || '',
    subtitle: '',
    excerpt: '',
    heroImage: '',
    audioSummary: '',
    transcriptExcerpt: '',
    hidden: false,
    featured: false,
    clearFeatured: false,
  })

  const overrideObj = useMemo(() => buildQuickOverride(piece, form), [piece, form])
  const overrideJson = JSON.stringify(overrideObj, null, 2)
  const overrideSnippet = `"${piece.slug}": ${JSON.stringify(overrideObj[piece.slug], null, 2)}`
  const [copied, setCopied] = useState('')

  async function copy(text, mode) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(mode)
      window.setTimeout(() => setCopied(''), 1200)
    } catch {
      setCopied('')
    }
  }

  return (
    <div className="review-override-builder">
      <div className="review-override-builder__grid">
        <label className="archive-control">
          <span>{projectLabel}</span>
          <select value={form.project} onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value }))}>
            <option value="">keep current</option>
            {projectOptions.map((project) => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </label>

        <label className="archive-control">
          <span>{heroImageLabel}</span>
          <input
            type="text"
            value={form.heroImage}
            onChange={(e) => setForm((prev) => ({ ...prev, heroImage: e.target.value }))}
            placeholder={heroImagePlaceholder}
          />
        </label>

        <label className="archive-control">
          <span>subtitle</span>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
            placeholder={subtitlePlaceholder}
          />
        </label>

        <label className="archive-control">
          <span>{audioSummaryLabel}</span>
          <input
            type="text"
            value={form.audioSummary}
            onChange={(e) => setForm((prev) => ({ ...prev, audioSummary: e.target.value }))}
            placeholder={audioSummaryLabel}
          />
        </label>
      </div>

      <label className="archive-control">
        <span>{transcriptLabel}</span>
        <textarea
          className="review-override-builder__textarea"
          value={form.transcriptExcerpt}
          onChange={(e) => setForm((prev) => ({ ...prev, transcriptExcerpt: e.target.value }))}
          placeholder={transcriptLabel}
        />
      </label>

      <label className="archive-control">
        <span>excerpt</span>
        <textarea
          className="review-override-builder__textarea"
          value={form.excerpt}
          onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
          placeholder={excerptPlaceholder}
        />
      </label>

      <div className="review-override-builder__toggles">
        <label><input type="checkbox" checked={form.hidden} onChange={(e) => setForm((prev) => ({ ...prev, hidden: e.target.checked }))} /> {hideLabel}</label>
        <label><input type="checkbox" checked={form.featured} onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked, clearFeatured: e.target.checked ? false : prev.clearFeatured }))} /> {explicitAction}</label>
        <label><input type="checkbox" checked={form.clearFeatured} onChange={(e) => setForm((prev) => ({ ...prev, clearFeatured: e.target.checked, featured: e.target.checked ? false : prev.featured }))} /> {unfeatureAction}</label>
      </div>

      <div className="review-card__actions">
        <button className="button button--primary" type="button" onClick={() => copy(overrideSnippet, 'snippet')}>
          {copied === 'snippet' ? 'copied' : copySnippetAction}
        </button>
        <button className="button button--primary" type="button" onClick={() => copy(overrideJson, 'json')}>
          {copied === 'json' ? 'copied' : copyJsonAction}
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setForm({
            project: piece.primaryProject || '',
            subtitle: '',
            excerpt: '',
            heroImage: '',
            audioSummary: '',
            transcriptExcerpt: '',
            hidden: false,
            featured: false,
            clearFeatured: false,
          })}
        >
          {clearAction}
        </button>
      </div>

      <div className="review-override-builder__output">
        <div className="review-summary-card__eyebrow">{generatedLabel}</div>
        <pre className="review-card__snippet">{overrideJson}</pre>
      </div>
    </div>
  )
}

export function ReviewQueuePage({ pieces }) {
  const resolvedConfig = useResolvedConfig()
  const heroBlock = getConfiguredBlock(resolvedConfig, 'review.hero')
  const summaryBlock = getConfiguredBlock(resolvedConfig, 'review.summary')
  const filtersBlock = getConfiguredBlock(resolvedConfig, 'review.filters')
  const metaBlock = getConfiguredBlock(resolvedConfig, 'review.meta')
  const featuredBlock = getConfiguredBlock(resolvedConfig, 'review.featured')
  const toolBlock = getConfiguredBlock(resolvedConfig, 'review.overrideTools')

  const projectSummaryLabel = getConfiguredText(resolvedConfig, summaryBlock?.projectLabelField || 'review.summary.projectLabel', 'by project')
  const flagSummaryLabel = getConfiguredText(resolvedConfig, summaryBlock?.flagLabelField || 'review.summary.flagLabel', 'by flag')
  const searchLabel = getConfiguredText(resolvedConfig, filtersBlock?.searchLabelField || 'review.filters.searchLabel', 'search')
  const searchPlaceholder = getConfiguredText(resolvedConfig, filtersBlock?.searchPlaceholderField || 'review.filters.searchPlaceholder', 'title, flag, project...')
  const flagLabel = getConfiguredText(resolvedConfig, filtersBlock?.flagLabelField || 'review.filters.flagLabel', 'flag')
  const projectLabel = getConfiguredText(resolvedConfig, filtersBlock?.projectLabelField || 'review.filters.projectLabel', 'project')
  const allLabel = getConfiguredText(resolvedConfig, filtersBlock?.allLabelField || 'review.filters.allLabel', 'all')
  const visibleLabel = getConfiguredText(resolvedConfig, metaBlock?.visibleLabelField || 'review.meta.visibleLabel', 'visible')
  const totalFlaggedLabel = getConfiguredText(resolvedConfig, metaBlock?.totalFlaggedLabelField || 'review.meta.totalFlaggedLabel', 'total flagged')
  const featuredLabel = getConfiguredText(resolvedConfig, featuredBlock?.labelField || 'review.featured.label', 'featured')
  const explicitLabel = getConfiguredText(resolvedConfig, featuredBlock?.explicitField || 'review.featured.explicit', 'explicit feature')
  const fallbackLabel = getConfiguredText(resolvedConfig, featuredBlock?.fallbackField || 'review.featured.fallback', 'fallback feature')
  const notFeaturedLabel = getConfiguredText(resolvedConfig, featuredBlock?.notFeaturedField || 'review.featured.notFeatured', 'not featured')
  const overrideEyebrow = getConfiguredText(resolvedConfig, toolBlock?.eyebrowField || 'review.overrideTools.eyebrow', 'override tools')
  const overrideTitle = getConfiguredText(resolvedConfig, toolBlock?.titleField || 'review.overrideTools.title', 'Quick Override Builder')
  const overrideDescription = getConfiguredText(resolvedConfig, toolBlock?.descriptionField || 'review.overrideTools.description', 'Generate override-ready snippets for common archive cleanup actions without hand-writing every object.')
  const groupByLabel = getConfiguredText(resolvedConfig, toolBlock?.groupByLabelField || 'review.overrideTools.groupByLabel', 'group by')
  const groupByProject = getConfiguredText(resolvedConfig, toolBlock?.groupByProjectField || 'review.overrideTools.groupByProject', 'project')
  const groupByFlag = getConfiguredText(resolvedConfig, toolBlock?.groupByFlagField || 'review.overrideTools.groupByFlag', 'flag')
  const groupByNone = getConfiguredText(resolvedConfig, toolBlock?.groupByNoneField || 'review.overrideTools.groupByNone', 'none')

  const queued = useMemo(
    () => pieces.filter((piece) => piece.reviewFlags?.length),
    [pieces]
  )

  const [query, setQuery] = useState('')
  const [flagFilter, setFlagFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [groupMode, setGroupMode] = useState('none')

  const flagOptions = useMemo(() => getFlagOptions(queued), [queued])
  const projectOptions = useMemo(() => getProjectOptions(queued), [queued])
  const summary = useMemo(() => buildSummary(queued), [queued])
  const allProjectMap = useMemo(() => buildProjectMap(pieces), [pieces])
  const allProjectNames = useMemo(() => allProjectMap.map((item) => item.name), [allProjectMap])

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

  const grouped = useMemo(() => groupPieces(filtered, groupMode), [filtered, groupMode])

  return (
    <main className="page review-page">
      <section className="project-hero">
        <EditableText as="div" className="project-hero__eyebrow" field={heroBlock?.eyebrowField || 'review.hero.eyebrow'}>
          review / overrides / cleanup
        </EditableText>
        <EditableText as="h1" field={heroBlock?.titleField || 'review.hero.title'}>
          Review Queue
        </EditableText>
        <EditableText as="p" className="project-hero__description" field={heroBlock?.descriptionField || 'review.hero.description'}>
          Imported pieces that probably need metadata cleanup, project reassignment, or richer handling.
        </EditableText>
        <div className="project-hero__meta">
          <span>{filtered.length} {visibleLabel}</span>
          <span>{queued.length} {totalFlaggedLabel}</span>
        </div>
      </section>

      <section className="review-summary-grid">
        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">{projectSummaryLabel}</div>
          <ul>
            {summary.byProject.map(([name, count]) => (
              <li key={name}><span>{name}</span><strong>{count}</strong></li>
            ))}
          </ul>
        </article>

        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">{flagSummaryLabel}</div>
          <ul>
            {summary.byFlag.map(([name, count]) => (
              <li key={name}><span>{name}</span><strong>{count}</strong></li>
            ))}
          </ul>
        </article>
      </section>

      <section className="archive-controls">
        <label className="archive-control">
          <span>{searchLabel}</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>

        <label className="archive-control">
          <span>{flagLabel}</span>
          <select value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)}>
            <option value="all">{allLabel}</option>
            {flagOptions.map((flag) => (
              <option key={flag} value={flag}>{flag}</option>
            ))}
          </select>
        </label>

        <label className="archive-control">
          <span>{projectLabel}</span>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">{allLabel}</option>
            {projectOptions.map((project) => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </label>

        <label className="archive-control">
          <span>{groupByLabel}</span>
          <select value={groupMode} onChange={(e) => setGroupMode(e.target.value)}>
            <option value="none">{groupByNone}</option>
            <option value="project">{groupByProject}</option>
            <option value="flag">{groupByFlag}</option>
          </select>
        </label>
      </section>

      <section className="review-queue review-queue--grouped">
        {grouped.map(([groupName, items]) => (
          <section key={groupName} className="review-group">
            {groupMode !== 'none' ? <h2 className="review-group__title">{groupName}</h2> : null}

            {items.map((piece) => {
              const display = splitDisplayTitle(piece)
              const snippet = buildOverrideSnippet(piece)
              const featuredResult = piece.primaryProjectSlug ? getFeaturedPieceForProject(pieces, piece.primaryProjectSlug) : null
              const featuredState = featuredResult?.piece?.slug === piece.slug
                ? featuredResult?.source === 'explicit'
                  ? explicitLabel
                  : fallbackLabel
                : notFeaturedLabel

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
                    <span className="review-flag review-flag--featured">{featuredLabel}: {featuredState}</span>
                  </div>

                  <div className="review-card__actions">
                    <CopyButton text={snippet} />
                  </div>

                  <OverrideBuilder
                    piece={piece}
                    projectOptions={allProjectNames}
                    toolBlock={toolBlock}
                    resolvedConfig={resolvedConfig}
                  />

                  <pre className="review-card__snippet">{snippet}</pre>
                </article>
              )
            })}
          </section>
        ))}
      </section>
    </main>
  )
}
