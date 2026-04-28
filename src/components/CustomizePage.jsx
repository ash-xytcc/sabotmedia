import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'

const SECTIONS = [
  ['Site Identity', 'Edit title, tagline, and publication identity ing.'],
  ['Colors', 'Theme color controls will live here.'],
  ['Header / Masthead', 'Masthead logo and header layout controls.'],
  ['Navigation', 'Public nav items and menu placement.'],
  ['Homepage', 'Homepage source, featured layout, and feed behavior.'],
]

export function CustomizePage() {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Customize</h1>
          <Link className="button" to="/">View site</Link>
        </div>

        <section className="wp-meta-box wp-customize-shell">
          <h2>Customizer</h2>
          <p className="description">
            WordPress-style customizer  for Sabot. These sections are local UI placeholders until each control is wired.
          </p>

          <div className="wp-customize-section-list">
            {SECTIONS.map(([title, body]) => (
              <button className="wp-customize-section" type="button" key={title}>
                <span>{title}</span>
                <small>{body}</small>
              </button>
            ))}
          </div>

          <p className="description">
            Existing legacy draft/config tools are still available under <Link to="/draft">Site Editor</Link>, but Customize should become the primary friendly surface.
          </p>
        </section>
      </main>
    </AdminFrame>
  )
}
