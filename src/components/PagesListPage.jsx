import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { listSurfaceConfigs } from '../lib/publicSurfaceTargets'

function buildPages() {
  const staticPages = [
    { id: 'home', title: 'Home', path: '/' },
    { id: 'archive', title: 'Archive', path: '/archive' },
    { id: 'press', title: 'Press', path: '/press' },
    { id: 'projects', title: 'Projects', path: '/projects' },
  ]

  const fromTargets = listSurfaceConfigs().map((target) => ({
    id: `surface-${target.key}`,
    title: `${target.title}`,
    path: target.route || '/draft',
  }))

  const deduped = new Map()
  ;[...staticPages, ...fromTargets].forEach((item) => {
    if (!deduped.has(item.title)) deduped.set(item.title, item)
  })
  return [...deduped.values()]
}

export function PagesListPage() {
  const pages = buildPages()

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Pages</h1>
          <Link className="button button--primary" to="/draft">Add New</Link>
        </div>

        <section className="wp-meta-box">
          <div className="wp-list-filters">
            <div className="wp-view-tabs">
              <button type="button" className="wp-view-tab is-active">All ({pages.length})</button>
            </div>
          </div>

          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}><input type="checkbox" aria-label="select all pages" /></th>
                <th>Title</th>
                <th>Slug</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td><input type="checkbox" aria-label={`select ${page.title}`} /></td>
                  <td>
                    <strong className="content-table__title">{page.title}</strong>
                    <div className="wp-row-actions">
                      <Link to="/draft">Edit Site</Link>
                      <Link to={page.path}>View</Link>
                      <Link to="/customize">Customize</Link>
                    </div>
                  </td>
                  <td>{page.path}</td>
                  <td>{new Date().toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}
