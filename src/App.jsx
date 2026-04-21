import { Link, Route, Routes } from 'react-router-dom'
import { HomePage } from './components/HomePage'
import { PiecePage } from './components/PiecePage'
import { PrintPage } from './components/PrintPage'
import { ProjectPage } from './components/ProjectPage'
import { ProjectsIndexPage } from './components/ProjectsIndexPage'
import { ReviewQueuePage } from './components/ReviewQueuePage'
import { AdminPage } from './components/AdminPage'
import { OverridesPage } from './components/OverridesPage'
import { PublicDraftPage } from './components/PublicDraftPage'
import { PublicEditProvider, usePublicEdit } from './components/PublicEditContext'
import { PublicEditPanel } from './components/PublicEditPanel'
import { EditableText } from './components/EditableText'
import { buildProjectMap, getFeaturedPiece, getLatestPieces } from './lib/content'
import { getPieces } from './lib/pieces'

const pieces = getPieces()
const featured = getFeaturedPiece(pieces)
const latest = getLatestPieces(pieces, 12)
const projectMap = buildProjectMap(pieces)
const reviewCount = pieces.filter((piece) => piece.reviewFlags?.length).length

function Layout({ children }) {
  const { isAdmin, isEditing, toggleEditing } = usePublicEdit()

  return (
    <div className={`site-shell${isEditing ? ' site-shell--editing' : ''}`}>
      <header className="app-header">
        <Link className="brand" to="/">
          <span className="brand-kicker">sabot</span>
          <span className="brand-title">media</span>
        </Link>

        <nav className="header-nav">
          <Link to="/">Drops</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/review">Review {reviewCount ? `(${reviewCount})` : ''}</Link>
          <Link to="/admin">Admin</Link>
          <Link to="/overrides">Overrides</Link>
          <Link to="/draft">Draft</Link>
          {isAdmin ? (
            <button className="button button--primary" type="button" onClick={toggleEditing}>
              {isEditing ? 'exit edit' : 'edit site'}
            </button>
          ) : null}
        </nav>
      </header>

      <PublicEditPanel />

      {children}

      <footer className="site-footer" id="about">
        <div className="site-footer__grid">
          <section className="site-footer__block">
            <EditableText as="div" className="site-footer__eyebrow" field="footer.about.eyebrow">
              about
            </EditableText>
            <EditableText as="h2" field="footer.about.title">
              Sabot Media
            </EditableText>
            <EditableText as="p" field="footer.about.body">
              An open collective of radical media makers working across writing, print, graphics, comics, newsletters, and broadcast.
            </EditableText>
          </section>

          <section className="site-footer__block">
            <EditableText as="div" className="site-footer__eyebrow" field="footer.routes.eyebrow">
              routes
            </EditableText>
            <ul>
              <li><Link to="/projects">browse projects</Link></li>
              <li><Link to="/">browse archive</Link></li>
              <li><Link to="/review">review queue</Link></li>
              <li><Link to="/admin">admin</Link></li>
              <li><Link to="/overrides">overrides</Link></li>
              <li><Link to="/draft">draft</Link></li>
            </ul>
          </section>

          <section className="site-footer__block">
            <EditableText as="div" className="site-footer__eyebrow" field="footer.state.eyebrow">
              state
            </EditableText>
            <EditableText as="p" field="footer.state.body">
              Imported archive online. Native publishing and deeper tooling next.
            </EditableText>
          </section>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <PublicEditProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage featured={featured} latest={latest} projectMap={projectMap} allPieces={pieces} />} />
          <Route path="/projects" element={<ProjectsIndexPage projectMap={projectMap} />} />
          <Route path="/projects/:slug" element={<ProjectPage pieces={pieces} />} />
          <Route path="/piece/:slug" element={<PiecePage pieces={pieces} />} />
          <Route path="/piece/:slug/print" element={<PrintPage pieces={pieces} />} />
          <Route path="/review" element={<ReviewQueuePage pieces={pieces} />} />
          <Route path="/admin" element={<AdminPage pieces={pieces} />} />
          <Route path="/overrides" element={<OverridesPage />} />
          <Route path="/draft" element={<PublicDraftPage />} />
        </Routes>
      </Layout>
    </PublicEditProvider>
  )
}
