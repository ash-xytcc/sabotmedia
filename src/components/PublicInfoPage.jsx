import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { EditableLink } from './EditableLink'
import { EditableText } from './EditableText'
import { getEditablePage } from '../lib/editableContentRegistry'

export function PublicInfoPage({ page = 'about' }) {
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
          as="div"
          className="project-hero__description"
          field={editablePage.body.field}
          multiline
        >
          {editablePage.body.defaultText}
        </EditableText>
        <div className="archive-results-bar">
          {editablePage.actions.map((action, index) => (
            <EditableLink
              className={`button${index === 0 ? ' button--primary' : ''}`}
              defaultHref={action.defaultHref}
              defaultLabel={action.defaultLabel}
              hrefField={action.hrefField}
              key={action.id}
              labelField={action.labelField}
              variant="button"
            />
          ))}
        </div>
      </section>
      <PublicationFooter />
    </main>
  )
}
