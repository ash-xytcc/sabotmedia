import { Link } from 'react-router-dom'

const footerSections = [
  {
    title: 'Site',
    links: [
      ['/', 'Home'],
      ['/archive', 'Archive'],
      ['/projects', 'Projects'],
      ['/about', 'About'],
      ['/contact', 'Contact'],
      ['/submit', 'Submit work'],
      ['/support', 'Support'],
    ],
  },
  {
    title: 'Formats',
    links: [
      ['/archive?format=article', 'Articles'],
      ['/archive?format=podcast', 'Podcasts'],
      ['/archive?format=comic', 'Comics'],
      ['/archive?format=zine', 'Zines'],
      ['/archive?format=newsletter', 'Newsletters'],
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
        <p>Read online, search the archive, or open a print-friendly article view.</p>
      </div>
    </footer>
  )
}
