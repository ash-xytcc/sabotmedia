import { Link } from 'react-router-dom'
import {
  PagesAdminPage,
  SettingsAdminPage,
  UsersAdminPage,
} from './WpAdminScaffoldPages'

export { PagesAdminPage, SettingsAdminPage, UsersAdminPage }

export function CustomizeAdminPage() {
  return (
    <main className="wp-admin-page">
      <header className="wp-admin-page__header">
        <div>
          <p className="wp-admin-page__eyebrow">Appearance</p>
          <h1>Customize</h1>
          <p>Adjust the public site presentation and open the live editor.</p>
        </div>
        <Link className="button button--primary" to="/site-editor/home">
          Open Live Site Editor
        </Link>
      </header>
    </main>
  )
}

export function SiteEditorAdminPage() {
  return (
    <main className="wp-admin-page">
      <header className="wp-admin-page__header">
        <div>
          <p className="wp-admin-page__eyebrow">Live Site</p>
          <h1>Site Editor</h1>
          <p>Edit the public site layout and homepage presentation.</p>
        </div>
      </header>
    </main>
  )
}

export function ToolsAdminPage() {
  function exportBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      posts: JSON.parse(localStorage.getItem('sabot-native-posts') || '[]'),
      media: JSON.parse(localStorage.getItem('sabot-media-library') || '[]'),
      settings: JSON.parse(localStorage.getItem('sabot-settings') || '{}'),
      customizer: JSON.parse(localStorage.getItem('sabot-customizer') || '{}'),
      users: JSON.parse(localStorage.getItem('sabot-users') || '[]'),
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sabot-media-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="wp-admin-page">
      <header className="wp-admin-page__header">
        <div>
          <p className="wp-admin-page__eyebrow">Tools</p>
          <h1>Tools</h1>
          <p>Export a local backup of this Sabot Media site.</p>
        </div>
      </header>

      <section className="wp-admin-card">
        <h2>Backup Export</h2>
        <p>Downloads posts, media, settings, customizer data, and users as JSON.</p>
        <button type="button" className="button button--primary" onClick={exportBackup}>
          Export Backup JSON
        </button>
      </section>
    </main>
  )
}
