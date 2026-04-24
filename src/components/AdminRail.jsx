import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/content', label: 'Posts' },
  { to: '/native-bridge?new=article', label: 'Add New' },
  { to: '/native-bridge?new=podcast', label: 'New Podcast' },
  { to: '/podcasts', label: 'Podcasts' },
  { to: '/draft', label: 'Site Editor' },
  { to: '/overrides', label: 'Overrides' },
  { to: '/system-backup', label: 'Backup' },
]

export function AdminRail() {
  return (
    <aside className="admin-rail" aria-label="Admin navigation">
      <div className="admin-rail__label">backstage</div>
      <nav className="admin-rail__nav">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `admin-rail__link${isActive ? ' is-active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
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
