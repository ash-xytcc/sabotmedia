import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadNativeCollection } from '../lib/nativePublicContent'

function getBucket(item) {
  if (item.status === 'published' || item.workflowState === 'published') return 'published'
  if (item.workflowState === 'scheduled' || item.scheduledFor) return 'scheduled'
  return 'drafts'
}

function ContentCard({ item }) {
  const bucket = getBucket(item)

  return (
    <article className="content-list-card">
      <div className="content-list-card__meta">
        <span>{item.contentType || 'entry'}</span>
        <span>{bucket}</span>
        <span>{item.target || 'general'}</span>
      </div>

      <h3>{item.title || 'Untitled'}</h3>
      <p>{item.excerpt || item.body || 'No summary yet.'}</p>

      <div className="content-list-card__actions">
        <Link className="button button--primary" to={`/native-bridge?edit=${item.id}`}>Edit</Link>
        <Link className="button" to={`/native-bridge?new=${item.contentType === 'podcast' ? 'podcast' : item.contentType === 'print' ? 'print' : item.contentType === 'publicBlock' ? 'publicBlock' : 'article'}`}>
          New similar
        </Link>
      </div>
    </article>
  )
}

export function ContentListPage() {
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')

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

    for (const item of items) {
      out[getBucket(item)].push(item)
    }

    return out
  }, [items])

  return (
    <main className="page content-list-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">content / queue / publishing</div>
        <h1>Content</h1>
        <p className="project-hero__description">
          Drafts, scheduled pieces, and published native entries. The archive is public; this is the workspace.
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

      {state === 'error' ? (
        <section className="missing-state">
          <h2>Content could not load</h2>
          <p>The native content collection was unavailable.</p>
        </section>
      ) : null}

      {['drafts', 'scheduled', 'published'].map((bucket) => (
        <section className="content-list-section" key={bucket}>
          <div className="content-list-section__header">
            <h2>{bucket}</h2>
            <span>{buckets[bucket].length}</span>
          </div>

          {buckets[bucket].length ? (
            <div className="content-list-grid">
              {buckets[bucket].map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="review-card__excerpt">Nothing here yet.</p>
          )}
        </section>
      ))}
    </main>
  )
}
