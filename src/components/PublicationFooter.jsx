import { Link } from 'react-router-dom'

const footerSections = [
  {
    title: 'Archive',
    links: [
      ['/archive', 'Browse archive'],
      ['/updates', 'Recent posts'],
      ['/press', 'Press'],
      ['/projects', 'Projects'],
    ],
  },
  {
    title: 'Formats',
    links: [
      ['/archive', 'Articles'],
      ['/archive', 'Dispatches'],
      ['/archive', 'Podcasts'],
      ['/archive', 'Print materials'],
    ],
  },
  {
    title: 'About',
    links: [
      ['/archive', 'About the publication'],
      ['/archive', 'Contact'],
      ['/archive', 'Topics and tags'],
    ],
  },
]

export function PublicationFooter() {
  return (
    <footer className="publication-footer">
      <div className="publication-footer__top">
        <div className="publication-footer__brand">
          <div className="publication-footer__eyebrow">independent media / archive / public publication</div>
          <h2>Sabot Media</h2>
          <p>
            An independent media publication for recent writing, dispatches, print material, and archive work.
            The public site is for reading. The tools stay backstage.
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
        <p>Each piece supports read mode, experience mode, and print mode.</p>
      </div>
    </footer>
  )
}
