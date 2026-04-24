import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { AdminFrame } from './AdminRail'

function getBucket(item) {
  if (item.status === 'published' || item.workflowState === 'published') return 'published'
  if (item.workflowState === 'scheduled' || item.scheduledFor) return 'scheduled'
  return 'drafts'
}

function ContentRow({ item }) {
  const bucket = getBucket(item)
  const kind =
    item.contentType === 'podcast'
      ? 'podcast'
      : item.contentType === 'print'
        ? 'print'
        : item.contentType === 'publicBlock'
          ? 'public block'
          : 'post'

  return (
    <tr>
      <td>
        <strong className="content-table__title">{item.title || 'Untitled'}</strong>
        <div className="content-table__slug">{item.slug || 'no slug'}</div>
      </td>
      <td>{kind}</td>
      <td>{bucket}</td>
      <td>{item.target || 'general'}</td>
      <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}</td>
      <td>
        <div className="content-table__actions">
          <Link className="button button--primary" to={`/native-bridge?edit=${item.id}`}>Edit</Link>
          <Link className="button" to={`/native-bridge?new=${item.contentType === 'podcast' ? 'podcast' : item.contentType === 'print' ? 'print' : item.contentType === 'publicBlock' ? 'publicBlock' : 'article'}`}>
            New similar
          </Link>
        </div>
      </td>
    </tr>
  )
}

export function ContentListPage() {
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        setState('loading')
        const loaded = await loadNativeCollection({ includeFuture: 1 })
        if (cancelled) return
        setItems(Array.isArray(loaded) ? loaded : [])
        setState('loaded')
      } catch {
        if (!cancelled) setState('error')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const buckets = useMemo(() => {
    const out = { drafts: [], scheduled: [], published: [] }
    for (const item of items) out[getBucket(item)].push(item)
    return out
  }, [items])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()

    return items.filter((item) => {
      const bucket = getBucket(item)
      if (filter !== 'all' && bucket !== filter) return false
      if (!q) return true

      return [
        item.title,
        item.slug,
        item.excerpt,
        item.body,
        item.contentType,
        item.target,
      ].join(' ').toLowerCase().includes(q)
    })
  }, [items, filter, query])

  return (
    <AdminFrame>
    <main className="page content-list-page">
      <section className="project-hero content-list-hero">
        <div className="project-hero__eyebrow">posts / queue / publishing</div>
        <h1>Posts</h1>
        <p className="project-hero__description">
          Drafts, scheduled pieces, and published native entries. This is the working posts table.
        </p>
        <div className="project-hero__meta">
          <span>{items.length} entries</span>
          <span>{buckets.drafts.length} drafts</span>
          <span>{buckets.scheduled.length} scheduled</span>
          <span>{buckets.published.length} published</span>
        </div>
        <div className="review-card__actions">
          <Link className="button button--primary" to="/native-bridge?new=article">Add New</Link>
          <Link className="button" to="/native-bridge?new=podcast">New Podcast</Link>
        </div>
      </section>

      <section className="content-table-wrap">
        <div className="content-table-toolbar">
          <div className="content-table-tabs">
            {['all', 'drafts', 'scheduled', 'published'].map((key) => (
              <button
                key={key}
                type="button"
                className={`content-table-tab${filter === key ? ' is-active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {key}
              </button>
            ))}
          </div>

          <label className="content-table-search">
            <span>Search posts</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="title, slug, type..." />
          </label>
        </div>

        {state === 'error' ? (
          <section className="missing-state">
            <h2>Content could not load</h2>
            <p>The native content collection was unavailable.</p>
          </section>
        ) : null}

        <div className="content-table-scroll">
          <table className="content-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Target</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => <ContentRow key={item.id} item={item} />)}
            </tbody>
          </table>
        </div>

        {!visible.length ? <p className="review-card__excerpt">No posts match this view.</p> : null}
      </section>
    </main>
    </AdminFrame>
  )
}
