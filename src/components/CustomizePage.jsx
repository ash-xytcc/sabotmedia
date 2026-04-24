import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'

const SECTIONS = ['Site Identity', 'Colors', 'Header / Masthead', 'Navigation', 'Homepage']

export function CustomizePage() {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Customize</h1>
          <Link className="button" to="/draft">Open Site Editor</Link>
        </div>

        <section className="wp-meta-box">
          <h2>Customizer</h2>
          <p>Use these panels to jump into the existing inline public editing and draft system.</p>
          <ul>
            {SECTIONS.map((section) => (
              <li key={section}>
                <Link to="/draft">{section}</Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </AdminFrame>
  )
}
