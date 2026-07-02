import { useMemo, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePublicEdit } from './PublicEditContext'
import { useAdminAuth } from './AdminAuthContext'
import { getEditorPermissionsSnapshot } from '../lib/editorPermissions'
import { loadNativeCollection } from '../lib/nativePublicContent'
import mastheadLogo from '../assets/sabot-masthead-logo.png'

export function PublicAdminToolbar() {
  const siteTitle = 'Sabot Media'
  const location = useLocation()

  const [nativeItems, setNativeItems] = useState([])
  const { isAuthenticated, logout } = useAdminAuth()

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated) {
      setNativeItems([])
      return () => { cancelled = true }
    }
    loadNativeCollection({ includeFuture: 1 })
      .then((items) => {
        if (!cancelled) setNativeItems(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (!cancelled) setNativeItems([])
      })
    return () => { cancelled = true }
  }, [isAuthenticated])
  const { isEditing, canSave, changedFields, saveState, saveDraftToBackend, applyDraftLocally } = usePublicEdit()
  const [canUseToolbar, setCanUseToolbar] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated) {
      setCanUseToolbar(false)
      return () => { cancelled = true }
    }

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
  }, [isAuthenticated])

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

  const editSiteLink = useMemo(() => {
    const params = new URLSearchParams(location.search)
    params.set('edit', 'site')
    return `${location.pathname}?${params.toString()}`
  }, [location.pathname, location.search])

  if (!isAuthenticated || !canUseToolbar || isEditing) return null

  return (
    <div className="wp-public-admin-bar" role="navigation" aria-label="Editor toolbar">
      <div className="wp-public-admin-bar__left">
        <a className="wp-public-admin-bar__item wp-public-admin-bar__brand" href={'/'} aria-label={`${siteTitle} home`}>
          <img src={mastheadLogo} alt={siteTitle} className="wp-public-admin-bar__brand-logo" />
        </a>
        <a className="wp-public-admin-bar__item" href={'/admin'}>Dashboard</a>
        <a className="wp-public-admin-bar__item" href={'/native-bridge?new=article'}>New</a>
        <a className="wp-public-admin-bar__item" href={'/content'}>Posts</a>
        <a className="wp-public-admin-bar__item" href={'/media'}>Media</a>
        <a className="wp-public-admin-bar__item" href={'/customize'}>Customize</a>
        {editPostLink ? <a className="wp-public-admin-bar__item" href={editPostLink}>Edit Post</a> : null}
        <a className="wp-public-admin-bar__item" href={editSiteLink}>Edit Site</a>
      </div>
      <div className="wp-public-admin-bar__right">
        <button className="wp-public-admin-bar__item" type="button" onClick={logout}>Logout</button>
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
