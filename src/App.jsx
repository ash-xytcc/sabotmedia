import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { HomePage } from './components/HomePage'
import { PiecePage } from './components/PiecePage'
import { PrintPage } from './components/PrintPage'
import { ProjectsIndexPage } from './components/ProjectsIndexPage'
import { ReviewQueuePage } from './components/ReviewQueuePage'
import { AdminPage } from './components/AdminPage'
import { ContentListPage } from './components/ContentListPage'
import { OverridesPage } from './components/OverridesPage'
import { PodcastAdminPage } from './components/PodcastAdminPage'
import { PodcastSettingsPage } from './components/PodcastSettingsPage'
import { NativeContentBridgePage } from './components/NativeContentBridgePage'
import { NativeUpdatesPage } from './components/NativeUpdatesPage'
import { NativeUpdateDetailPage } from './components/NativeUpdateDetailPage'
import { NativeDraftPreviewPage } from './components/NativeDraftPreviewPage'
import { PublicSearchPage } from './components/PublicSearchPage'
import { PublicDraftPage } from './components/PublicDraftPage'
import { PrintLabPage } from './components/PrintLabPage'
import { PublicationLandingPage, PublicationReaderPage, PublicationsIndexPage } from './components/PublicationReaderPage'
import { AdminQaPage } from './components/AdminQaPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotFoundPage } from './components/NotFoundPage'
import { PublicEditProvider, usePublicEdit } from './components/PublicEditContext'
import { PublicEditPanel } from './components/PublicEditPanel'
import { PublicAdminToolbar } from './components/PublicAdminToolbar'
import { AdminAuthProvider, useAdminAuth } from './components/AdminAuthContext'
import { LoginPage } from './components/LoginPage'
import { EditableText } from './components/EditableText'
import { buildProjectMap, getFeaturedPiece, getLatestPieces, getProjectMeta } from './lib/content'
import { getPieces } from './lib/pieces'
import { PublicSurfacePage } from './components/PublicSurfacePage'
import { PublicInfoPage } from './components/PublicInfoPage'
import { AdminNoticeProvider } from './components/WpAdminNotices'
import { MediaLibraryPage } from './components/MediaLibraryPage'
import { AnalyticsPage } from './components/AnalyticsPage'
import { CustomizeAdminPage, PagesAdminPage, SettingsAdminPage, SiteEditorAdminPage, ToolsAdminPage, UsersAdminPage } from './components/WpAdminPages'
import { SitesAdminPage } from './components/SitesAdminPage'
import { adminRoutes, publicRoutes } from './routing/routes'
import { buildPostMeta, setDocumentMeta } from './lib/documentMeta'

const pieces = getPieces()
const featured = getFeaturedPiece(pieces)
const latest = getLatestPieces(pieces, 12)
const projectMap = buildProjectMap(pieces)
const reviewCount = pieces.filter((piece) => piece.reviewFlags?.length).length

const ADMIN_SHELL_PATHS = [
  '/admin',
  '/review',
  '/qa',
  '/content',
  '/posts',
  '/add-new',
  '/post-new',
  '/native-bridge',
  '/native-preview',
  '/podcasts',
  '/draft',
  '/overrides',
  '/system-backup',
  '/taxonomy',
  '/roles',
  '/audit-log',
  '/analytics',
  '/design-system',
  '/platform-map',
  '/media',
  '/pages',
  '/users',
  '/menus',
  '/customize',
  '/site-editor',
  '/advanced-draft-tools',
  '/tools',
  '/printlab',
  '/settings',
  '/sites',
  '/wp-admin',
  '/wp-admin/posts',
  '/wp-admin/media',
  '/wp-admin/projects',
  '/wp-admin/printlab',
  '/wp-admin/settings',
]

function shouldUseBareShell(pathname) {
  return ADMIN_SHELL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo(0, 0)
  }, [pathname, search, hash])

  return null
}

