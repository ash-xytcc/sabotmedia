import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { getPieces } from '../lib/pieces'
import { loadLocalMediaItems } from '../lib/localMediaLibrary'
import { exportNativeCollection, loadNativeCollection } from '../lib/nativePublicContent'
import { getStoredPublicConfig, resolvePublicConfig } from '../lib/publicConfig'

const SETTINGS_KEY = 'sabot-wp-clone-settings-v1'
const MENU_KEY = 'sabot-wp-clone-menu-v1'
const USER_ROLE_SETTINGS_KEY = 'sabot-wp-clone-user-role-settings-v1'
const CUSTOMIZER_KEY = 'sabot-wp-clone-customizer-v1'

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
          <button className="button button--primary" type="button">
            Add New
          </button>
        </div>

        <p className="description">Manage your primary public site surfaces and quick actions.</p>

        <section className="wp-meta-box">
          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Last modified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.slug}>
                  <td><strong>{page.title}</strong></td>
                  <td>{page.slug}</td>
                  <td>{page.status}</td>
                  <td>{new Date(page.modified).toLocaleDateString()}</td>
                  <td>
                    <div className="wp-row-actions">
                      <Link to={page.path}>View</Link>
                      <Link to={`${page.path}?edit=site`}>Edit Live</Link>
                      <Link to={`/customize?section=${page.customizeSection}`}>Customize</Link>
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

