import { Link, useLocation } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { AdminPublicConfigCard } from './AdminPublicConfigCard'
import { LegacyInfoPageRecovery } from './LegacyInfoPageRecovery'
import { RobotVoiceSettingsCard } from './RobotVoiceSettingsCard'
import { CourseAdminPage } from './CourseAdminPage'
import { getPieces } from '../lib/pieces'
import { adminRoutes } from '../routing/routes'
import { publicPageRegistry, withSiteEdit } from '../lib/publicPageRegistry'

export { AdminUsersPage as UsersAdminPage } from './AdminUsersPage'

export function PagesAdminPage() {
  const location = useLocation()
  const courseEditor = new URLSearchParams(location.search).get('course')
  if (courseEditor === 'become-the-thousand-servers') return <CourseAdminPage />

  const samplePost = getPieces().find((piece) => piece?.slug)
  const samplePostPath = samplePost?.slug ? `/post/${samplePost.slug}` : '/archive'
  const pages = [
    ...publicPageRegistry.map((page) => ({ title: page.label, slug: page.id, path: page.path, type: page.family })),
    { title: 'Post template', slug: 'post-template', path: samplePostPath, type: 'template' },
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
          <h2>Guides / Field Manuals</h2>
          <p className="description">Living instructional material with its own structured editor.</p>
          <div className="review-card__actions">
            <Link className="button button--primary" to="/wp-admin/pages?course=become-the-thousand-servers">Edit Become the Thousand Servers</Link>
            <a className="button" href="/guides/become-the-thousand-servers/" target="_blank" rel="noreferrer">View course</a>
          </div>
        </section>
        <section className="wp-meta-box">
          <table className="content-table wp-posts-table">
            <thead><tr><th>Title</th><th>Slug</th><th>Type</th><th>Path</th></tr></thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.slug}>
                  <td><strong className="content-table__title">{page.title}</strong><div className="wp-row-actions"><Link to={page.path}>View</Link><Link to={withSiteEdit(page.path)}>Edit live</Link></div></td>
                  <td>{page.slug}</td><td>{page.type}</td><td><code>{page.path}</code></td>
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
          <div><h1>Settings</h1><p className="description">The single home for production-backed site configuration. Saved changes use the authenticated public-site-config API and D1 rather than browser storage.</p></div>
          <Link className="button button--primary" to={withSiteEdit('/')}>Edit Live</Link>
        </div>
        <AdminPublicConfigCard />
        <RobotVoiceSettingsCard />
        <LegacyInfoPageRecovery />
        <section className="wp-meta-box">
          <h2>Operational settings</h2>
          <p className="description">Settings with their own data models live on the relevant operational screen instead of being duplicated here.</p>
          <div className="review-card__actions">
            <Link className="button" to={adminRoutes.feeds}>Feeds / RSS</Link>
            <Link className="button" to={adminRoutes.podcasts}>Podcasts</Link>
            <Link className="button" to={adminRoutes.siteHealth}>Site Health</Link>
            <Link className="button" to={adminRoutes.backup}>Backups</Link>
            <Link className="button" to={adminRoutes.sites}>Advanced Domain Registry</Link>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}
