import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePublicEdit } from './PublicEditContext'

function removeEditParam(pathname, search) {
  const params = new URLSearchParams(search)
  params.delete('edit')
  const nextSearch = params.toString()
  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}`
}

export function PublicEditPanel() {
  const {
    isEditing,
    isAdmin,
    canSave,
    changedFields,
    hasDraftChanges,
    saveState,
    saveError,
    permissionError,
    saveDraftToBackend,
    discardDraftAndReload,
    stopEditing,
    hasPendingDraftChanges,
  } = usePublicEdit()
  const location = useLocation()
  const navigate = useNavigate()
  const [loginNotice, setLoginNotice] = useState(false)

  const statusText = useMemo(() => {
    if (saveState === 'saving') return 'Saving'
    if (saveState === 'saved') return 'Saved'
    if (saveState === 'error') return 'Save needs attention'
    if (hasDraftChanges) return 'Unsaved changes'
    return 'No changes'
  }, [hasDraftChanges, saveState])

  useEffect(() => {
    if (!isEditing) return

    function handleKeyDown(event) {
      const active = document.activeElement
      const isTextInput = active?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active?.tagName)
      if (event.key !== 'Escape' || isTextInput) return
      event.preventDefault()
      exitEditor({ discard: hasDraftChanges })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasDraftChanges, isEditing, location.pathname, location.search])

  if (!isAdmin || !isEditing) return null

  async function exitEditor({ discard = false } = {}) {
    if (discard) {
      await discardDraftAndReload()
    }
    stopEditing()
    navigate(removeEditParam(location.pathname, location.search), { replace: true })
  }

  async function handleSave() {
    if (document.activeElement?.isContentEditable) {
      document.activeElement.blur()
      await new Promise((resolve) => window.requestAnimationFrame(resolve))
    }

    if (!hasPendingDraftChanges()) {
      await exitEditor()
      return
    }

    if (!canSave) {
      const returnTo = `${location.pathname}${location.search || ''}${location.hash || ''}`
      setLoginNotice(true)
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }

    await saveDraftToBackend()
  }

  return (
    <>
      <div className="public-inline-edit-bar" role="region" aria-label="Live page editing">
        <div className="public-inline-edit-bar__title">
          <strong>Editing page</strong>
          <span>{statusText}</span>
        </div>

        {saveError || permissionError || loginNotice ? (
          <p className="public-inline-edit-bar__message">
            {saveError || permissionError || 'Log in to save changes.'}
          </p>
        ) : null}

        <div className="public-inline-edit-bar__actions">
          {changedFields.length ? <span>{changedFields.length} changed</span> : null}
          <button className="button button--primary" type="button" onClick={handleSave} disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving...' : 'Save'}
          </button>
          <button className="button" type="button" onClick={() => exitEditor({ discard: hasDraftChanges })}>
            {hasDraftChanges ? 'Exit without saving' : 'Exit'}
          </button>
        </div>
      </div>
    </>
  )
}
