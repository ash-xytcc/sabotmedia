import { AdminFrame } from './AdminRail'

const TOOLS = [
  ['Import', 'Bring content into the internal Sabot clone. Not wired yet.'],
  ['Export', 'Export local/native content snapshots. Scaffolded.'],
  ['Native content export', 'Future direct export of internal posts and media.'],
  ['Public config export', 'Future export of public site settings and customizer state.'],
  ['Media audit', 'Check missing featured images, broken URLs, and local media records.'],
]

export function ToolsPage() {
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
                  <td>Scaffolded</td>
                  <td>{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}
