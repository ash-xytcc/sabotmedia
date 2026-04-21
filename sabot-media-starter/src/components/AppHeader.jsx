import { Link } from 'react-router-dom'

export function AppHeader() {
  return (
    <header className="app-header">
      <Link className="brand" to="/">
        <span className="brand-kicker">Sabot</span>
        <span className="brand-title">Media</span>
      </Link>
      <nav className="header-nav" aria-label="Primary">
        <a href="#drops">Drops</a>
        <a href="#projects">Projects</a>
        <a href="#about">About</a>
      </nav>
    </header>
  )
}
