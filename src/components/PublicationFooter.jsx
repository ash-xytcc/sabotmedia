import { Link } from 'react-router-dom'

const footerSections = [
  {
    title: 'Archive',
    links: [
      ['/search', 'Search archives'],
      ['/updates', 'Recent posts'],
      ['/press-updates', 'Press'],
      ['/project-updates', 'Projects'],
    ],
  },
  {
    title: 'Formats',
    links: [
      ['/search', 'Articles'],
      ['/search', 'Dispatches'],
      ['/search', 'Podcasts'],
      ['/search', 'Print materials'],
    ],
  },
  {
    title: 'About',
    links: [
      ['/platform-map', 'About this publication'],
      ['/admin', 'Admin'],
      ['/system-backup', 'System backup'],
    ],
  },
]

export function PublicationFooter() {
  return (
    <footer className="publication-footer">
      <div className="publication-footer__top">
        <div className="publication-footer__brand">
          <div className="publication-footer__eyebrow">publication / archive / other routes</div>
          <h2>Sabot Media</h2>
          <p>
            Public-facing media publication for recent writing, dispatches, and archive material.
            The content is the product. Everything else stays backstage where it belongs.
          </p>
        </div>

        {footerSections.map((section) => (
          <div className="publication-footer__section" key={section.title}>
            <h3>{section.title}</h3>
            <nav>
              {section.links.map(([to, label]) => (
                <Link key={to + label} to={to}>{label}</Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="publication-footer__bottom">
        <p>Read mode, experience mode, and print mode live on each piece page.</p>
      </div>
    </footer>
  )
}
