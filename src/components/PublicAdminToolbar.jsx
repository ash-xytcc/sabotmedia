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
        <a className="wp-public-admin-bar__item" href={WORDPRESS_ADMIN_LINKS.posts} target="_blank" rel="noreferrer">
          Posts
        </a>
        <a className="wp-public-admin-bar__item" href={WORDPRESS_ADMIN_LINKS.newPost} target="_blank" rel="noreferrer">
          + New
        </a>
        <a className="wp-public-admin-bar__item" href={WORDPRESS_ADMIN_LINKS.media} target="_blank" rel="noreferrer">
          Media
        </a>
        <button className="wp-public-admin-bar__item" type="button" onClick={toggleEditing}>
          {isEditing ? 'Exit Edit Site' : 'Edit Site'}
        </button>
        <a className="wp-public-admin-bar__item" href={WORDPRESS_ADMIN_LINKS.dashboard} target="_blank" rel="noreferrer">
          WP Admin
        </a>
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
