import { Link } from 'react-router-dom'

export function PublicationTopbar() {
  return (
    <header className="publication-topbar">
      <div className="publication-topbar__brand">
        <Link to="/">Sabot Media</Link>
      </div>

      <nav className="publication-topbar__nav">
        <Link to="/">Home</Link>
        <Link to="/archive">Archive</Link>
        <Link to="/press">Press</Link>
        <Link to="/projects">Projects</Link>
      </nav>
    </header>
  )
}
