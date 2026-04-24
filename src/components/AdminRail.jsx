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

export function AdminRail() {
  const location = useLocation()
  const [sites, setSites] = useState(() => loadSites())
  const primarySite = sites[0]

  useEffect(() => {
    setSites(loadSites())
  }, [location.pathname])

  return (
    <>
      <div className="wp-admin-topbar">
        <details className="wp-admin-topbar__sites-dropdown">
          <summary className="wp-admin-topbar__link">● My Sites</summary>
          <div className="wp-admin-topbar__dropdown-menu" role="menu" aria-label="My Sites">
            {sites.map((site) => (
              <div className="wp-admin-topbar__site-row" key={site.id}>
                <strong>{site.name}</strong>
                <span>{site.domain}</span>
                <small>{site.status} · {site.basePath}</small>
              </div>
            ))}
            <Link to="/sites" className="wp-admin-topbar__dropdown-link">Connect another domain</Link>
          </div>
        </details>
        <NavLink to="/" className="wp-admin-topbar__link">🏠 {primarySite?.name || 'Sabot Media'}</NavLink>
        <NavLink to="/native-bridge?new=article" className="wp-admin-topbar__link">+ New</NavLink>
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
