import { Link, useLocation } from 'react-router-dom'
import { loadCustomizerSettings } from '../lib/customizerLocal'
import { sabotLogoVerified } from '../lib/sabotLogoVerified'
import { EditableLink } from './EditableLink'
import { editableContentRegistry } from '../lib/editableContentRegistry'

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
            className="publication-topbar__brand-link"
            aria-label={`${siteTitle} home`}
            title={siteTitle}
            style={{ background: 'transparent', opacity: 1, visibility: 'visible' }}
          >
            <img
              src={sabotLogoVerified}
              alt={siteTitle}
              className="publication-topbar__brand-image"
              width="280"
              height="88"
              style={{ display: 'block', opacity: 1, visibility: 'visible', filter: 'none', mixBlendMode: 'normal' }}
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
          </nav>
        </div>
      </div>
    </header>
  )
}
