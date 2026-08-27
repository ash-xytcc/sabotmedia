import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAnalyticsReport } from '../lib/analyticsApi'

function TrafficGraph({ points = [] }) {
  const width = 640
  const height = 210
  const minX = 20
  const maxX = width - 20
  const minY = 24
  const maxY = height - 32
  const maxViews = Math.max(...points.map((point) => Number(point.views || 0)), 1)
  const pathData = points.map((point, index) => {
    const x = minX + ((maxX - minX) * index) / (points.length - 1 || 1)
    const y = maxY - ((maxY - minY) * Number(point.views || 0)) / maxViews
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
  const labels = points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 6) === 0)

  return (
    <div className="wp-analytics-graph" role="img" aria-label="Actual page views over time">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1={minX} y1={maxY} x2={maxX} y2={maxY} className="wp-analytics-graph__axis" />
        {pathData ? <path d={pathData} className="wp-analytics-graph__line" /> : null}
      </svg>
      <div className="wp-analytics-graph__labels">
        {labels.map((point) => <span key={point.day}>{formatDay(point.day)}</span>)}
      </div>
    </div>
  )
}

export function WpAnalyticsWidgets({ pieces = [], compact = false }) {
  const [days, setDays] = useState(compact ? 7 : 30)
  const [analytics, setAnalytics] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setState('loading')
      setError('')
      setAnalytics(await fetchAnalyticsReport(days))
      setState('loaded')
    } catch (nextError) {
      setAnalytics(null)
      setError(String(nextError?.message || nextError))
      setState('error')
    }
  }, [days])

  useEffect(() => { load() }, [load])

  const publishedPosts = useMemo(() => pieces.filter((piece) => piece.publishedAt).length, [pieces])
  const summary = analytics?.summary || {}
  const realtime = analytics?.realtime || {}

  return (
    <section className="wp-dashboard-grid wp-dashboard-grid--analytics">
      {!compact ? (
        <div className="wp-analytics-toolbar wp-meta-box wp-meta-box--wide">
          <div>
            <strong>Traffic period</strong>
            <span>{analytics?.generatedAt ? ` Updated ${formatTime(analytics.generatedAt)}` : ''}</span>
          </div>
          <div className="wp-analytics-periods" aria-label="Analytics reporting period">
            {[7, 30, 90].map((period) => (
              <button key={period} type="button" className={`button${days === period ? ' button--primary' : ''}`} onClick={() => setDays(period)}>
                {period} days
              </button>
            ))}
            <button type="button" className="button" onClick={load}>Refresh</button>
          </div>
        </div>
      ) : null}

      {state === 'error' ? (
        <article className="wp-meta-box wp-meta-box--wide wp-meta-box--notice">
          <h2>Analytics unavailable</h2>
          <p>{error}</p>
          <button type="button" className="button" onClick={load}>Try again</button>
        </article>
      ) : null}

      <Metric title="Views Today" value={summary.views_today} loading={state === 'loading'} />
      <Metric title="Visitors Today" value={summary.visitors_today} loading={state === 'loading'} />
      <Metric title={`Views · ${days}d`} value={summary.views} loading={state === 'loading'} />
      <Metric title="Active · 30 min" value={realtime.visitors} loading={state === 'loading'} />

      {!compact ? <Metric title="Published Posts" value={publishedPosts} loading={false} /> : null}

      <article className="wp-meta-box wp-meta-box--wide">
        <h2>Traffic</h2>
        {analytics?.daily?.length ? <TrafficGraph points={fillDays(analytics.daily, days)} /> : <Empty loading={state === 'loading'} />}
      </article>

      <article className="wp-meta-box wp-meta-box--wide">
        <h2>Top Pages</h2>
        {analytics?.topPages?.length ? (
          <ol className="wp-analytics-list">
            {analytics.topPages.map((page) => (
              <li key={page.path}>
                <Link to={page.path}>{page.title || labelPath(page.path)}</Link>
                <strong>{number(page.views)} views · {number(page.visitors)} visitors</strong>
              </li>
            ))}
          </ol>
        ) : <Empty loading={state === 'loading'} />}
      </article>

      {!compact ? (
        <>
          <Breakdown title="Referrers" rows={analytics?.referrers} labelKey="referrer" empty="No external referrers recorded yet." />
          <Breakdown title="Campaigns" rows={analytics?.campaigns} empty="Campaign-tagged links will appear here." />
          <Breakdown title="Devices" rows={analytics?.devices} />
          <Breakdown title="Browsers" rows={analytics?.browsers} />
          <Breakdown title="Countries" rows={analytics?.countries} empty="Countries appear after at least three views." />
          <article className="wp-meta-box wp-meta-box--wide wp-meta-box--notice">
            <h2>Real first-party data</h2>
            <p>
              Counts public page views and browser-tab sessions from Sabot Media itself. No advertising ID, fingerprint, cookie, or IP address is stored. Do Not Track and Global Privacy Control are respected. Data begins accumulating after this release; earlier traffic cannot be reconstructed.
            </p>
          </article>
        </>
      ) : null}
    </section>
  )
}

function Metric({ title, value, loading }) {
  return (
    <article className="wp-meta-box wp-meta-box--stat">
      <h2>{title}</h2>
      <p className="wp-metric">{loading && value == null ? '—' : number(value)}</p>
    </article>
  )
}

function Breakdown({ title, rows = [], labelKey = 'label', empty = 'No data recorded yet.' }) {
  const safeRows = Array.isArray(rows) ? rows : []
  const total = safeRows.reduce((sum, row) => sum + Number(row.views || 0), 0)
  return (
    <article className="wp-meta-box wp-meta-box--wide">
      <h2>{title}</h2>
      {safeRows.length ? (
        <ul className="wp-analytics-breakdown">
          {safeRows.map((row) => (
            <li key={row[labelKey]}>
              <span>{row[labelKey] || 'Unknown'}</span>
              <span className="wp-analytics-breakdown__bar"><i style={{ width: `${Math.max(2, (Number(row.views || 0) / Math.max(total, 1)) * 100)}%` }} /></span>
              <strong>{number(row.views)}</strong>
            </li>
          ))}
        </ul>
      ) : <p>{empty}</p>}
    </article>
  )
}

function Empty({ loading }) {
  return <p>{loading ? 'Loading real traffic data…' : 'No traffic recorded for this period yet.'}</p>
}

function number(value) {
  return Number(value || 0).toLocaleString()
}

function formatDay(value) {
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : value
}

function formatTime(value) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
}

function labelPath(path) {
  return path === '/' ? 'Homepage' : path.replace(/^\//, '').replace(/[-/]+/g, ' ')
}

function fillDays(rows, days) {
  const byDay = new Map(rows.map((row) => [row.day, row]))
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - (days - offset - 1))
    const day = date.toISOString().slice(0, 10)
    return byDay.get(day) || { day, views: 0, visitors: 0 }
  })
}
