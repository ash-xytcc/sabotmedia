import { Link } from 'react-router-dom'
import mastheadLogo from '../assets/sabot-masthead-logo.png'

export function AppHeader() {
  return (
    <header className="app-header">
      <Link className="brand" to="/">
        <img src={mastheadLogo} alt="Sabot Media" className="brand-image" />
      </Link>
      <nav className="header-nav" aria-label="Primary">
        <Link to="/archive">Archive</Link>
        <a href="/guides/become-the-thousand-servers/">COURSES</a>
        <Link to="/about">About</Link>
      </nav>
    </header>
  )
}
