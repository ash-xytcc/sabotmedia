import { Link } from 'react-router-dom'
import mastheadLogo from '../assets/sabot-masthead-logo.png'

export function PublicationTopbar() {
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
            <Link to="/archive">Archive</Link>
            <Link to="/press">Press</Link>
            <Link to="/projects">Projects</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
