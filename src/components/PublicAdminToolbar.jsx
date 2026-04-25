import { useMemo, useEffect, useState } from 'react'
import { usePublicEdit } from './PublicEditContext'
import { getEditorPermissionsSnapshot } from '../lib/editorPermissions'
import { loadCustomizerSettings } from '../lib/customizerLocal'

export function PublicAdminToolbar() {
  const [nativeItems, setNativeItems] = useState([])

  useEffect(() => {
    let cancelled = false
    loadNativeCollection({ includeFuture: 1 })
      .then((items) => {
        if (!cancelled) setNativeItems(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (!cancelled) setNativeItems([])
      })
    return () => { cancelled = true }
  }, [])
  const { canSave, changedFields, saveState, saveDraftToBackend, applyDraftLocally } = usePublicEdit()
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

  const editPostLink = useMemo(() => {
    const postMatch = location.pathname.match(/^\/(post|piece)\/([^/]+)/)
    if (!postMatch) return ''
    const slug = postMatch[2]
    const found = nativeItems.find((item) => item.slug === slug)
    return found ? `/native-bridge?edit=${found.id}` : ''
  }, [location.pathname, nativeItems])

  if (!canUseToolbar) return null

  return (
    <div className="wp-public-admin-bar" role="navigation" aria-label="Editor toolbar">
      <div className="wp-public-admin-bar__left">
        <a className="wp-public-admin-bar__item wp-public-admin-bar__brand" href={'/'}>{siteTitle}</a>
        <a className="wp-public-admin-bar__item" href={'/admin'}>Dashboard</a>
        <a className="wp-public-admin-bar__item" href={'/native-bridge?new=article'}>New</a>
        <a className="wp-public-admin-bar__item" href={'/content'}>Posts</a>
        <a className="wp-public-admin-bar__item" href={'/media'}>Media</a>
        {/* Live inline editing remains deferred; use Customize as the active internal site-editing entry point. */}
        <a className="wp-public-admin-bar__item" href={'/customize'}>Customize</a>
        {editPostLink ? <Link className="wp-public-admin-bar__item" to={editPostLink}>Edit Post</Link> : null}
        <a className="wp-public-admin-bar__item" href="/customize">Edit Site</a>
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
