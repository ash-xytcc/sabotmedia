import { useMemo, useState } from 'react'
import { usePublicEdit } from './PublicEditContext'
import { EditableText } from './EditableText'
import { buildChangedOnlyPayload } from '../lib/publicDraftExport'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { getConfiguredBlock, getConfiguredText } from '../lib/publicConfig'

export function AdminPublicConfigCard() {
  const {
    canSave,
    backendMode,
    changedFields,
    changedTextFields,
    changedStyleFields,
    draft,
    draftStats,
    savedStats,
    effectiveStats,
    hasDraftChanges,
    loadState,
    saveState,
    lastLoadedAt,
    lastSavedAt,
    applyDraftLocally,
    saveDraftToBackend,
    reloadFromBackend,
    discardDraftAndReload,
    clearSavedConfig,
  } = usePublicEdit()

  const [copied, setCopied] = useState(false)
  const resolvedConfig = useResolvedConfig()
  const block = getConfiguredBlock(resolvedConfig, 'admin.publicEditor')

  const eyebrow = getConfiguredText(resolvedConfig, block?.eyebrowField || 'admin.publicEditor.eyebrow', 'public editor')
  const title = getConfiguredText(resolvedConfig, block?.titleField || 'admin.publicEditor.title', 'Public Site Config')
  const description = getConfiguredText(resolvedConfig, block?.descriptionField || 'admin.publicEditor.description', 'Control the saved public-facing site configuration from the admin surface without leaving the operational workspace.')
  const savedStatsLabel = getConfiguredText(resolvedConfig, block?.savedStatsLabelField || 'admin.publicEditor.savedStatsLabel', 'saved config')
  const draftStatsLabel = getConfiguredText(resolvedConfig, block?.draftStatsLabelField || 'admin.publicEditor.draftStatsLabel', 'draft overlay')
  const effectiveStatsLabel = getConfiguredText(resolvedConfig, block?.effectiveStatsLabelField || 'admin.publicEditor.effectiveStatsLabel', 'effective config')
  const dirtyLabel = getConfiguredText(resolvedConfig, block?.dirtyLabelField || 'admin.publicEditor.dirtyLabel', 'dirty fields')
  const loadLabel = getConfiguredText(resolvedConfig, block?.loadLabelField || 'admin.publicEditor.loadLabel', 'load')
  const saveLabel = getConfiguredText(resolvedConfig, block?.saveLabelField || 'admin.publicEditor.saveLabel', 'save')
  const permissionLabel = getConfiguredText(resolvedConfig, block?.permissionLabelField || 'admin.publicEditor.permissionLabel', 'permission')
  const backendLabel = getConfiguredText(resolvedConfig, block?.backendLabelField || 'admin.publicEditor.backendLabel', 'backend')
  const canSaveYes = getConfiguredText(resolvedConfig, block?.canSaveYesField || 'admin.publicEditor.canSaveYes', 'can save')
  const canSaveNo = getConfiguredText(resolvedConfig, block?.canSaveNoField || 'admin.publicEditor.canSaveNo', 'read only')
  const reloadAction = getConfiguredText(resolvedConfig, block?.reloadActionField || 'admin.publicEditor.reloadAction', 'reload backend')
  const discardAction = getConfiguredText(resolvedConfig, block?.discardActionField || 'admin.publicEditor.discardAction', 'discard draft + reload')
  const applyLocalAction = getConfiguredText(resolvedConfig, block?.applyLocalActionField || 'admin.publicEditor.applyLocalAction', 'apply locally')
  const saveBackendAction = getConfiguredText(resolvedConfig, block?.saveBackendActionField || 'admin.publicEditor.saveBackendAction', 'save to backend')
  const copyAction = getConfiguredText(resolvedConfig, block?.copyActionField || 'admin.publicEditor.copyAction', 'copy changed-only payload')
  const resetSavedAction = getConfiguredText(resolvedConfig, block?.resetSavedActionField || 'admin.publicEditor.resetSavedAction', 'reset saved config')
  const noDirty = getConfiguredText(resolvedConfig, block?.noDirtyField || 'admin.publicEditor.noDirty', 'no unsaved fields')
  const lastLoadedLabel = getConfiguredText(resolvedConfig, block?.lastLoadedLabelField || 'admin.publicEditor.lastLoadedLabel', 'last loaded')
  const lastSavedLabel = getConfiguredText(resolvedConfig, block?.lastSavedLabelField || 'admin.publicEditor.lastSavedLabel', 'last saved')

  const payload = useMemo(() => buildChangedOnlyPayload(draft), [draft])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="admin-public-config-card">
      <div className="admin-public-config-card__header">
        <EditableText as="div" className="admin-public-config-card__eyebrow" field={block?.eyebrowField || 'admin.publicEditor.eyebrow'}>
          {eyebrow}
        </EditableText>
        <EditableText as="h2" field={block?.titleField || 'admin.publicEditor.title'}>
          {title}
        </EditableText>
        <EditableText as="p" className="admin-public-config-card__description" field={block?.descriptionField || 'admin.publicEditor.description'}>
          {description}
        </EditableText>
      </div>

      <div className="admin-public-config-card__status">
        <span>{backendLabel}: <strong>{backendMode}</strong></span>
        <span>{loadLabel}: <strong>{loadState}</strong></span>
        <span>{saveLabel}: <strong>{saveState}</strong></span>
        <span>{permissionLabel}: <strong>{canSave ? canSaveYes : canSaveNo}</strong></span>
      </div>

      <div className="review-summary-grid">
        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">{savedStatsLabel}</div>
          <ul>
            <li><span>text</span><strong>{savedStats.textCount}</strong></li>
            <li><span>styles</span><strong>{savedStats.styleCount}</strong></li>
            <li><span>blocks</span><strong>{savedStats.blockCount}</strong></li>
          </ul>
        </article>

        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">{draftStatsLabel}</div>
          <ul>
            <li><span>text</span><strong>{draftStats.textCount}</strong></li>
            <li><span>styles</span><strong>{draftStats.styleCount}</strong></li>
            <li><span>{dirtyLabel}</span><strong>{draftStats.totalCount}</strong></li>
          </ul>
        </article>

        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">{effectiveStatsLabel}</div>
          <ul>
            <li><span>text</span><strong>{effectiveStats.textCount}</strong></li>
            <li><span>styles</span><strong>{effectiveStats.styleCount}</strong></li>
            <li><span>blocks</span><strong>{effectiveStats.blockCount}</strong></li>
          </ul>
        </article>

        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">{dirtyLabel}</div>
          <ul>
            <li><span>text fields</span><strong>{changedTextFields.length}</strong></li>
            <li><span>style fields</span><strong>{changedStyleFields.length}</strong></li>
            <li><span>status</span><strong>{hasDraftChanges ? `${changedFields.length} dirty` : noDirty}</strong></li>
          </ul>
        </article>
      </div>

      <div className="admin-public-config-card__timestamps">
        {lastLoadedAt ? <span>{lastLoadedLabel}: <strong>{lastLoadedAt}</strong></span> : null}
        {lastSavedAt ? <span>{lastSavedLabel}: <strong>{lastSavedAt}</strong></span> : null}
      </div>

      <div className="admin-public-config-card__chips">
        {changedFields.length ? changedFields.slice(0, 18).map((field) => (
          <span key={field} className="public-edit-panel__changed-chip">{field}</span>
        )) : (
          <span className="public-edit-panel__changed-chip public-edit-panel__changed-chip--empty">{noDirty}</span>
        )}
      </div>

      <div className="admin-public-config-card__actions">
        <button className="button" type="button" onClick={reloadFromBackend}>
          {reloadAction}
        </button>
        <button className="button" type="button" onClick={discardDraftAndReload} disabled={!hasDraftChanges}>
          {discardAction}
        </button>
        <button className="button button--primary" type="button" onClick={applyDraftLocally}>
          {applyLocalAction}
        </button>
        <button className="button button--primary" type="button" onClick={saveDraftToBackend} disabled={!canSave || !hasDraftChanges}>
          {saveBackendAction}
        </button>
        <button className="button button--primary" type="button" onClick={handleCopy}>
          {copied ? 'copied payload' : copyAction}
        </button>
        <button className="button" type="button" onClick={clearSavedConfig}>
          {resetSavedAction}
        </button>
      </div>
    </section>
  )
}
