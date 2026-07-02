import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'

const pageContent = {
  about: {
    eyebrow: 'about / publication / harbor',
    title: 'About Sabot Media',
    body: 'Sabot Media publishes independent reporting, essays, dispatches, print material, and project-based archive work rooted in Grays Harbor and beyond.',
    actions: [
      ['/archive', 'Browse archive'],
      ['/projects', 'View projects'],
    ],
  },
  contact: {
    eyebrow: 'contact / tips / correspondence',
    title: 'Contact',
    body: 'For tips, corrections, project notes, questions, or general correspondence, contact Sabot Media through the public channels listed by the publication.',
    actions: [
      ['/submit', 'Submit work'],
      ['/support', 'Support'],
    ],
  },
  submit: {
    eyebrow: 'submit / pitches / contributions',
    title: 'Submit',
    body: 'Send pitches, essays, reports, art, zine ideas, or project leads that fit the publication. Include a short description, the intended format, and how to reach you.',
    actions: [
      ['/archive?format=article', 'Read articles'],
      ['/contact', 'Contact'],
    ],
  },
  support: {
    eyebrow: 'support / sustain / share',
    title: 'Support',
    body: 'Support Sabot Media by reading, sharing, printing, citing, and circulating work from the archive. More direct support options can be added here as they become available.',
    actions: [
      ['/archive?format=zine', 'Print material'],
      ['/projects', 'Projects'],
    ],
  },
}

export function PublicInfoPage({ page = 'about' }) {
  const content = pageContent[page] || pageContent.about

  return (
    <main className="page public-info-page">
      <PublicationTopbar />
      <section className="project-hero public-info-page__hero">
        <div className="project-hero__eyebrow">{content.eyebrow}</div>
        <h1>{content.title}</h1>
        <p className="project-hero__description">{content.body}</p>
        <div className="archive-results-bar">
          {content.actions.map(([to, label], index) => (
            <Link className={`button${index === 0 ? ' button--primary' : ''}`} key={to} to={to}>
              {label}
            </Link>
          ))}
        </div>
      </section>
      <PublicationFooter />
    </main>
  )
}
