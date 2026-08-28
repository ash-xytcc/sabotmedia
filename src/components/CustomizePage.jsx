import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { LegacyInfoPageRecovery } from './LegacyInfoPageRecovery'
import { adminRoutes } from '../routing/routes'

const SECTIONS = [
  ['Site Identity', 'Edit title, tagline, and publication identity.'],
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
          <div>
            <h1>Customize</h1>
            <p className="description">Published site copy is D1-backed. Browser-local copies are recovery sources only and never control the live site.</p>
          </div>
          <Link className="button" to="/">View site</Link>
        </div>

        <LegacyInfoPageRecovery />

        <section className="wp-meta-box wp-customize-shell">
          <h2>Customizer</h2>
          <p className="description">
            WordPress-style customizer for Sabot. These sections are being moved onto persisted server-backed controls as they become operational.
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
            Advanced public config tools are available under <Link to={adminRoutes.liveEditor}>Site Editor</Link>.
          </p>
        </section>
      </main>
    </AdminFrame>
  )
}
