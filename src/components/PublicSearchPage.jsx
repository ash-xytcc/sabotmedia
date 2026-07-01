import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { splitDisplayTitle } from '../lib/content'
import { buildPublicPostPath } from '../lib/publicSiteRouting'
function resolveCanonicalSlug(piece) {
  return String(
    piece?.slug ||
    piece?.nativeSlug ||
    piece?.canonicalSlug ||
    piece?.id ||
    ''
  ).trim()
}


const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'article', label: 'Articles' },
  { key: 'podcast', label: 'Podcasts' },
  { key: 'comic', label: 'Comics' },
  { key: 'zine', label: 'Zines' },
  { key: 'newsletter', label: 'Newsletters' },
  { key: 'print', label: 'Print' },
]

function normalizeType(piece) {
  const raw = String(piece?.type || piece?.contentType || '').toLowerCase()
  if (raw.includes('podcast')) return 'podcast'
  if (raw.includes('comic')) return 'comic'
  if (raw.includes('zine')) return 'zine'
  if (raw.includes('newsletter')) return 'newsletter'
  if (raw.includes('print') || piece?.hasPrintAssets) return 'print'
  return 'article'
}

function normalizeArchiveSlug(piece) {
  const candidates = [
    piece?.slug,
    piece?.id,
    piece?.href,
    piece?.permalink,
    piece?.sourceUrl,
  ]

  for (const candidate of candidates) {
    const value = String(candidate || '').trim()
    if (!value) continue

    const cleaned = value
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/?#?\/?/i, '/')
      .replace(/^[^#]*#\/?/, '/')
      .replace(/[?#].*$/, '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/^(post|piece|native-preview)\//, '')
      .replace(/^post-/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (cleaned) return cleaned
  }

  return ''
}

function normalizeCardImageUrl(rawUrl) {
  const url = String(rawUrl || '').trim()
  if (!url) return ''
  if (url.startsWith('#')) return ''
  if (/^javascript:/i.test(url)) return ''
  return url
}

function normalizePiece(piece) {
  const display = typeof splitDisplayTitle === 'function'
    ? splitDisplayTitle(piece)
    : {
        title: piece?.title || piece?.slug || 'Untitled',
        subtitle: piece?.subtitle || '',
      }

  const title = display?.title || piece?.title || piece?.slug || 'Untitled'
  const subtitle = display?.subtitle || piece?.subtitle || ''
  const excerpt = piece?.excerpt || subtitle || ''
  const project = piece?.primaryProject || ''
  const slug = resolveCanonicalSlug(piece)
  const imageUrl = normalizeCardImageUrl(piece?.featuredImage || getImportedImage(piece) || '')

  return {
    id: piece?.id || slug || title,
    slug,
    title,
    excerpt,
    type: normalizeType(piece),
    rawType: piece?.type || '',
    project,
    publishedAt: piece?.publishedAt || '',
    publishedDateLabel: piece?.publishedDateLabel || '',
    imageUrl,
    href: slug ? buildPublicPostPath(slug) : '/archive',
    hasPrintAssets: !!piece?.hasPrintAssets,
    sourceKind: piece?.sourceKind || 'archive',
  }
}

function ArchiveCard({ item, featured = false }) {
  const [hideImage, setHideImage] = useState(false)
  const hasImage = item.imageUrl && !hideImage

  return (
    <article className={`archive-card${featured ? ' archive-card--featured' : ''}`}>
      <Link className="archive-card__media" to={item.href} aria-label={item.title}>
        {hasImage ? (
          <div className="archive-card__image">
            <img
              className="archive-card__image-el"
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              onError={() => setHideImage(true)}
            />
          </div>
        ) : (
          <div className="archive-card__image archive-card__image--fallback" />
        )}
        <div className="archive-card__overlay">
          <h2 className="archive-card__title">{item.title}</h2>
        </div>
      </Link>
      <div className="archive-card__actions">
        <Link className="button button--primary" to={item.href}>Read</Link>
        <Link className="button" to={`${item.href}/print`}>Print</Link>
      </div>
    </article>
  )
}

export function PublicSearchPage({ pieces = [] }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const initialFormat = searchParams.get('format') || searchParams.get('type') || 'all'
  const [activeFilter, setActiveFilter] = useState(FILTERS.some((filter) => filter.key === initialFormat) ? initialFormat : 'all')
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') || 'all')
  const [visibleCount, setVisibleCount] = useState(24)
  const [nativePieces, setNativePieces] = useState([])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const loaded = await loadPublishedNativePieces()
      if (!cancelled) setNativePieces(loaded)
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const wordpressFeed = useWordPressPieces(pieces)
  const livePieces = wordpressFeed.pieces || pieces

  const normalized = useMemo(() => {
    return mergeNativeAndImportedPieces(Array.isArray(livePieces) ? livePieces : [], nativePieces)
      .map(normalizePiece)
      .filter((item) => item.slug)
      .sort((a, b) => {
        const aNative = a.sourceKind === 'native' ? 1 : 0
        const bNative = b.sourceKind === 'native' ? 1 : 0
        if (aNative !== bNative) return bNative - aNative
        const aTime = new Date(a.publishedAt || 0).getTime()
        const bTime = new Date(b.publishedAt || 0).getTime()
        return bTime - aTime
      })
  }, [livePieces, nativePieces])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return normalized.filter((item) => {
      const filterPass =
        activeFilter === 'all'
          ? true
          : activeFilter === 'print'
            ? item.type === 'print' || item.hasPrintAssets
            : item.type === activeFilter

      if (!filterPass) return false
      if (projectFilter !== 'all' && item.project !== projectFilter) return false
      if (!q) return true

      const haystack = [
        item.title,
        item.excerpt,
        item.project,
        item.type,
        item.publishedDateLabel,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [normalized, activeFilter, projectFilter, query])

  const featured = filtered[0] || null
  const results = featured ? filtered.slice(1, visibleCount + 1) : filtered.slice(0, visibleCount)

  const counts = useMemo(() => {
    const out = Object.fromEntries(FILTERS.map((filter) => [filter.key, 0]))
    out.all = normalized.length
    for (const item of normalized) {
      if (item.type in out) out[item.type] += 1
      if (item.hasPrintAssets && item.type !== 'print') out.print += 1
    }
    return out
  }, [normalized])

  const projectOptions = useMemo(() => {
    return [...new Set(normalized.map((item) => item.project).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
  }, [normalized])

  useEffect(() => {
    const nextFormat = searchParams.get('format') || searchParams.get('type') || 'all'
    if (FILTERS.some((filter) => filter.key === nextFormat) && nextFormat !== activeFilter) {
      setActiveFilter(nextFormat)
      setVisibleCount(24)
    }
    const nextProject = searchParams.get('project') || 'all'
    if (nextProject !== projectFilter) {
      setProjectFilter(nextProject)
      setVisibleCount(24)
    }
  }, [activeFilter, projectFilter, searchParams])

  function updateFilter(filterKey) {
    setActiveFilter(filterKey)
    setVisibleCount(24)
    const next = new URLSearchParams(searchParams)
    if (filterKey === 'all') {
      next.delete('format')
      next.delete('type')
    } else {
      next.set('format', filterKey)
      next.delete('type')
    }
    setSearchParams(next, { replace: true })
  }

  function updateProjectFilter(project) {
    setProjectFilter(project)
    setVisibleCount(24)
    const next = new URLSearchParams(searchParams)
    if (project === 'all') next.delete('project')
    else next.set('project', project)
    setSearchParams(next, { replace: true })
  }

  return (
    <main className="page public-search-page archive-page">
      <PublicationTopbar />

      <section className="project-hero archive-page__hero">
        <div className="project-hero__eyebrow">archive / browse / publication</div>
        <h1>Archive</h1>
        <p className="project-hero__description">
          Browse articles, dispatches, podcasts, and print material from across the publication. Search still works, but browsing comes first.
        </p>
        <div className="project-hero__meta">
          <span>{normalized.length} pieces</span>
          <span>newest first</span>
        </div>
      </section>

      <section className="archive-filter-bar">
        <div className="archive-filter-bar__filters" role="tablist" aria-label="Archive filters">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`archive-filter-chip${activeFilter === filter.key ? ' is-active' : ''}`}
              onClick={() => updateFilter(filter.key)}
            >
              {filter.label}
              <span className="archive-filter-chip__count">
                {filter.key === 'all' ? counts.all : counts[filter.key]}
              </span>
            </button>
          ))}
        </div>

        <label className="archive-search-control">
          <span>Search the archive</span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setVisibleCount(24)
            }}
            placeholder="Title, project, excerpt..."
          />
        </label>

        {projectOptions.length ? (
          <label className="archive-search-control">
            <span>Project</span>
            <select value={projectFilter} onChange={(event) => updateProjectFilter(event.target.value)}>
              <option value="all">All projects</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      {featured ? (
        <section className="archive-featured">
          <ArchiveCard item={featured} featured />
        </section>
      ) : null}

      <section className="archive-results">
        <div className="archive-results__header">
          <div className="archive-results__eyebrow">
            {activeFilter === 'all' ? 'recent archive' : `${activeFilter} archive`}
          </div>
          <p className="archive-results__summary">
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
            {query.trim() ? ` for “${query.trim()}”` : ''}
          </p>
        </div>

        {results.length ? (
          <div className="archive-card-grid">
            {results.map((item) => (
              <ArchiveCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <section className="missing-state">
            <h2>No archive results</h2>
            <p>Try a different filter or a broader search term.</p>
          </section>
        )}

        {filtered.length > results.length + (featured ? 1 : 0) ? (
          <div className="archive-load-more">
            <button
              type="button"
              className="button button--primary"
              onClick={() => setVisibleCount((count) => count + 24)}
            >
              Load more
            </button>
          </div>
        ) : null}
      </section>

      <PublicationFooter />
    </main>
  )
}
