import { Link } from 'react-router-dom'
import mastheadLogo from '../assets/sabot-masthead-logo.png'
import { loadMenuDraft } from '../lib/wpAdminLocal'

export function PublicationTopbar() {
  const items = loadMenuDraft()

  return (
    <header className="publication-topbar publication-topbar--masthead">
      <div className="publication-topbar__inner">
        <div className="publication-topbar__brand">
          <Link to="/" className="publication-topbar__brand-link" aria-label="Sabot Media home">
            <img
              src={mastheadLogo}
              alt="Sabot Media"
              className="publication-topbar__brand-image"
            />
          </Link>

          <nav className="publication-topbar__nav" aria-label="Primary">
            {items.map((item) => (
              <Link key={item.id} to={item.to}>{item.label}</Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
