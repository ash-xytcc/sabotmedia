import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { EditableText } from './EditableText'
import { getEditablePage } from '../lib/editableContentRegistry'
import { getPublicInfoCopy, getPublicInfoField } from '../content/publicInfoCopy'
import { SecureContactForm } from './SecureContactForm'

const CONTACT_CHANNELS = [
  { label: 'News tips, documents, and leads', address: 'tips@sabot.media' },
  { label: 'Submissions and pitches', address: 'submit@sabot.media' },
  { label: 'Press and interview requests', address: 'press@sabot.media' },
  { label: 'Security questions', address: 'security@sabot.media' },
  { label: 'Support and material help', address: 'support@sabot.media' },
]

function ContactChannels() {
  return (
    <div className="contact-channels">
      <section className="contact-channel contact-channel--general" aria-labelledby="general-contact-title">
        <div>
          <p className="contact-channel__label" id="general-contact-title">General correspondence, corrections, collaboration, and questions</p>
          <a href="mailto:info@sabot.media">info@sabot.media</a>
        </div>
        <SecureContactForm />
      </section>

      <div className="contact-channel-grid" aria-label="Other Sabot Media contact addresses">
        {CONTACT_CHANNELS.map((channel) => (
          <section className="contact-channel" key={channel.address}>
            <p className="contact-channel__label">{channel.label}</p>
            <a href={`mailto:${channel.address}`}>{channel.address}</a>
          </section>
        ))}
      </div>
    </div>
  )
}

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
        {page === 'contact' ? <ContactChannels /> : null}
      </section>
      <PublicationFooter />
    </main>
  )
}
