import { NavLink, useLocation } from 'react-router-dom'

const NAV_GROUPS = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/content', label: 'Posts' },
  { to: '/media', label: 'Media' },
  { to: '/pages', label: 'Pages' },
  {
    label: 'Appearance',
    children: [
      { to: '/menus', label: 'Menus' },
      { to: '/customize', label: 'Customize' },
    ],
  },
  { to: '/tools', label: 'Tools' },
  { to: '/settings', label: 'Settings' },
]

export function AdminRail() {
  const location = useLocation()

  return (
    <>
      <div className="wp-admin-topbar">
        <span>My Site</span>
        <span>Howdy, admin</span>
      </div>
      <aside className="admin-rail" aria-label="Admin navigation">
        <div className="admin-rail__label">wp-admin</div>
        <nav className="admin-rail__nav">
          {NAV_GROUPS.map((group) => {
            if (!group.children) {
              return (
                <NavLink key={group.to} to={group.to} className={({ isActive }) => `admin-rail__link${isActive ? ' is-active' : ''}`}>
                  {group.label}
                </NavLink>
              )
            }

            const isOpen = group.children.some((entry) => location.pathname.startsWith(entry.to))
            return (
              <div key={group.label} className={`admin-rail__group${isOpen ? ' is-open' : ''}`}>
                <div className="admin-rail__link admin-rail__group-label">{group.label}</div>
                <div className="admin-rail__subnav">
                  {group.children.map((entry) => (
                    <NavLink key={entry.to} to={entry.to} className={({ isActive }) => `admin-rail__link admin-rail__sublink${isActive ? ' is-active' : ''}`}>
                      {entry.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
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