function RouteMeta({ pieces = [] }) {
  const location = useLocation()

  useEffect(() => {
    const pathname = location.pathname
    const postMatch = pathname.match(/^\/post\/([^/]+)$/)
    const postPrintMatch = pathname.match(/^\/post\/([^/]+)\/print$/)
    const printMatch = pathname.match(/^\/print\/([^/]+)$/)
    const projectMatch = pathname.match(/^\/(?:project|projects)\/([^/]+)$/)

    if (postMatch) {
      const piece = pieces.find((item) => item.slug === postMatch[1])
      if (piece) setDocumentMeta(buildPostMeta(piece, { path: pathname }))
      return
    }

    if (postPrintMatch || printMatch) {
      const slug = (postPrintMatch || printMatch)[1]
      const piece = pieces.find((item) => item.slug === slug)
      setDocumentMeta({
        ...(piece ? buildPostMeta(piece, { path: pathname }) : {}),
        title: piece ? `${piece.title} Print` : 'Print',
        canonicalPath: pathname,
      })
      return
    }

    if (projectMatch) {
      const meta = getProjectMeta(projectMatch[1])
      setDocumentMeta({
        title: meta.name,
        description: meta.description,
        canonicalPath: pathname,
      })
      return
    }

    const routeMeta = {
      '/': ['Sabot Media', 'Independent reporting, essays, comics, podcasts, zines, and project-based archive work.'],
      '/archive': ['Archive', 'Browse the Sabot Media archive by search, project, format, and date.'],
      '/search': ['Search', 'Search the Sabot Media archive.'],
      '/projects': ['Archive', 'Search and filter the full Sabot Media archive by project, format, and keyword.'],
      '/about': ['About', 'About Sabot Media and its public-interest media work.'],
      '/contact': ['Contact', 'Contact Sabot Media.'],
      '/submit': ['Submit', 'Submit tips, documents, writing, art, or project ideas to Sabot Media.'],
      '/support': ['Support', 'Support Sabot Media by reading, sharing, printing, citing, and circulating the archive.'],
      '/security': ['Security', 'Security guidance and public OpenPGP key for contacting Sabot Media.'],
      '/press': ['Press', 'Press information and public-facing Sabot Media materials.'],
      '/publications': ['Publications', 'Read Sabot Media publications.'],
      '/updates': ['Updates', 'Latest Sabot Media updates.'],
      '/login': ['Editor Login', 'Editor login for Sabot Media administrators.'],
      '/wp-login': ['Editor Login', 'Editor login for Sabot Media administrators.'],
      '/logout': ['Editor Logout', 'Log out of Sabot Media editor tools.'],
    }[pathname]

    if (routeMeta) {
      setDocumentMeta({
        title: routeMeta[0],
        description: routeMeta[1],
        canonicalPath: pathname,
      })
    }
  }, [location.pathname, pieces])

  return null
}

