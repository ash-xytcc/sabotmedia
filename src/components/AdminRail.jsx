import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { loadSites } from '../lib/siteDomains'
import { adminRoutes } from '../routing/routes'
import mastheadLogo from '../assets/sabot-masthead-logo.png'

const MENU = [
  { to: adminRoutes.dashboard, label: 'Dashboard' },
  { to: adminRoutes.posts, label: 'Posts' },
  { to: adminRoutes.printlab, label: 'Printlab' },
  { to: adminRoutes.addNew, label: 'Add New' },
  { to: adminRoutes.media, label: 'Media' },
  { to: adminRoutes.pages, label: 'Pages' },
  { to: adminRoutes.collections, label: 'Collections' },
  { to: adminRoutes.publications, label: 'Publications' },
  { to: adminRoutes.customize, label: 'Customize' },
  { to: adminRoutes.tools, label: 'Tools' },
  { to: adminRoutes.siteHealth, label: 'Site Health' },
  { to: adminRoutes.backup, label: 'Backups' },
  { to: adminRoutes.auditLog, label: 'Audit Log' },
  { to: adminRoutes.qa, label: 'QA' },
  { to: adminRoutes.settings, label: 'Settings' },
  { to: adminRoutes.users, label: 'Users' },
]

function AdminBarMenu({ label, children, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div ref={menuRef} className={`wp-admin-topbar__menu ${isOpen ? 'is-open' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="wp-admin-topbar__button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {label}
      </button>
      <div className="wp-admin-topbar__dropdown" role="menu" aria-label={typeof label === 'string' ? label : 'menu'} onClick={() => setIsOpen(false)}>
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
      <div className="wp-admin-topbar" role="navigation" aria-label="SabotPress admin bar">
        <div className="wp-admin-topbar__left">
          <Link to={adminRoutes.dashboard} className="wp-admin-topbar__link wp-admin-topbar__link--icon" aria-label="SabotPress" title="SabotPress">
            <span className="wp-admin-topbar__wpicon" aria-hidden="true">S</span>
          </Link>

          <AdminBarMenu label="My Sites">
            <Link to="/" className="wp-admin-topbar__dropdown-link">{primarySiteName}</Link>
            <Link to={adminRoutes.sites} className="wp-admin-topbar__dropdown-link">Manage Sites</Link>
            <Link to={`${adminRoutes.settings}/sites`} className="wp-admin-topbar__dropdown-link">Connect Domain</Link>
          </AdminBarMenu>

          <Link to="/" className="wp-admin-topbar__link wp-admin-topbar__brand-logo-link" aria-label="Sabot Media home">
            <img src={mastheadLogo} alt="Sabot Media" className="wp-admin-topbar__brand-logo" />
          </Link>

          <AdminBarMenu label="+ New">
            <Link to={adminRoutes.addNew} className="wp-admin-topbar__dropdown-link">Post</Link>
            <Link to={adminRoutes.media} className="wp-admin-topbar__dropdown-link">Media</Link>
            <Link to={adminRoutes.pages} className="wp-admin-topbar__dropdown-link">Page</Link>
            <Link to={adminRoutes.collections} className="wp-admin-topbar__dropdown-link">Collection</Link>
            <Link to={adminRoutes.publications} className="wp-admin-topbar__dropdown-link">Publication</Link>
            <Link to={adminRoutes.users} className="wp-admin-topbar__dropdown-link">User</Link>
          </AdminBarMenu>

          <Link to={adminRoutes.customize} className="wp-admin-topbar__link">Customize</Link>
        </div>

        <div className="wp-admin-topbar__right">
          <AdminBarMenu label="Howdy sabotmedia" className="wp-admin-topbar__menu--right">
            <Link to={adminRoutes.users} className="wp-admin-topbar__dropdown-link">Profile</Link>
            <Link to="/logout" className="wp-admin-topbar__dropdown-link">Log Out</Link>
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
