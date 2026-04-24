import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { getPieces } from '../lib/pieces'
import { loadLocalMediaItems } from '../lib/localMediaLibrary'
import { exportNativeCollection, loadNativeCollection } from '../lib/nativePublicContent'
import { getStoredPublicConfig, resolvePublicConfig } from '../lib/publicConfig'

const SETTINGS_KEY = 'sabot-wp-clone-settings-v1'
const MENU_KEY = 'sabot-wp-clone-menu-v1'
const USER_ROLE_SETTINGS_KEY = 'sabot-wp-clone-user-role-settings-v1'

function loadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // local scaffold only
  }
}

function WpNotice({ children }) {
  return <div className="notice notice-info"><p>{children}</p></div>
}

function downloadJson(filename, payload) {
  const blob = new Blob([payload], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

async function copyToClipboard(value) {
  if (!navigator?.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function PagesAdminPage() {
  const pages = [
    { title: 'Home', slug: 'home', path: '/', status: 'Published' },
    { title: 'Archive', slug: 'archive', path: '/archive', status: 'Published' },
    { title: 'Press', slug: 'press', path: '/press', status: 'Published' },
    { title: 'Projects', slug: 'projects', path: '/projects', status: 'Published' },
  ]

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Pages</h1>
          <Link className="button button--primary" to="/draft">Add New</Link>
        </div>

        <section className="wp-meta-box">
          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.slug}>
                  <td><strong>{page.title}</strong></td>
                  <td>{page.slug}</td>
                  <td>{page.status}</td>
                  <td>
                    <div className="wp-row-actions">
                      <Link to="/draft">Edit Site</Link>
                      <Link to={page.path}>View</Link>
                      <Link to="/customize">Customize</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}

export function MenusAdminPage() {
  const [items, setItems] = useState(() => loadJson(MENU_KEY, [
    { label: 'Archive', to: '/archive' },
    { label: 'Press', to: '/press' },
    { label: 'Projects', to: '/projects' },
  ]))

  function updateItem(index, patch) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  function saveMenu() {
    saveJson(MENU_KEY, items)
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Menus</h1>
          <button className="button button--primary" type="button" onClick={saveMenu}>Save Menu</button>
        </div>

        <WpNotice>This is a local WordPress-style menu scaffold. Public masthead wiring can read this later.</WpNotice>

        <section className="wp-meta-box">
          <h2>Menu Structure</h2>
          <p className="description">Edit the visible public navigation items.</p>

          <div className="wp-menu-editor">
            {items.map((item, index) => (
              <div className="wp-menu-item" key={`${item.to}-${index}`}>
                <input value={item.label} onChange={(e) => updateItem(index, { label: e.target.value })} />
                <input value={item.to} onChange={(e) => updateItem(index, { to: e.target.value })} />
                <button type="button" className="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>Remove</button>
              </div>
            ))}
          </div>

          <p>
            <button type="button" className="button" onClick={() => setItems((current) => [...current, { label: 'New Item', to: '/' }])}>
              Add menu item
            </button>
          </p>
        </section>
      </main>
    </AdminFrame>
  )
}

export function CustomizeAdminPage() {
  const sections = [
    ['Site Identity', 'Title, tagline, icon, and publication identity.'],
    ['Colors', 'Theme colors and editorial color controls.'],
    ['Header / Masthead', 'Logo, masthead placement, and header layout.'],
    ['Navigation', 'Public nav placement and menu behavior.'],
    ['Homepage', 'Featured content, feed source, and layout.'],
  ]

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Customize</h1>
          <Link className="button" to="/">View site</Link>
        </div>

        <section className="wp-meta-box wp-customize-shell">
          <h2>Customizer</h2>
          <p className="description">WordPress-style customizer scaffold for Sabot.</p>

          <div className="wp-customize-section-list">
            {sections.map(([title, body]) => (
              <button className="wp-customize-section" type="button" key={title}>
                <span>{title}</span>
                <small>{body}</small>
              </button>
            ))}
          </div>

          <p className="description">
            Legacy draft/config editor remains available at <Link to="/draft">Site Editor</Link>.
          </p>
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
          <h1>Site Editor</h1>
          <Link className="button button--primary" to="/draft">Open Site Editor</Link>
        </div>

        <section className="wp-meta-box">
          <h2>Pages and public surface editing</h2>
          <p className="description">
            This wraps the existing public site editing tools in a WordPress-like entry point.
          </p>
          <p><Link to="/customize">Customize</Link> · <Link to="/menus">Menus</Link> · <Link to="/draft">Draft editor</Link></p>
        </section>
      </main>
    </AdminFrame>
  )
}

export function ToolsAdminPage() {
  const [notices, setNotices] = useState([])

  function addNotice(type, message) {
    setNotices((current) => [{ id: `${Date.now()}-${Math.random()}`, type, message }, ...current].slice(0, 6))
  }

  async function runNativeExport() {
    const collection = await loadNativeCollection()
    const payload = exportNativeCollection(collection)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadJson(`native-content-export-${stamp}.json`, payload)
    const copied = await copyToClipboard(payload)
    addNotice('success', `Native content export downloaded${copied ? ' and copied to clipboard' : ''}.`)
  }

  async function runPublicSettingsExport() {
    const runtime = getStoredPublicConfig()
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        config: resolvePublicConfig(runtime),
      },
      null,
      2
    )
    const stamp = new Date().toISOString().slice(0, 10)
    downloadJson(`public-settings-export-${stamp}.json`, payload)
    const copied = await copyToClipboard(payload)
    addNotice('success', `Public settings export downloaded${copied ? ' and copied to clipboard' : ''}.`)
  }

  function runMediaAudit() {
    const pieces = getPieces()
    const localMedia = loadLocalMediaItems()
    const importedMediaCount = pieces.filter((piece) => String(piece.sourceType || '').toLowerCase() !== 'manual').length
    const missingFeaturedImages = pieces.filter((piece) => !String(piece.heroImage || piece.featuredImage || '').trim()).length
    addNotice(
      'success',
      `Media audit complete. Total media items: ${localMedia.length + importedMediaCount}. Local uploads: ${localMedia.length}. Imported media references: ${importedMediaCount}. Missing featured images: ${missingFeaturedImages}.`
    )
  }

  function runBrokenImageAudit() {
    addNotice('warning', 'Broken image audit scaffold is in place, but URL validation checks are not implemented yet.')
  }

  function runLocalStorageInventory() {
    const inventory = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue
      const value = window.localStorage.getItem(key) || ''
      inventory.push({ key, bytes: new Blob([value]).size })
    }
    inventory.sort((a, b) => b.bytes - a.bytes)
    const summary = inventory.map((entry) => `${entry.key}: ${entry.bytes} bytes`).join('\n')
    addNotice('success', `LocalStorage inventory complete. ${inventory.length} keys scanned.`)
    if (summary) {
      copyToClipboard(summary)
    }
  }

  const tools = [
    {
      name: 'Export native content JSON',
      status: 'Ready',
      notes: 'Downloads current native content collection and copies JSON when clipboard access is allowed.',
      actionLabel: 'Run export',
      action: runNativeExport,
    },
    {
      name: 'Export public settings JSON',
      status: 'Ready',
      notes: 'Exports resolved public settings from browser storage as JSON.',
      actionLabel: 'Run export',
      action: runPublicSettingsExport,
    },
    {
      name: 'Run media audit',
      status: 'Ready',
      notes: 'Summarizes media totals, local uploads, imported references, and missing featured images.',
      actionLabel: 'Run audit',
      action: runMediaAudit,
    },
    {
      name: 'Run broken image audit',
      status: 'Scaffolded',
      notes: 'Audit flow exists, but URL reachability checks are intentionally not implemented yet.',
      actionLabel: 'Run scaffold',
      action: runBrokenImageAudit,
    },
    {
      name: 'Run localStorage inventory',
      status: 'Ready',
      notes: 'Scans localStorage keys, sizes values in bytes, and copies a text summary.',
      actionLabel: 'Run inventory',
      action: runLocalStorageInventory,
    },
  ]

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Tools</h1>
        </div>

        {notices.map((notice) => (
          <div className={`notice ${notice.type === 'warning' ? 'notice-warning' : 'notice-success'}`} key={notice.id}>
            <p>{notice.message}</p>
          </div>
        ))}

        <section className="wp-meta-box">
          <h2>Available tools</h2>
          <p className="description">Internal Sabot clone tools. Noblogs direct backend is not part of main.</p>

          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.name}>
                  <td><strong>{tool.name}</strong></td>
                  <td>{tool.status}</td>
                  <td>{tool.notes}</td>
                  <td>
                    <button className="button" type="button" onClick={tool.action}>{tool.actionLabel}</button>
                  </td>
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
  const [settings, setSettings] = useState(() => loadJson(SETTINGS_KEY, {
    siteTitle: 'Sabot Media',
    tagline: 'Radical media and publishing',
    homepageSource: 'latest',
    postsPerPage: 12,
    defaultPostType: 'article',
    mediaMode: 'local',
  }))

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  function saveSettings() {
    saveJson(SETTINGS_KEY, settings)
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Settings</h1>
          <button className="button button--primary" type="button" onClick={saveSettings}>Save Changes</button>
        </div>

        <section className="wp-meta-box">
          <h2>General Settings</h2>

          <div className="wp-settings-form">
            <label><span>Site Title</span><input value={settings.siteTitle} onChange={(e) => update('siteTitle', e.target.value)} /></label>
            <label><span>Tagline</span><input value={settings.tagline} onChange={(e) => update('tagline', e.target.value)} /></label>
            <label><span>Homepage source</span><select value={settings.homepageSource} onChange={(e) => update('homepageSource', e.target.value)}><option value="latest">Latest posts</option><option value="featured">Featured post</option></select></label>
            <label><span>Posts per page</span><input type="number" value={settings.postsPerPage} onChange={(e) => update('postsPerPage', Number(e.target.value || 12))} /></label>
            <label><span>Default post type</span><select value={settings.defaultPostType} onChange={(e) => update('defaultPostType', e.target.value)}><option value="article">Article</option><option value="podcast">Podcast</option><option value="print">Print</option></select></label>
            <label><span>Media mode</span><select value={settings.mediaMode} onChange={(e) => update('mediaMode', e.target.value)}><option value="local">Local only</option><option value="future-cloud">Future cloud</option></select></label>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}