function Layout({ children }) {
  const { isEditing, setSelectedField, startEditing } = usePublicEdit()
  const { isAuthenticated } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const bareShell = shouldUseBareShell(location.pathname)
  const isHomepage = location.pathname === '/'

  useEffect(() => {
    document.body.classList.toggle('is-homepage', isHomepage)

    return () => {
      document.body.classList.remove('is-homepage')
    }
  }, [isHomepage])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('edit') === 'site') {
      if (isAuthenticated) {
        startEditing()
      } else {
        const returnTo = `${location.pathname}${location.search || ''}${location.hash || ''}`
        navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true })
      }
    }
  }, [isAuthenticated, location.hash, location.pathname, location.search, navigate, startEditing])

  useEffect(() => {
    const root = document.documentElement

    const updateViewportVars = () => {
      const masthead = document.querySelector('.publication-topbar')
      const adminBar = document.querySelector('.wp-public-admin-bar')

      root.style.setProperty('--masthead-height', `${Math.round(masthead?.getBoundingClientRect().height || 0)}px`)
      root.style.setProperty('--public-admin-bar-height', `${Math.round(adminBar?.getBoundingClientRect().height || 0)}px`)
    }

    updateViewportVars()

    const observer = new ResizeObserver(updateViewportVars)
    const mutationObserver = new MutationObserver(updateViewportVars)

    const masthead = document.querySelector('.publication-topbar')
    const adminBar = document.querySelector('.wp-public-admin-bar')

    if (masthead) observer.observe(masthead)
    if (adminBar) observer.observe(adminBar)

    mutationObserver.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', updateViewportVars)

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', updateViewportVars)
    }
  }, [location.pathname])

  if (bareShell) {
    return (
      <div className="bare-route-shell">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <PublicEditPanel />
        <div id="main-content" tabIndex="-1">
          <ErrorBoundary key={location.pathname} area="admin">
            {children}
          </ErrorBoundary>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`public-route-shell${isEditing ? ' public-route-shell--editing' : ''}`}
      onClick={() => {
        if (isEditing) setSelectedField(null)
      }}
    >
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PublicAdminToolbar />
      <PublicEditPanel />
      <div id="main-content" tabIndex="-1">
        <ErrorBoundary key={location.pathname} area="public">
          {children}
        </ErrorBoundary>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, isChecking } = useAdminAuth()

  if (isChecking) {
    return (
      <main className="page admin-login-page">
        <section className="admin-login-panel">
          <p className="admin-login-panel__eyebrow">Sabot Media</p>
          <h1>Checking Access</h1>
        </section>
      </main>
    )
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search || ''}${location.hash || ''}`
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }

  return children
}

function protect(element) {
  return <ProtectedRoute>{element}</ProtectedRoute>
}

export default function App() {
  return (
    <AdminAuthProvider>
      <PublicEditProvider>
        <AdminNoticeProvider>
      <ScrollToTop />
      <RouteMeta pieces={pieces} />
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/wp-login" element={<LoginPage />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/" element={<NativeUpdatesPage pieces={pieces} featured={featured} latest={latest} />} />
          <Route path="/projects" element={<Navigate to="/archive" replace />} />
          <Route path="/projects/:slug" element={<ProjectArchiveRedirect projectMap={projectMap} />} />
          <Route path={publicRoutes.project} element={<ProjectArchiveRedirect projectMap={projectMap} />} />
          <Route path="/piece/:slug" element={<LegacyPieceRedirect />} />
          <Route path={publicRoutes.post} element={<PiecePage pieces={pieces} />} />
          <Route path="/post/:slug/print" element={<PrintPage pieces={pieces} />} />
          <Route path={publicRoutes.print} element={<PrintPage pieces={pieces} />} />
          <Route path="/piece/:slug/print" element={<LegacyPrintRedirect />} />
          <Route path="/review" element={protect(<Navigate to={adminRoutes.qa} replace />)} />
          <Route path="/admin" element={protect(<Navigate to={adminRoutes.dashboard} replace />)} />
          <Route path={adminRoutes.dashboard} element={protect(<AdminPage pieces={pieces} />)} />
          <Route path="/content" element={protect(<Navigate to={adminRoutes.posts} replace />)} />
          <Route path="/posts" element={protect(<Navigate to={adminRoutes.posts} replace />)} />
          <Route path={adminRoutes.posts} element={protect(<ContentListPage />)} />
          <Route path={adminRoutes.addNew} element={protect(<Navigate to={`${adminRoutes.nativeBridge}?new=article`} replace />)} />
          <Route path="/add-new" element={protect(<Navigate to={adminRoutes.addNew} replace />)} />
          <Route path="/post-new" element={protect(<Navigate to={adminRoutes.addNew} replace />)} />
          <Route path="/wp-admin/post-new.php" element={protect(<Navigate to={adminRoutes.addNew} replace />)} />
          <Route path="/overrides" element={protect(<Navigate to={adminRoutes.overrides} replace />)} />
          <Route path={adminRoutes.overrides} element={protect(<OverridesPage />)} />
          <Route path="/media" element={protect(<Navigate to={adminRoutes.media} replace />)} />
          <Route path={adminRoutes.media} element={protect(<MediaLibraryPage />)} />
          <Route path={adminRoutes.projects} element={protect(<ProjectsIndexPage projectMap={projectMap} />)} />
          <Route path="/pages" element={protect(<Navigate to={adminRoutes.pages} replace />)} />
          <Route path={adminRoutes.pages} element={protect(<PagesAdminPage />)} />
          <Route path="/users" element={protect(<Navigate to={adminRoutes.users} replace />)} />
          <Route path={adminRoutes.users} element={protect(<UsersAdminPage />)} />
          <Route path="/menus" element={protect(<Navigate to={`${adminRoutes.customize}?section=navigation`} replace />)} />
          <Route path="/customize" element={protect(<Navigate to={adminRoutes.customize} replace />)} />
          <Route path={adminRoutes.customize} element={protect(<CustomizeAdminPage />)} />
          <Route path="/site-editor" element={protect(<Navigate to={`${adminRoutes.tools}#advanced-draft-tools`} replace />)} />
          <Route path="/advanced-draft-tools" element={protect(<Navigate to={`${adminRoutes.tools}#advanced-draft-tools`} replace />)} />
          <Route path="/tools" element={protect(<Navigate to={adminRoutes.tools} replace />)} />
          <Route path={adminRoutes.tools} element={protect(<ToolsAdminPage />)} />
          <Route path="/qa" element={protect(<Navigate to={adminRoutes.qa} replace />)} />
          <Route path={adminRoutes.qa} element={protect(<AdminQaPage />)} />
          <Route path="/printlab" element={protect(<Navigate to={adminRoutes.printlab} replace />)} />
          <Route path={adminRoutes.printlab} element={protect(<PrintLabPage pieces={pieces} />)} />
          <Route path="/tools/print" element={protect(<Navigate to={adminRoutes.printlab} replace />)} />
          <Route path="/settings" element={protect(<Navigate to={adminRoutes.settings} replace />)} />
          <Route path={adminRoutes.settings} element={protect(<SettingsAdminPage />)} />
          <Route path="/settings/social" element={protect(<Navigate to={adminRoutes.settings} replace />)} />
          <Route path="/settings/sites" element={protect(<Navigate to={`${adminRoutes.settings}/sites`} replace />)} />
          <Route path="/sites" element={protect(<Navigate to={adminRoutes.sites} replace />)} />
          <Route path={`${adminRoutes.settings}/sites`} element={protect(<SitesAdminPage />)} />
          <Route path={adminRoutes.sites} element={protect(<SitesAdminPage />)} />
          <Route path="/admin/*" element={protect(<Navigate to={adminRoutes.dashboard} replace />)} />
          <Route path="/wp-admin/*" element={protect(<Navigate to={adminRoutes.dashboard} replace />)} />
          <Route path="/content/*" element={protect(<Navigate to={adminRoutes.posts} replace />)} />
          <Route path="/media/*" element={protect(<Navigate to={adminRoutes.media} replace />)} />
          <Route path="/customize/*" element={protect(<Navigate to={adminRoutes.customize} replace />)} />
          <Route path="/settings/*" element={protect(<Navigate to={adminRoutes.settings} replace />)} />
          <Route path="/tools/*" element={protect(<Navigate to={adminRoutes.tools} replace />)} />
          <Route path="/printlab/*" element={protect(<Navigate to={adminRoutes.printlab} replace />)} />
          <Route path="/native-bridge/*" element={protect(<LegacyNativeBridgeRedirect />)} />
        <Route path="/podcasts" element={protect(<Navigate to={adminRoutes.podcasts} replace />)} />
        <Route path="/podcasts/settings" element={protect(<Navigate to={`${adminRoutes.podcasts}/settings`} replace />)} />
        <Route path={adminRoutes.podcasts} element={protect(<PodcastAdminPage pieces={pieces} />)} />
        <Route path={`${adminRoutes.podcasts}/settings`} element={protect(<PodcastSettingsPage />)} />
        <Route path="/native-bridge" element={protect(<LegacyNativeBridgeRedirect />)} />
        <Route path={adminRoutes.nativeBridge} element={protect(<NativeContentBridgePage />)} />
        <Route path="/updates" element={<NativeUpdatesPage pieces={pieces} featured={featured} latest={latest} />} />
        <Route path="/updates/:slug" element={<NativeUpdateDetailPage />} />
        <Route path="/native-preview/:id" element={protect(<NativeDraftPreviewPage />)} />
        <Route path="/press" element={<PublicSurfacePage target="press" />} />
        <Route path="/publications" element={<PublicationsIndexPage />} />
        <Route path="/publications/:slug" element={<PublicationLandingPage />} />
        <Route path="/reader/:slug" element={<PublicationReaderPage />} />
        <Route path="/about" element={<PublicInfoPage page="about" />} />
        <Route path="/security" element={<PublicInfoPage page="security" />} />
        <Route path="/contact" element={<PublicInfoPage page="contact" />} />
        <Route path="/submit" element={<PublicInfoPage page="submit" />} />
        <Route path="/support" element={<PublicInfoPage page="support" />} />
        <Route path="/archive" element={<PublicSearchPage pieces={pieces} />} />
        <Route path="/search" element={<PublicSearchPage pieces={pieces} />} />
          <Route path="/draft" element={protect(<Navigate to={adminRoutes.liveEditor} replace />)} />
          <Route path={adminRoutes.liveEditor} element={protect(<PublicDraftPage />)} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
        </AdminNoticeProvider>
      </PublicEditProvider>
    </AdminAuthProvider>
  )
}

