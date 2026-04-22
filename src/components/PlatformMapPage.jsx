import { Link } from 'react-router-dom'

const lanes = [
  {
    eyebrow: 'archive lane',
    title: 'Imported Archive',
    body: 'Legacy content remains searchable and reviewable. Use migration tools to elevate pieces into native publishing when they deserve full editorial treatment.',
    links: [
      ['/search', 'search archive'],
      ['/migration-tools', 'migration tools'],
    ],
  },
  {
    eyebrow: 'native lane',
    title: 'Native Publishing',
    body: 'Draft, revise, schedule, and publish new content through the native pipeline. This is now the primary content system, not the archive.',
    links: [
      ['/native-bridge', 'open editor'],
      ['/updates', 'view updates'],
    ],
  },
  {
    eyebrow: 'structure lane',
    title: 'Taxonomy & Surfaces',
    body: 'Organize content with reusable taxonomy and publish intentionally across surfaces instead of dumping everything into one stream.',
    links: [
      ['/taxonomy', 'taxonomy'],
      ['/press-updates', 'press surface'],
      ['/project-updates', 'project surface'],
    ],
  },
  {
    eyebrow: 'ops lane',
    title: 'Operations',
    body: 'Roles, audit logs, analytics, and backups. The unglamorous parts that stop everything from collapsing quietly.',
    links: [
      ['/roles', 'roles'],
      ['/audit-log', 'audit log'],
      ['/analytics', 'analytics'],
      ['/system-backup', 'backup'],
    ],
  },
]

export function PlatformMapPage() {
  return (
    <main className="page platform-map-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">platform / map / final state</div>
        <h1>Platform Map</h1>
        <p className="project-hero__description">
          This is the canonical overview of Sabot’s structure. If you forget how the system works later, this page is the answer instead of guesswork.
        </p>
      </section>

      <section className="review-summary-grid">
        {lanes.map((lane) => (
          <article key={lane.title} className="review-summary-card surface-card ui-stack-md">
            <div className="review-summary-card__eyebrow">{lane.eyebrow}</div>
            <h2>{lane.title}</h2>
            <p>{lane.body}</p>
            <div className="review-card__actions">
              {lane.links.map(([to, label]) => (
                <Link key={to} to={to} className="button button--primary">
                  {label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="review-summary-card surface-card ui-stack-md">
        <div className="review-summary-card__eyebrow">final notes</div>
        <ul>
          <li><span>archive</span><strong>preserved, searchable</strong></li>
          <li><span>native</span><strong>primary publishing system</strong></li>
          <li><span>surfaces</span><strong>intentional distribution</strong></li>
          <li><span>ops</span><strong>visible and trackable</strong></li>
        </ul>
      </section>
    </main>
  )
}