export function UsersAdminPage() {
  const [settings, setSettings] = useState(() => loadJson(USER_ROLE_SETTINGS_KEY, {
    users: [{ id: 'local-admin', name: 'sabotmedia', email: 'local@sabotmedia', role: 'Administrator' }],
    roles: ['Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber'],
  }))

  function updateRole(id, role) {
    setSettings((current) => ({
      ...current,
      users: current.users.map((user) => user.id === id ? { ...user, role } : user),
    }))
  }

  function saveUsers() {
    saveJson(USER_ROLE_SETTINGS_KEY, settings)
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Users</h1>
          <button className="button button--primary" type="button" onClick={saveUsers}>Save Roles</button>
        </div>

        <section className="wp-meta-box">
          <h2>Users</h2>
          <table className="content-table wp-posts-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>
              {settings.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select value={user.role} onChange={(e) => updateRole(user.id, e.target.value)}>
                      {settings.roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="wp-meta-box">
          <h2>Role reference</h2>
          <ul>
            <li><strong>Administrator:</strong> full local clone control</li>
            <li><strong>Editor:</strong> publish and manage posts</li>
            <li><strong>Author:</strong> write and publish own posts</li>
            <li><strong>Contributor:</strong> write drafts</li>
            <li><strong>Subscriber:</strong> read-only placeholder</li>
          </ul>
        </section>
      </main>
    </AdminFrame>
  )
}
