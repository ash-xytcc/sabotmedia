import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { loadSites } from '../lib/siteDomains'
import { adminRoutes } from '../routing/routes'
import mastheadLogo from '../assets/sabot-masthead-logo.png'
import { AdminCommandPalette } from './AdminCommandPalette'
import { useAdminAuth } from './AdminAuthContext'

const RAIL_STATE_KEY = 'sabot-admin-rail-collapsed-v1'
const COURSES_PATH = '/wp-admin/pages?courses=1'

const NAV_GROUPS = [
  {
    id: 'content', label: 'Content', icon: '✎',
    items: [
      { to: adminRoutes.posts, label: 'Posts', capability: 'content:write' },
      { to: adminRoutes.addNew, label: 'Add New', capability: 'content:write' },
      { to: adminRoutes.pages, label: 'Pages', excludeCourseQuery: true, capability: 'publishing:write' },
      { to: adminRoutes.collections, label: 'Collections', capability: 'publishing:write' },
      { to: adminRoutes.taxonomy, label: 'Taxonomy', capability: 'publishing:write' },
    ],
  },
  {
    id: 'publishing', label: 'Publishing', icon: '↗',
    items: [
      { to: adminRoutes.publications, label: 'Publications', capability: 'publishing:write' },
      { to: adminRoutes.campaigns, label: 'Campaigns', capability: 'publishing:write' },
      { to: adminRoutes.podcasts, label: 'Podcasts', capability: 'publishing:write' },
      { to: adminRoutes.translations, label: 'Translations', capability: 'publishing:write' },
      { to: adminRoutes.feeds, label: 'Feeds & Syndication', capability: 'publishing:write' },
      { to: adminRoutes.qa, label: 'Editorial QA', capability: 'review:manage' },
    ],
  },
  {
    id: 'courses', label: 'Courses', icon: '▤',
    items: [
      { to: COURSES_PATH, label: 'All Courses', capability: 'publishing:write' },
    ],
  },
  {
    id: 'media', label: 'Media & Labs', icon: '▣',
    items: [
      { to: adminRoutes.media, label: 'Media Library', capability: 'media:write' },
      { to: adminRoutes.printlab, label: 'Printlab', capability: 'publishing:write' },
      { to: adminRoutes.audiolab, label: 'AudioLab', capability: 'media:write' },
    ],
  },
  {
    id: 'site', label: 'Site', icon: '⌂',
    items: [
      { to: adminRoutes.settings, label: 'Settings', capability: 'site:manage' },
      { to: adminRoutes.analytics, label: 'Analytics', capability: 'analytics:view' },
    ],
  },
  {
    id: 'system', label: 'System', icon: '⚙',
    items: [
      { to: adminRoutes.siteHealth, label: 'Site Health', capability: 'system:view' },
      { to: adminRoutes.backup, label: 'Backups', capability: 'system:view' },
      { to: adminRoutes.auditLog, label: 'Audit Log', capability: 'system:view' },
      { to: adminRoutes.users, label: 'Users & Access', capability: 'users:manage' },
    ],
  },
]

