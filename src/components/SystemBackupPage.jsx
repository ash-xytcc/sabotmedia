import { useState } from 'react'
import { downloadSnapshot, exportSystemSnapshot, summarizeSnapshot } from '../lib/systemBackup'

export function SystemBackupPage() {
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  async function handleExport() {
    try {
      setState('loading')
      setError('')
      const snapshot = await exportSystemSnapshot()
      setSummary(summarizeSnapshot(snapshot))
      downloadSnapshot(snapshot)
      setState('done')
    } catch (err) {
      setError(String(err?.message || err))
      setState('error')
    }
  }

  return (
    <main className="page system-backup-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">backup / recovery / export</div>
        <h1>System Backup</h1>
        <p className="project-hero__description">
          Export a pragmatic system snapshot covering native content, revisions, taxonomy, roles, and audit data. Because eventually somebody will swear nothing changed right after changing everything.
        </p>
        <div className="project-hero__meta">
          <span>status: {state}</span>
        </div>
        {error ? <p className="review-card__excerpt">{error}</p> : null}
      </section>

      <section className="review-summary-card">
        <div className="review-summary-card__eyebrow">export snapshot</div>
        <div className="review-card__actions">
          <button className="button button--primary" type="button" onClick={handleExport}>
            export full system snapshot
          </button>
        </div>
      </section>

      {summary ? (
        <section className="review-summary-grid">
          <article className="review-summary-card">
            <div className="review-summary-card__eyebrow">snapshot summary</div>
            <ul>
              <li><span>native content</span><strong>{summary.nativeCount}</strong></li>
              <li><span>revisions</span><strong>{summary.revisionCount}</strong></li>
              <li><span>taxonomy terms</span><strong>{summary.taxonomyCount}</strong></li>
              <li><span>editor roles</span><strong>{summary.roleCount}</strong></li>
              <li><span>audit events</span><strong>{summary.auditCount}</strong></li>
            </ul>
          </article>
        </section>
      ) : null}
    </main>
  )
}