export function CustomizeAdminPage() {
  const sections = useMemo(() => ([
    { id: 'siteIdentity', title: 'Site Identity', body: 'Title, tagline, icon, and publication identity.' },
    { id: 'colors', title: 'Colors', body: 'Theme colors and editorial color controls.' },
    { id: 'masthead', title: 'Header / Masthead', body: 'Logo, masthead placement, and header layout.' },
    { id: 'navigation', title: 'Navigation', body: 'Public nav placement and menu behavior.' },
    { id: 'homepage', title: 'Homepage', body: 'Featured content, feed source, and layout.' },
  ]), [])
  const [searchParams, setSearchParams] = useSearchParams()
  const defaultSection = searchParams.get('section') || 'siteIdentity'
  const [activeSection, setActiveSection] = useState(defaultSection)
  const [settings, setSettings] = useState(() => loadJson(CUSTOMIZER_KEY, {
    siteIdentity: {
      siteTitle: 'Sabot Media',
      tagline: 'Radical media and publishing',
      logoUrl: '',
    },
    colors: {
      backgroundColor: '#ffffff',
      accentColor: '#3858e9',
      textColor: '#1d2327',
    },
    masthead: {
      mastheadSize: 'medium',
      navPosition: 'below',
      logoUrl: '',
    },
    navigation: {
      menuItems: loadJson(MENU_KEY, [
        { label: 'Archive', path: '/archive' },
        { label: 'Press', path: '/press' },
        { label: 'Projects', path: '/projects' },
      ]).map((item) => ({ label: item.label, path: item.path || item.to })),
    },
    homepage: {
      homepageSource: 'latest',
      featuredLayout: 'grid',
      postsPerPage: 12,
    },
  }))
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (!sections.some((section) => section.id === activeSection)) {
      setActiveSection('siteIdentity')
    }
  }, [activeSection, sections])

  useEffect(() => {
    const querySection = searchParams.get('section')
    if (querySection && querySection !== activeSection && sections.some((section) => section.id === querySection)) {
      setActiveSection(querySection)
    }
  }, [activeSection, searchParams, sections])

  function updateSection(section, field, value) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }))
    setSaveMessage('')
  }

  function updateNavigationItem(index, patch) {
    setSettings((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        menuItems: current.navigation.menuItems.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      },
    }))
    setSaveMessage('')
  }

  function addNavigationItem() {
    setSettings((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        menuItems: [...current.navigation.menuItems, { label: 'New Item', path: '/' }],
      },
    }))
    setSaveMessage('')
  }

  function removeNavigationItem(index) {
    setSettings((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        menuItems: current.navigation.menuItems.filter((_, i) => i !== index),
      },
    }))
    setSaveMessage('')
  }

  function saveSection(section) {
    saveJson(CUSTOMIZER_KEY, settings)
    saveJson(MENU_KEY, settings.navigation.menuItems.map((item) => ({ label: item.label, to: item.path })))
    const sectionName = sections.find((entry) => entry.id === section)?.title || 'Section'
    setSaveMessage(`${sectionName} saved locally.`)
  }

  function renderPanel() {
    if (activeSection === 'siteIdentity') {
      return (
        <div className="wp-customize-panel" key="siteIdentity">
          <h3>Site Identity</h3>
          <label>
            <span>Site title</span>
            <input
              value={settings.siteIdentity.siteTitle}
              onChange={(e) => updateSection('siteIdentity', 'siteTitle', e.target.value)}
            />
          </label>
          <label>
            <span>Tagline</span>
            <input
              value={settings.siteIdentity.tagline}
              onChange={(e) => updateSection('siteIdentity', 'tagline', e.target.value)}
            />
          </label>
          <label>
            <span>Logo / masthead URL</span>
            <input
              value={settings.siteIdentity.logoUrl}
              onChange={(e) => updateSection('siteIdentity', 'logoUrl', e.target.value)}
            />
          </label>
          <button className="button button--primary" type="button" onClick={() => saveSection('siteIdentity')}>Save</button>
        </div>
      )
    }

    if (activeSection === 'colors') {
      return (
        <div className="wp-customize-panel" key="colors">
          <h3>Colors</h3>
          <label>
            <span>Background color</span>
            <input
              value={settings.colors.backgroundColor}
              onChange={(e) => updateSection('colors', 'backgroundColor', e.target.value)}
            />
          </label>
          <label>
            <span>Accent color</span>
            <input
              value={settings.colors.accentColor}
              onChange={(e) => updateSection('colors', 'accentColor', e.target.value)}
            />
          </label>
          <label>
            <span>Text color</span>
            <input
              value={settings.colors.textColor}
              onChange={(e) => updateSection('colors', 'textColor', e.target.value)}
            />
          </label>
          <button className="button button--primary" type="button" onClick={() => saveSection('colors')}>Save</button>
        </div>
      )
    }

    if (activeSection === 'masthead') {
      return (
        <div className="wp-customize-panel" key="masthead">
          <h3>Header / Masthead</h3>
          <label>
            <span>Masthead size</span>
            <select
              value={settings.masthead.mastheadSize}
              onChange={(e) => updateSection('masthead', 'mastheadSize', e.target.value)}
            >
              <option value="compact">Compact</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label>
            <span>Nav position</span>
            <select
              value={settings.masthead.navPosition}
              onChange={(e) => updateSection('masthead', 'navPosition', e.target.value)}
            >
              <option value="below">Below masthead</option>
              <option value="inline">Inline with logo</option>
              <option value="above">Above masthead</option>
            </select>
          </label>
          <label>
            <span>Logo URL</span>
            <input
              value={settings.masthead.logoUrl}
              onChange={(e) => updateSection('masthead', 'logoUrl', e.target.value)}
            />
          </label>
          <button className="button button--primary" type="button" onClick={() => saveSection('masthead')}>Save</button>
        </div>
      )
    }

    if (activeSection === 'navigation') {
      return (
        <div className="wp-customize-panel" key="navigation">
          <h3>Navigation</h3>
          <div className="wp-customize-nav-list">
            {settings.navigation.menuItems.map((item, index) => (
              <div className="wp-customize-nav-row" key={`${item.path}-${index}`}>
                <input
                  value={item.label}
                  onChange={(e) => updateNavigationItem(index, { label: e.target.value })}
                  aria-label={`Menu item ${index + 1} label`}
                />
                <input
                  value={item.path}
                  onChange={(e) => updateNavigationItem(index, { path: e.target.value })}
                  aria-label={`Menu item ${index + 1} path`}
                />
                <button type="button" className="button" onClick={() => removeNavigationItem(index)}>Remove</button>
              </div>
            ))}
          </div>
          <p>
            <button type="button" className="button" onClick={addNavigationItem}>Add item</button>
          </p>
          <button className="button button--primary" type="button" onClick={() => saveSection('navigation')}>Save</button>
        </div>
      )
    }

    return (
      <div className="wp-customize-panel" key="homepage">
        <h3>Homepage</h3>
        <label>
          <span>Homepage source</span>
          <select
            value={settings.homepage.homepageSource}
            onChange={(e) => updateSection('homepage', 'homepageSource', e.target.value)}
          >
            <option value="latest">Latest posts</option>
            <option value="featured">Featured feed</option>
            <option value="mixed">Mixed curation</option>
          </select>
        </label>
        <label>
          <span>Featured layout</span>
          <select
            value={settings.homepage.featuredLayout}
            onChange={(e) => updateSection('homepage', 'featuredLayout', e.target.value)}
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
            <option value="stack">Stack</option>
          </select>
        </label>
        <label>
          <span>Posts per page</span>
          <input
            type="number"
            min="1"
            value={settings.homepage.postsPerPage}
            onChange={(e) => updateSection('homepage', 'postsPerPage', Number(e.target.value) || 1)}
          />
        </label>
        <button className="button button--primary" type="button" onClick={() => saveSection('homepage')}>Save</button>
      </div>
    )
  }

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
          <WpNotice>Customizer settings are local scaffold until public wiring lands.</WpNotice>

          <div className="wp-customize-layout">
            <div className="wp-customize-section-list">
              {sections.map((section) => (
                <button
                  className={`wp-customize-section${section.id === activeSection ? ' is-active' : ''}`}
                  type="button"
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id)
                    setSearchParams({ section: section.id })
                  }}
                >
                  <span>{section.title}</span>
                  <small>{section.body}</small>
                </button>
              ))}
            </div>
            <div className="wp-customize-panel-wrap">
              {renderPanel()}
              {saveMessage && <p className="description">{saveMessage}</p>}
            </div>
          </div>

          <p className="description">Navigation menus are managed here under the Navigation panel.</p>
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
          <h1>Advanced Draft Tools</h1>
          <Link className="button button--primary" to="/draft">Open Draft Tools</Link>
        </div>

        <section className="wp-meta-box">
          <h2>Legacy developer surface</h2>
          <p className="description">
            This legacy route stays available for developer workflows and is intentionally hidden from normal admin navigation.
          </p>
          <p><Link to="/customize?section=navigation">Customize Navigation</Link> · <Link to="/draft">Draft editor</Link></p>
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

        <section className="wp-meta-box" id="advanced-draft-tools">
          <h2>Advanced Draft Tools</h2>
          <p className="description">Legacy developer editing surface, hidden from the main admin sidebar.</p>
          <p><Link to="/draft">Open Draft Tools</Link></p>
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
    social: {
      mastodonInstanceUrl: '',
      mastodonAccessToken: '',
      blueskyHandle: '',
      blueskyAppPassword: '',
      rssAutopostEnabled: true,
      newsletterProvider: '',
    },
  }))
  const location = useLocation()
  const isSocialPath = location.pathname === '/settings/social'

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

        <section className="wp-meta-box">
          <h2>Settings Sections</h2>
          <p className="description">This area is scaffolded. Social autopost provider wiring has not been implemented yet.</p>
          <p>
            <NavLink className="button" to="/settings">General</NavLink>{' '}
            <NavLink className="button" to="/settings/social">Social</NavLink>
          </p>
        </section>

        {!isSocialPath ? (
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
        ) : (
          <section className="wp-meta-box">
            <h2>Social Sharing / Autopost (Scaffold)</h2>
            <p className="description">Placeholder credentials only. No real API posting or outbound integrations are active yet.</p>
            <div className="wp-settings-form">
              <label>
                <span>Fediverse / Mastodon instance URL</span>
                <input
                  placeholder="https://mastodon.social"
                  value={settings.social?.mastodonInstanceUrl || ''}
                  onChange={(e) => updateSocial('mastodonInstanceUrl', e.target.value)}
                />
              </label>
              <label>
                <span>Mastodon access token (placeholder)</span>
                <input
                  type="password"
                  placeholder="mastodon-token-placeholder"
                  value={settings.social?.mastodonAccessToken || ''}
                  onChange={(e) => updateSocial('mastodonAccessToken', e.target.value)}
                />
              </label>
              <label>
                <span>Bluesky handle</span>
                <input
                  placeholder="you.bsky.social"
                  value={settings.social?.blueskyHandle || ''}
                  onChange={(e) => updateSocial('blueskyHandle', e.target.value)}
                />
              </label>
              <label>
                <span>Bluesky app password (placeholder)</span>
                <input
                  type="password"
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  value={settings.social?.blueskyAppPassword || ''}
                  onChange={(e) => updateSocial('blueskyAppPassword', e.target.value)}
                />
              </label>
              <label>
                <span>RSS feed autopost</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings.social?.rssAutopostEnabled)}
                  onChange={(e) => updateSocial('rssAutopostEnabled', e.target.checked)}
                />
              </label>
              <label>
                <span>Email / newsletter provider (placeholder)</span>
                <input
                  placeholder="ConvertKit, Ghost, Mailchimp, etc."
                  value={settings.social?.newsletterProvider || ''}
                  onChange={(e) => updateSocial('newsletterProvider', e.target.value)}
                />
              </label>
            </div>
          </section>
        )}
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
