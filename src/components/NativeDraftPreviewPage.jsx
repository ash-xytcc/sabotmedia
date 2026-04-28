import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { renderImportedBody } from '../lib/renderImportedBody'
import { resolveNativeBodyHtml } from '../lib/nativePublicFeed'

export function NativeDraftPreviewPage() {
  const { id = '' } = useParams()
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
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

  const entry = useMemo(
    () => items.find((item) => item.id === id),
    [items, id]
  )

  if (entry?.status === 'published' && entry?.slug) {
    return <Navigate to={`/post/${entry.slug}`} replace />
  }

  if (state === 'loaded' && !entry) return <Navigate to="/content" replace />

  const image = entry?.featuredImage || entry?.heroImage || ''
  const bodyNodes = useMemo(() => renderImportedBody(resolveNativeBodyHtml(entry || {}), 'read'), [entry])

  return (
    <main className="page native-draft-preview-page">
      <PublicationTopbar />

      <section className="piece-header">
        <div className="piece-header__eyebrow">
          draft preview / {entry?.contentType || 'entry'}
        </div>
        <h1>{entry?.title || 'Untitled draft'}</h1>
        {entry?.excerpt ? <p className="piece-header__subtitle">{entry.excerpt}</p> : null}
        <div className="piece-header__meta">
          <span>{entry?.status || state}</span>
          <span>{entry?.workflowState || 'draft'}</span>
          <span>{entry?.target || 'general'}</span>
        </div>
        <div className="review-card__actions">
          <Link className="button button--primary" to={`/native-bridge?edit=${entry?.id || id}`}>
            Back to editor
          </Link>
          {entry?.slug && entry?.status === 'published' ? (
            <Link className="button" to={`/post/${entry.slug}`}>Public URL</Link>
          ) : null}
        </div>
      </section>

      {image ? (
        <section className="piece-hero">
          <img className="piece-hero__image" src={image} alt="" />
        </section>
      ) : null}

      <section className="piece-layout">
        <article className="piece-body-wrap">
          <div className="piece-body__content">
            {bodyNodes.length ? bodyNodes : <p>No body content yet.</p>}
          </div>
        </article>
      </section>

      <PublicationFooter />
    </main>
  )
}
