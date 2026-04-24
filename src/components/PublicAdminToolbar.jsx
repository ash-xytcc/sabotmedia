import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { usePublicEdit } from './PublicEditContext'
import { getPieces } from '../lib/pieces'
import { getEditorPermissionsSnapshot } from '../lib/editorPermissions'
import { WORDPRESS_ADMIN_LINKS, buildWordPressPostEditLink } from '../lib/wordpressClient'

const IMPORTED_PIECES = getPieces()

export function PublicAdminToolbar() {
  const { canSave, isEditing, toggleEditing, changedFields, saveState, saveDraftToBackend, applyDraftLocally } = usePublicEdit()
  const location = useLocation()
  const [nativeItems, setNativeItems] = useState([])
  const [canUseToolbar, setCanUseToolbar] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPermissions() {
      try {
        const snapshot = await getEditorPermissionsSnapshot()
        if (!cancelled) setCanUseToolbar(Boolean(snapshot?.canEditAnything))
      } catch {
        if (!cancelled) setCanUseToolbar(false)
      }
    }

    loadPermissions()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!canUseToolbar) return
    loadNativeCollection({ includeFuture: 1 }).then((items) => setNativeItems(Array.isArray(items) ? items : []))
  }, [canUseToolbar])

  const currentPiece = useMemo(() => {
    const postMatch = location.pathname.match(/^\/(post|piece)\/([^/]+)/)
    if (!postMatch) return null
    const slug = postMatch[2]
    return IMPORTED_PIECES.find((item) => item?.slug === slug) || null
  }, [location.pathname])

  const editPostLink = useMemo(() => {
    const postMatch = location.pathname.match(/^\/(post|piece)\/([^/]+)/)
    if (!postMatch) return ''
    const slug = postMatch[2]
    const found = nativeItems.find((item) => item.slug === slug)
    return found ? `/native-bridge?edit=${found.id}` : ''
  }, [location.pathname, nativeItems])

  const editSourceLink = useMemo(() => {
    const sourcePostId = String(currentPiece?.sourcePostId || '').trim()
    const sourceUrl = String(currentPiece?.sourceUrl || '').trim()
    if (!sourcePostId && !sourceUrl) return ''
    if (sourcePostId) return buildWordPressPostEditLink(sourcePostId, sourceUrl)
    return sourceUrl
  }, [currentPiece])

  if (!canUseToolbar) return null

  return (
    <div className="wp-public-admin-bar" role="navigation" aria-label="Editor toolbar">
      <div className="wp-public-admin-bar__left">
        <a className="wp-public-admin-bar__item wp-public-admin-bar__brand" href={'/admin'}>Sabot Media</a>
        <a className="wp-public-admin-bar__item" href={'/admin'}>Dashboard</a>
        <a className="wp-public-admin-bar__item" href={'/native-bridge?new=article'}>New</a>
        <a className="wp-public-admin-bar__item" href={'/content'}>Posts</a>
        <a className="wp-public-admin-bar__item" href={'/media'}>Media</a>
        <a className="wp-public-admin-bar__item" href={WORDPRESS_ADMIN_LINKS.customize}>Customize</a>
        {editPostLink ? <Link className="wp-public-admin-bar__item" to={editPostLink}>Edit Post</Link> : null}
        {editSourceLink ? <a className="wp-public-admin-bar__item" href={editSourceLink}>Edit Source</a> : null}
        <a className="wp-public-admin-bar__item" href="/?edit=site">Edit Site</a>
      </div>
      <div className="wp-public-admin-bar__right">
        {canSave && changedFields.length ? (
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
