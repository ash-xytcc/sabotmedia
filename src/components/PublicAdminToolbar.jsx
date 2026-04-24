import { Link } from 'react-router-dom'
import { usePublicEdit } from './PublicEditContext'
import { WORDPRESS_ADMIN_LINKS } from '../lib/wordpressClient'

export function PublicAdminToolbar() {
  const { canSave, isEditing, toggleEditing, changedFields, saveState, saveDraftToBackend, applyDraftLocally } = usePublicEdit()

  if (!canSave) return null

  return (
    <div className="wp-public-admin-bar" role="navigation" aria-label="Editor toolbar">
      <div className="wp-public-admin-bar__left">
        <Link className="wp-public-admin-bar__item wp-public-admin-bar__brand" to="/">Sabot Media</Link>
        <button className="wp-public-admin-bar__item" type="button" onClick={toggleEditing}>{isEditing ? 'Exit Edit Site' : 'Edit Site'}</button>
        <Link className="wp-public-admin-bar__item" to="/native-bridge?new=article">New Post</Link>
        <Link className="wp-public-admin-bar__item" to="/content">Posts</Link>
        <Link className="wp-public-admin-bar__item" to="/media">Media</Link>
        <Link className="wp-public-admin-bar__item" to="/admin">Dashboard</Link>
      </div>
      <div className="wp-public-admin-bar__right">
        {changedFields.length ? (
          <>
            <span className="wp-public-admin-bar__status">{changedFields.length} unsaved</span>
            <button className="wp-public-admin-bar__item" type="button" onClick={applyDraftLocally}>Apply Local</button>
            <button className="wp-public-admin-bar__item" type="button" onClick={saveDraftToBackend}>{saveState === 'saving' ? 'Saving…' : 'Save Site'}</button>
          </>
        ) : null}
      </div>
    </div>
  )
}
