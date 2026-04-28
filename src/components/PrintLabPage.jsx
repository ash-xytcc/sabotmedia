import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'

const PRINT_LAB_TOOLS = [
  {
    name: 'Export piece as print PDF',
    status: 'ed',
    notes: 'Uses each piece’s Print mode and browser print dialog. Dedicated export pipeline is unavailable.',
    actionLabel: 'Open archive in print mode',
    to: '/archive',
  },
  {
    name: 'Zine / imposition ',
    status: 'ed',
    notes: 'Planning surface for booklet signatures, folios, and pagination rules. No layout engine wired yet.',
    actionLabel: 'View  notes',
    to: '/tools/print#zine-imposition',
  },
  {
    name: 'Button maker ',
    status: 'ed',
    notes: 'Reserved for circular artboard prep and print-safe bleed presets. Export templates are unavailable.',
    actionLabel: 'View  notes',
    to: '/tools/print#button-maker',
  },
  {
    name: 'Poster tiler / rasterbator ',
    status: 'ed',
    notes: 'Reserved for multi-page poster splitting and optional halftone raster modes. Rendering is unavailable.',
    actionLabel: 'View  notes',
    to: '/tools/print#poster-tiler',
  },
]

export function PrintLabPage() {
  return (
    <AdminFrame>
      <main className="page wp-admin-screen print-lab-page">
        <div className="wp-screen-header">
          <h1>Print Lab</h1>
          <Link className="button button--primary" to="/tools">Back to Tools</Link>
        </div>

        <section className="wp-meta-box">
          <h2>Publication print s</h2>
          <p className="description">
            Print Lab tracks publication-focused tooling. Items marked ed are intentionally not wired to completed exports.
          </p>

          <div className="print-lab-grid">
            {PRINT_LAB_TOOLS.map((tool) => (
              <article className="print-lab-card" key={tool.name}>
                <h3>{tool.name}</h3>
                <p><strong>Status:</strong> {tool.status}</p>
                <p>{tool.notes}</p>
                <Link className="button" to={tool.to}>{tool.actionLabel}</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="wp-meta-box" id="zine-imposition">
          <h2>Zine / imposition </h2>
          <p className="description">Target: signature planning (4/8/16 page), duplex folding map, and page-order proofing.</p>
        </section>

        <section className="wp-meta-box" id="button-maker">
          <h2>Button maker </h2>
          <p className="description">Target: circular templates, text-safe ring guides, and pin-back bleed helpers.</p>
        </section>

        <section className="wp-meta-box" id="poster-tiler">
          <h2>Poster tiler / rasterbator </h2>
          <p className="description">Target: poster splitting across paper sizes, registration marks, and optional raster effects.</p>
        </section>
      </main>
    </AdminFrame>
  )
}
