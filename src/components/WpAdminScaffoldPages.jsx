import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { exportNativeCollection, loadNativeCollection } from '../lib/nativePublicContent'
import { getStoredPublicConfig, resolvePublicConfig } from '../lib/publicConfig'
import { loadSites } from '../lib/siteDomains'
import { DEFAULT_CUSTOMIZER_SETTINGS, loadCustomizerSettings, saveCustomizerSettings } from '../lib/customizerLocal'
import { buildLocalStorageInventory, buildMediaAuditSummary, exportLocalSiteBackupJson } from '../lib/localSiteBackup'

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
    // local  only
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
    { title: 'Home', slug: 'home', path: '/', status: 'Published', modified: '2026-04-22', customizeSection: 'homepage' },
    { title: 'Archive', slug: 'archive', path: '/archive', status: 'Published', modified: '2026-04-21', customizeSection: 'navigation' },
    { title: 'Press', slug: 'press', path: '/press', status: 'Published', modified: '2026-04-23', customizeSection: 'colors' },
    { title: 'Projects', slug: 'projects', path: '/projects', status: 'Published', modified: '2026-04-20', customizeSection: 'homepage' },
  ]

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Pages</h1>
        </div>

        <p className="description">Manage your primary public site surfaces and quick actions.</p>
      </main>
    </AdminFrame>
  )
}

export function SettingsAdminPage() {
  const location = useLocation()
  const isSocialPath = location.pathname.startsWith('/settings/social')
  const [settings, setSettings] = useState(() => loadJson(SETTINGS_KEY, {
    siteTitle: 'Sabot Media',
    tagline: 'Radical media and publishing',
    homepageSource: 'latest',
    postsPerPage: 12,
    defaultPostType: 'article',
    mediaMode: 'local',
    social: {
      mastodonInstanceUrl: '',
      mastodonAccessToken: '',
      blueskyHandle: '',
      blueskyAppPassword: '',
      rssAutopostEnabled: true,
      newsletterProvider: '',
    },
  }))
  const sites = useMemo(() => loadSites(), [])

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  function updateSocial(field, value) {
    setSettings((current) => ({
      ...current,
      social: {
        mastodonInstanceUrl: '',
        mastodonAccessToken: '',
        blueskyHandle: '',
        blueskyAppPassword: '',
        rssAutopostEnabled: true,
        newsletterProvider: '',
        ...(current.social || {}),
        [field]: value,
      },
    }))
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
            <li><strong>Subscriber:</strong> read-only placeholder</li>
          </ul>
        </section>
      </main>
    </AdminFrame>
  )
}
