import { AdminFrame } from './AdminRail'

const TOOLS = [
  { label: 'Import', wired: false },
  { label: 'Export', wired: false },
  { label: 'Native content export', wired: true },
  { label: 'Public config export', wired: true },
  { label: 'Media audit', wired: false },
  { label: 'WordPress REST audit', wired: false },
]

export function ToolsPage() {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header"><h1>Tools</h1></div>
        <section className="wp-meta-box">
          <h2>Available tools</h2>
          <ul>
            {TOOLS.map((tool) => (
              <li key={tool.label}>
                <strong>{tool.label}</strong> — {tool.wired ? 'available via existing helpers/screens' : 'not wired yet'}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </AdminFrame>
  )
}
