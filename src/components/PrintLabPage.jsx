import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { resolveNativeBodyHtml } from '../lib/nativePublicFeed'
import { renderImportedBody } from '../lib/renderImportedBody'
import { AdminFrame } from './AdminRail'

const PRINT_FORMATS = [
  { value: 'single-page', label: 'Single page article' },
  { value: 'half-sheet-zine', label: 'Half sheet zine' },
  { value: 'booklet-draft', label: 'Booklet draft' },
]

function formatPostLabel(post) {
  const title = post?.title || 'Untitled'
  const status = post?.status || 'draft'
  return `${title} (${status})`
}

export function PrintLabPage() {
  const [posts, setPosts] = useState([])
  const [selectedPostId, setSelectedPostId] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('single-page')
  const [state, setState] = useState('loading')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const loaded = await loadNativeCollection({ includeFuture: 1 })
        if (cancelled) return
        const normalized = Array.isArray(loaded)
          ? loaded.filter((post) => post.status !== 'trash')
          : []
        setPosts(normalized)
        if (normalized[0]?.id) setSelectedPostId(normalized[0].id)
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

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || null,
    [posts, selectedPostId]
  )

  const previewBody = useMemo(
    () => renderImportedBody(resolveNativeBodyHtml(selectedPost || {}), 'read'),
    [selectedPost]
  )

  const previewImage = selectedPost?.featuredImage || selectedPost?.heroImage || ''

  return (
    <AdminFrame>
      <main className="page wp-admin-screen print-lab-page">
        <div className="wp-screen-header print-lab-screen-header">
          <h1>Print Lab</h1>
          <Link className="button" to="/tools">Back to Tools</Link>
        </div>

        <section className="wp-meta-box print-lab-controls" aria-label="Print controls">
          <h2>Print layout generator</h2>
          <p className="description">
            Select an existing post and format to generate a printable preview using post title, excerpt, featured image, and body.
          </p>

          <div className="print-lab-controls__row">
            <label>
              Post
              <select value={selectedPostId} onChange={(event) => setSelectedPostId(event.target.value)}>
                {posts.map((post) => (
                  <option key={post.id} value={post.id}>{formatPostLabel(post)}</option>
                ))}
              </select>
            </label>

            <label>
              Format
              <select value={selectedFormat} onChange={(event) => setSelectedFormat(event.target.value)}>
                {PRINT_FORMATS.map((format) => (
                  <option key={format.value} value={format.value}>{format.label}</option>
                ))}
              </select>
            </label>

            <button type="button" className="button button--primary" onClick={() => window.print()}>
              Print
            </button>
          </div>

          {state === 'loading' ? <p className="description">Loading posts…</p> : null}
          {state === 'error' ? <p className="description">Unable to load posts.</p> : null}
          {state === 'loaded' && posts.length === 0 ? <p className="description">No posts available for preview.</p> : null}
        </section>

        <section className="wp-meta-box print-lab-preview-wrap" aria-label="Print preview">
          <h2>Print preview</h2>

          {selectedPost ? (
            <article className={`print-lab-preview print-lab-preview--${selectedFormat}`}>
              <header className="print-lab-preview__header">
                <p className="print-lab-preview__eyebrow">{PRINT_FORMATS.find((item) => item.value === selectedFormat)?.label}</p>
                <h3>{selectedPost.title || 'Untitled post'}</h3>
                {selectedPost.excerpt ? <p className="print-lab-preview__excerpt">{selectedPost.excerpt}</p> : null}
              </header>

              {previewImage ? (
                <figure className="print-lab-preview__hero">
                  <img src={previewImage} alt="" />
                </figure>
              ) : null}

              <div className="print-lab-preview__body">
                {previewBody.length ? previewBody : <p>No body content yet.</p>}
              </div>
            </article>
          ) : (
            <p className="description">Select a post to preview.</p>
          )}
        </section>
      </main>
    </AdminFrame>
  )
}
