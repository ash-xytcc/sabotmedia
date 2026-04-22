import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchNativeEntries } from '../lib/nativePublicContentApi'
import { splitDisplayTitle } from '../lib/content'

function makeNativeResult(item) {
  const haystack = [
    item.title,
    item.excerpt,
    item.body,
    ...(item.tags || []),
    item.author,
    item.fullTranscript,
    item.transcriptExcerpt,
    item.audioSummary,
  ].join(' ').toLowerCase()

  return {
    kind: 'native',
    id: item.id,
    slug: item.slug,
    title: item.title || item.slug,
    excerpt: item.excerpt || item.audioSummary || item.transcriptExcerpt || '',
    meta: `${item.target} / ${item.contentType}`,
    href: `/updates/${item.slug}`,
    haystack,
  }
}

function makeArchiveResult(item) {
  const display = splitDisplayTitle(item)
  const haystack = [
    item.title,
    item.subtitle,
    item.excerpt,
    item.bodyText,
    item.primaryProject,
    ...(item.tags || []),
    item.audioSummary,
    item.transcriptExcerpt,
  ].join(' ').toLowerCase()

  return {
    kind: 'archive',
    id: item.id,
    slug: item.slug,
    title: display.title,
    excerpt: item.excerpt || item.audioSummary || item.transcriptExcerpt || '',
    meta: `${item.primaryProject} / ${item.type}`,
    href: `/piece/${item.slug}`,
    haystack,
  }
}

export function PublicSearchPage({ pieces }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [kindFilter, setKindFilter] = useState(searchParams.get('kind') || 'all')
  const [nativeItems, setNativeItems] = useState([])
  const [state, setState] = useState('loading')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        setState('loading')
        const data = await fetchNativeEntries({ status: 'published' })
        if (cancelled) return
        setNativeItems(Array.isArray(data?.items) ? data.items : [])
        setState('loaded')
      } catch {
        if (cancelled) return
        setNativeItems([])
        setState('error')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const next = {}
    if (q.trim()) next.q = q.trim()
    if (kindFilter !== 'all') next.kind = kindFilter
    setSearchParams(next, { replace: true })
  }, [q, kindFilter, setSearchParams])

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()

    const native = nativeItems.map(makeNativeResult)
    const archive = (pieces || []).map(makeArchiveResult)

    let merged = [...native, ...archive]

    if (kindFilter !== 'all') {
      merged = merged.filter((item) => item.kind === kindFilter)
    }

    if (!query) return merged.slice(0, 40)

    return merged
      .filter((item) => item.haystack.includes(query))
      .slice(0, 80)
  }, [q, kindFilter, nativeItems, pieces])

  return (
    <main className="page public-search-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">search / archive / discovery</div>
        <h1>Search</h1>
        <p className="project-hero__description">
          Search across public native updates and the imported archive. A shocking concept, apparently, but useful if readers are expected to find anything.
        </p>
        <div className="project-hero__meta">
          <span>{results.length} results</span>
          <span>native load: {state}</span>
        </div>
      </section>

      <section className="archive-controls">
        <label className="archive-control">
          <span>query</span>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="title, excerpt, transcript, tag..." />
        </label>

        <label className="archive-control">
          <span>kind</span>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
            <option value="all">all</option>
            <option value="native">native updates</option>
            <option value="archive">archive pieces</option>
          </select>
        </label>
      </section>

      {results.length ? (
        <section className="review-queue">
          {results.map((item) => (
            <article className="review-card" key={`${item.kind}-${item.id}`}>
              <div className="review-card__meta">
                <span>{item.kind}</span>
                <span>{item.meta}</span>
              </div>
              <h2><Link to={item.href}>{item.title}</Link></h2>
              {item.excerpt ? <p className="review-card__excerpt">{item.excerpt}</p> : null}
            </article>
          ))}
        </section>
      ) : (
        <section className="missing-state">
          <h2>No results</h2>
          <p>Try a broader query or remove the kind filter.</p>
        </section>
      )}
    </main>
  )
}
