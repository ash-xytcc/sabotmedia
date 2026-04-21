import { useMemo, useState, useEffect } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { getProjectMeta, splitDisplayTitle, isPublicProjectSlug, buildTypeOptions } from '../lib/content'
import { getProjectTheme } from '../lib/projectTheme'
import { getFeaturedPieceForProject } from '../lib/projectFeatured'
import { EditableText } from './EditableText'
import { usePublicEdit } from './PublicEditContext'
import { getConfiguredBlock } from '../lib/publicConfig'

const PAGE_SIZE = 24

function ProjectPieceCard({ piece }) {
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

export function ProjectPage({ pieces }) {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { effectiveConfig } = usePublicEdit()

  const heroBlock = getConfiguredBlock(effectiveConfig, 'projectPage.hero')
  const featuredBlock = getConfiguredBlock(effectiveConfig, 'projectPage.featured')
  const archiveBlock = getConfiguredBlock(effectiveConfig, 'projectPage.archive')

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  if (!isPublicProjectSlug(slug)) {
    return <Navigate to="/projects" replace />
  }

  const meta = getProjectMeta(slug)
  const theme = getProjectTheme(slug)

  const basePieces = useMemo(
    () => pieces.filter((piece) => (piece.primaryProjectSlug || '') === slug),
    [pieces, slug]
  )
  const featuredPiece = useMemo(() => getFeaturedPieceForProject(pieces, slug), [pieces, slug])

  const typeOptions = useMemo(() => buildTypeOptions(basePieces), [basePieces])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    const out = [...basePieces].filter((piece) => {
      if (typeFilter !== 'all' && piece.type !== typeFilter) return false
      if (!q) return true

      const haystack = [
        piece.title,
        piece.subtitle,
        piece.excerpt,
        ...(piece.tags || []),
      ].join(' ').toLowerCase()

      return haystack.includes(q)
    })

    out.sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.publishedAt) - new Date(b.publishedAt)
      if (sortBy === 'title') return String(a.title || '').localeCompare(String(b.title || ''))
      return new Date(b.publishedAt) - new Date(a.publishedAt)
    })

    return out
  }, [basePieces, query, typeFilter, sortBy])

  useEffect(() => {
    const next = {}
    if (query.trim()) next.q = query.trim()
    if (typeFilter !== 'all') next.type = typeFilter
    if (sortBy !== 'newest') next.sort = sortBy
    setSearchParams(next, { replace: true })
  }, [query, typeFilter, sortBy, setSearchParams])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, typeFilter, sortBy, slug])

  const visiblePieces = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <main className={`page project-page ${theme.className}`}>
      <section className="project-hero">
        <EditableText as="div" className="project-hero__eyebrow" field={heroBlock?.eyebrowField || 'projectPage.hero.eyebrow'}>
          project archive
        </EditableText>
        <h1>{meta.name}</h1>
        <EditableText as="p" className="project-hero__description" field={heroBlock?.descriptionField || 'projectPage.hero.description'}>
          {meta.description}
        </EditableText>
        <div className="project-hero__meta">
          <span>{filtered.length} pieces</span>
          <span>imported archive + native-ready structure</span>
        </div>
      </section>

      {featuredPiece ? (
        <section className="project-featured-callout">
          <EditableText as="div" className="project-featured-callout__eyebrow" field={featuredBlock?.eyebrowField || 'projectPage.featured.eyebrow'}>
            featured in this lane
          </EditableText>
          <h2><Link to={`/piece/${featuredPiece.slug}`}>{splitDisplayTitle(featuredPiece).title}</Link></h2>
          {featuredPiece.excerpt ? <p>{featuredPiece.excerpt}</p> : null}
        </section>
      ) : null}

      <section className="section-heading">
        <EditableText as="p" field={archiveBlock?.eyebrowField || 'projectPage.archive.eyebrow'}>
          Project archive
        </EditableText>
        <EditableText as="h2" field={archiveBlock?.titleField || 'projectPage.archive.title'}>
          Browse pieces
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
          <span>sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">newest</option>
            <option value="oldest">oldest</option>
            <option value="title">title</option>
          </select>
        </label>
      </section>

      {filtered.length ? (
        <>
          <section className="piece-grid">
            {visiblePieces.map((piece) => (
              <ProjectPieceCard key={piece.id} piece={piece} />
            ))}
          </section>

          <section className="archive-results-bar">
            <span>showing {visiblePieces.length} of {filtered.length}</span>
            {hasMore ? (
              <button className="button button--primary" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                load more
              </button>
            ) : null}
          </section>
        </>
      ) : (
        <section className="missing-state">
          <h2>No matching pieces</h2>
          <p>Try changing the search or filters.</p>
        </section>
      )}
    </main>
  )
}
