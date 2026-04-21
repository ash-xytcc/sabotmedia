import { Navigate, Route, Routes } from 'react-router-dom'
import imported from './content/pieces.imported.json'
import { AppHeader } from './components/AppHeader'
import { HomePage } from './components/HomePage'
import { PiecePage } from './components/PiecePage'
import { PrintPage } from './components/PrintPage'
import { buildProjectMap, getFeaturedPiece, getLatestPieces } from './lib/content'

const pieces = imported.items || []
const featured = getFeaturedPiece(pieces)
const latest = getLatestPieces(pieces, 9)
const projectMap = buildProjectMap(pieces)

export default function App() {
  return (
    <div className="site-shell">
      <AppHeader />
      <Routes>
        <Route path="/" element={<HomePage featured={featured} latest={latest} projectMap={projectMap} />} />
        <Route path="/piece/:slug" element={<PiecePage pieces={pieces} />} />
        <Route path="/piece/:slug/print" element={<PrintPage pieces={pieces} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
