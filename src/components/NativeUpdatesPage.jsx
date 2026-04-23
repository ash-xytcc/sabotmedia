import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchNativeEntries } from '../lib/nativePublicContentApi'
import { PublicationFooter } from './PublicationFooter'
import { splitDisplayTitle } from '../lib/content'
import { PublicationTopbar } from './PublicationTopbar'

function formatDate(value) {
  const d = new Date(value || '')
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function normalizeNativeItem(item) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title || item.slug || 'Untitled',
    excerpt: item.excerpt || '',
    target: item.target || 'general',
    contentType: item.contentType || 'article',
    publishedAt: item.publishedAt || item.updatedAt || '',
    updatedAt: item.updatedAt || item.publishedAt || '',
    href: `/updates/${item.slug}`,
    imageUrl: item.heroImage || item.imageUrl || '',
    sourceKind: 'native',
  }
}

function normalizeArchivePiece(piece) {
  const display = typeof splitDisplayTitle === 'function' ? splitDisplayTitle(piece) : {
    title: piece?.title || piece?.slug || 'Untitled',
    subtitle: piece?.subtitle || '',
  }

  const title = display?.title || piece?.title || piece?.slug || 'Untitled'
  const subtitle = display?.subtitle || piece?.subtitle || ''
  const excerpt = piece?.excerpt || subtitle || ''
  const slug = piece?.slug || ''
  const type = piece?.type || 'article'
  const target = inferTargetFromPiece(piece)
  const publishedAt = piece?.publishedAt || piece?.date || piece?.createdAt || piece?.updatedAt || ''
  const imageUrl =
    piece?.heroImage ||
    piece?.hero_image ||
    piece?.image ||
    piece?.image_url ||
    piece?.coverImage ||
    piece?.cover_image ||
    piece?.featuredImage ||
    piece?.featured_image ||
    (Array.isArray(piece?.images) && piece.images[0]) ||

    piece?.heroImage ||
    piece?.hero_image ||
    piece?.image ||
    piece?.coverImage ||
    piece?.featuredImage ||
    ''

  return {
    id: piece?.id || slug || title,
    slug,
    title,
    excerpt,
    target,
    contentType: type,
    publishedAt,
    updatedAt: piece?.updatedAt || publishedAt || '',
    href: slug ? `/post/${slug}` : '/search',
    imageUrl,
    sourceKind: 'archive',
  }
}

function inferTargetFromPiece(piece) {
  const project = String(piece?.primaryProject || '').toLowerCase()
  if (project.includes('press')) return 'press'
  if (project.includes('project')) return 'projects'
  return 'general'
}

function pickArchiveFeed({ pieces = [], featured = null, latest = [] }) {
  const latestList = Array.isArray(latest) && latest.length ? latest : pieces
  const normalizedLatest = latestList.map(normalizeArchivePiece)

  const featuredPiece =
    featured
      ? normalizeArchivePiece(featured)
      : normalizedLatest[0] || null

  const recent = normalizedLatest
    .filter((item) => item.id !== featuredPiece?.id)
    .slice(0, 6)

  return {
    featured: featuredPiece,
    recent,
  }
}

function HeroFeature({ item }) {
  return (
    <article className="publication-hero-card">
      <Link className="publication-hero-card__image-wrap" to={item.href}>
        <div
          className="publication-hero-card__image-fill"
          style={item.imageUrl ? {
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.62)), url("${item.imageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        />
        <div className="publication-hero-card__overlay">
          <div className="publication-hero-card__meta">
            <span>{formatDate(item.publishedAt || item.updatedAt)}</span>
            <span>{item.target}</span>
            <span>{item.contentType}</span>
          </div>
          <h1>{item.title}</h1>
          {item.excerpt ? <p>{item.excerpt}</p> : null}
        </div>
      </Link>
    </article>
  )
}

function RecentCard({ item }) {
  return (
    <article className="publication-post-card">
      <Link className="publication-post-card__link" to={item.href}>
        <div
          className="publication-post-card__image-fill"
          style={item.imageUrl ? {
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.68)), url("${item.imageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        />
        <div className="publication-post-card__overlay">
          <div className="publication-post-card__meta">
            <span>{formatDate(item.publishedAt || item.updatedAt)}</span>
            <span>{item.target}</span>
          </div>
          <h2>{item.title}</h2>
          {item.excerpt ? <p>{item.excerpt}</p> : null}
        </div>
      </Link>
    </article>
  )
}

export function NativeUpdatesPage({ pieces = [], featured = null, latest = [] }) {
  const [nativeItems, setNativeItems] = useState([])
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
        const visible = all
          .filter((item) => ['general', 'home', 'press', 'projects'].includes(item.target))
          .map(normalizeNativeItem)

        setNativeItems(visible)
        setState(visible.length ? 'loaded' : 'archive-fallback')
      } catch (err) {
        if (cancelled) return
        setNativeItems([])
        setError(String(err?.message || err))
        setState('archive-fallback')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const archiveFeed = useMemo(
    () => pickArchiveFeed({ pieces, featured, latest }),
    [pieces, featured, latest]
  )

  const featuredItem = useMemo(() => {
    if (nativeItems.length) return nativeItems[0]
    return archiveFeed.featured
  }, [nativeItems, archiveFeed])

  const recentItems = useMemo(() => {
    if (nativeItems.length) return nativeItems.slice(1, 7)
    return archiveFeed.recent
  }, [nativeItems, archiveFeed])

  const usingArchiveFallback = !nativeItems.length && !!archiveFeed.featured

  return (
    <main className="page publication-homepage">
      <PublicationTopbar />

      {usingArchiveFallback ? (
        <section className="publication-status-note">
          <p>Using imported archive content for the homepage while native publishing is still being wired up.</p>
        </section>
      ) : null}

      {error && !usingArchiveFallback ? (
        <section className="missing-state">
          <h1>Recent posts unavailable</h1>
          <p>{error}</p>
        </section>
      ) : null}

      {featuredItem ? (
        <>
          <HeroFeature item={featuredItem} />

          <section className="publication-recent-grid">
            {recentItems.map((item) => (
              <RecentCard key={item.id} item={item} />
            ))}
          </section>

          <section className="publication-next-row">
            <Link className="publication-next-link" to="/archive">
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
          <h1>No recent pieces available</h1>
          <p>Either publish some native entries or make sure the imported archive is loaded.</p>
        </section>
      )}

      <PublicationFooter />
    </main>
  )
}
