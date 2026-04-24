import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { usePublicEdit } from './PublicEditContext'
import { WORDPRESS_ADMIN_LINKS } from '../lib/wordpressClient'

export function PublicAdminToolbar() {
  const { canSave, isEditing, toggleEditing, changedFields, saveState, saveDraftToBackend, applyDraftLocally } = usePublicEdit()
  const location = useLocation()
  const [nativeItems, setNativeItems] = useState([])

  useEffect(() => {
    if (!canSave) return
    loadNativeCollection({ includeFuture: 1 }).then((items) => setNativeItems(Array.isArray(items) ? items : []))
  }, [canSave])

  const editPostLink = useMemo(() => {
    const postMatch = location.pathname.match(/^\/(post|piece)\/([^/]+)/)
    if (!postMatch) return ''
    const slug = postMatch[2]
    const found = nativeItems.find((item) => item.slug === slug)
    return found ? `/native-bridge?edit=${found.id}` : ''
  }, [location.pathname, nativeItems])

  if (!canSave) return null

  return (
    <div className="wp-public-admin-bar" role="navigation" aria-label="Editor toolbar">
      <div className="wp-public-admin-bar__left">
        <Link className="wp-public-admin-bar__item wp-public-admin-bar__brand" to="/">Sabot Media</Link>
        <Link className="wp-public-admin-bar__item" to="/customize">Customize</Link>
        <Link className="wp-public-admin-bar__item" to="/native-bridge?new=article">New</Link>
        {editPostLink ? <Link className="wp-public-admin-bar__item" to={editPostLink}>Edit Post</Link> : null}
        <button className="wp-public-admin-bar__item" type="button" onClick={toggleEditing}>{isEditing ? 'Exit Edit Site' : 'Edit Site'}</button>
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