function AdminBarMenu({ label, children, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    function handleClickOutside(event) { if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  return (
    <div ref={menuRef} className={`wp-admin-topbar__menu ${isOpen ? 'is-open' : ''} ${className}`.trim()}>
      <button type="button" className="wp-admin-topbar__button" aria-haspopup="true" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>{label}</button>
      <div className="wp-admin-topbar__dropdown" role="menu" aria-label={typeof label === 'string' ? label : 'menu'} onClick={() => setIsOpen(false)}>{children}</div>
    </div>
  )
}

function itemMatches(location, item) {
  const target = String(item?.to || '')
  if (!target) return false
  const params = new URLSearchParams(location.search)
  if (item.excludeCourseQuery && (params.get('courses') === '1' || params.get('course'))) return false
  const [targetPath, targetQuery = ''] = target.split('?')
  if (location.pathname !== targetPath && !location.pathname.startsWith(`${targetPath}/`)) return false
  if (!targetQuery) return true
  const wanted = new URLSearchParams(targetQuery)
  for (const [key, value] of wanted.entries()) if (params.get(key) !== value) return false
  return true
}

export function AdminRail({ collapsed, onToggleCollapsed }) {
  const location = useLocation()
  const { capabilities, session } = useAdminAuth()
  const [primarySiteName, setPrimarySiteName] = useState('Sabot Media')
  const [paletteOpenTick, setPaletteOpenTick] = useState(0)
  const hasCapability = (capability) => !capability || capabilities.includes('*') || capabilities.includes(capability)
  const groups = useMemo(() => NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => hasCapability(item.capability)) })).filter((group) => group.items.length), [capabilities])
  const activeGroup = groups.find((group) => group.items.some((item) => itemMatches(location, item)))?.id || ''
  const [openGroups, setOpenGroups] = useState(() => new Set(activeGroup ? [activeGroup] : ['content']))
  const canCreate = hasCapability('content:write') || hasCapability('media:write') || hasCapability('publishing:write')
  const canManageSite = hasCapability('site:manage')
  const canManageUsers = hasCapability('users:manage')

  useEffect(() => {
    if (!activeGroup) return
    setOpenGroups((current) => current.has(activeGroup) ? current : new Set(current).add(activeGroup))
  }, [activeGroup])

  useEffect(() => {
    let cancelled = false
    async function refreshSites() {
      try {
        const sites = await loadSites()
        if (cancelled) return
        const primarySite = Array.isArray(sites) ? sites[0] : null
        setPrimarySiteName(String(primarySite?.name || 'Sabot Media').trim() || 'Sabot Media')
      } catch { if (!cancelled) setPrimarySiteName('Sabot Media') }
    }
    refreshSites()
    return () => { cancelled = true }
  }, [location.pathname])

  useEffect(() => {
    if (!paletteOpenTick) return
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
  }, [paletteOpenTick])

  function toggleGroup(groupId) {
    if (collapsed) {
      onToggleCollapsed(false)
      setOpenGroups((current) => new Set(current).add(groupId))
      return
    }
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  return (
    <>
      <AdminCommandPalette />
      <div className="wp-admin-topbar" role="navigation" aria-label="SabotPress admin bar">
        <div className="wp-admin-topbar__left">
          <Link to={adminRoutes.dashboard} className="wp-admin-topbar__link wp-admin-topbar__link--icon" aria-label="SabotPress" title="SabotPress"><span className="wp-admin-topbar__wpicon" aria-hidden="true">S</span></Link>
          <AdminBarMenu label="My Sites">
            <Link to="/" className="wp-admin-topbar__dropdown-link">{primarySiteName}</Link>
            {canManageSite ? <Link to={adminRoutes.settings} className="wp-admin-topbar__dropdown-link">Site Settings</Link> : null}
          </AdminBarMenu>
          <Link to="/" className="wp-admin-topbar__link wp-admin-topbar__brand-logo-link" aria-label="Sabot Media home"><img src={mastheadLogo} alt="Sabot Media" className="wp-admin-topbar__brand-logo" /></Link>
          {canCreate ? (
            <AdminBarMenu label="+ New">
              {hasCapability('content:write') ? <Link to={adminRoutes.addNew} className="wp-admin-topbar__dropdown-link">Post</Link> : null}
              {hasCapability('publishing:write') ? <Link to={`${adminRoutes.nativeBridge}?new=podcast`} className="wp-admin-topbar__dropdown-link">Podcast Episode</Link> : null}
              {hasCapability('media:write') ? <Link to={adminRoutes.media} className="wp-admin-topbar__dropdown-link">Media</Link> : null}
              {hasCapability('publishing:write') ? <Link to={adminRoutes.collections} className="wp-admin-topbar__dropdown-link">Collection</Link> : null}
              {hasCapability('publishing:write') ? <Link to={adminRoutes.campaigns} className="wp-admin-topbar__dropdown-link">Campaign</Link> : null}
              {hasCapability('publishing:write') ? <Link to={adminRoutes.publications} className="wp-admin-topbar__dropdown-link">Publication</Link> : null}
              {hasCapability('publishing:write') ? <Link to={COURSES_PATH} className="wp-admin-topbar__dropdown-link">Course</Link> : null}
              {hasCapability('media:write') ? <Link to={adminRoutes.audiolab} className="wp-admin-topbar__dropdown-link">AudioLab Project</Link> : null}
            </AdminBarMenu>
          ) : null}
          <button type="button" className="wp-admin-topbar__button wp-admin-topbar__command" aria-label="Open command palette" onClick={() => setPaletteOpenTick((tick) => tick + 1)}>⌘K</button>
        </div>
        <div className="wp-admin-topbar__right">
          <AdminBarMenu label={session?.user?.displayName || session?.user?.email || session?.role || 'Account'} className="wp-admin-topbar__menu--right">
            {canManageUsers ? <Link to={adminRoutes.users} className="wp-admin-topbar__dropdown-link">Users & Access</Link> : null}
            <span className="wp-admin-topbar__dropdown-link" aria-disabled="true">Role: {session?.role || 'unknown'}</span>
            <Link to="/logout" className="wp-admin-topbar__dropdown-link">Log Out</Link>
          </AdminBarMenu>
        </div>
      </div>

      <aside className={`admin-rail${collapsed ? ' is-collapsed' : ''}`} aria-label="Admin navigation">
        <div className="admin-rail__controls">
          <button type="button" className="admin-rail__toggle" onClick={() => onToggleCollapsed(!collapsed)} aria-label={collapsed ? 'Expand admin navigation' : 'Collapse admin navigation'} aria-expanded={!collapsed} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}><span aria-hidden="true">☰</span><span className="admin-rail__toggle-label">Menu</span></button>
        </div>
        <nav className="admin-rail__nav">
          <NavLink to={adminRoutes.dashboard} className={({ isActive }) => `admin-rail__link admin-rail__link--primary${isActive ? ' is-active' : ''}`} title={collapsed ? 'Dashboard' : undefined}><span className="admin-rail__icon" aria-hidden="true">●</span><span className="admin-rail__text">Dashboard</span></NavLink>
          {groups.map((group) => {
            const isOpen = openGroups.has(group.id)
            const isGroupActive = activeGroup === group.id
            return (
              <div key={group.id} className={`admin-rail__group${isOpen ? ' is-open' : ''}${isGroupActive ? ' is-active' : ''}`}>
                <button type="button" className="admin-rail__group-toggle" onClick={() => toggleGroup(group.id)} aria-expanded={isOpen && !collapsed} aria-controls={`admin-rail-group-${group.id}`} title={collapsed ? group.label : undefined}><span className="admin-rail__icon" aria-hidden="true">{group.icon}</span><span className="admin-rail__text">{group.label}</span><span className="admin-rail__chevron" aria-hidden="true">›</span></button>
                <div id={`admin-rail-group-${group.id}`} className="admin-rail__subnav" hidden={collapsed || !isOpen}>{group.items.map((item) => <NavLink key={item.to} to={item.to} className={() => `admin-rail__sublink${itemMatches(location, item) ? ' is-active' : ''}`}>{item.label}</NavLink>)}</div>
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

export function AdminFrame({ children }) {
  const { session } = useAdminAuth()
  const [railCollapsed, setRailCollapsed] = useState(() => {
    try { const stored = window.localStorage.getItem(RAIL_STATE_KEY); return stored === null ? true : stored === '1' } catch { return true }
  })
  function setCollapsed(next) {
    const value = Boolean(next)
    setRailCollapsed(value)
    try { window.localStorage.setItem(RAIL_STATE_KEY, value ? '1' : '0') } catch { /* UI preference only */ }
  }
  const contributor = session?.role === 'contributor'
  return (
    <div className={`admin-frame${railCollapsed ? ' admin-frame--rail-collapsed' : ''}`} data-admin-role={session?.role || ''}>
      {contributor ? <style>{`
        [data-admin-role="contributor"] .native-content-editor__actions > button:nth-of-type(n+4) { display: none !important; }
        [data-admin-role="contributor"] .native-bridge-sidebar .wp-meta-box:first-child > label:nth-of-type(2),
        [data-admin-role="contributor"] .native-bridge-sidebar .wp-meta-box:first-child > label:nth-of-type(3),
        [data-admin-role="contributor"] .native-bridge-sidebar .wp-meta-box:first-child > label:nth-of-type(4),
        [data-admin-role="contributor"] .native-bridge-sidebar .wp-meta-box:first-child > .native-content-editor__check,
        [data-admin-role="contributor"] .native-bridge-sidebar .wp-meta-box:first-child > .description { display: none !important; }
      `}</style> : null}
      <AdminRail collapsed={railCollapsed} onToggleCollapsed={setCollapsed} />
      <div className="admin-frame__main">{children}</div>
    </div>
  )
}
