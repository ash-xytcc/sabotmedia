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
import { attachPostAssets } from '../assets/assetSystem'
import { normalizePost } from '../models/publication'
import { renderPost } from '../renderers'

const MODE_STORAGE_KEY = 'sabot.postMode'

function getPreferredMode(searchParams) {
  const explicit = searchParams.get('mode')
  if (explicit === 'read') return 'read'
  return ''
}

function getPieceBySlug(pieces, slug) {
  return (Array.isArray(pieces) ? pieces : []).find((piece) => piece?.slug === slug) || null
}

function getOrderedPieces(pieces) {
  return (Array.isArray(pieces) ? pieces : [])
    .filter((piece) => isPublicPiece(piece))
    .filter((piece) => piece?.slug)
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a?.publishedAt || a?.updatedAt || 0).getTime()
      const bTime = new Date(b?.publishedAt || b?.updatedAt || 0).getTime()
      return bTime - aTime
    })
}

function isPublicPiece(piece) {
  if (!piece) return false
  const status = String(piece.status || '').toLowerCase()
  if (['draft', 'pending', 'private', 'trash', 'auto-draft'].includes(status)) return false
  if (piece.hidden === true) return false
  return true
}


function stripHtmlForPreview(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeRawHtml(value) {
  const raw = String(value || '')
  return /<\s*\/?\s*(p|br|img|div|figure|h1|h2|h3|ul|ol|li|blockquote|a)\b/i.test(raw) || raw.includes('&nbsp;')
}

function formatMetaType(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function getTitleLengthClass(value) {
  const title = String(value || '').trim()
  const wordCount = title.split(/\s+/).filter(Boolean).length
  if (title.length > 72 || wordCount > 10) return 'title-length-xl'
  if (title.length > 48 || wordCount > 7) return 'title-length-long'
  if (title.length > 28 || wordCount > 4) return 'title-length-medium'
  return 'title-length-short'
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
    if (explicit === 'read' && displaySettings.enableReadMode) return 'read'
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(MODE_STORAGE_KEY) : ''
    if (stored === 'read' && displaySettings.enableReadMode) return 'read'
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
  const renderData = useMemo(
    () => (piece ? renderPost(attachPostAssets(normalizePost(piece)), { mode }) : null),
    [piece, mode]
  )

  const heroImage = useMemo(() => {
    if (!piece) return ''
    return renderData?.hero?.url || piece.featuredImage || getImportedImage(piece) || ''
  }, [piece, renderData])

  const bodyNodes = useMemo(
    () => renderImportedBody(renderData?.bodyHtml || piece?.bodyHtml || '', mode),
    [piece?.bodyHtml, renderData, mode]
  )
  const categoryLabel = renderData?.eyebrow || piece?.primaryProject || piece?.type || 'general'
  const headerMetaItems = useMemo(() => {
    if (!piece) return []
    return [categoryLabel, 'Sabot Media', formatMetaType(piece.type), piece.publishedDateLabel]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }, [piece, categoryLabel])
  const titleText = display.title || piece?.title || piece?.slug || ''
  const titleLengthClass = getTitleLengthClass(titleText)

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

  const rawExcerpt = piece?.excerpt || piece?.subtitle || ''
  const displayExcerpt = looksLikeRawHtml(rawExcerpt) ? '' : stripHtmlForPreview(rawExcerpt)

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
    return <Navigate to={`/post/${piece.slug}/print`} replace />
  }

  return (
    <main className={`page piece-page${mode === 'experience' ? ' piece-page--experience' : ' piece-page--reading'}`}>
      <PublicationTopbar />

      <section className={`piece-article-lead piece-article-lead--${titleLengthClass}${heroImage ? ' piece-article-lead--image' : ' piece-article-lead--fallback'}`}>
        {heroImage ? (
          <figure className="piece-article-lead__figure">
            <img className="piece-article-lead__image" src={heroImage} alt="" />
            <figcaption className="piece-article-lead__overlay">
              <h1>{titleText}</h1>
            </figcaption>
          </figure>
        ) : (
          <div className="piece-article-lead__fallback">
            <div className="piece-article-lead__eyebrow">{categoryLabel}</div>
            <h1>{titleText}</h1>
          </div>
        )}

        <div className="piece-article-lead__below">
          {headerMetaItems.length ? (
            <div className="piece-article-lead__meta">
              {headerMetaItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}

          {displaySettings.enablePrintMode ? (
            <Link className="piece-article-lead__print-link" to={`/post/${piece.slug}/print`}>
              Print
            </Link>
          ) : null}
        </div>
      </section>

      <section className="piece-layout">
        <article className="piece-body-wrap piece-body-wrap--public-post">
          <div className="piece-body__content">
            {bodyNodes.length ? bodyNodes : <p className="post-body__paragraph">{displayExcerpt || ''}</p>}
          </div>
        </article>
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
