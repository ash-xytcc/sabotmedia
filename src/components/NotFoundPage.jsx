import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { setDocumentMeta } from '../lib/documentMeta'

const COPY = {
  page: {
    title: 'Page not found',
    body: 'That page does not exist, moved, or was never published.',
  },
  post: {
    title: 'Post not found',
    body: 'This post is not published, does not exist, or is still saving.',
  },
  project: {
    title: 'Project not found',
    body: 'That project archive does not exist or is not public.',
  },
}

export function NotFoundPage({ kind = 'page', title = '', body = '', backTo = '/archive', backLabel = 'Back to archive' }) {
  const copy = COPY[kind] || COPY.page
  const heading = title || copy.title
  const message = body || copy.body

  useEffect(() => {
    setDocumentMeta({
      title: heading,
      description: message,
      canonicalPath: window.location.pathname,
    })
  }, [heading, message])

  return (
    <main className="page not-found-page" aria-labelledby="not-found-title">
      <PublicationTopbar />
      <section className="missing-state not-found-page__body">
        <p className="project-hero__eyebrow">404</p>
        <h1 id="not-found-title">{heading}</h1>
        <p>{message}</p>
        <div className="not-found-page__actions">
          <Link className="button button--primary" to={backTo}>{backLabel}</Link>
          <Link className="button" to="/">Home</Link>
        </div>
      </section>
      <PublicationFooter />
    </main>
  )
}
