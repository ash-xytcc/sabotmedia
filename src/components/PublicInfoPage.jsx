import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { EditableText } from './EditableText'
import { getEditablePage } from '../lib/editableContentRegistry'
import { getPublicInfoCopy, getPublicInfoField } from '../content/publicInfoCopy'

export function PublicInfoPage({ page = 'about' }) {
  const editablePage = getEditablePage(page)
  const currentCopy = getPublicInfoCopy(page)

  const eyebrowField = getPublicInfoField(page, 'eyebrow', editablePage.eyebrow.field)
  const titleField = getPublicInfoField(page, 'title', editablePage.title.field)
  const bodyField = getPublicInfoField(page, 'body', editablePage.body.field)

  return (
    <main className="page public-info-page">
      <PublicationTopbar />
      <section className="project-hero public-info-page__hero">
        <EditableText
          as="div"
          className="project-hero__eyebrow"
          field={eyebrowField}
        >
          {currentCopy?.eyebrow || editablePage.eyebrow.defaultText}
        </EditableText>
        <EditableText as="h1" field={titleField}>
          {currentCopy?.title || editablePage.title.defaultText}
        </EditableText>
        <EditableText
          as="div"
          className="project-hero__description"
          field={bodyField}
          multiline
        >
          {currentCopy?.body || editablePage.body.defaultText}
        </EditableText>
      </section>
      <PublicationFooter />
    </main>
  )
}
