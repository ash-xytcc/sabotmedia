import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { loadSites } from '../lib/siteDomains'

const MENU = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/content', label: 'Posts' },
  { to: '/native-bridge?new=article', label: 'Add New' },
  { to: '/media', label: 'Media' },
  { to: '/pages', label: 'Pages' },
  { to: '/customize', label: 'Customize' },
  { to: '/tools', label: 'Tools' },
  { to: '/settings', label: 'Settings' },
  { to: '/users', label: 'Users' },
]

function AdminBarMenu({ label, children, className = '' }) {
  return (
    <div className={`wp-admin-topbar__menu ${className}`.trim()}>
      <button type="button" className="wp-admin-topbar__button" aria-haspopup="true">
        {label}
      </button>
      <div className="wp-admin-topbar__dropdown" role="menu" aria-label={typeof label === 'string' ? label : 'menu'}>
        {children}
      </div>
    </div>
  )
}

export function AdminRail() {
  const location = useLocation()
  const [sites, setSites] = useState(() => loadSites())

  useEffect(() => {
    setSites(loadSites())
  }, [location.pathname])

  const primarySite = sites[0]
  const primarySiteName = String(primarySite?.name || 'Sabot Media').trim() || 'Sabot Media'

  return (
    <>
      <div className="wp-admin-topbar" role="navigation" aria-label="WordPress admin bar">
        <div className="wp-admin-topbar__left">
          <Link to="/admin" className="wp-admin-topbar__link wp-admin-topbar__link--icon" aria-label="Sabot admin dashboard">
            <span className="wp-admin-topbar__wpicon" aria-hidden="true">W</span>
          </Link>

          <AdminBarMenu label="My Sites ▾">
            <Link to="/" className="wp-admin-topbar__dropdown-link">{primarySiteName}</Link>
            <span className="wp-admin-topbar__dropdown-link" aria-disabled="true">Manage Sites (not wired yet)</span>
            <span className="wp-admin-topbar__dropdown-link" aria-disabled="true">Connect Domain (not wired yet)</span>
          </AdminBarMenu>

          <Link to="/" className="wp-admin-topbar__link">Sabot Media</Link>

          <AdminBarMenu label="+ New ▾">
            <Link to="/native-bridge?new=article" className="wp-admin-topbar__dropdown-link">Post</Link>
            <Link to="/media" className="wp-admin-topbar__dropdown-link">Media</Link>
            <Link to="/pages" className="wp-admin-topbar__dropdown-link">Page</Link>
            <Link to="/users" className="wp-admin-topbar__dropdown-link">User</Link>
          </AdminBarMenu>

          <Link to="/customize" className="wp-admin-topbar__link">Customize</Link>
        </div>

        <div className="wp-admin-topbar__right">
          <AdminBarMenu label="Howdy, sabotmedia ▾" className="wp-admin-topbar__menu--right">
            <Link to="/users" className="wp-admin-topbar__dropdown-link">Profile</Link>
            <span className="wp-admin-topbar__dropdown-link" aria-disabled="true">Log Out (not wired yet)</span>
          </AdminBarMenu>
        </div>
      </div>

      <aside className="admin-rail" aria-label="Admin navigation">
        <div className="admin-rail__label">wp-admin</div>
        <nav className="admin-rail__nav">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-rail__link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}

export function AdminFrame({ children }) {
  return (
    <div className="admin-frame">
      <AdminRail />
      <div className="admin-frame__main">{children}</div>
    </div>
  )
}
