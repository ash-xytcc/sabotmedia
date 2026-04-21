import { useMemo, useState } from 'react'
import { usePublicEdit } from './PublicEditContext'
import { buildChangedOnlyPayload } from '../lib/publicDraftExport'

export function PublicEditPanel() {
  const {
    isEditing,
    isAdmin,
    selectedField,
    draft,
    changedFields,
    updateStyle,
    resetField,
    clearDraft,
    clearSavedConfig,
    applyDraftLocally,
    saveDraftToBackend,
    effectiveConfig,
    loadState,
    saveState,
    loadError,
    saveError,
  } = usePublicEdit()

  const [copied, setCopied] = useState(false)

  const selectedStyles = useMemo(() => {
    if (!selectedField) return {}
    return effectiveConfig?.styles?.[selectedField] || {}
  }, [effectiveConfig, selectedField])

  const changedPayload = useMemo(() => buildChangedOnlyPayload(draft), [draft])

  async function handleCopyDraft() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(changedPayload, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  function applyPreset(kind) {
    if (!selectedField) return

    const presets = {
      xs: { fontSize: '0.9rem', lineHeight: '1.1' },
      sm: { fontSize: '1.1rem', lineHeight: '1.2' },
      md: { fontSize: '1.4rem', lineHeight: '1.2' },
      lg: { fontSize: '1.9rem', lineHeight: '1.05' },
      xl: { fontSize: '2.6rem', lineHeight: '0.95' },
    }

    updateStyle(selectedField, presets[kind] || presets.md)
  }

  if (!isAdmin || !isEditing) return null

  return (
    <aside className="public-edit-panel">
      <div className="public-edit-panel__eyebrow">live site editor</div>

      <div className="public-edit-panel__status">
        <span>{changedFields.length} changed field{changedFields.length === 1 ? '' : 's'}</span>
      </div>

      <div className="public-edit-panel__status">
        <span>load: {loadState}</span>
        {loadError ? <strong>{loadError}</strong> : null}
      </div>

      <div className="public-edit-panel__status">
        <span>save: {saveState}</span>
        {saveError ? <strong>{saveError}</strong> : null}
      </div>

      {selectedField ? (
        <>
          <div className="public-edit-panel__field">{selectedField}</div>

          <div className="public-edit-panel__presets">
            <button className="button" type="button" onClick={() => applyPreset('xs')}>xs</button>
            <button className="button" type="button" onClick={() => applyPreset('sm')}>sm</button>
            <button className="button" type="button" onClick={() => applyPreset('md')}>md</button>
            <button className="button" type="button" onClick={() => applyPreset('lg')}>lg</button>
            <button className="button" type="button" onClick={() => applyPreset('xl')}>xl</button>
          </div>

          <label className="public-edit-panel__control">
            <span>font size</span>
            <input
              type="range"
              min="0.8"
              max="6"
              step="0.05"
              value={parseFloat(String(selectedStyles.fontSize || '1.0').replace('rem', ''))}
              onChange={(e) => updateStyle(selectedField, { fontSize: `${e.target.value}rem` })}
            />
            <strong>{selectedStyles.fontSize || 'default'}</strong>
          </label>

          <label className="public-edit-panel__control">
            <span>line height</span>
            <input
              type="range"
              min="0.8"
              max="2.2"
              step="0.05"
              value={parseFloat(String(selectedStyles.lineHeight || '1.2'))}
              onChange={(e) => updateStyle(selectedField, { lineHeight: String(e.target.value) })}
            />
            <strong>{selectedStyles.lineHeight || 'default'}</strong>
          </label>

          <label className="public-edit-panel__control">
            <span>max width</span>
            <input
              type="range"
              min="8"
              max="60"
              step="1"
              value={parseFloat(String(selectedStyles.maxWidth || '24').replace('ch', ''))}
              onChange={(e) => updateStyle(selectedField, { maxWidth: `${e.target.value}ch` })}
            />
            <strong>{selectedStyles.maxWidth || 'default'}</strong>
          </label>

          <button className="button button--primary" type="button" onClick={() => resetField(selectedField)}>
            reset selected field
          </button>
        </>
      ) : (
        <p className="public-edit-panel__empty">Select an editable text block on the page.</p>
      )}

      <div className="public-edit-panel__changed-list">
        {changedFields.slice(0, 8).map((field) => (
          <span key={field} className="public-edit-panel__changed-chip">{field}</span>
        ))}
      </div>

      <div className="public-edit-panel__actions">
        <button className="button button--primary" type="button" onClick={applyDraftLocally}>
          apply locally
        </button>
        <button className="button button--primary" type="button" onClick={saveDraftToBackend}>
          save to backend
        </button>
        <button className="button button--primary" type="button" onClick={handleCopyDraft}>
          {copied ? 'copied payload' : 'copy changed-only payload'}
        </button>
        <button className="button" type="button" onClick={clearDraft}>
          clear draft
        </button>
        <button className="button" type="button" onClick={clearSavedConfig}>
          reset saved config
        </button>
      </div>
    </aside>
  )
}
