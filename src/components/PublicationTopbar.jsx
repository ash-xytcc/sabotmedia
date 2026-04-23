import { Link } from 'react-router-dom'

export function PublicationTopbar() {
  return (
    <header className="publication-topbar publication-topbar--masthead">
      <div className="publication-topbar__inner">
        <div className="publication-topbar__brand">
          <Link to="/" className="publication-topbar__brand-link" aria-label="Sabot Media home">
            <span className="publication-topbar__brand-stamp">Sabot Media</span>
          </Link>
        </div>

        <nav className="publication-topbar__nav" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/archive">Archive</Link>
          <Link to="/press">Press</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </div>
    </header>
  )
}
