import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'

const pageContent = {
  about: {
    eyebrow: 'about / publication / harbor',
    title: 'About Sabot Media',
    body: 'Sabot Media publishes independent reporting, essays, comics, podcasts, zines, and project-based archive work rooted in Grays Harbor and connected to wider struggles.',
    actions: [
      ['/archive', 'Browse archive'],
      ['/projects', 'View projects'],
    ],
  },
  contact: {
    eyebrow: 'contact / tips / correspondence',
    title: 'Contact',
    body: 'Send tips, corrections, project notes, questions, and correspondence through the publication channels. Include context, links, and a way to follow up when a reply is needed.',
    actions: [
      ['/submit', 'Submit work'],
      ['/support', 'Support'],
    ],
  },
  submit: {
    eyebrow: 'submit / pitches / contributions',
    title: 'Submit',
    body: 'Send pitches, essays, reports, comics, art, zine ideas, or project leads that fit the publication. Include a short description, the intended format, and how to reach you.',
    actions: [
      ['/archive?format=article', 'Read articles'],
      ['/contact', 'Contact'],
    ],
  },
  support: {
    eyebrow: 'support / sustain / share',
    title: 'Support',
    body: 'Support Sabot Media by reading, sharing, printing, citing, and circulating work from the archive. Direct support details can be added here when they are ready.',
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
