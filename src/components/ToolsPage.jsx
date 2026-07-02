import { AdminFrame } from './AdminRail'
import { useEffect, useState } from 'react'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { getPieces } from '../lib/pieces'
import { exportLocalSiteBackupJson } from '../lib/localSiteBackup'
import { downloadRssBundle } from '../lib/rssFeeds'

const TOOLS = [
  ['Native content export', 'Exports native content, imported archive references, and revision-aware local data.'],
  ['Media index export', 'Included in the newsroom backup with local uploads, folders, tags, alt text, captions, and media audit data.'],
  ['Settings export', 'Included in the newsroom backup with WordPress-style settings, customizer values, and editable public pages.'],
  ['RSS generation', 'Generates all-content, project, collection/category, format, podcast, and author feed XML as an export bundle.'],
  ['Site health', 'Dashboard checks missing images, alt text, orphaned media, RSS/search status, and build/deploy notes.'],
]

export function ToolsPage() {
  const [nativeItems, setNativeItems] = useState([])

  useEffect(() => {
    loadNativeCollection({ includeFuture: 1 }).then((items) => setNativeItems(Array.isArray(items) ? items : [])).catch(() => setNativeItems([]))
  }, [])

  function downloadBackup() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([exportLocalSiteBackupJson({ nativeItems })], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `sabot-newsroom-backup-${stamp}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Tools</h1>
        </div>

        <section className="wp-meta-box">
          <h2>Available tools</h2>
          <p className="description">
            These are internal Sabot clone tools. The direct Noblogs/WordPress backend experiment is not part of this branch.
          </p>

          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map(([tool, notes]) => (
                <tr key={tool}>
                  <td><strong>{tool}</strong></td>
                  <td>ed</td>
                  <td>{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="review-card__actions">
            <button className="button button--primary" type="button" onClick={downloadBackup}>Export newsroom backup</button>
            <button className="button" type="button" onClick={() => downloadRssBundle([...nativeItems, ...getPieces()])}>Generate RSS bundle</button>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}
