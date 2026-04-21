import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { splitDisplayTitle, buildTypeOptions } from '../lib/content'
import { EditableText } from './EditableText'
import { usePublicEdit } from './PublicEditContext'
import { getConfiguredBlock } from '../lib/publicConfig'

const PAGE_SIZE = 24

function PieceCard({ piece }) {
  const display = splitDisplayTitle(piece)

  return (
    <article className="piece-card">
      <div className="piece-card__meta">
        <span>{piece.primaryProject}</span>
        <span>{piece.type}</span>
      </div>
      <h3>
        <Link to={`/piece/${piece.slug}`}>{display.title}</Link>
      </h3>
      {display.subtitle ? <p className="piece-card__subtitle">{display.subtitle}</p> : null}
      {piece.excerpt ? <p>{piece.excerpt}</p> : null}
      <div className="piece-card__footer">
        <span>{piece.publishedDateLabel}</span>
        {piece.hasPrintAssets ? <span>print</span> : null}
      </div>
    </article>
  )
}

export function HomePage({ featured, latest, projectMap, allPieces }) {
  const featuredDisplay = splitDisplayTitle(featured)
  const [searchParams, setSearchParams] = useSearchParams()
  const { effectiveConfig } = usePublicEdit()

  const featuredBlock = getConfiguredBlock(effectiveConfig, 'home.featured')
  const archiveBlock = getConfiguredBlock(effectiveConfig, 'home.archive')

  const initialQuery = searchParams.get('q') || ''
  const initialType = searchParams.get('type') || 'all'
  const initialProject = searchParams.get('project') || 'all'

  const [query, setQuery] = useState(initialQuery)
  const [typeFilter, setTypeFilter] = useState(initialType)
  const [projectFilter, setProjectFilter] = useState(initialProject)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const typeOptions = useMemo(() => buildTypeOptions(allPieces || []), [allPieces])

  const filteredPieces = useMemo(() => {
    const q = query.trim().toLowerCase()

    return [...(allPieces || [])]
      .filter((piece) => {
        if (typeFilter !== 'all' && piece.type !== typeFilter) return false
        if (projectFilter !== 'all' && piece.primaryProjectSlug !== projectFilter) return false
        if (!q) return true

        const haystack = [
          piece.title,
          piece.subtitle,
          piece.excerpt,
          piece.primaryProject,
          ...(piece.tags || []),
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(q)
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  }, [allPieces, query, typeFilter, projectFilter])

  useEffect(() => {
    const next = {}
    if (query.trim()) next.q = query.trim()
    if (typeFilter !== 'all') next.type = typeFilter
    if (projectFilter !== 'all') next.project = projectFilter
    setSearchParams(next, { replace: true })
  }, [query, typeFilter, projectFilter, setSearchParams])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, typeFilter, projectFilter])

  const visiblePieces = filteredPieces.slice(0, visibleCount)
  const hasMore = visibleCount < filteredPieces.length

  return (
    <main className="page page-home">
      <section
        className="hero hero--featured"
        style={featured?.heroImage ? {
          backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.55), rgba(8,8,8,0.82)), url(${featured.heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <div className="hero__content">
          <EditableText as="div" className="hero__eyebrow" field={featuredBlock?.eyebrowField || 'home.featured.eyebrow'}>
            Featured drop
          </EditableText>

          <EditableText as="h1" field={featuredBlock?.titleField || 'home.featured.title'}>
            {featuredDisplay.title || 'Sabot Media'}
          </EditableText>

          {featuredDisplay.subtitle ? (
            <EditableText as="p" className="hero__subtitle" field={featuredBlock?.subtitleField || 'home.featured.subtitle'}>
              {featuredDisplay.subtitle}
            </EditableText>
          ) : null}

          <div className="hero__meta">
            <span>{featured?.primaryProject}</span>
            <span>{featured?.type}</span>
            <span>{featured?.publishedDateLabel}</span>
          </div>

          {featured?.excerpt ? (
            <EditableText as="p" className="hero__excerpt" field={featuredBlock?.excerptField || 'home.featured.excerpt'}>
              {featured.excerpt}
            </EditableText>
          ) : null}

          {featured ? (
            <div className="hero__actions">
              <Link className="button button--primary" to={`/piece/${featured.slug}`}>read</Link>
              <Link className="button" to={`/piece/${featured.slug}?mode=experience`}>experience</Link>
              <Link className="button" to={`/piece/${featured.slug}/print`}>print</Link>
            </div>
          ) : null}
        </div>

        <aside className="hero__rail">
          <div className="manifesto-card">
            <EditableText as="div" className="manifesto-card__eyebrow" field="home.projects.eyebrow">
              Projects
            </EditableText>
            <ul className="project-list">
              {projectMap.map((project) => (
                <li key={project.slug}>
                  <div>
                    <strong><Link to={`/projects/${project.slug}`}>{project.name}</Link></strong>
                    <span>{project.count} pieces</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section className="section-heading">
        <EditableText as="p" field={archiveBlock?.eyebrowField || 'home.archive.eyebrow'}>
          Archive flow
        </EditableText>
        <EditableText as="h2" field={archiveBlock?.titleField || 'home.archive.title'}>
          Browse imported pieces
        </EditableText>
      </section>

      <section className="archive-controls">
        <label className="archive-control">
          <span>search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="title, excerpt, tag..."
          />
        </label>

        <label className="archive-control">
          <span>type</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">all</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="archive-control">
          <span>project</span>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">all</option>
            {projectMap.map((project) => (
              <option key={project.slug} value={project.slug}>{project.name}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="piece-grid">
        {visiblePieces.map((piece) => (
          <PieceCard key={piece.id} piece={piece} />
        ))}
      </section>

      {filteredPieces.length ? (
        <section className="archive-results-bar">
          <span>showing {visiblePieces.length} of {filteredPieces.length}</span>
          {hasMore ? (
            <button className="button button--primary" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
              load more
            </button>
          ) : null}
        </section>
      ) : (
        <section className="missing-state">
          <h2>No matching pieces</h2>
          <p>Try changing the search or filters.</p>
        </section>
      )}
    </main>
  )
}
