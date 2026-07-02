import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { EditableText } from './EditableText'
import { getEditablePage } from '../lib/editableContentRegistry'

const pageContent = {
  about: {
    actions: [
      ['/archive', 'Browse archive'],
      ['/projects', 'View projects'],
    ],
  },
  contact: {
    actions: [
      ['/submit', 'Submit work'],
      ['/support', 'Support'],
    ],
  },
  submit: {
    actions: [
      ['/archive?format=article', 'Read articles'],
      ['/contact', 'Contact'],
    ],
  },
  support: {
    actions: [
      ['/archive?format=zine', 'Print material'],
      ['/projects', 'Projects'],
    ],
  },
}

export function PublicInfoPage({ page = 'about' }) {
  const content = pageContent[page] || pageContent.about
  const editablePage = getEditablePage(page)

  return (
    <main className="page public-info-page">
      <PublicationTopbar />
      <section className="project-hero public-info-page__hero">
        <EditableText
          as="div"
          className="project-hero__eyebrow"
          field={editablePage.eyebrow.field}
        >
          {editablePage.eyebrow.defaultText}
        </EditableText>
        <EditableText as="h1" field={editablePage.title.field}>
          {editablePage.title.defaultText}
        </EditableText>
        <EditableText
          as="p"
          className="project-hero__description"
          field={editablePage.body.field}
        >
          {editablePage.body.defaultText}
        </EditableText>
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
