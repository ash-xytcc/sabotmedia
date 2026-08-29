import { Link } from 'react-router-dom'
import { EditableLink } from './EditableLink'
import { EditableText } from './EditableText'
import { editableContentRegistry } from '../lib/editableContentRegistry'
import { useAdminAuth } from './AdminAuthContext'
import { publicRoutes } from '../routing/routes'

export function PublicationFooter() {
  const footer = editableContentRegistry.footer
  const { isAuthenticated, isChecking } = useAdminAuth()

  return (
    <footer className="publication-footer">
      <div className="publication-footer__top">
        <div className="publication-footer__brand">
          <EditableText as="div" className="publication-footer__eyebrow" field={footer.eyebrow.field}>
            {footer.eyebrow.defaultText}
          </EditableText>
          <EditableText as="h2" field={footer.title.field}>
            {footer.title.defaultText}
          </EditableText>
          <EditableText as="div" className="publication-footer__body" field={footer.body.field} multiline>
            {footer.body.defaultText}
          </EditableText>
        </div>

        {footer.sections.map((section) => (
          <div className="publication-footer__section" key={section.id}>
            <EditableText as="h3" field={section.titleField}>
              {section.defaultTitle}
            </EditableText>
            <nav>
              {section.links.map((link) => (
                <EditableLink
                  defaultHref={link.defaultHref}
                  defaultLabel={link.defaultLabel}
                  hrefField={link.hrefField}
                  key={link.id}
                  labelField={link.labelField}
                />
              ))}
              {section.id === 'site' ? <Link className="publication-footer__campaign-link" to={publicRoutes.aiCampaign}>A/I Campaign</Link> : null}
              {section.id === 'site' ? <Link to="/aberdeen-local-1312-gallery">Gallery</Link> : null}
            </nav>
          </div>
        ))}
      </div>

      <div className="publication-footer__bottom">
        <EditableText as="div" field={footer.bottom.field} multiline>
          {footer.bottom.defaultText}
        </EditableText>
        {!isChecking && !isAuthenticated ? (
          <Link className="publication-footer__login-link" to="/login">Editor login</Link>
        ) : null}
      </div>
    </footer>
  )
}
