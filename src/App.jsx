import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { HomePage } from './components/HomePage'
import { PiecePage } from './components/PiecePage'
import { PrintPage } from './components/PrintPage'
import { ProjectPage } from './components/ProjectPage'
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
import { ZineStudioPage } from './components/ZineStudioPage'
import { PublicationLandingPage, PublicationReaderPage, PublicationsIndexPage } from './components/PublicationReaderPage'
import { PublicEditProvider, usePublicEdit } from './components/PublicEditContext'
import { PublicEditPanel } from './components/PublicEditPanel'
import { PublicAdminToolbar } from './components/PublicAdminToolbar'
import { EditableText } from './components/EditableText'
import { buildProjectMap, getFeaturedPiece, getLatestPieces } from './lib/content'
import { getPieces } from './lib/pieces'
import { PublicSurfacePage } from './components/PublicSurfacePage'
import { PublicInfoPage } from './components/PublicInfoPage'
import { AdminNoticeProvider } from './components/WpAdminNotices'
import { MediaLibraryPage } from './components/MediaLibraryPage'
import { AnalyticsPage } from './components/AnalyticsPage'
import { CustomizeAdminPage, PagesAdminPage, SettingsAdminPage, SiteEditorAdminPage, ToolsAdminPage, UsersAdminPage } from './components/WpAdminPages'
import { SitesAdminPage } from './components/SitesAdminPage'
import { adminRoutes, publicRoutes } from './routing/routes'

const pieces = getPieces()
const featured = getFeaturedPiece(pieces)
const latest = getLatestPieces(pieces, 12)
const projectMap = buildProjectMap(pieces)
const reviewCount = pieces.filter((piece) => piece.reviewFlags?.length).length

const ADMIN_SHELL_PATHS = [
  '/admin',
  '/review',
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
  '/zine-studio',
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


function Layout({ children }) {
  const { isEditing, setSelectedField } = usePublicEdit()
  const location = useLocation()
  const bareShell = shouldUseBareShell(location.pathname)
  const isHomepage = location.pathname === '/'

  useEffect(() => {
    document.body.classList.toggle('is-homepage', isHomepage)

    return () => {
      document.body.classList.remove('is-homepage')
    }
  }, [isHomepage])

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
        <PublicEditPanel />
        {children}
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
      <PublicAdminToolbar />
      <PublicEditPanel />
      {children}
    </div>
  )
}


export default function App() {
  return (
    <PublicEditProvider>
      <AdminNoticeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<NativeUpdatesPage pieces={pieces} featured={featured} latest={latest} />} />
          <Route path="/projects" element={<ProjectsIndexPage projectMap={projectMap} />} />
          <Route path="/projects/:slug" element={<ProjectPage pieces={pieces} />} />
          <Route path={publicRoutes.project} element={<ProjectPage pieces={pieces} />} />
          <Route path="/piece/:slug" element={<LegacyPieceRedirect />} />
          <Route path={publicRoutes.post} element={<PiecePage pieces={pieces} />} />
          <Route path="/post/:slug/print" element={<PrintPage pieces={pieces} />} />
          <Route path={publicRoutes.print} element={<PrintPage pieces={pieces} />} />
          <Route path="/piece/:slug/print" element={<LegacyPrintRedirect />} />
          <Route path="/review" element={<ReviewQueuePage pieces={pieces} />} />
          <Route path="/admin" element={<AdminPage pieces={pieces} />} />
          <Route path={adminRoutes.dashboard} element={<AdminPage pieces={pieces} />} />
          <Route path="/content" element={<ContentListPage />} />
          <Route path="/posts" element={<ContentListPage />} />
          <Route path={adminRoutes.posts} element={<ContentListPage />} />
          <Route path="/add-new" element={<Navigate to="/native-bridge?new=article" replace />} />
          <Route path="/post-new" element={<Navigate to="/native-bridge?new=article" replace />} />
          <Route path="/wp-admin/post-new.php" element={<Navigate to="/native-bridge?new=article" replace />} />
          <Route path="/overrides" element={<OverridesPage />} />
          <Route path="/media" element={<Navigate to={adminRoutes.media} replace />} />
          <Route path={adminRoutes.media} element={<MediaLibraryPage />} />
          <Route path={adminRoutes.projects} element={<ProjectsIndexPage projectMap={projectMap} />} />
          <Route path="/pages" element={<PagesAdminPage />} />
          <Route path="/users" element={<UsersAdminPage />} />
          <Route path="/menus" element={<Navigate to="/customize?section=navigation" replace />} />
          <Route path="/customize" element={<CustomizeAdminPage />} />
          <Route path="/site-editor" element={<Navigate to="/tools#advanced-draft-tools" replace />} />
          <Route path="/advanced-draft-tools" element={<SiteEditorAdminPage />} />
          <Route path="/tools" element={<ToolsAdminPage />} />
          <Route path="/printlab" element={<Navigate to={adminRoutes.printlab} replace />} />
          <Route path={adminRoutes.printlab} element={<PrintLabPage pieces={pieces} />} />
          <Route path="/zine-studio" element={<ZineStudioPage />} />
          <Route path="/zine-studio/:id" element={<ZineStudioPage />} />
          <Route path="/tools/print" element={<Navigate to={adminRoutes.printlab} replace />} />
          <Route path="/settings" element={<Navigate to={adminRoutes.settings} replace />} />
          <Route path={adminRoutes.settings} element={<SettingsAdminPage />} />
          <Route path="/settings/social" element={<Navigate to={adminRoutes.settings} replace />} />
          <Route path="/settings/sites" element={<SitesAdminPage />} />
          <Route path="/sites" element={<SitesAdminPage />} />
        <Route path="/podcasts" element={<PodcastAdminPage pieces={pieces} />} />
        <Route path="/podcasts/settings" element={<PodcastSettingsPage />} />
        <Route path="/native-bridge" element={<NativeContentBridgePage />} />
        <Route path="/updates" element={<NativeUpdatesPage pieces={pieces} featured={featured} latest={latest} />} />
        <Route path="/updates/:slug" element={<NativeUpdateDetailPage />} />
        <Route path="/native-preview/:id" element={<NativeDraftPreviewPage />} />
        <Route path="/press" element={<PublicSurfacePage target="press" />} />
        <Route path="/publications" element={<PublicationsIndexPage />} />
        <Route path="/publications/:slug" element={<PublicationLandingPage />} />
        <Route path="/reader/:slug" element={<PublicationReaderPage />} />
        <Route path="/about" element={<PublicInfoPage page="about" />} />
        <Route path="/contact" element={<PublicInfoPage page="contact" />} />
        <Route path="/submit" element={<PublicInfoPage page="submit" />} />
        <Route path="/support" element={<PublicInfoPage page="support" />} />
        <Route path="/archive" element={<PublicSearchPage pieces={pieces} />} />
        <Route path="/search" element={<PublicSearchPage pieces={pieces} />} />
          <Route path="/draft" element={<PublicDraftPage />} />
        </Routes>
      </Layout>
      </AdminNoticeProvider>
    </PublicEditProvider>
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
