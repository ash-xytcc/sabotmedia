import { useEffect, useState } from 'react'
import { usePublicEdit } from './PublicEditContext'
import { getEditorPermissionsSnapshot } from '../lib/editorPermissions'

export function PublicAdminToolbar() {
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

  if (!canUseToolbar) return null

  return (
    <div className="wp-public-admin-bar" role="navigation" aria-label="Editor toolbar">
      <div className="wp-public-admin-bar__left">
        <a className="wp-public-admin-bar__item wp-public-admin-bar__brand" href="/">Sabot Media</a>
        <a className="wp-public-admin-bar__item" href="/admin">Dashboard</a>
        <a className="wp-public-admin-bar__item" href="/native-bridge?new=article">New</a>
        <a className="wp-public-admin-bar__item" href="/content">Posts</a>
        <a className="wp-public-admin-bar__item" href="/media">Media</a>
        <a className="wp-public-admin-bar__item" href="/customize">Customize</a>
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
