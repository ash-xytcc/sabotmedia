import { NavLink, Link } from 'react-router-dom'

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
  const primarySite = sites[0]

  useEffect(() => {
    setSites(loadSites())
  }, [location.pathname])

  return (
    <>
      <div className="wp-admin-topbar" role="navigation" aria-label="WordPress admin bar">
        <div className="wp-admin-topbar__left">
          <Link to="/admin" className="wp-admin-topbar__link wp-admin-topbar__link--icon" aria-label="Sabot admin dashboard">
            <span className="wp-admin-topbar__wpicon" aria-hidden="true">W</span>
          </Link>

          <AdminBarMenu label="My Sites ▾">
            <Link to="/" className="wp-admin-topbar__dropdown-link">Sabot Media</Link>
            <Link to="/settings" className="wp-admin-topbar__dropdown-link">Add / connect another site or domain</Link>
            <Link to="/admin" className="wp-admin-topbar__dropdown-link">Manage sites</Link>
          </AdminBarMenu>

          <Link to="/" className="wp-admin-topbar__link">Sabot Media</Link>
          <Link to="/admin" className="wp-admin-topbar__link" title="Comments (placeholder)">💬 0</Link>

          <AdminBarMenu label="+ New ▾">
            <Link to="/native-bridge?new=article" className="wp-admin-topbar__dropdown-link">Post</Link>
            <Link to="/media" className="wp-admin-topbar__dropdown-link">Media</Link>
            <Link to="/pages" className="wp-admin-topbar__dropdown-link">Page</Link>
            <Link to="/users" className="wp-admin-topbar__dropdown-link">User</Link>
          </AdminBarMenu>

          <Link to="/customize" className="wp-admin-topbar__link">Customize</Link>
          <Link to="/native-bridge" className="wp-admin-topbar__link">Edit Page</Link>
        </div>

        <div className="wp-admin-topbar__right">
          <button type="button" className="wp-admin-topbar__link wp-admin-topbar__search" aria-label="Search placeholder" title="Search placeholder">
            🔍
          </button>

          <AdminBarMenu label="Howdy, sabotmedia ▾" className="wp-admin-topbar__menu--right">
            <Link to="/users" className="wp-admin-topbar__dropdown-link">sabotmedia</Link>
            <Link to="/users" className="wp-admin-topbar__dropdown-link">Edit Profile</Link>
            <Link to="/admin" className="wp-admin-topbar__dropdown-link">Log Out</Link>
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
