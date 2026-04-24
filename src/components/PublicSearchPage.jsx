import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { splitDisplayTitle } from '../lib/content'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'article', label: 'Articles' },
  { key: 'dispatch', label: 'Dispatches' },
  { key: 'podcast', label: 'Podcasts' },
  { key: 'print', label: 'Print' },
]

function normalizeType(piece) {
  const raw = String(piece?.type || '').toLowerCase()
  if (raw.includes('podcast')) return 'podcast'
  if (raw.includes('dispatch')) return 'dispatch'
  if (raw.includes('print') || piece?.hasPrintAssets) return 'print'
  return 'article'
}

function formatDate(value, label) {
  if (label) return label
  const d = new Date(value || '')
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
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
  const imageUrl = piece?.featuredImage || getImportedImage(piece) || ''

  return {
    id: piece?.id || piece?.slug || title,
    slug: piece?.slug || '',
    title,
    excerpt,
    type: normalizeType(piece),
    rawType: piece?.type || '',
    project,
    publishedAt: piece?.publishedAt || '',
    publishedDateLabel: piece?.publishedDateLabel || '',
    imageUrl,
    href: piece?.slug ? `/post/${piece.slug}` : '/archive',
    hasPrintAssets: !!piece?.hasPrintAssets,
  }
}

function ArchiveCard({ item, featured = false }) {
  return (
    <article className={`archive-card${featured ? ' archive-card--featured' : ''}`}>
      <Link className="archive-card__media" to={item.href} aria-label={item.title}>
        {item.imageUrl ? (
          <div
            className="archive-card__image"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.55)), url("${item.imageUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <div className="archive-card__image archive-card__image--fallback" />
        )}
      </Link>

      <div className="archive-card__body">
        <div className="archive-card__meta">
          {item.publishedDateLabel || item.publishedAt ? (
            <span>{formatDate(item.publishedAt, item.publishedDateLabel)}</span>
          ) : null}
          <span>{item.type}</span>
          {item.project ? <span>{item.project}</span> : null}
        </div>

        <h2 className="archive-card__title">
          <Link to={item.href}>{item.title}</Link>
        </h2>

        
      </div>
    </article>
  )
}

export function PublicSearchPage({ pieces = [] }) {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
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

  const normalized = useMemo(() => {
    return mergeNativeAndImportedPieces(Array.isArray(pieces) ? pieces : [], nativePieces)
      .map(normalizePiece)
      .sort((a, b) => {
        const aTime = new Date(a.publishedAt || 0).getTime()
        const bTime = new Date(b.publishedAt || 0).getTime()
        return bTime - aTime
      })
  }, [pieces, nativePieces])

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
  }, [normalized, activeFilter, query])

  const featured = filtered[0] || null
  const results = featured ? filtered.slice(1, visibleCount + 1) : filtered.slice(0, visibleCount)

  const counts = useMemo(() => {
    const out = { all: normalized.length, article: 0, dispatch: 0, podcast: 0, print: 0 }
    for (const item of normalized) {
      if (item.type in out) out[item.type] += 1
      if (item.hasPrintAssets && item.type !== 'print') out.print += 0
    }
    return out
  }, [normalized])

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
              onClick={() => {
                setActiveFilter(filter.key)
                setVisibleCount(24)
              }}
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
