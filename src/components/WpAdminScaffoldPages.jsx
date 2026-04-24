import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { listSurfaceConfigs } from '../lib/publicSurfaceTargets'

const MENU_STORAGE_KEY = 'sabot.wpClone.navMenu.v1'

function loadMenu() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MENU_STORAGE_KEY) || '[]')
    if (Array.isArray(parsed) && parsed.length) return parsed
  } catch {
    // noop
  }
  return [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'updates', label: 'Updates', path: '/updates' },
    { id: 'projects', label: 'Projects', path: '/projects' },
    { id: 'archive', label: 'Archive', path: '/archive' },
  ]
}

function saveMenu(items) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(items))
}

function Screen({ title, children, action }) {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>{title}</h1>
          {action || null}
        </div>
        {children}
      </main>
    </AdminFrame>
  )
}

export function PagesAdminPage() {
  const surfaces = listSurfaceConfigs()
  const corePages = [
    { title: 'Home', route: '/', status: 'published' },
    { title: 'Projects', route: '/projects', status: 'published' },
    { title: 'Search', route: '/search', status: 'published' },
    { title: 'Archive', route: '/archive', status: 'published' },
  ]

  return (
    <Screen title="Pages" action={<Link className="button" to="/draft">Add New</Link>}>
      <section className="wp-meta-box">
        <h2>Public Pages</h2>
        <table className="wp-list-table">
          <thead><tr><th>Title</th><th>Route</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {corePages.map((page) => (
              <tr key={page.route}>
                <td>{page.title}</td>
                <td><code>{page.route}</code></td>
                <td>{page.status}</td>
                <td><Link to="/draft">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="wp-meta-box">
        <h2>Public Surfaces</h2>
        <table className="wp-list-table">
          <thead><tr><th>Surface</th><th>Description</th><th>Route</th></tr></thead>
          <tbody>
            {surfaces.map((surface) => (
              <tr key={surface.key}>
                <td>{surface.title}</td>
                <td>{surface.description}</td>
                <td><code>{surface.route}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Screen>
  )
}

export function MenusAdminPage() {
  const [items, setItems] = useState(loadMenu)
  const [label, setLabel] = useState('')
  const [path, setPath] = useState('')
  const changed = useMemo(() => JSON.stringify(items) !== JSON.stringify(loadMenu()), [items])

  function updateItem(id, patch) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  return (
    <Screen title="Menus" action={<button type="button" className="button button--primary" onClick={() => saveMenu(items)}>{changed ? 'Save Menu' : 'Saved'}</button>}>
      <section className="wp-meta-box">
        <h2>Main Navigation</h2>
        <p>Edit nav labels and routes locally for clone behavior.</p>
        <table className="wp-list-table">
          <thead><tr><th>Label</th><th>Path</th><th /></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><input value={item.label} onChange={(e) => updateItem(item.id, { label: e.target.value })} /></td>
                <td><input value={item.path} onChange={(e) => updateItem(item.id, { path: e.target.value })} /></td>
                <td><button type="button" className="button" onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="wp-add-row">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
          <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/route" />
          <button
            type="button"
            className="button"
            onClick={() => {
              if (!label.trim() || !path.trim()) return
              setItems((prev) => [...prev, { id: `menu-${Date.now()}`, label: label.trim(), path: path.trim() }])
              setLabel('')
              setPath('')
            }}
          >
            Add Item
          </button>
        </div>
      </section>
    </Screen>
  )
}

export function CustomizeAdminPage() {
  return (
    <Screen title="Customize" action={<Link className="button button--primary" to="/draft">Open Customizer</Link>}>
      <section className="wp-meta-box">
        <h2>Theme Customizer</h2>
        <p>Use the public draft editor for local-first customization and preview workflow.</p>
      </section>
    </Screen>
  )
}

export function SiteEditorAdminPage() {
  return (
    <Screen title="Site Editor" action={<Link className="button button--primary" to="/draft">Open Site Editor</Link>}>
      <section className="wp-meta-box">
        <h2>Templates and Patterns</h2>
        <p>Site-wide layout editing is currently bridged to the existing /draft interface.</p>
      </section>
    </Screen>
  )
}

export function ToolsAdminPage() {
  return (
    <Screen title="Tools">
      <section className="wp-meta-box">
        <h2>Available Tools</h2>
        <ul>
          <li><Link to="/overrides">Content Overrides</Link></li>
          <li><Link to="/system-backup">System Backup</Link></li>
          <li><Link to="/platform-map">Platform Map</Link></li>
        </ul>
      </section>
    </Screen>
  )
}

export function SettingsAdminPage() {
  return (
    <Screen title="Settings">
      <section className="wp-meta-box wp-settings-form">
        <h2>General</h2>
        <label>Site Title <input defaultValue="Sabot Media" /></label>
        <label>Tagline <input defaultValue="Internal WordPress-classic clone" /></label>
        <label>Timezone
          <select defaultValue="UTC"><option>UTC</option><option>America/New_York</option><option>America/Chicago</option><option>America/Los_Angeles</option></select>
        </label>
        <button type="button" className="button button--primary">Save Changes</button>
      </section>
    </Screen>
  )
}
