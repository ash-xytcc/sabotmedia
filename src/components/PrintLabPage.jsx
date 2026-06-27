import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { renderImportedBody } from '../lib/renderImportedBody'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { AdminFrame } from './AdminRail'
import '../printLabArticle.css'

const PRINT_LAB_LAYOUTS = [
  { value: 'article', label: 'Article' },
  { value: 'half-sheet-zine', label: 'Half-sheet zine' },
  { value: 'booklet-draft', label: 'Booklet draft' },
]

const DEFAULT_ARTICLE_OPTIONS = {
  showImage: true,
  showExcerpt: true,
  showMetadata: true,
  showColophon: true,
}

function getPieceId(piece) {
  return String(piece?.id || piece?.slug || piece?.sourcePostId || piece?.title || '')
}

function getContentType(piece) {
  return piece?.contentType || piece?.type || piece?.sourcePostType || 'post'
}

function getPublishedAt(piece) {
  return piece?.publishedAt || piece?.date || piece?.createdAt || piece?.updatedAt || ''
}

function getPublishedAtLabel(piece) {
  const value = getPublishedAt(piece)
  if (!value) return ''
  const published = new Date(value)
  if (Number.isNaN(published.getTime())) return ''
  return published.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getFeaturedImage(piece) {
  return (
    piece?.featuredImage ||
    piece?.heroImage ||
    piece?.imageUrl ||
    piece?.image ||
    getImportedImage(piece) ||
    ''
  )
}

function isPublishedPiece(piece) {
  if (!piece || piece.hidden === true) return false
  const status = String(piece.status || '').toLowerCase()
  if (status) return status === 'published'
  return Boolean(getPublishedAt(piece))
}

function getPreviewHtml(piece) {
  return piece?.bodyHtml || piece?.contentHtml || piece?.content || piece?.body || ''
}

function toPlainText(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(raw, 'text/html')
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
  }

  return raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function getExcerpt(piece) {
  return toPlainText(piece?.excerpt || piece?.dek || piece?.subtitle || '')
}

function buildMetadataItems(piece) {
  return [
    { label: 'Type', value: getContentType(piece) },
    { label: 'Date', value: getPublishedAtLabel(piece) },
    { label: 'Author', value: piece?.author || piece?.byline || '' },
    { label: 'Source', value: piece?.sourceTitle || piece?.sourcePostType || piece?.sourceUrl || '' },
    { label: 'Slug', value: piece?.slug || '' },
  ].filter((item) => String(item.value || '').trim())
}

function PrintLabToggle({ checked, label, onChange }) {
  return (
    <label className="print-lab-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

function PrintLabArticlePreview({ layout, options, piece, previewHtml, selectedImage }) {
  const title = toPlainText(piece?.title || 'Untitled') || 'Untitled'
  const excerpt = getExcerpt(piece)
  const publishedAt = getPublishedAtLabel(piece)
  const contentType = getContentType(piece)
  const metadataItems = buildMetadataItems(piece)
  const bodyNodes = previewHtml ? renderImportedBody(previewHtml, 'print') : []
  const layoutClass = layout === 'article' ? 'single-page' : layout

  return (
    <article className={`print-lab-preview print-lab-preview--${layoutClass}`} data-print-preview>
      <header className="print-lab-preview__header">
        {options.showMetadata && (publishedAt || contentType) ? (
          <p className="print-lab-preview__eyebrow">
            {[contentType, publishedAt].filter(Boolean).join(' / ')}
          </p>
        ) : null}
        <h3>{title}</h3>
        {options.showExcerpt && excerpt ? <p className="print-lab-preview__excerpt">{excerpt}</p> : null}
        {options.showMetadata && metadataItems.length ? (
          <dl className="print-lab-preview__metadata">
            {metadataItems.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </header>

      {options.showImage && selectedImage ? (
        <figure className="print-lab-preview__hero">
          <img src={selectedImage} alt="" />
        </figure>
      ) : null}

      <div className="print-lab-preview__body post-body__content">
        {bodyNodes.length ? bodyNodes : <p>No body content is available for this post.</p>}
      </div>

      {options.showColophon ? (
        <footer className="print-lab-preview__colophon">
          <strong>Sabot Media Printlab</strong>
          <span>{[title, publishedAt, piece?.slug].filter(Boolean).join(' / ')}</span>
        </footer>
      ) : null}
    </article>
  )
}

export function PrintLabPage({ pieces = [] }) {
  const [nativePieces, setNativePieces] = useState([])
  const [nativeState, setNativeState] = useState('loading')
  const [selectedId, setSelectedId] = useState('')
  const [selectedLayout, setSelectedLayout] = useState('article')
  const [articleOptions, setArticleOptions] = useState(DEFAULT_ARTICLE_OPTIONS)
  const wordpressFeed = useWordPressPieces(pieces)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        setNativeState('loading')
        const loaded = await loadPublishedNativePieces()
        if (cancelled) return
        setNativePieces(Array.isArray(loaded) ? loaded : [])
        setNativeState('loaded')
      } catch (err) {
        if (cancelled) return
        setNativePieces([])
        setNativeState('error')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const publishedPieces = useMemo(() => {
    const importedPieces = (wordpressFeed.pieces || pieces).filter(isPublishedPiece)
    return mergeNativeAndImportedPieces(importedPieces, nativePieces)
      .filter(isPublishedPiece)
      .sort((a, b) => new Date(getPublishedAt(b) || 0) - new Date(getPublishedAt(a) || 0))
  }, [nativePieces, pieces, wordpressFeed.pieces])

  useEffect(() => {
    if (!publishedPieces.length) {
      setSelectedId('')
      return
    }

    setSelectedId((current) => (
      publishedPieces.some((piece) => getPieceId(piece) === current)
        ? current
        : getPieceId(publishedPieces[0])
    ))
  }, [publishedPieces])

  const selectedPiece = publishedPieces.find((piece) => getPieceId(piece) === selectedId) || null
  const selectedImage = getFeaturedImage(selectedPiece)
  const previewHtml = getPreviewHtml(selectedPiece)
  const isLoading = nativeState === 'loading' && wordpressFeed.state === 'loading' && !publishedPieces.length

  const handleOptionToggle = (key) => (event) => {
    const checked = Boolean(event?.target?.checked)
    setArticleOptions((current) => ({ ...current, [key]: checked }))
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen print-lab-page">
        <div className="wp-screen-header print-lab-screen-header">
          <h1>Printlab</h1>
          <Link className="button" to="/content">Back to Posts</Link>
        </div>

        <section className="wp-meta-box print-lab-controls">
          <h2>Published source posts</h2>
          <p className="description">
            Choose a published post from the merged native and imported feed to preview its print source material.
          </p>

          {isLoading ? <p className="description">Loading published posts...</p> : null}

          {!isLoading && !publishedPieces.length ? (
            <p className="description">No published posts are available in the merged feed yet.</p>
          ) : null}

          {publishedPieces.length ? (
            <div className="print-lab-source-layout">
              <div className="print-lab-post-list" role="list" aria-label="Published posts">
                {publishedPieces.map((piece) => {
                  const id = getPieceId(piece)
                  const image = getFeaturedImage(piece)
                  const selected = id === selectedId

                  return (
                    <button
                      className={`print-lab-post-card${selected ? ' is-selected' : ''}`}
                      key={id}
                      type="button"
                      role="listitem"
                      aria-pressed={selected}
                      onClick={() => setSelectedId(id)}
                    >
                      {image ? (
                        <img className="print-lab-post-card__thumb" src={image} alt="" loading="lazy" />
                      ) : (
                        <span className="print-lab-post-card__thumb print-lab-post-card__thumb--empty" aria-hidden="true">No image</span>
                      )}
                      <span className="print-lab-post-card__content">
                        <strong>{toPlainText(piece.title || 'Untitled') || 'Untitled'}</strong>
                        <span>{getContentType(piece)}</span>
                        <span>{getPublishedAtLabel(piece) || 'Unavailable'}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="print-lab-preview-wrap" aria-live="polite">
                <div className="print-lab-preview-toolbar">
                  <div className="print-lab-controls__row">
                    <label>
                      Layout
                      <select value={selectedLayout} onChange={(event) => setSelectedLayout(event.target.value)}>
                        {PRINT_LAB_LAYOUTS.map((layout) => (
                          <option key={layout.value} value={layout.value}>{layout.label}</option>
                        ))}
                      </select>
                    </label>
                    <button className="button button-primary" type="button" onClick={handlePrint}>Print</button>
                  </div>

                  <fieldset className="print-lab-preview-options" aria-label="Article preview options">
                    <PrintLabToggle
                      checked={articleOptions.showImage}
                      label="Show image"
                      onChange={handleOptionToggle('showImage')}
                    />
                    <PrintLabToggle
                      checked={articleOptions.showExcerpt}
                      label="Show excerpt"
                      onChange={handleOptionToggle('showExcerpt')}
                    />
                    <PrintLabToggle
                      checked={articleOptions.showMetadata}
                      label="Show metadata"
                      onChange={handleOptionToggle('showMetadata')}
                    />
                    <PrintLabToggle
                      checked={articleOptions.showColophon}
                      label="Show colophon"
                      onChange={handleOptionToggle('showColophon')}
                    />
                  </fieldset>
                </div>

                <h2>Preview</h2>
                {selectedPiece ? (
                  <PrintLabArticlePreview
                    layout={selectedLayout}
                    options={articleOptions}
                    piece={selectedPiece}
                    previewHtml={previewHtml}
                    selectedImage={selectedImage}
                  />
                ) : (
                  <p className="description">Select a published post to preview its source material.</p>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </AdminFrame>
  )
}
