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
import { NativeContentBridgePage } from './components/NativeContentBridgePage'
import { NativeUpdatesPage } from './components/NativeUpdatesPage'
import { NativeUpdateDetailPage } from './components/NativeUpdateDetailPage'
import { NativeDraftPreviewPage } from './components/NativeDraftPreviewPage'
import { PublicSearchPage } from './components/PublicSearchPage'
import { PublicDraftPage } from './components/PublicDraftPage'
import { PublicEditProvider, usePublicEdit } from './components/PublicEditContext'
import { PublicEditPanel } from './components/PublicEditPanel'
import { PublicAdminToolbar } from './components/PublicAdminToolbar'
import { EditableText } from './components/EditableText'
import { buildProjectMap, getFeaturedPiece, getLatestPieces } from './lib/content'
import { getPieces } from './lib/pieces'
import { PublicSurfacePage } from './components/PublicSurfacePage'
import { AdminNoticeProvider } from './components/WpAdminNotices'
import { MediaLibraryPage } from './components/MediaLibraryPage'
import { CustomizeAdminPage, PagesAdminPage, SettingsAdminPage, SiteEditorAdminPage, ToolsAdminPage, UsersAdminPage } from './components/WpAdminScaffoldPages'
import { SitesAdminPage } from './components/SitesAdminPage'

const pieces = getPieces()
const featured = getFeaturedPiece(pieces)
const latest = getLatestPieces(pieces, 12)
const projectMap = buildProjectMap(pieces)
const reviewCount = pieces.filter((piece) => piece.reviewFlags?.length).length

const ADMIN_SHELL_PATHS = [
  '/admin',
  '/review',
  '/content',
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
  '/settings',
  '/sites',
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
          <Route path="/piece/:slug" element={<PiecePage pieces={pieces} />} />
          <Route path="/post/:slug" element={<PiecePage pieces={pieces} />} />
          <Route path="/piece/:slug/print" element={<PrintPage pieces={pieces} />} />
          <Route path="/review" element={<ReviewQueuePage pieces={pieces} />} />
          <Route path="/admin" element={<AdminPage pieces={pieces} />} />
          <Route path="/content" element={<ContentListPage />} />
          <Route path="/overrides" element={<OverridesPage />} />
          <Route path="/media" element={<MediaLibraryPage />} />
          <Route path="/pages" element={<PagesAdminPage />} />
          <Route path="/users" element={<UsersAdminPage />} />
          <Route path="/menus" element={<Navigate to="/customize?section=navigation" replace />} />
          <Route path="/customize" element={<CustomizeAdminPage />} />
          <Route path="/site-editor" element={<Navigate to="/tools#advanced-draft-tools" replace />} />
          <Route path="/advanced-draft-tools" element={<SiteEditorAdminPage />} />
          <Route path="/tools" element={<ToolsAdminPage />} />
          <Route path="/settings" element={<SettingsAdminPage />} />
          <Route path="/settings/sites" element={<SitesAdminPage />} />
          <Route path="/sites" element={<SitesAdminPage />} />
        <Route path="/podcasts" element={<PodcastAdminPage pieces={pieces} />} />
        <Route path="/native-bridge" element={<NativeContentBridgePage />} />
        <Route path="/updates" element={<NativeUpdatesPage pieces={pieces} featured={featured} latest={latest} />} />
        <Route path="/updates/:slug" element={<NativeUpdateDetailPage />} />
        <Route path="/native-preview/:id" element={<NativeDraftPreviewPage />} />
        <Route path="/press" element={<PublicSurfacePage target="press" />} />
        <Route path="/archive" element={<PublicSearchPage pieces={pieces} />} />
        <Route path="/search" element={<PublicSearchPage pieces={pieces} />} />
          <Route path="/draft" element={<PublicDraftPage />} />
        </Routes>
      </Layout>
      </AdminNoticeProvider>
    </PublicEditProvider>
  )
}
