import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { loadQuickDrafts, saveQuickDraft } from '../lib/wpAdminLocal'
import { AdminFrame } from './AdminRail'
import { WpAnalyticsWidgets } from './WpAnalyticsWidgets'

export function AdminPage({ pieces = [] }) {
  const total = pieces.length
  const drafts = pieces.filter((piece) => !piece.publishedAt).length
  const published = pieces.filter((piece) => piece.publishedAt).length

  const [nativeDrafts, setNativeDrafts] = useState([])
  const [quickDrafts, setQuickDrafts] = useState(() => loadQuickDrafts())
  const [quickTitle, setQuickTitle] = useState('')
  const [quickBody, setQuickBody] = useState('')

  useEffect(() => {
    loadNativeCollection({ includeFuture: 1 }).then((items) => {
      setNativeDrafts((items || []).filter((item) => item.status === 'draft').slice(0, 5))
    })
  }, [])

  function handleQuickDraftSubmit(e) {
    e.preventDefault()
    const next = saveQuickDraft({ title: quickTitle, content: quickBody })
    setQuickDrafts(next)
    setQuickTitle('')
    setQuickBody('')
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Dashboard</h1>
        </div>

        <section className="wp-dashboard-grid">
          <article className="wp-meta-box">
            <h2>At a Glance</h2>
            <ul>
              <li>{total} Posts</li>
              <li>{published} Published</li>
              <li>{drafts} Drafts</li>
            </ul>
            <p>
              <Link to="/content">View Posts</Link> · <Link to="/native-bridge?new=article">Add New</Link> · <Link to="/media">Media Library</Link>
            </p>
          </article>

          <article className="wp-meta-box">
            <h2>Activity</h2>
            {nativeDrafts.length ? (
              <ul>
                {nativeDrafts.slice(0, 3).map((item) => (
                  <li key={item.id}><Link to={`/native-bridge?edit=${item.id}`}>{item.title || 'Untitled draft'}</Link></li>
                ))}
              </ul>
            ) : <p>No recent draft activity yet.</p>}
            <p><Link to="/content">Open Posts</Link></p>
          </article>

          <article className="wp-meta-box">
            <h2>Quick Draft</h2>
            <form onSubmit={handleQuickDraftSubmit} className="wp-quick-draft-form">
              <input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} placeholder="Title" />
              <textarea value={quickBody} onChange={(e) => setQuickBody(e.target.value)} placeholder="What’s on your mind?" />
              <button type="submit" className="button button--primary">Save Draft</button>
            </form>
          </article>

          <article className="wp-meta-box">
            <h2>Recent Drafts</h2>
            <ul>
              {nativeDrafts.map((draftItem) => (
                <li key={draftItem.id}><Link to={`/native-bridge?edit=${draftItem.id}`}>{draftItem.title || 'Untitled draft'}</Link></li>
              ))}
              {!nativeDrafts.length ? <li>None yet.</li> : null}
            </ul>
            {quickDrafts.length ? (
              <>
                <h3>Quick Drafts (local)</h3>
                <ul>
                  {quickDrafts.slice(0, 3).map((item) => <li key={item.id}>{item.title}</li>)}
                </ul>
              </>
            ) : null}
          </article>

          <article className="wp-meta-box">
            <h2>Site Health Status</h2>
            <p>Local-first persistence active. Native preview and content routes enabled.</p>
            <p><Link to="/customize">Customize</Link> · <Link to="/tools#advanced-draft-tools">Advanced Draft Tools</Link></p>
          </article>
        </section>

        <section className="wp-dashboard-section">
          <div className="wp-dashboard-section__header">
            <h2>Analytics Overview</h2>
            <Link to="/analytics">Open full analytics screen</Link>
          </div>
          <WpAnalyticsWidgets pieces={pieces} compact />
        </section>
      </main>
    </AdminFrame>
  )
}
