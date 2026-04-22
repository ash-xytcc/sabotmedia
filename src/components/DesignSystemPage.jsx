import { Link } from 'react-router-dom'
export function DesignSystemPage() {
  const tokens = [
    ['--page-max', 'Main content width'],
    ['--space-1 ... --space-6', 'Spacing scale'],
    ['--radius-1 ... --radius-3', 'Corner radius scale'],
    ['--shadow', 'Default card shadow'],
    ['--paper', 'Primary text color'],
    ['--text-dim', 'Muted text color'],
    ['--panel-border', 'Standard border color'],
    ['.surface-card', 'Reusable panel/card treatment'],
    ['.ui-stack-sm / md / lg', 'Reusable vertical spacing'],
  ]

  return (
    <main className="page design-system-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">design / system / consolidation</div>
        <h1>Design System</h1>
        <p className="project-hero__description">
          Centralized tokens and reusable UI surfaces for Sabot. Not glamorous, but it keeps the interface from mutating into a pile of unrelated opinions.
        </p>
      </section>

      <section className="review-summary-grid">
        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">tokens</div>
          <ul>
            {tokens.map(([name, desc]) => (
              <li key={name}><span>{name}</span><strong>{desc}</strong></li>
            ))}
          </ul>
        </article>

        <article className="review-summary-card surface-card ui-stack-md">
          <div className="review-summary-card__eyebrow">surface card example</div>
          <h2>Reusable panel</h2>
          <p>This panel uses the shared surface-card treatment and spacing utilities.</p>
          <div className="review-card__actions">
            <button className="button button--primary" type="button">primary action</button>
            <button className="button" type="button">secondary action</button>
          </div>
        </article>
      </section>
          <section className="review-summary-card surface-card ui-stack-md">
        <div className="review-summary-card__eyebrow">system map</div>
        <p>Need the canonical product map instead of style tokens? Miraculously, that now exists too.</p>
        <div className="review-card__actions">
          <Link className="button button--primary" to="/platform-shape">open platform map</Link>
        </div>
      </section>
    </main>
  )
}
