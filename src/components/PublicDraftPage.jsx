import { useMemo, useState } from 'react'
import { usePublicEdit } from './PublicEditContext'
import { CopyButton } from './CopyButton'
import { buildPublicConfigPayload, buildChangedOnlyPayload } from '../lib/publicDraftExport'
import { savePublicConfigPayload } from '../lib/publicConfigApi'

export function PublicDraftPage() {
  const { draft, changedFields, clearDraft, loadState, saveState, loadError, saveError } = usePublicEdit()
  const fullPayload = useMemo(() => buildPublicConfigPayload(draft), [draft])
  const changedPayload = useMemo(() => buildChangedOnlyPayload(draft), [draft])

  const fullJson = JSON.stringify(fullPayload, null, 2)
  const changedJson = JSON.stringify(changedPayload, null, 2)

  const [mockSaveState, setMockSaveState] = useState('idle')

  async function handleMockSave() {
    try {
      setMockSaveState('saving')
      await savePublicConfigPayload(fullPayload)
      setMockSaveState('saved')
      window.setTimeout(() => setMockSaveState('idle'), 1500)
    } catch {
      setMockSaveState('error')
      window.setTimeout(() => setMockSaveState('idle'), 2000)
    }
  }

  return (
    <main className="page public-draft-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">inline edit / draft / export</div>
        <h1>Public Draft</h1>
        <p className="project-hero__description">
          Current browser-local inline edit draft for the public-facing site. This is the handoff layer before real persistence wiring.
        </p>
        <div className="project-hero__meta">
          <span>{changedFields.length} changed fields</span>
          <span>backend-ready payload shape</span>
          <span>load: {loadState}</span>
          <span>save: {saveState}</span>
        </div>
        {loadError ? <p className="review-card__excerpt">{loadError}</p> : null}
        {saveError ? <p className="review-card__excerpt">{saveError}</p> : null}
      </section>

      <section className="review-summary-grid">
        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">changed fields</div>
          {changedFields.length ? (
            <ul>
              {changedFields.map((field) => (
                <li key={field}><span>{field}</span></li>
              ))}
            </ul>
          ) : (
            <p className="review-card__excerpt">No local changes yet.</p>
          )}
        </article>

        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">actions</div>
          <div className="review-card__actions">
            <CopyButton text={changedJson} />
            <CopyButton text={fullJson} />
            <button className="button button--primary" type="button" onClick={handleMockSave}>
              {mockSaveState === 'saving' ? 'saving...' : mockSaveState === 'saved' ? 'saved' : mockSaveState === 'error' ? 'save error' : 'mock save'}
            </button>
            <button className="button" type="button" onClick={clearDraft}>clear local draft</button>
          </div>
        </article>
      </section>

      <section className="review-queue">
        <article className="review-card">
          <div className="review-card__meta">
            <span>export</span>
            <span>changed-only payload</span>
          </div>
          <pre className="review-card__snippet">{changedJson}</pre>
        </article>

        <article className="review-card">
          <div className="review-card__meta">
            <span>export</span>
            <span>full payload</span>
          </div>
          <pre className="review-card__snippet">{fullJson}</pre>
        </article>
      </section>
    </main>
  )
}
