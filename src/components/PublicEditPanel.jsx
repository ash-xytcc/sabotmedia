import { useMemo, useState } from 'react'
import { usePublicEdit } from './PublicEditContext'
import { buildChangedOnlyPayload } from '../lib/publicDraftExport'
import { getSavedAdminToken, setSavedAdminToken } from '../lib/publicConfigApi'

export function PublicEditPanel() {
  const {
    isEditing,
    isAdmin,
    selectedField,
    draft,
    changedFields,
    changedTextFields,
    changedStyleFields,
    draftStats,
    savedStats,
    effectiveStats,
    hasDraftChanges,
    updateStyle,
    resetField,
    clearDraft,
    clearSavedConfig,
    applyDraftLocally,
    saveDraftToBackend,
    reloadFromBackend,
    discardDraftAndReload,
    effectiveConfig,
    loadState,
    saveState,
    loadError,
    saveError,
    canSave,
    permissionState,
    permissionError,
    backendMode,
    lastLoadedAt,
    lastSavedAt,
    configVersion,
  } = usePublicEdit()

  const [copied, setCopied] = useState(false)
  const [tokenInput, setTokenInput] = useState(getSavedAdminToken())

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
      xs: { fontSize: '0.9rem', lineHeight: '1.1', maxWidth: '56ch', letterSpacing: '0em', textTransform: 'none' },
      sm: { fontSize: '1.1rem', lineHeight: '1.2', maxWidth: '54ch', letterSpacing: '0em', textTransform: 'none' },
      md: { fontSize: '1.4rem', lineHeight: '1.2', maxWidth: '48ch', letterSpacing: '0em', textTransform: 'none' },
      lg: { fontSize: '1.9rem', lineHeight: '1.05', maxWidth: '26ch', letterSpacing: '0em', textTransform: 'none' },
      xl: { fontSize: '2.6rem', lineHeight: '0.95', maxWidth: '18ch', letterSpacing: '-0.01em', textTransform: 'none' },
      stamp: { fontSize: '1.45rem', lineHeight: '1', maxWidth: '40ch', letterSpacing: '0.04em', textTransform: 'uppercase' },
    }

    updateStyle(selectedField, presets[kind] || presets.md)
  }

  function cycleTextTransform() {
    if (!selectedField) return
    const current = selectedStyles.textTransform || 'none'
    const next =
      current === 'none'
        ? 'uppercase'
        : current === 'uppercase'
          ? 'lowercase'
          : current === 'lowercase'
            ? 'capitalize'
            : 'none'

    updateStyle(selectedField, { textTransform: next })
  }

  if (!isAdmin || !isEditing) return null

  return (
    <aside className="public-edit-panel">
      <div className="public-edit-panel__topline">
        <div className="public-edit-panel__eyebrow">live site editor</div>
        <div className="public-edit-panel__badge">{changedFields.length} dirty</div>
      </div>

      <div className="public-edit-panel__status-grid">
        <div className="public-edit-panel__status">
          <span>backend</span>
          <strong>{backendMode}</strong>
        </div>

        <div className="public-edit-panel__status">
          <span>version</span>
          <strong>v{configVersion}</strong>
        </div>

        <div className="public-edit-panel__status">
          <span>load</span>
          <strong>{loadState}</strong>
        </div>

        <div className="public-edit-panel__status">
          <span>save</span>
          <strong>{saveState}</strong>
        </div>

        <div className="public-edit-panel__status">
          <span>perm</span>
          <strong>{canSave ? 'can save' : 'read only'}</strong>
        </div>

        <div className="public-edit-panel__status">
          <span>draft fields</span>
          <strong>{draftStats.totalCount}</strong>
        </div>
      </div>

      {loadError ? <div className="public-edit-panel__error">{loadError}</div> : null}
      {saveError ? <div className="public-edit-panel__error">{saveError}</div> : null}
      {permissionError ? <div className="public-edit-panel__error">{permissionError}</div> : null}

      <div className="public-edit-panel__summary-grid">
        <div className="public-edit-panel__summary-card">
          <span>saved config</span>
          <strong>{savedStats.textCount} text / {savedStats.styleCount} styles / {savedStats.blockCount} blocks</strong>
        </div>
        <div className="public-edit-panel__summary-card">
          <span>draft overlay</span>
          <strong>{draftStats.textCount} text / {draftStats.styleCount} styles</strong>
        </div>
        <div className="public-edit-panel__summary-card">
          <span>effective config</span>
          <strong>{effectiveStats.textCount} text / {effectiveStats.styleCount} styles / {effectiveStats.blockCount} blocks</strong>
        </div>
        <div className="public-edit-panel__summary-card">
          <span>change split</span>
          <strong>{changedTextFields.length} text / {changedStyleFields.length} style</strong>
        </div>
      </div>

      <label className="public-edit-panel__control">
        <span>admin token</span>
        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="paste SABOT_ADMIN_TOKEN"
        />
      </label>

      <div className="public-edit-panel__actions public-edit-panel__actions--two">
        <button
          className="button"
          type="button"
          onClick={() => {
            setSavedAdminToken(tokenInput.trim())
            window.location.reload()
          }}
        >
          save token + reload
        </button>

        <button className="button" type="button" onClick={reloadFromBackend}>
          reload backend
        </button>
      </div>

      {lastLoadedAt || lastSavedAt ? (
        <div className="public-edit-panel__timestamps">
          {lastLoadedAt ? <div><span>last loaded</span><strong>{lastLoadedAt}</strong></div> : null}
          {lastSavedAt ? <div><span>last saved</span><strong>{lastSavedAt}</strong></div> : null}
        </div>
      ) : null}

      {selectedField ? (
        <>
          <div className="public-edit-panel__field-wrap">
            <span className="public-edit-panel__field-label">selected field</span>
            <div className="public-edit-panel__field">{selectedField}</div>
          </div>

          <div className="public-edit-panel__presets">
            <button className="button" type="button" onClick={() => applyPreset('xs')}>xs</button>
            <button className="button" type="button" onClick={() => applyPreset('sm')}>sm</button>
            <button className="button" type="button" onClick={() => applyPreset('md')}>md</button>
            <button className="button" type="button" onClick={() => applyPreset('lg')}>lg</button>
            <button className="button" type="button" onClick={() => applyPreset('xl')}>xl</button>
            <button className="button" type="button" onClick={() => applyPreset('stamp')}>stamp</button>
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
              max="80"
              step="1"
              value={parseFloat(String(selectedStyles.maxWidth || '24').replace('ch', ''))}
              onChange={(e) => updateStyle(selectedField, { maxWidth: `${e.target.value}ch` })}
            />
            <strong>{selectedStyles.maxWidth || 'default'}</strong>
          </label>

          <label className="public-edit-panel__control">
            <span>letter spacing</span>
            <input
              type="range"
              min="-0.08"
              max="0.12"
              step="0.005"
              value={parseFloat(String(selectedStyles.letterSpacing || '0').replace('em', ''))}
              onChange={(e) => updateStyle(selectedField, { letterSpacing: `${e.target.value}em` })}
            />
            <strong>{selectedStyles.letterSpacing || 'default'}</strong>
          </label>

          <div className="public-edit-panel__actions public-edit-panel__actions--two">
            <button className="button" type="button" onClick={cycleTextTransform}>
              transform: {selectedStyles.textTransform || 'none'}
            </button>

            <button className="button button--primary" type="button" onClick={() => resetField(selectedField)}>
              reset field
            </button>
          </div>
        </>
      ) : (
        <p className="public-edit-panel__empty">Select an editable text block on the page.</p>
      )}

      <div className="public-edit-panel__changed-list">
        {changedFields.length ? (
          changedFields.slice(0, 12).map((field) => (
            <span key={field} className="public-edit-panel__changed-chip">{field}</span>
          ))
        ) : (
          <span className="public-edit-panel__changed-chip public-edit-panel__changed-chip--empty">no unsaved fields</span>
        )}
      </div>

      <div className="public-edit-panel__actions public-edit-panel__actions--stack">
        <button className="button" type="button" onClick={discardDraftAndReload} disabled={!hasDraftChanges}>
          discard draft + reload backend
        </button>
        <button className="button button--primary" type="button" onClick={applyDraftLocally}>
          apply locally
        </button>
        <button className="button button--primary" type="button" onClick={saveDraftToBackend} disabled={!canSave || !hasDraftChanges}>
          save to backend
        </button>
        <button className="button button--primary" type="button" onClick={handleCopyDraft}>
          {copied ? 'copied payload' : 'copy changed-only payload'}
        </button>
        <button className="button" type="button" onClick={clearDraft} disabled={!hasDraftChanges}>
          clear draft
        </button>
        <button className="button" type="button" onClick={clearSavedConfig}>
          reset saved config
        </button>
      </div>
    </aside>
  )
}
