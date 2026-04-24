import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { renderImportedBody } from '../lib/renderImportedBody'
import { splitDisplayTitle } from '../lib/content'

const MODE_STORAGE_KEY = 'sabot.postMode'

function PublicationModeSwitch({ slug, mode }) {
  return (
    <nav className="publication-mode-switch" aria-label="reading modes">
      <Link
        className={`publication-mode-switch__link${mode === 'read' ? ' is-active' : ''}`}
        to={`/post/${slug}`}
      >
        Read
      </Link>
      <Link
        className={`publication-mode-switch__link${mode === 'experience' ? ' is-active' : ''}`}
        to={`/post/${slug}?mode=experience`}
      >
        Experience
      </Link>
      <Link
        className="publication-mode-switch__link"
        to={`/piece/${slug}/print`}
      >
        Print
      </Link>
    </nav>
  )
}

function getPreferredMode(searchParams) {
  const explicit = searchParams.get('mode')
  if (explicit === 'experience') return 'experience'
  return 'read'
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
  const [searchParams, setSearchParams] = useSearchParams()
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

  const mergedPieces = useMemo(
    () => mergeNativeAndImportedPieces(Array.isArray(livePieces) ? livePieces : [], nativePieces),
    [livePieces, nativePieces]
  )

  const mode = useMemo(() => getPreferredMode(searchParams), [searchParams])

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(MODE_STORAGE_KEY) : null
    if (!searchParams.get('mode') && stored === 'experience') {
      const next = new URLSearchParams(searchParams)
      next.set('mode', 'experience')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode)
    }
  }, [mode])

  const orderedPieces = useMemo(() => getOrderedPieces(mergedPieces), [mergedPieces])
  const piece = useMemo(() => getPieceBySlug(orderedPieces, slug), [orderedPieces, slug])

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

  if (!piece) {
    return <Navigate to="/archive" replace />
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

        <PublicationModeSwitch slug={piece.slug} mode={mode} />
      </header>

      {heroImage ? (
        <section className={`piece-hero${mode === 'experience' ? ' piece-hero--experience' : ''}`}>
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
