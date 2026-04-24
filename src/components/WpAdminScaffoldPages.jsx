import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { listSurfaceConfigs } from '../lib/publicSurfaceTargets'
import { DEFAULT_MENU_ITEMS, loadMenuDraft, loadWpSettings, saveMenuDraft, saveWpSettings } from '../lib/wpAdminLocal'

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

function dedupeByTitle(rows) {
  const map = new Map()
  rows.forEach((row) => {
    if (!map.has(row.title)) map.set(row.title, row)
  })
  return [...map.values()]
}

export function PagesAdminPage() {
  const publicSurfaces = listSurfaceConfigs()

  const pages = dedupeByTitle([
    { id: 'home', title: 'Home', slug: '/', source: 'core' },
    { id: 'archive', title: 'Archive', slug: '/archive', source: 'core' },
    { id: 'press', title: 'Press', slug: '/press', source: 'core' },
    { id: 'projects', title: 'Projects', slug: '/projects', source: 'core' },
    ...publicSurfaces.map((surface) => ({
      id: `surface-${surface.key}`,
      title: surface.title,
      slug: surface.route,
      source: 'public surface',
    })),
  ])

  const today = new Date().toLocaleDateString()

  return (
    <Screen title="Pages" action={<Link className="button button--primary" to="/draft">Add New</Link>}>
      <section className="wp-meta-box">
        <div className="wp-list-filters">
          <div className="wp-view-tabs">
            <button type="button" className="wp-view-tab is-active">All ({pages.length})</button>
          </div>
        </div>
        <table className="wp-list-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" aria-label="Select all pages" /></th>
              <th>Title</th>
              <th>Slug</th>
              <th>Source</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id}>
                <td><input type="checkbox" aria-label={`Select ${page.title}`} /></td>
                <td>
                  <strong>{page.title}</strong>
                  <div className="wp-row-actions">
                    <Link to="/draft">Edit</Link>
                    <Link to={page.slug}>View</Link>
                    <Link to="/customize">Customize</Link>
                  </div>
                </td>
                <td>{page.slug}</td>
                <td>{page.source}</td>
                <td>{today}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Screen>
  )
}

export function MenusAdminPage() {
  const [items, setItems] = useState(() => loadMenuDraft())
  const [status, setStatus] = useState('')

  const changed = useMemo(() => JSON.stringify(items) !== JSON.stringify(loadMenuDraft()), [items])

  function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    setItems((current) => {
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  return (
    <Screen title="Menus" action={<button type="button" className="button button--primary" onClick={() => {
      saveMenuDraft(items)
      setStatus('Menu saved to local storage.')
    }}>{changed ? 'Save Menu' : 'Saved'}</button>}>
      <section className="wp-meta-box">
        <h2>Edit Menus</h2>
        <p>Primary menu scaffold (Archive / Press / Projects) with local reorder + label edits.</p>
        <table className="wp-list-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Path</th>
              <th style={{ width: 140 }}>Order</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td><input value={item.label} onChange={(e) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, label: e.target.value } : row))} /></td>
                <td><input value={item.to} onChange={(e) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, to: e.target.value } : row))} /></td>
                <td className="wp-list-controls">
                  <button type="button" className="button" onClick={() => move(index, -1)} aria-label={`Move ${item.label} up`}>↑</button>
                  <button type="button" className="button" onClick={() => move(index, 1)} aria-label={`Move ${item.label} down`}>↓</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="wp-meta-actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              setItems(DEFAULT_MENU_ITEMS)
              setStatus('Reset menu draft to default scaffold.')
            }}
          >
            Reset to default
          </button>
          {status ? <p>{status}</p> : null}
          {changed ? <p><em>You have unsaved menu changes.</em></p> : null}
        </div>
      </section>
    </Screen>
  )
}

const CUSTOMIZER_ITEMS = [
  'Site Identity',
  'Colors',
  'Header / Masthead',
  'Navigation',
  'Homepage',
]

export function CustomizeAdminPage() {
  return (
    <Screen title="Customize" action={<Link className="button button--primary" to="/draft">Open /draft editor</Link>}>
      <section className="wp-meta-box">
        <h2>Customizer</h2>
        <p>Jump to existing draft editing while keeping WordPress-like panel groupings.</p>
        <ul className="wp-checklist">
          {CUSTOMIZER_ITEMS.map((item) => (
            <li key={item}><Link to="/draft">{item}</Link></li>
          ))}
        </ul>
      </section>
    </Screen>
  )
}

export function SiteEditorAdminPage() {
  return (
    <Screen title="Site Editor" action={<Link className="button button--primary" to="/draft">Open Site Editor</Link>}>
      <section className="wp-meta-box">
        <h2>Templates and Patterns</h2>
        <p>Site-wide template editing remains bridged to the existing /draft route.</p>
      </section>
    </Screen>
  )
}

const TOOL_ROWS = [
  { label: 'Import', note: 'WordPress importer scaffold placeholder' },
  { label: 'Export', note: 'WordPress export scaffold placeholder' },
  { label: 'Native content export', note: 'Use Native bridge and JSON export helpers' },
  { label: 'Public config export', note: 'Use public config API export helper' },
  { label: 'Media audit', note: 'Use media manager + local media inventory' },
  { label: 'WordPress REST audit', note: 'Placeholder for REST parity checks' },
]

export function ToolsAdminPage() {
  return (
    <Screen title="Tools">
      <section className="wp-meta-box">
        <h2>Available tools</h2>
        <table className="wp-list-table">
          <thead><tr><th>Tool</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            {TOOL_ROWS.map((tool) => (
              <tr key={tool.label}>
                <td>{tool.label}</td>
                <td>Scaffolded</td>
                <td>{tool.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Screen>
  )
}

export function SettingsAdminPage() {
  const [form, setForm] = useState(() => loadWpSettings())
  const [status, setStatus] = useState('')

  return (
    <Screen title="Settings" action={<button type="button" className="button button--primary" onClick={() => {
      saveWpSettings(form)
      setStatus('Settings saved locally.')
    }}>Save Changes</button>}>
      <section className="wp-meta-box wp-settings-form">
        <h2>General</h2>
        <label>Site title <input value={form.siteTitle} onChange={(e) => setForm((state) => ({ ...state, siteTitle: e.target.value }))} /></label>
        <label>Tagline <input value={form.tagline} onChange={(e) => setForm((state) => ({ ...state, tagline: e.target.value }))} /></label>
        <label>Homepage source
          <select value={form.homepageSource} onChange={(e) => setForm((state) => ({ ...state, homepageSource: e.target.value }))}>
            <option value="updates">Updates feed</option>
            <option value="static">Static page</option>
          </select>
        </label>
        <label>Posts per page
          <input type="number" min="1" max="100" value={form.postsPerPage} onChange={(e) => setForm((state) => ({ ...state, postsPerPage: Number(e.target.value) || 10 }))} />
        </label>
        <label>Default post type
          <select value={form.defaultPostType} onChange={(e) => setForm((state) => ({ ...state, defaultPostType: e.target.value }))}>
            <option value="dispatch">Dispatch</option>
            <option value="podcast">Podcast</option>
            <option value="print">Print</option>
          </select>
        </label>
        <label>Media mode
          <select value={form.mediaMode} onChange={(e) => setForm((state) => ({ ...state, mediaMode: e.target.value }))}>
            <option value="local-only">Local only</option>
            <option value="future-cloud">Future cloud</option>
          </select>
        </label>
        {status ? <p>{status}</p> : null}
      </section>
    </Screen>
  )
}
