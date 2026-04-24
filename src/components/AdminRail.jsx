import { NavLink } from 'react-router-dom'
import { WORDPRESS_ADMIN_LINKS } from '../lib/wordpressClient'

function isExternal(to) {
  return String(to || '').startsWith('http')
}

const LINKS = [
  { to: '/admin', label: 'Dashboard' },
  { to: WORDPRESS_ADMIN_LINKS.posts, label: 'Posts' },
  { to: WORDPRESS_ADMIN_LINKS.newPost, label: 'Add New' },
  { to: WORDPRESS_ADMIN_LINKS.media, label: 'Media' },
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
          isExternal(link.to) ? (
            <a
              key={link.to}
              href={link.to}
              target="_blank"
              rel="noreferrer"
              className="admin-rail__link"
            >
              {link.label}
            </a>
          ) : (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `admin-rail__link${isActive ? ' is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          )
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
