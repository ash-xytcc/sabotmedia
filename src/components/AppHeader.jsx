import { Link } from 'react-router-dom'
import mastheadLogo from '../assets/sabot-masthead-logo.png'

export function AppHeader() {
  return (
    <header className="app-header">
      <Link className="brand" to="/">
        <img src={mastheadLogo} alt="Sabot Media" className="brand-image" />
      </Link>
      <nav className="header-nav" aria-label="Primary">
        <a href="#drops">Drops</a>
        <a href="#projects">Projects</a>
        <a href="#about">About</a>
      </nav>
    </header>
  )
}
