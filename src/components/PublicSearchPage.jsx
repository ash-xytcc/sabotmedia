import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { slugifyProject, splitDisplayTitle } from '../lib/content'
import { buildPublicPostPath } from '../lib/publicSiteRouting'
import { EditableText } from './EditableText'
import { editableContentRegistry } from '../lib/editableContentRegistry'
import { getConfiguredText } from '../lib/publicConfig'
import { useResolvedConfig } from '../lib/useResolvedConfig'
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
  const projectSlug = piece?.primaryProjectSlug || slugifyProject(project)
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
    projectSlug,
    publishedAt: piece?.publishedAt || '',
    publishedDateLabel: piece?.publishedDateLabel || '',
    imageUrl,
    href: slug ? buildPublicPostPath(slug) : '/archive',
    hasPrintAssets: !!piece?.hasPrintAssets,
    sourceKind: piece?.sourceKind || 'archive',
  }
}

function HighlightText({ text, query }) {
  const value = String(text || '')
  const needle = String(query || '').trim()
  if (!needle) return value

  const lower = value.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const parts = []
  let index = 0
  let matchIndex = lower.indexOf(lowerNeedle, index)

  while (matchIndex >= 0) {
    if (matchIndex > index) parts.push(value.slice(index, matchIndex))
    parts.push(<mark key={`${matchIndex}-${lowerNeedle}`}>{value.slice(matchIndex, matchIndex + needle.length)}</mark>)
    index = matchIndex + needle.length
    matchIndex = lower.indexOf(lowerNeedle, index)
  }

  if (index < value.length) parts.push(value.slice(index))
  return parts
}

function ArchiveCard({ item, featured = false, query = '', readLabel = 'Read', printLabel = 'Print' }) {
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
          <h2 className="archive-card__title"><HighlightText text={item.title} query={query} /></h2>
        </div>
      </Link>
      <div className="archive-card__actions">
        <Link className="button button--primary" to={item.href}>{readLabel}</Link>
        <Link className="button" to={`${item.href}/print`}>{printLabel}</Link>
      </div>
    </article>
  )
}

