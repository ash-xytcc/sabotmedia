import { Link } from 'react-router-dom'
import mastheadLogo from '../assets/sabot-masthead-logo.png'
import { loadMenuDraft } from '../lib/wpAdminLocal'
import { loadCustomizerSettings } from '../lib/customizerLocal'

function normalizePath(path) {
  const value = String(path || '').trim()
  if (!value) return '/'
  return value.startsWith('/') ? value : `/${value}`
}

function isBlockedPublicPath(path = '') {
  const value = String(path || '').trim().toLowerCase()
  if (!value) return true
  if (value.includes('/wp-admin')) return true
  if (value === '/draft' || value.startsWith('/draft/')) return true
  if (value.startsWith('/admin') || value.startsWith('/customize') || value.startsWith('/site-editor')) return true
  return false
}

function resolvePublicNavItems(customItems = [], fallbackItems = []) {
  const normalizedCustomItems = (Array.isArray(customItems) ? customItems : [])
    .map((item, index) => ({
      id: item?.id || `menu-${index + 1}`,
      label: String(item?.label || '').trim(),
      to: normalizePath(item?.path || item?.to),
    }))
    .filter((item) => item.label && !isBlockedPublicPath(item.to))

  return normalizedCustomItems.length ? normalizedCustomItems : fallbackItems
}

export function PublicationTopbar() {
  const customizer = loadCustomizerSettings()
  const menuDraft = loadMenuDraft()

  const siteTitle = String(customizer.siteIdentity?.siteTitle || 'Sabot Media').trim() || 'Sabot Media'
  const logoUrl = String(customizer.masthead?.logoUrl || customizer.siteIdentity?.logoUrl || '').trim() || mastheadLogo
  const mastheadSize = ['compact', 'medium', 'large'].includes(customizer.masthead?.mastheadSize)
    ? customizer.masthead.mastheadSize
    : 'medium'

  const fallbackMenu = [
    { id: 'archive', label: 'Archive', path: '/archive' },
    { id: 'press', label: 'Press', path: '/press' },
    { id: 'projects', label: 'Projects', path: '/projects' },
  ]

  const fallbackItems = fallbackMenu.map((item) => ({
    id: item.id,
    label: item.label,
    to: item.path,
  }))

  const sourceMenu = customizer.navigation?.menuItems?.length ? customizer.navigation.menuItems : menuDraft
  const publicItems = resolvePublicNavItems(sourceMenu, fallbackItems)

  return (
    <header className={`publication-topbar publication-topbar--masthead publication-topbar--${mastheadSize}`}>
      <div className="publication-topbar__inner">
        <div className="publication-topbar__brand">
          <Link to="/" className="publication-topbar__brand-link" aria-label={`${siteTitle} home`} title={siteTitle}>
            <img
              src={logoUrl}
              alt={siteTitle}
              className="publication-topbar__brand-image"
            />
          </Link>

          <nav className="publication-topbar__nav" aria-label="Primary">
            {publicItems.map((item) => (
              <Link key={item.id} to={item.to}>{item.label}</Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
