import { NavLink } from 'react-router-dom'

const MENU = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/content', label: 'Posts' },
  { to: '/native-bridge?new=article', label: 'Add New' },
  { to: '/media', label: 'Media' },
  { to: '/pages', label: 'Pages' },
  { to: '/customize', label: 'Customize' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/tools', label: 'Tools' },
  { to: '/settings', label: 'Settings' },
  { to: '/users', label: 'Users' },
]

export function AdminRail() {
  return (
    <>
      <div className="wp-admin-topbar">
        <NavLink to="/" className="wp-admin-topbar__link">● My Sites</NavLink>
        <NavLink to="/" className="wp-admin-topbar__link">🏠 Sabot Media</NavLink>
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
