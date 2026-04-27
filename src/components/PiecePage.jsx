import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { renderImportedBody } from '../lib/renderImportedBody'
import { splitDisplayTitle } from '../lib/content'
import { getPieceDisplaySettings, resolveFirstReadableMode } from '../lib/publicDisplayModes'

const MODE_STORAGE_KEY = 'sabot.postMode'

function PublicationModeSwitch({ slug, mode, displaySettings }) {
  const links = []
  if (displaySettings.enableReadMode) links.push({ key: 'read', label: 'Read', to: `/post/${slug}` })
  if (displaySettings.enableExperienceMode) links.push({ key: 'experience', label: 'Experience', to: `/post/${slug}?mode=experience` })
  if (displaySettings.enablePrintMode) links.push({ key: 'print', label: 'Print', to: `/piece/${slug}/print` })
  return (
    <nav className="publication-mode-switch" aria-label="reading modes">
      {links.map((link) => (
        <Link key={link.key} className={`publication-mode-switch__link${mode === link.key ? ' is-active' : ''}`} to={link.to}>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

function getPreferredMode(searchParams) {
  const explicit = searchParams.get('mode')
  if (explicit === 'experience') return 'experience'
  if (explicit === 'read') return 'read'
  return ''
}

function getPieceBySlug(pieces, slug) {
  return (Array.isArray(pieces) ? pieces : []).find((piece) => piece?.slug === slug) || null
}

function getOrderedPieces(pieces) {
  return (Array.isArray(pieces) ? pieces : [])
    .filter((piece) => piece?.slug)
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a?.publishedAt || a?.updatedAt || 0).getTime()
      const bTime = new Date(b?.publishedAt || b?.updatedAt || 0).getTime()
      return bTime - aTime
    })
}

export function PiecePage({ pieces = [] }) {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [nativePieces, setNativePieces] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const loaded = await loadPublishedNativePieces()
        if (!cancelled) setNativePieces(Array.isArray(loaded) ? loaded : [])
      } catch {
        if (!cancelled) setNativePieces([])
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const wordpressFeed = useWordPressPieces(pieces)
  const livePieces = wordpressFeed.pieces || pieces

  const mergedPieces = useMemo(
    () => mergeNativeAndImportedPieces(Array.isArray(livePieces) ? livePieces : [], Array.isArray(nativePieces) ? nativePieces : []),
    [livePieces, nativePieces]
  )

  const orderedPieces = useMemo(() => getOrderedPieces(mergedPieces), [mergedPieces])
  const piece = useMemo(() => getPieceBySlug(orderedPieces, slug), [orderedPieces, slug])
  const displaySettings = useMemo(() => getPieceDisplaySettings(piece), [piece])
  const mode = useMemo(() => {
    if (!piece) return 'read'
    const explicit = getPreferredMode(searchParams)
    if (explicit === 'experience' && displaySettings.enableExperienceMode) return 'experience'
    if (explicit === 'read' && displaySettings.enableReadMode) return 'read'
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(MODE_STORAGE_KEY) : ''
    if (stored === 'experience' && displaySettings.enableExperienceMode) return 'experience'
    if (stored === 'read' && displaySettings.enableReadMode) return 'read'
    if (displaySettings.defaultMode === 'experience' && displaySettings.enableExperienceMode) return 'experience'
    if (displaySettings.defaultMode === 'print' && displaySettings.enablePrintMode) return 'print'
    return resolveFirstReadableMode(displaySettings)
  }, [piece, searchParams, displaySettings])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode)
    }
  }, [mode])

  const index = useMemo(
    () => orderedPieces.findIndex((item) => item?.slug === slug),
    [orderedPieces, slug]
  )

  const previous = index >= 0 ? orderedPieces[index + 1] || null : null
  const next = index > 0 ? orderedPieces[index - 1] || null : null

  const display = useMemo(
    () =>
      piece
        ? splitDisplayTitle(piece)
        : {
            title: '',
            subtitle: '',
          },
    [piece]
  )

  const heroImage = useMemo(() => {
    if (!piece) return ''
    return piece.featuredImage || getImportedImage(piece) || ''
  }, [piece])

  const bodyNodes = useMemo(
    () => renderImportedBody(piece?.bodyHtml || '', mode),
    [piece?.bodyHtml, mode]
  )

  if (!piece && nativePieces === null) {
    return (
      <main className="page piece-page piece-page--loading">
        <PublicationTopbar />
        <section className="piece-header">
          <p>Loading post…</p>
        </section>
      </main>
    )
  }

  if (!piece) {
    return (
      <main className="page piece-page piece-page--not-found">
        <PublicationTopbar />
        <section className="piece-header">
          <h1>Post not found</h1>
          <p>This post is not published, does not exist, or is still saving.</p>
          <Link className="button" to="/archive">Back to archive</Link>
        </section>
        <PublicationFooter />
      </main>
    )
  }
  if (mode === 'print') {
    return <Navigate to={`/piece/${piece.slug}/print`} replace />
  }

  return (
    <main className={`page piece-page${mode === 'experience' ? ' piece-page--experience' : ' piece-page--reading'}`}>
      <PublicationTopbar />

      <header className="piece-header">
        <div className="piece-header__eyebrow">
          {piece.primaryProject || piece.type || 'publication'}
        </div>
        <h1>{display.title || piece.title || piece.slug}</h1>
        {display.subtitle || piece.subtitle || piece.excerpt ? (
          <p className="piece-header__subtitle">
            {display.subtitle || piece.subtitle || piece.excerpt}
          </p>
        ) : null}

        <div className="piece-header__meta">
          <span>{piece.author || 'Sabot Media'}</span>
          {piece.publishedDateLabel ? <span>{piece.publishedDateLabel}</span> : null}
          {piece.type ? <span>{piece.type}</span> : null}
        </div>

        <PublicationModeSwitch slug={piece.slug} mode={mode} displaySettings={displaySettings} />
      </header>

      {heroImage ? (
        <section className={`piece-hero${mode === 'experience' ? ' piece-hero--experience' : ''}${displaySettings.heroStyle !== 'default' ? ` piece-hero--${displaySettings.heroStyle}` : ''}`}>
          <img className="piece-hero__image" src={heroImage} alt={display.title || piece.title || piece.slug} />
        </section>
      ) : null}

      <section className="piece-layout">
        <article className="piece-body-wrap">
          <div className="piece-body__content">
            {bodyNodes.length ? bodyNodes : <p className="post-body__paragraph">{piece.excerpt || ''}</p>}
          </div>
        </article>

        {mode === 'read' ? (
          <aside className="piece-meta-panel">
            <section className="piece-meta-panel__section">
              <h2>Details</h2>
              <ul className="piece-meta-panel__list">
                {piece.author ? <li><strong>Author:</strong> {piece.author}</li> : null}
                {piece.publishedDateLabel ? <li><strong>Published:</strong> {piece.publishedDateLabel}</li> : null}
                {piece.primaryProject ? <li><strong>Project:</strong> {piece.primaryProject}</li> : null}
                {Array.isArray(piece.tags) && piece.tags.length ? (
                  <li><strong>Tags:</strong> {piece.tags.join(', ')}</li>
                ) : null}
              </ul>
            </section>
          </aside>
        ) : null}
      </section>

      <section className="piece-nav">
        <div className="piece-nav-grid">
          {previous ? (
            <Link className="piece-nav-card publication-piece-nav-card" to={`/post/${previous.slug}`}>
              <div className="piece-nav-card__eyebrow">Previous</div>
              <strong>{splitDisplayTitle(previous).title || previous.title}</strong>
            </Link>
          ) : null}

          {next ? (
            <Link className="piece-nav-card piece-nav-card--next publication-piece-nav-card" to={`/post/${next.slug}`}>
              <div className="piece-nav-card__eyebrow">Next</div>
              <strong>{splitDisplayTitle(next).title || next.title}</strong>
            </Link>
          ) : null}
        </div>
      </section>

      <PublicationFooter />
    </main>
  )
}
