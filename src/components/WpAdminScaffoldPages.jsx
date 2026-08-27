import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { AdminPublicConfigCard } from './AdminPublicConfigCard'
import { getPieces } from '../lib/pieces'
import { adminRoutes } from '../routing/routes'

export function PagesAdminPage() {
  const samplePost = getPieces().find((piece) => piece?.slug)
  const samplePostPath = samplePost?.slug ? `/post/${samplePost.slug}` : '/archive'
  const pages = [
    { title: 'Home', slug: 'home', path: '/', type: 'Public route', editPath: adminRoutes.liveEditor },
    { title: 'Archive', slug: 'archive', path: '/archive', type: 'Public route', editPath: adminRoutes.customize },
    { title: 'Collections', slug: 'collections', path: '/collections', type: 'Public index', editPath: adminRoutes.collections },
    { title: 'Publications', slug: 'publications', path: '/publications', type: 'Public index', editPath: adminRoutes.publications },
    { title: 'Feeds', slug: 'feeds', path: '/feeds', type: 'Public index', editPath: adminRoutes.feeds },
    { title: 'About', slug: 'about', path: '/about', type: 'Public route', editPath: adminRoutes.liveEditor },
    { title: 'Contact', slug: 'contact', path: '/contact', type: 'Public route', editPath: adminRoutes.liveEditor },
    { title: 'Submit', slug: 'submit', path: '/submit', type: 'Public route', editPath: adminRoutes.liveEditor },
    { title: 'Support', slug: 'support', path: '/support', type: 'Public route', editPath: adminRoutes.liveEditor },
    { title: 'Security', slug: 'security', path: '/security', type: 'Public route', editPath: adminRoutes.liveEditor },
    { title: 'Post template', slug: 'post-template', path: samplePostPath, type: 'Template', editPath: adminRoutes.customize },
  ]

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Pages</h1>
            <p className="description">Route inventory for public surfaces. SabotPress does not currently store these as WordPress-style page records, so this screen deliberately provides navigation and the correct editor instead of pretending the rows are database objects.</p>
          </div>
        </div>

        <section className="wp-meta-box">
          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Type</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.slug}>
                  <td>
                    <strong className="content-table__title">{page.title}</strong>
                    <div className="wp-row-actions">
                      <Link to={page.path}>View</Link>
                      <Link to={`${page.editPath}?page=${encodeURIComponent(page.slug)}`}>Edit</Link>
                    </div>
                  </td>
                  <td>{page.slug}</td>
                  <td>{page.type}</td>
                  <td><code>{page.path}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}

export function SettingsAdminPage() {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Settings</h1>
            <p className="description">Production-backed site configuration. Saved changes use the authenticated public-site-config API and D1 rather than browser storage.</p>
          </div>
        </div>

        <AdminPublicConfigCard />

        <section className="wp-meta-box">
          <h2>Operational settings</h2>
          <p className="description">Settings with their own data models live on the relevant operational screen instead of being duplicated here.</p>
          <div className="review-card__actions">
            <Link className="button" to={adminRoutes.feeds}>Feeds / RSS</Link>
            <Link className="button" to={adminRoutes.podcasts}>Podcasts</Link>
            <Link className="button" to={adminRoutes.siteHealth}>Site Health</Link>
            <Link className="button" to={adminRoutes.backup}>Backups</Link>
            <Link className="button" to={adminRoutes.sites}>Sites / Domains</Link>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}

export function UsersAdminPage() {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Users</h1>
            <p className="description">Authentication status and collaboration model.</p>
          </div>
        </div>

        <section className="wp-meta-box">
          <h2>Current production model</h2>
          <p>SabotPress currently authenticates the administrative session through the server login/session flow. There is not yet a production user-account table with enforceable per-user roles.</p>
          <p className="notice notice-warning" role="status">The previous controls on this screen created browser-only users that could not actually log in and whose roles were not enforced. Those fake account controls have been removed.</p>
        </section>

        <section className="wp-meta-box">
          <h2>Roles and permissions</h2>
          <p className="description">Editor-role records exist separately, but they are not an authorization boundary until the authenticated session is linked to a persisted user identity and permission checks are enforced in Functions.</p>
          <p><strong>Production blocker:</strong> add a D1 user identity/membership schema, invitation or provisioning flow, and server-side RBAC enforcement before exposing user creation or role-changing controls here.</p>
        </section>

        <section className="wp-meta-box">
          <h2>Security</h2>
          <div className="review-card__actions">
            <Link className="button button--primary" to={adminRoutes.siteHealth}>Check Site Health</Link>
            <Link className="button" to={adminRoutes.auditLog}>View Audit Log</Link>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}
