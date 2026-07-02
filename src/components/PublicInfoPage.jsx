import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
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
      </section>
      <PublicationFooter />
    </main>
  )
}
