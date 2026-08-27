import { downloadSnapshot, exportSystemSnapshot, summarizeSnapshot } from '../lib/systemBackup'
import { useState } from 'react'
import { AdminFrame } from './AdminRail'

export function SystemBackupPage() {
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  async function handleExport() {
    try {
      setState('loading')
      setError('')
      setSummary(null)
      const snapshot = await exportSystemSnapshot()
      const nextSummary = summarizeSnapshot(snapshot)
      if (!nextSummary.complete) throw new Error('Backup manifest is incomplete')
      setSummary(nextSummary)
      downloadSnapshot(snapshot)
      setState('done')
    } catch (err) {
      setError(String(err?.message || err))
      setState('error')
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen system-backup-page">
        <div className="wp-screen-header">
          <div>
            <h1>System Backup</h1>
            <p className="description">
              Export a verified server snapshot of SabotPress data. The download is withheld if any required dataset fails to load.
            </p>
          </div>
          <span className="description" role="status">status: {state}</span>
        </div>

        {error ? (
          <div className="notice notice-error" role="alert">
            <p><strong>Backup failed:</strong> {error}</p>
            <p>No incomplete snapshot was downloaded. Check Site Health and retry after the reported backend problem is fixed.</p>
          </div>
        ) : null}

        <section className="review-summary-card">
          <div className="review-summary-card__eyebrow">verified export</div>
          <p>Includes native content and revisions, taxonomy, editor-role records, audit events, media metadata, collections, publications, and public-site configuration.</p>
          <div className="review-card__actions">
            <button className="button button--primary" type="button" onClick={handleExport} disabled={state === 'loading'}>
              {state === 'loading' ? 'Building verified snapshot…' : 'Export server snapshot'}
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
                <li><span>media assets</span><strong>{summary.mediaCount}</strong></li>
                <li><span>collections</span><strong>{summary.collectionCount}</strong></li>
                <li><span>publications</span><strong>{summary.publicationCount}</strong></li>
                <li><span>manifest</span><strong>{summary.complete ? 'complete' : 'incomplete'}</strong></li>
              </ul>
            </article>
          </section>
        ) : null}
      </main>
    </AdminFrame>
  )
}