function LegacyPieceRedirect() {
  const location = useLocation()
  const slug = location.pathname.replace(/^\/piece\//, '').replace(/\/+$/, '')
  return <Navigate to={`/post/${slug}${location.search || ''}`} replace />
}

function LegacyPrintRedirect() {
  const location = useLocation()
  const slug = location.pathname.replace(/^\/piece\//, '').replace(/\/print\/?$/, '')
  return <Navigate to={`/post/${slug}/print${location.search || ''}`} replace />
}

function ProjectArchiveRedirect({ projectMap = [] }) {
  const { slug = '' } = useParams()
  const match = projectMap.find((project) => project.slug === slug)
  const projectValue = match?.name || getProjectMeta(slug).name || slug
  return <Navigate to={`/archive?project=${encodeURIComponent(projectValue)}`} replace />
}

function LegacyNativeBridgeRedirect() {
  const location = useLocation()
  return <Navigate to={`${adminRoutes.nativeBridge}${location.search || ''}${location.hash || ''}`} replace />
}

function LogoutPage() {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()

  useEffect(() => {
    let cancelled = false

    async function runLogout() {
      await logout()
      if (!cancelled) navigate('/login?loggedOut=1', { replace: true })
    }

    runLogout()

    return () => {
      cancelled = true
    }
  }, [logout, navigate])

  return (
    <main className="page admin-login-page">
      <section className="admin-login-panel">
        <p className="admin-login-panel__eyebrow">Sabot Media</p>
        <h1>Logging out</h1>
        <p>Ending your editor session.</p>
      </section>
    </main>
  )
}
