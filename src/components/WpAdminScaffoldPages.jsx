import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import { listSurfaceConfigs } from '../lib/publicSurfaceTargets'
import { DEFAULT_MENU_ITEMS, loadMenuDraft, loadWpSettings, saveMenuDraft, saveWpSettings } from '../lib/wpAdminLocal'
import { fetchWordPressPieces } from '../lib/wordpressClient'
import { loadNativeCollection, slugify, upsertNativeEntry } from '../lib/nativePublicContent'

function Screen({ title, children, action }) {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>{title}</h1>
          {action || null}
        </div>
        <WpAdminNotices />
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
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState({})
  const [nativeItems, setNativeItems] = useState([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  function getMatch(post, items = nativeItems) {
    return items.find((item) => {
      const samePostId = String(item.sourcePostId || item.sourceExternalId || '') === String(post.sourcePostId || '')
      const sameSource = item.sourceUrl && post.sourceUrl && item.sourceUrl === post.sourceUrl
      const sameSlug = item.slug && post.slug && item.slug === post.slug
      return samePostId || sameSource || sameSlug
    })
  }

  function isLikelyLocallyEdited(item) {
    if (!item) return false
    if (item.sourceKind !== 'wordpress') return true
    const createdAt = new Date(item.createdAt || 0).getTime()
    const updatedAt = new Date(item.updatedAt || 0).getTime()
    if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) return false
    return updatedAt - createdAt > 60_000
  }

  async function fetchPreview() {
    setBusy(true)
    setStatus('Fetching WordPress posts…')
    try {
      const [wpRows, native] = await Promise.all([
        fetchWordPressPieces({ perPage: 100 }),
        loadNativeCollection(),
      ])
      setNativeItems(native)
      setRows(wpRows)
      const defaults = {}
      wpRows.forEach((row) => {
        const existing = getMatch(row, native)
        defaults[row.id] = !existing || !isLikelyLocallyEdited(existing)
      })
      setSelected(defaults)
      setStatus(`Loaded ${wpRows.length} WordPress posts for preview.`)
    } catch (err) {
      setStatus(`WordPress sync failed: ${String(err?.message || err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function importSelected() {
    const picked = rows.filter((row) => selected[row.id])
    if (!picked.length) {
      setStatus('Select at least one post to import.')
      return
    }

    setBusy(true)
    setStatus(`Importing ${picked.length} posts…`)

    try {
      let working = [...nativeItems]
      for (const post of picked) {
        const existing = getMatch(post, working)
        const entry = {
          ...(existing || {}),
          id: existing?.id || `wp-${post.sourcePostId}`,
          contentType: 'dispatch',
          status: existing?.status || 'draft',
          workflowState: existing?.workflowState || 'draft',
          target: existing?.target || 'general',
          title: post.title,
          slug: slugify(post.slug || post.title),
          excerpt: post.excerpt || '',
          body: post.bodyHtml || post.body || '',
          bodyHtml: post.bodyHtml || post.body || '',
          publishedAt: post.publishedAt || existing?.publishedAt || '',
          categories: Array.isArray(post.projects) ? post.projects : [],
          projects: Array.isArray(post.projects) ? post.projects : [],
          tags: Array.isArray(post.tags) ? post.tags : [],
          featuredImage: post.featuredImage || '',
          heroImage: post.featuredImage || '',
          sourceType: 'wordpress',
          sourceKind: 'wordpress',
          sourceLabel: 'WordPress',
          sourceUrl: post.sourceUrl || '',
          sourceExternalId: String(post.sourcePostId || ''),
          sourcePostId: String(post.sourcePostId || ''),
        }
        working = await upsertNativeEntry(working, entry, 'wordpress import sync')
      }

      setNativeItems(working)
      setStatus(`Imported ${picked.length} posts into native content.`)
    } catch (err) {
      setStatus(`Import failed: ${String(err?.message || err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title="Tools">
      <section className="wp-meta-box">
        <h2>Available tools</h2>
        <p>Use this scaffold button to verify WordPress-style warning/error feedback paths.</p>
        <button type="button" className="button" onClick={() => pushNotice('Autosave failed.', 'error')}>Simulate autosave failure</button>
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
      <section className="wp-meta-box">
        <h2>WordPress Sync</h2>
        <p>Preview posts from <code>https://sabotmedia.noblogs.org/wp-json/wp/v2/posts?_embed=1</code> and import selected rows into native content.</p>
        <div className="wp-meta-actions">
          <button type="button" className="button" onClick={fetchPreview} disabled={busy}>
            {busy ? 'Working…' : 'Fetch preview'}
          </button>
          <button type="button" className="button button--primary" onClick={importSelected} disabled={busy || !rows.length}>
            Import selected
          </button>
        </div>
        {status ? <p>{status}</p> : null}
        {rows.length ? (
          <table className="wp-list-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all imported posts"
                    checked={rows.length > 0 && rows.every((row) => selected[row.id])}
                    onChange={(e) => {
                      const next = {}
                      rows.forEach((row) => { next[row.id] = e.target.checked })
                      setSelected(next)
                    }}
                  />
                </th>
                <th>Title</th>
                <th>Slug</th>
                <th>Published</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const existing = getMatch(row)
                const locallyEdited = isLikelyLocallyEdited(existing)
                return (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[row.id])}
                        onChange={(e) => setSelected((state) => ({ ...state, [row.id]: e.target.checked }))}
                        aria-label={`Select ${row.title}`}
                      />
                    </td>
                    <td>{row.title}</td>
                    <td>{row.slug}</td>
                    <td>{row.publishedDateLabel || '—'}</td>
                    <td>{existing ? (locallyEdited ? 'Existing (locally edited)' : 'Existing') : 'New'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : null}
      </section>
    </Screen>
  )
}

export function SettingsAdminPage() {
  const [form, setForm] = useState(() => loadWpSettings())
  const [status, setStatus] = useState('')
  const { pushNotice } = useAdminNotices()

  return (
    <Screen title="Settings" action={<button type="button" className="button button--primary" onClick={() => {
      saveWpSettings(form)
      setStatus('Settings saved locally.')
      pushNotice('Settings saved.', 'success')
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

const ROLE_PERMISSION_ROWS = [
  {
    role: 'Administrator',
    publish: 'Yes',
    manageUsers: 'Yes',
    manageSettings: 'Yes',
    note: 'Full local admin access in this scaffold.',
  },
  {
    role: 'Editor',
    publish: 'Yes',
    manageUsers: 'No',
    manageSettings: 'No',
    note: 'Can publish and manage content.',
  },
  {
    role: 'Author',
    publish: 'Own posts',
    manageUsers: 'No',
    manageSettings: 'No',
    note: 'Can write + publish own posts.',
  },
  {
    role: 'Contributor',
    publish: 'No',
    manageUsers: 'No',
    manageSettings: 'No',
    note: 'Can draft posts pending review.',
  },
  {
    role: 'Subscriber',
    publish: 'No',
    manageUsers: 'No',
    manageSettings: 'No',
    note: 'Read-only local account placeholder.',
  },
]

export function UsersAdminPage() {
  const [users, setUsers] = useState(() => loadUserRoleSettings())
  const [status, setStatus] = useState('')
  const [permissionsStatus, setPermissionsStatus] = useState('Checking current editor permission checks...')

  useEffect(() => {
    getEditorPermissionsSnapshot()
      .then((snapshot) => {
        setPermissionsStatus(snapshot?.canEditAnything
          ? 'Current editor permission checks: editable.'
          : 'Current editor permission checks: read-only fallback.')
      })
      .catch(() => {
        setPermissionsStatus('Current editor permission checks unavailable. Local role storage still active.')
      })
  }, [])

  function updateRole(id, role) {
    setUsers((rows) => rows.map((row) => (row.id === id ? { ...row, role } : row)))
  }

  return (
    <Screen
      title="Users"
      action={(
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            saveUserRoleSettings(users)
            setStatus('Users and role settings saved to local storage.')
          }}
        >
          Save Local Roles
        </button>
      )}
    >
      <section className="wp-meta-box">
        <h2>All Users</h2>
        <p>{permissionsStatus}</p>
        <table className="wp-list-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.username}</strong></td>
                <td>{user.displayName}</td>
                <td>{user.email}</td>
                <td>
                  <select value={user.role} onChange={(e) => updateRole(user.id, e.target.value)}>
                    {WP_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </td>
                <td>{user.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {status ? <p>{status}</p> : null}
      </section>

      <section className="wp-meta-box">
        <h2>Roles and Permissions</h2>
        <p>WordPress-like role model scaffold for Bondfire expansion planning. No production auth changes are applied here.</p>
        <table className="wp-list-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Publish</th>
              <th>Manage users</th>
              <th>Manage settings</th>
              <th>Explanation</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_PERMISSION_ROWS.map((row) => (
              <tr key={row.role}>
                <td><strong>{row.role}</strong></td>
                <td>{row.publish}</td>
                <td>{row.manageUsers}</td>
                <td>{row.manageSettings}</td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><button type="button" className="button" onClick={() => {
          setUsers(DEFAULT_LOCAL_USERS)
          setStatus('Reset local users to placeholder profile.')
        }}>Reset to placeholder user</button></p>
      </section>
    </Screen>
  )
}
