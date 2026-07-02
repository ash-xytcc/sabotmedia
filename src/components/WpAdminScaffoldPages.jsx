import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { DEFAULT_SETTINGS, loadWpSettings, saveWpSettings } from '../lib/wpAdminLocal'
import { getPieces } from '../lib/pieces'

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
    // local  only
  }
}

export function PagesAdminPage() {
  const samplePost = getPieces().find((piece) => piece?.slug)
  const samplePostPath = samplePost?.slug ? `/post/${samplePost.slug}` : '/archive'
  const pages = [
    { title: 'Home', slug: 'home', path: '/', type: 'Public page', customizeSection: 'homepage' },
    { title: 'Archive', slug: 'archive', path: '/archive', type: 'Public index', customizeSection: 'navigation' },
    { title: 'Post template', slug: 'post-template', path: samplePostPath, type: 'Template', customizeSection: 'colors' },
    { title: 'Printlab', slug: 'printlab', path: '/printlab', type: 'Admin tool', customizeSection: 'masthead' },
  ]

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Pages</h1>
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
                      <Link to={`/draft?page=${page.slug}`}>Edit Live</Link>
                      <Link to={`/customize?section=${page.customizeSection}`}>Customize</Link>
                    </div>
                  </td>
                  <td>{page.slug}</td>
                  <td>{page.type}</td>
                  <td>{page.path}</td>
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
  const [settings, setSettings] = useState(() => loadWpSettings())
  const [saved, setSaved] = useState('')

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  function saveSettings() {
    const savedSettings = saveWpSettings({
      ...settings,
      postsPerPage: Math.max(1, Number(settings.postsPerPage) || DEFAULT_SETTINGS.postsPerPage),
    })
    setSettings(savedSettings)
    setSaved('Settings saved.')
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Settings</h1>
          <button className="button button--primary" type="button" onClick={saveSettings}>Save Changes</button>
        </div>

        <section className="wp-meta-box">
          <h2>General</h2>
          <div className="wp-settings-form">
            <label>
              <span>Site title</span>
              <input value={settings.siteTitle || ''} onChange={(event) => update('siteTitle', event.target.value)} />
            </label>
            <label>
              <span>Tagline</span>
              <input value={settings.tagline || ''} onChange={(event) => update('tagline', event.target.value)} />
            </label>
            <label>
              <span>Posts per page</span>
              <input type="number" min="1" max="100" value={settings.postsPerPage || 10} onChange={(event) => update('postsPerPage', Number(event.target.value) || 10)} />
            </label>
            <label>
              <span>Default post type</span>
              <select value={settings.defaultPostType || 'dispatch'} onChange={(event) => update('defaultPostType', event.target.value)}>
                <option value="dispatch">Dispatch</option>
                <option value="article">Article</option>
                <option value="podcast">Podcast</option>
                <option value="print">Print</option>
              </select>
            </label>
          </div>
          {saved ? <p className="description" role="status">{saved}</p> : null}
        </section>
      </main>
    </AdminFrame>
  )
}

export function UsersAdminPage() {
  const [settings, setSettings] = useState(() => loadJson(USER_ROLE_SETTINGS_KEY, {
    users: [{
      id: 'local-admin',
      username: 'sabotmedia',
      email: 'local@sabotmedia',
      displayName: 'sabotmedia',
      role: 'Administrator',
    }],
    roles: ['Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber'],
  }))
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    displayName: '',
    role: 'Subscriber',
  })

  const normalizedUsers = useMemo(() => settings.users.map((user) => ({
    ...user,
    username: user.username || user.name || '',
    displayName: user.displayName || user.name || user.username || '',
  })), [settings.users])

  useEffect(() => {
    saveJson(USER_ROLE_SETTINGS_KEY, settings)
  }, [settings])

  function updateRole(id, role) {
    setSettings((current) => ({
      ...current,
      users: current.users.map((user) => user.id === id ? { ...user, role } : user),
    }))
  }

  function saveUsers() {
    saveJson(USER_ROLE_SETTINGS_KEY, settings)
  }

  function updateNewUser(field, value) {
    setNewUser((current) => ({ ...current, [field]: value }))
  }

  function addUser(event) {
    event.preventDefault()
    const username = newUser.username.trim()
    const email = newUser.email.trim()
    const displayName = newUser.displayName.trim()

    if (!username || !email || !displayName) return

    setSettings((current) => ({
      ...current,
      users: [...current.users, {
        id: `local-${Date.now()}`,
        username,
        email,
        displayName,
        role: newUser.role,
      }],
    }))
    setNewUser({ username: '', email: '', displayName: '', role: 'Subscriber' })
    setIsAddingUser(false)
  }

  function deleteUser(id) {
    setSettings((current) => ({
      ...current,
      users: current.users.filter((user) => user.id !== id),
    }))
  }

  const hasRequiredNewUserFields = newUser.username.trim() && newUser.email.trim() && newUser.displayName.trim()

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Users</h1>
          <div>
            <button className="button" type="button" onClick={() => setIsAddingUser((current) => !current)}>Add New</button>{' '}
            <button className="button button--primary" type="button" onClick={saveUsers}>Save Users</button>
          </div>
        </div>

        {isAddingUser && (
          <section className="wp-meta-box">
            <h2>Add New User</h2>
            <form className="wp-settings-form" onSubmit={addUser}>
              <label><span>Username</span><input value={newUser.username} onChange={(e) => updateNewUser('username', e.target.value)} /></label>
              <label><span>Email</span><input type="email" value={newUser.email} onChange={(e) => updateNewUser('email', e.target.value)} /></label>
              <label><span>Display name</span><input value={newUser.displayName} onChange={(e) => updateNewUser('displayName', e.target.value)} /></label>
              <label>
                <span>Role</span>
                <select value={newUser.role} onChange={(e) => updateNewUser('role', e.target.value)}>
                  {settings.roles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <p>
                <button className="button button--primary" type="submit" disabled={!hasRequiredNewUserFields}>Create User</button>{' '}
                <button className="button" type="button" onClick={() => setIsAddingUser(false)}>Cancel</button>
              </p>
            </form>
          </section>
        )}

        <section className="wp-meta-box">
          <h2>Users</h2>
          <table className="content-table wp-posts-table">
            <thead><tr><th>Username</th><th>Email</th><th>Display name</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              {normalizedUsers.map((user) => {
                const isProtectedUser = user.id === 'local-admin' || (user.username === 'sabotmedia' && user.role === 'Administrator')
                return (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.displayName}</td>
                  <td>
                    <select value={user.role} onChange={(e) => updateRole(user.id, e.target.value)}>
                      {settings.roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td>
                    {!isProtectedUser && (
                      <button className="button button-link-delete" type="button" onClick={() => deleteUser(user.id)}>Delete</button>
                    )}
                  </td>
                </tr>
                )
              })}
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
            <li><strong>Subscriber:</strong> read-only account</li>
          </ul>
        </section>
      </main>
    </AdminFrame>
  )
}
