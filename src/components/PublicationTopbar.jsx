import { Link, useLocation } from 'react-router-dom'
import { loadCustomizerSettings } from '../lib/customizerLocal'
import { sabotMastheadTransparent } from '../lib/sabotMastheadTransparent'
import { EditableLink } from './EditableLink'
import { editableContentRegistry } from '../lib/editableContentRegistry'
import { publicRoutes } from '../routing/routes'
import { SHOW_AI_CAMPAIGN_LINKS } from '../config/campaignVisibility'

export function PublicationTopbar() {
  const location = useLocation()
  const customizer = loadCustomizerSettings()

  const siteTitle = String(customizer.siteIdentity?.siteTitle || 'Sabot Media').trim() || 'Sabot Media'
  const mastheadSize = ['compact', 'medium', 'large'].includes(customizer.masthead?.mastheadSize)
    ? customizer.masthead.mastheadSize
    : 'medium'

  const isHome = location.pathname === '/'
  const resolvedMastheadSize = isHome ? mastheadSize : 'compact'

  return (
    <header className={`publication-topbar publication-topbar--masthead publication-topbar--${resolvedMastheadSize}${isHome ? ' publication-topbar--home' : ' publication-topbar--inner'}`}>
      <div className="publication-topbar__inner">
        <div className="publication-topbar__brand">
          <Link
            to="/"
            className="publication-topbar__brand-link publication-topbar__brand-link--isolated"
            aria-label={`${siteTitle} home`}
            title={siteTitle}
          >
            <img
              className="publication-topbar__brand-image publication-topbar__brand-image--isolated"
              src={sabotMastheadTransparent}
              alt=""
              aria-hidden="true"
            />
          </Link>

          <nav className="publication-topbar__nav" aria-label="Primary">
            {editableContentRegistry.nav.map((item) => (
              <EditableLink
                defaultHref={item.defaultHref}
                defaultLabel={item.defaultLabel}
                hrefField={item.hrefField}
                key={item.id}
                labelField={item.labelField}
              />
            ))}
            {SHOW_AI_CAMPAIGN_LINKS ? <Link className="publication-topbar__campaign-link" to={publicRoutes.aiCampaign}>A/I Campaign</Link> : null}
            <Link to="/aberdeen-local-1312-gallery">Gallery</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
