import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PAGE_SIZES, findPublication, loadPublications } from '../lib/publications'
import '../publicationReader.css'

function RenderPage({ page, zoom = 1 }) {
  const size = PAGE_SIZES[page.orientation] || PAGE_SIZES.portrait

  return (
    <article
      className={`reader-page reader-page--${page.orientation}`}
      style={{
        '--page-width': `${size.width}px`,
        '--page-height': `${size.height}px`,
        '--reader-zoom': zoom,
      }}
    >
      {(page.blocks || []).map((block) => (
        <div
          className="reader-block reader-block--text"
          key={block.id}
          style={{
            left: `${block.x}px`,
            top: `${block.y}px`,
            width: `${block.width}px`,
            minHeight: `${block.height}px`,
            fontSize: `${block.fontSize || 24}px`,
          }}
        >
          {block.text}
        </div>
      ))}
    </article>
  )
}

function useSwipe(onPrevious, onNext) {
  const [startX, setStartX] = useState(null)

  return {
    onTouchStart: (event) => setStartX(event.touches?.[0]?.clientX ?? null),
    onTouchEnd: (event) => {
      if (startX == null) return
      const endX = event.changedTouches?.[0]?.clientX ?? startX
      const delta = endX - startX
      if (Math.abs(delta) > 42) {
        if (delta > 0) onPrevious()
        else onNext()
      }
      setStartX(null)
    },
  }
}

export function PublicationReaderPage() {
  const { slug = '' } = useParams()
  const publication = useMemo(() => findPublication(slug), [slug])
  const [pageIndex, setPageIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [showThumbnails, setShowThumbnails] = useState(true)

  const pages = publication?.pages || []
  const currentPage = pages[pageIndex] || pages[0]

  const goPrevious = () => setPageIndex((index) => Math.max(0, index - 1))
  const goNext = () => setPageIndex((index) => Math.min(pages.length - 1, index + 1))
  const swipeHandlers = useSwipe(goPrevious, goNext)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'ArrowLeft') goPrevious()
      if (event.key === 'ArrowRight') goNext()
      if (event.key === '+' || event.key === '=') setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))))
      if (event.key === '-') setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(2))))
      if (event.key.toLowerCase() === 'f') document.documentElement.requestFullscreen?.()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pages.length])

  if (!publication) {
    return <Navigate to="/publications" replace />
  }

  return (
    <main className="publication-reader" {...swipeHandlers}>
      <header className="publication-reader__bar">
        <Link to={`/publications/${publication.slug}`}>{publication.title}</Link>
        <div className="publication-reader__controls">
          <button type="button" onClick={() => setShowThumbnails((value) => !value)}>Thumbnails</button>
          <button type="button" onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(2))))}>-</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))))}>+</button>
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.()}>Fullscreen</button>
        </div>
      </header>

      <section className="publication-reader__body">
        {showThumbnails ? (
          <aside className="publication-reader__thumbs" aria-label="Page thumbnails">
            {pages.map((page, index) => (
              <button
                key={page.id}
                className={index === pageIndex ? 'is-active' : ''}
                type="button"
                onClick={() => setPageIndex(index)}
              >
                <span>{index + 1}</span>
                <strong>{page.title}</strong>
              </button>
            ))}
          </aside>
        ) : null}

        <div className="publication-reader__stage">
          <button type="button" className="publication-reader__nav publication-reader__nav--prev" onClick={goPrevious} disabled={pageIndex === 0}>Prev</button>
          {currentPage ? <RenderPage page={currentPage} zoom={zoom} /> : null}
          <button type="button" className="publication-reader__nav publication-reader__nav--next" onClick={goNext} disabled={pageIndex >= pages.length - 1}>Next</button>
        </div>
      </section>

      <footer className="publication-reader__footer">
        <span>Page {pageIndex + 1} of {pages.length}</span>
      </footer>
    </main>
  )
}

export function PublicationsIndexPage() {
  const publications = loadPublications()

  return (
    <main className="page publications-index-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">Publications</div>
        <h1>Zines</h1>
        <p className="project-hero__description">Published zine documents with reader and print editions.</p>
      </section>

      {publications.length ? (
        <section className="piece-grid">
          {publications.map((publication) => (
            <article className="piece-card" key={publication.id}>
              <div className="piece-card__meta">
                <span>{publication.pages.length} pages</span>
                <span>{publication.status}</span>
              </div>
              <h3><Link to={`/publications/${publication.slug}`}>{publication.title}</Link></h3>
              <p>{publication.pages.map((page) => page.title).slice(0, 4).join(', ')}</p>
            </article>
          ))}
        </section>
      ) : (
        <section className="missing-state">
          <h2>No publications</h2>
          <p>No zine publications have been prepared yet.</p>
        </section>
      )}
    </main>
  )
}

export function PublicationLandingPage() {
  const { slug = '' } = useParams()
  const publication = findPublication(slug)

  if (!publication) {
    return <Navigate to="/publications" replace />
  }

  const readerPdf = publication.assets?.readerPdf || publication.digitalEditions?.[0]?.readerPdf || ''
  const printPdf = publication.assets?.printPdf || publication.printEditions?.[0]?.printPdf || ''
  const imposedPdf = publication.assets?.imposedPdf || publication.printEditions?.[0]?.imposedPdf || ''

  return (
    <main className="page publication-landing-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">Publication</div>
        <h1>{publication.title}</h1>
        <p className="project-hero__description">{publication.pages.length} managed pages, stored as one publication document.</p>
        <div className="publication-actions">
          {publication.pages.length ? <Link className="button button--primary" to={`/reader/${publication.slug}`}>Read Online</Link> : null}
          {printPdf ? <a className="button" href={printPdf}>Download Print Edition</a> : null}
          {imposedPdf ? <a className="button" href={imposedPdf}>Download Imposed Booklet</a> : null}
          {readerPdf ? <a className="button" href={readerPdf}>Download Reader PDF</a> : null}
        </div>
      </section>
      <section className="publication-page-strip" aria-label="Publication pages">
        {publication.pages.map((page, index) => (
          <article className="publication-page-card" key={page.id}>
            <span>{index + 1}</span>
            <h2>{page.title}</h2>
            <p>{page.kind} / {page.orientation}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
