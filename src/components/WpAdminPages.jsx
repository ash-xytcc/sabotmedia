import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { AdminPublicConfigCard } from './AdminPublicConfigCard'
import {
  PagesAdminPage,
  SettingsAdminPage,
  UsersAdminPage,
} from './WpAdminScaffoldPages'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { adminRoutes } from '../routing/routes'
import { getPieces } from '../lib/pieces'
import { downloadRssBundle } from '../lib/rssFeeds'

export { PagesAdminPage, SettingsAdminPage, UsersAdminPage }

export function CustomizeAdminPage() {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Customize</h1>
            <p className="description">Public-facing configuration saved through the authenticated D1-backed site configuration API.</p>
          </div>
          <div>
            <Link className="button" to={adminRoutes.liveEditor}>Edit Live</Link>
          </div>
        </div>

        <AdminPublicConfigCard />

        <section className="wp-meta-box">
          <h2>How customization works</h2>
          <p className="description">Use Edit Live for visual field selection and this screen to inspect, reload, save, or reset the persisted public configuration. Browser-only customizer settings are no longer presented as production saves.</p>
        </section>
      </main>
    </AdminFrame>
  )
}

export function SiteEditorAdminPage() {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Site Editor</h1>
            <p className="description">The canonical live editing surface is available below.</p>
          </div>
          <Link className="button button--primary" to={adminRoutes.liveEditor}>Open Live Editor</Link>
        </div>
      </main>
    </AdminFrame>
  )
}

export function ToolsAdminPage() {
  const [status, setStatus] = useState('')

  async function exportRss() {
    try {
      const nativeItems = await loadNativeCollection({ includeFuture: 1 })
      downloadRssBundle([...(Array.isArray(nativeItems) ? nativeItems : []), ...getPieces()])
      setStatus('RSS bundle exported. This is a JSON package containing multiple XML feeds for software, not a human-readable article.')
    } catch (error) {
      setStatus(`RSS export failed${error?.message ? `: ${error.message}` : '.'}`)
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Tools</h1>
        </div>

        <section className="wp-meta-box">
          <h2>Backup and Restore</h2>
          <p className="description">Use the production backup surface for authenticated server exports and imports. The old browser-generated backup could silently omit server data, so it is no longer offered here.</p>
          <div className="review-card__actions">
            <Link className="button button--primary" to={adminRoutes.backup}>Open System Backup</Link>
          </div>
        </section>

        <section className="wp-meta-box">
          <h2>Syndication</h2>
          <p className="description">The RSS bundle is a machine-readable package of XML feeds: everything, formats, projects, collections, author labels, topics, series, and podcasts. Edit labels and hide junk imported categories before exposing feeds publicly.</p>
          <div className="review-card__actions">
            <Link className="button button--primary" to={adminRoutes.feeds}>Edit Feed Settings</Link>
            <Link className="button" to="/feeds">View Public Feeds Page</Link>
            <button type="button" className="button" onClick={exportRss}>
              Export RSS Bundle JSON
            </button>
          </div>
          {status ? <p className="description" role="status">{status}</p> : null}
        </section>
      </main>
    </AdminFrame>
  )
}
