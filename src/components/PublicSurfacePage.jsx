import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchNativeEntries } from '../lib/nativePublicContentApi'
import { getSurfaceConfig, listSurfaceConfigs } from '../lib/publicSurfaceTargets'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'

function SurfaceCard({ item }) {
  return (
    <article className="piece-card">
      <div className="piece-card__meta">
        <span>{item.target}</span>
        <span>{item.contentType}</span>
      </div>
      <h3>
        <Link to={`/post/${item.slug}`}>{item.title || item.slug}</Link>
      </h3>
      {item.excerpt ? <p>{item.excerpt}</p> : null}
      <div className="piece-card__footer">
        <span>{item.publishedAt || item.updatedAt}</span>
      </div>
    </article>
  )
}

export function PublicSurfacePage({ target = 'general' }) {
  const surface = getSurfaceConfig(target)
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        setState('loading')
        setError('')
        const data = await fetchNativeEntries({ status: 'published', target: surface.key })
        if (cancelled) return
        setItems(Array.isArray(data?.items) ? data.items : [])
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
  }, [surface.key])

  const navTargets = useMemo(
    () => listSurfaceConfigs().filter((entry) => entry.key !== surface.key),
    [surface.key]
  )

  return (
    <main className="page public-surface-page">
      <PublicationTopbar />
      <section className="project-hero">
        <div className="project-hero__eyebrow">{surface.eyebrow}</div>
        <h1>{surface.title}</h1>
        <p className="project-hero__description">{surface.description}</p>
        <div className="project-hero__meta">
          <span>{items.length} published entries</span>
          <span>status: {state}</span>
        </div>
        {error ? <p className="review-card__excerpt">{error}</p> : null}
      </section>

      <section className="archive-results-bar">
        <Link className="button button--primary" to="/archive">search</Link>
        {navTargets.map((entry) => (
          <Link className="button" key={entry.key} to={entry.route}>{entry.title}</Link>
        ))}
      </section>

      {items.length ? (
        <section className="piece-grid">
          {items.map((item) => (
            <SurfaceCard key={item.id} item={item} />
          ))}
        </section>
      ) : (
        <section className="missing-state">
          <h2>No published entries</h2>
          <p>This surface is live, but nothing has been published into it yet.</p>
        </section>
      )}
      <PublicationFooter />
    </main>
  )
}
