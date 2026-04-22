import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchNativeEntries } from '../lib/nativePublicContentApi'
import { PublicationFooter } from './PublicationFooter'

function formatDate(value) {
  const d = new Date(value || '')
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function HeroFeature({ item }) {
  return (
    <article className="publication-hero-card">
      <Link className="publication-hero-card__image-wrap" to={`/updates/${item.slug}`}>
        <div className="publication-hero-card__image-fill" />
        <div className="publication-hero-card__overlay">
          <div className="publication-hero-card__meta">
            <span>{formatDate(item.publishedAt || item.updatedAt)}</span>
            <span>{item.target}</span>
            <span>{item.contentType}</span>
          </div>
          <h1>{item.title || item.slug}</h1>
          {item.excerpt ? <p>{item.excerpt}</p> : null}
        </div>
      </Link>
    </article>
  )
}

function RecentCard({ item }) {
  return (
    <article className="publication-post-card">
      <Link className="publication-post-card__link" to={`/updates/${item.slug}`}>
        <div className="publication-post-card__image-fill" />
        <div className="publication-post-card__overlay">
          <div className="publication-post-card__meta">
            <span>{formatDate(item.publishedAt || item.updatedAt)}</span>
            <span>{item.target}</span>
          </div>
          <h2>{item.title || item.slug}</h2>
          {item.excerpt ? <p>{item.excerpt}</p> : null}
        </div>
      </Link>
    </article>
  )
}

export function NativeUpdatesPage() {
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        setState('loading')
        setError('')
        const data = await fetchNativeEntries({ status: 'published' })
        if (cancelled) return

        const all = Array.isArray(data?.items) ? data.items : []
        const visible = all.filter((item) =>
          ['general', 'home', 'press', 'projects'].includes(item.target)
        )

        setItems(visible)
        setState('loaded')
      } catch (err) {
        if (cancelled) return
        setItems([])
        setError(String(err?.message || err))
        setState('error')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const featured = useMemo(() => items[0] || null, [items])
  const recent = useMemo(() => items.slice(1, 7), [items])

  return (
    <main className="page publication-homepage">
      <header className="publication-topbar">
        <div className="publication-topbar__brand">
          <Link to="/updates">Sabot Media</Link>
        </div>

        <nav className="publication-topbar__nav">
          <Link to="/updates">Home</Link>
          <Link to="/search">Archive</Link>
          <Link to="/press-updates">Press</Link>
          <Link to="/project-updates">Projects</Link>
        </nav>
      </header>

      {error ? (
        <section className="missing-state">
          <h1>Recent posts unavailable</h1>
          <p>{error}</p>
        </section>
      ) : null}

      {featured ? (
        <>
          <HeroFeature item={featured} />

          <section className="publication-recent-grid">
            {recent.map((item) => (
              <RecentCard key={item.id} item={item} />
            ))}
          </section>

          <section className="publication-next-row">
            <Link className="publication-next-link" to="/search">
              Next →
            </Link>
          </section>
        </>
      ) : state === 'loading' ? (
        <section className="missing-state">
          <h1>Loading recent posts</h1>
          <p>Pulling together the latest published material.</p>
        </section>
      ) : (
        <section className="missing-state">
          <h1>No published posts yet</h1>
          <p>Publish a few native entries and this page will become the public front page.</p>
        </section>
      )}

      <PublicationFooter />
    </main>
  )
}
