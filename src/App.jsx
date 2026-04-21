import { Link, Route, Routes } from 'react-router-dom'
import { HomePage } from './components/HomePage'
import { PiecePage } from './components/PiecePage'
import { PrintPage } from './components/PrintPage'
import { ProjectPage } from './components/ProjectPage'
import { ProjectsIndexPage } from './components/ProjectsIndexPage'
import { ReviewQueuePage } from './components/ReviewQueuePage'
import { buildProjectMap, getFeaturedPiece, getLatestPieces } from './lib/content'
import { getPieces } from './lib/pieces'

const pieces = getPieces()
const featured = getFeaturedPiece(pieces)
const latest = getLatestPieces(pieces, 12)
const projectMap = buildProjectMap(pieces)
const reviewCount = pieces.filter((piece) => piece.reviewFlags?.length).length

function Layout({ children }) {
  return (
    <div className="site-shell">
      <header className="app-header">
        <Link className="brand" to="/">
          <span className="brand-kicker">sabot</span>
          <span className="brand-title">media</span>
        </Link>

        <nav className="header-nav">
          <Link to="/">Drops</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/review">Review {reviewCount ? `(${reviewCount})` : ''}</Link>
        </nav>
      </header>

      {children}

      <footer className="site-footer" id="about">
        <div className="site-footer__grid">
          <section className="site-footer__block">
            <div className="site-footer__eyebrow">about</div>
            <h2>Sabot Media</h2>
            <p>
              An open collective of radical media makers working across writing, print,
              graphics, comics, newsletters, and broadcast.
            </p>
          </section>

          <section className="site-footer__block">
            <div className="site-footer__eyebrow">routes</div>
            <ul>
              <li><Link to="/projects">browse projects</Link></li>
              <li><Link to="/">browse archive</Link></li>
              <li><Link to="/review">review queue</Link></li>
            </ul>
          </section>

          <section className="site-footer__block">
            <div className="site-footer__eyebrow">state</div>
            <p>Imported archive online. Native publishing and deeper tooling next.</p>
          </section>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage featured={featured} latest={latest} projectMap={projectMap} allPieces={pieces} />} />
        <Route path="/projects" element={<ProjectsIndexPage projectMap={projectMap} />} />
        <Route path="/projects/:slug" element={<ProjectPage pieces={pieces} />} />
        <Route path="/piece/:slug" element={<PiecePage pieces={pieces} />} />
        <Route path="/piece/:slug/print" element={<PrintPage pieces={pieces} />} />
        <Route path="/review" element={<ReviewQueuePage pieces={pieces} />} />
      </Routes>
    </Layout>
  )
}
