import { Link } from 'react-router-dom'
import { usePublicEdit } from './PublicEditContext'
import { WORDPRESS_ADMIN_LINKS } from '../lib/wordpressClient'

export function PublicAdminToolbar() {
  const {
    canSave,
    isEditing,
    toggleEditing,
    changedFields,
    saveState,
    saveDraftToBackend,
    applyDraftLocally,
  } = usePublicEdit()

  if (!canSave) return null

  return (
    <div className="wp-public-admin-bar" role="navigation" aria-label="Editor toolbar">
      <div className="wp-public-admin-bar__left">
        <Link className="wp-public-admin-bar__item wp-public-admin-bar__brand" to="/">
          ◉ Sabot Media
        </Link>
        <Link className="wp-public-admin-bar__item" to={WORDPRESS_ADMIN_LINKS.posts}>
          Posts
        </Link>
        <Link className="wp-public-admin-bar__item" to={WORDPRESS_ADMIN_LINKS.newPost}>
          + New
        </Link>
        <Link className="wp-public-admin-bar__item" to={WORDPRESS_ADMIN_LINKS.media}>
          Media
        </Link>
        <button className="wp-public-admin-bar__item" type="button" onClick={toggleEditing}>
          {isEditing ? 'Exit Edit Site' : 'Edit Site'}
        </button>
        <Link className="wp-public-admin-bar__item" to={WORDPRESS_ADMIN_LINKS.dashboard}>
          Admin
        </Link>
      </div>

      <div className="wp-public-admin-bar__right">
        {changedFields.length ? (
          <>
            <span className="wp-public-admin-bar__status">
              {changedFields.length} unsaved
            </span>
            <button className="wp-public-admin-bar__item" type="button" onClick={applyDraftLocally}>
              Apply Local
            </button>
            <button className="wp-public-admin-bar__item" type="button" onClick={saveDraftToBackend}>
              {saveState === 'saving' ? 'Saving…' : 'Save Site'}
            </button>
          </>
        ) : null}
        <span className="wp-public-admin-bar__howdy">Howdy, sabotmedia</span>
      </div>
    </div>
  )
}
