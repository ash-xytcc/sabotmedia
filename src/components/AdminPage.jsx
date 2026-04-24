import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'

export function AdminPage({ pieces = [] }) {
  const total = pieces.length
  const drafts = pieces.filter((piece) => !piece.publishedAt).length
  const published = pieces.filter((piece) => piece.publishedAt).length

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
            <p>Recent publishing activity appears in the posts table and revisions.</p>
            <p><Link to="/content">Open Posts</Link></p>
          </article>

          <article className="wp-meta-box">
            <h2>Quick Draft</h2>
            <p>Start a post in the classic editor and save locally.</p>
            <p><Link className="button button--primary" to="/native-bridge?new=article">Write a draft</Link></p>
          </article>

          <article className="wp-meta-box">
            <h2>Recent Drafts</h2>
            <p>Open drafts from Posts and continue editing in Classic mode.</p>
            <p><Link to="/content">Go to drafts</Link></p>
          </article>

          <article className="wp-meta-box">
            <h2>Site Health Status</h2>
            <p>Local-first persistence active. Native preview and content routes enabled.</p>
            <p><Link to="/draft">Pages / Site Editor</Link></p>
          </article>
        </section>
      </main>
    </AdminFrame>
  )
}
