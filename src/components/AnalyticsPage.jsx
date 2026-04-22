import { useEffect, useMemo, useState } from 'react'
import { fetchNativeEntries } from '../lib/nativePublicContentApi'
import { summarizeArchiveForAnalytics, summarizeNativeForAnalytics } from '../lib/migrationTools'

function SummaryList({ title, rows }) {
  return (
    <article className="review-summary-card">
      <div className="review-summary-card__eyebrow">{title}</div>
      <ul>
        {rows.map(([label, count]) => (
          <li key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function AnalyticsPage({ pieces }) {
  const [nativeItems, setNativeItems] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        setState('loading')
        setError('')
        const data = await fetchNativeEntries({ includeFuture: 1 })
        if (cancelled) return
        setNativeItems(Array.isArray(data?.items) ? data.items : [])
        setState('loaded')
      } catch (err) {
        if (cancelled) return
        setNativeItems([])
        setError(String(err?.message || err))
        setState('error')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const archiveSummary = useMemo(() => summarizeArchiveForAnalytics(pieces), [pieces])
  const nativeSummary = useMemo(() => summarizeNativeForAnalytics(nativeItems), [nativeItems])

  return (
    <main className="page analytics-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">analytics / reporting / editorial insight</div>
        <h1>Analytics</h1>
        <p className="project-hero__description">
          Lightweight internal reporting across archive and native content so editorial planning stops relying entirely on intuition, superstition, and whoever remembers the most.
        </p>
        <div className="project-hero__meta">
          <span>archive: {archiveSummary.total}</span>
          <span>native: {nativeSummary.total}</span>
          <span>native load: {state}</span>
        </div>
        {error ? <p className="review-card__excerpt">{error}</p> : null}
      </section>

      <section className="review-summary-grid">
        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">archive summary</div>
          <ul>
            <li><span>total</span><strong>{archiveSummary.total}</strong></li>
            <li><span>podcasts</span><strong>{archiveSummary.podcasts}</strong></li>
            <li><span>print-ready</span><strong>{archiveSummary.printReady}</strong></li>
            <li><span>needs review</span><strong>{archiveSummary.reviewFlagged}</strong></li>
          </ul>
        </article>

        <article className="review-summary-card">
          <div className="review-summary-card__eyebrow">native summary</div>
          <ul>
            <li><span>total</span><strong>{nativeSummary.total}</strong></li>
            <li><span>published</span><strong>{nativeSummary.published}</strong></li>
            <li><span>scheduled</span><strong>{nativeSummary.scheduled}</strong></li>
            <li><span>archived</span><strong>{nativeSummary.archived}</strong></li>
          </ul>
        </article>

        <SummaryList title="archive by project" rows={archiveSummary.byProject.slice(0, 12)} />
        <SummaryList title="archive by type" rows={archiveSummary.byType.slice(0, 12)} />
        <SummaryList title="native by target" rows={nativeSummary.byTarget.slice(0, 12)} />
        <SummaryList title="native by workflow" rows={nativeSummary.byWorkflow.slice(0, 12)} />
      </section>
    </main>
  )
}