export function PublicSearchPage({ pieces = [] }) {
  const archiveCopy = editableContentRegistry.archive
  const resolvedConfig = useResolvedConfig()
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
      if (projectFilter !== 'all' && item.project !== projectFilter && item.projectSlug !== projectFilter) return false
      if (!q) return true

      const haystack = [
        item.title,
        item.excerpt,
        item.project,
        item.type,
        item.rawType,
        item.publishedDateLabel,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [normalized, activeFilter, projectFilter, query])

  const featured = filtered[0] || null
  const results = featured ? filtered.slice(1, visibleCount + 1) : filtered.slice(0, visibleCount)

  const projectOptions = useMemo(() => {
    return [...new Set(normalized.map((item) => item.project).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
  }, [normalized])

  const readLabel = getConfiguredText(resolvedConfig, archiveCopy.readLabel.field, archiveCopy.readLabel.defaultText)
  const printLabel = getConfiguredText(resolvedConfig, archiveCopy.printLabel.field, archiveCopy.printLabel.defaultText)
  const loadMoreLabel = getConfiguredText(resolvedConfig, archiveCopy.loadMoreLabel.field, archiveCopy.loadMoreLabel.defaultText)
  const clearFiltersLabel = getConfiguredText(resolvedConfig, archiveCopy.clearFiltersLabel.field, archiveCopy.clearFiltersLabel.defaultText)
  const recentLabel = getConfiguredText(resolvedConfig, archiveCopy.recentLabel.field, archiveCopy.recentLabel.defaultText)
  const allProjectsLabel = getConfiguredText(resolvedConfig, archiveCopy.allProjectsLabel.field, archiveCopy.allProjectsLabel.defaultText)
  const allFormatsLabel = getConfiguredText(resolvedConfig, archiveCopy.allFormatsLabel.field, archiveCopy.allFormatsLabel.defaultText)
  const countLabel = getConfiguredText(resolvedConfig, archiveCopy.countLabel.field, archiveCopy.countLabel.defaultText)

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

  function clearArchiveFilters() {
    setQuery('')
    setActiveFilter('all')
    setProjectFilter('all')
    setVisibleCount(24)
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return (
    <main className="page public-search-page archive-page">
      <PublicationTopbar />

      <section className="project-hero archive-page__hero">
        <EditableText as="div" className="project-hero__eyebrow" field={archiveCopy.eyebrow.field}>
          {archiveCopy.eyebrow.defaultText}
        </EditableText>
        <EditableText as="h1" field={archiveCopy.title.field}>
          {archiveCopy.title.defaultText}
        </EditableText>
        <EditableText as="p" className="project-hero__description" field={archiveCopy.body.field} multiline>
          {archiveCopy.body.defaultText}
        </EditableText>
        <div className="project-hero__meta">
          <span>{normalized.length} {countLabel}</span>
        </div>
      </section>

      <section className="archive-filter-bar">
        <label className="archive-search-control">
          <EditableText as="span" field={archiveCopy.formatLabel.field}>
            {archiveCopy.formatLabel.defaultText}
          </EditableText>
          <select value={activeFilter} onChange={(event) => updateFilter(event.target.value)}>
            {FILTERS.map((filter) => (
              <option key={filter.key} value={filter.key}>
                {filter.key === 'all' ? allFormatsLabel : filter.label}
              </option>
            ))}
          </select>
        </label>

        <label className="archive-search-control">
          <EditableText as="span" field={archiveCopy.searchLabel.field}>
            {archiveCopy.searchLabel.defaultText}
          </EditableText>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setVisibleCount(24)
            }}
            placeholder={getConfiguredText(resolvedConfig, archiveCopy.searchPlaceholder.field, archiveCopy.searchPlaceholder.defaultText)}
          />
        </label>

        {projectOptions.length ? (
          <label className="archive-search-control">
            <EditableText as="span" field={archiveCopy.projectLabel.field}>
              {archiveCopy.projectLabel.defaultText}
            </EditableText>
            <select value={projectFilter} onChange={(event) => updateProjectFilter(event.target.value)}>
              <option value="all">{allProjectsLabel}</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      {featured ? (
        <section className="archive-featured">
          <ArchiveCard item={featured} featured query={query} readLabel={readLabel} printLabel={printLabel} />
        </section>
      ) : null}

      <section className="archive-results">
        <div className="archive-results__header">
          <div className="archive-results__eyebrow">
            {activeFilter === 'all' ? recentLabel : `${activeFilter} archive`}
          </div>
          <p className="archive-results__summary">
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
            {query.trim() ? ` for “${query.trim()}”` : ''}
          </p>
        </div>

        {results.length ? (
          <div className="archive-card-grid">
            {results.map((item) => (
              <ArchiveCard key={item.id} item={item} query={query} readLabel={readLabel} printLabel={printLabel} />
            ))}
          </div>
        ) : (
          <section className="missing-state">
            <EditableText as="h2" field={archiveCopy.emptyTitle.field}>
              {archiveCopy.emptyTitle.defaultText}
            </EditableText>
            <EditableText as="p" field={archiveCopy.emptyBody.field}>
              {archiveCopy.emptyBody.defaultText}
            </EditableText>
            <div className="archive-empty-actions">
              <button className="button" type="button" onClick={clearArchiveFilters}>
                {clearFiltersLabel}
              </button>
            </div>
          </section>
        )}

        {filtered.length > results.length + (featured ? 1 : 0) ? (
          <div className="archive-load-more">
            <button
              type="button"
              className="button button--primary"
              onClick={() => setVisibleCount((count) => count + 24)}
            >
              {loadMoreLabel}
            </button>
          </div>
        ) : null}
      </section>

      <PublicationFooter />
    </main>
  )
}
