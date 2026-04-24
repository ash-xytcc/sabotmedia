import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/content', label: 'Posts' },
  { to: '/native-bridge?new=article', label: 'Add New' },
  { to: '/pages', label: 'Pages' },
  { to: '/media', label: 'Media' },
  { to: '/menus', label: 'Menus' },
  { to: '/customize', label: 'Customize' },
  { to: '/site-editor', label: 'Site Editor' },
  { to: '/tools', label: 'Tools' },
  { to: '/settings', label: 'Settings' },
]

export function AdminRail() {
  return (
    <>
      <div className="wp-admin-topbar">
        <span>Sabot Media</span>
        <span>Classic Admin</span>
      </div>
      <aside className="admin-rail" aria-label="Admin navigation">
        <div className="admin-rail__label">wp-admin</div>
        <nav className="admin-rail__nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `admin-rail__link${isActive ? ' is-active' : ''}`}>
              {link.label}
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
