import { useEffect, useRef, useState } from 'react'

function utcDayOffset(offset = 0) {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
}

function formatDay(day) {
  if (!day) return '—'
  const date = new Date(`${day}T00:00:00Z`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function pluralize(value, singular, plural = `${singular}s`) {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`
}

export function PodcastHostingPanel({ show }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [days, setDays] = useState(7)
  const stop = useRef(false)
  const showId = show.id || show.slug

  async function request(action) {
    const response = await fetch(`/api/podcasts/hosting?show=${encodeURIComponent(showId)}`, {
      method: action ? 'POST' : 'GET', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      ...(action ? { body: JSON.stringify({ showId, action }) } : {}),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) throw new Error(result.error || 'Podcast hosting request failed')
    setData(result)
    return result
  }

  useEffect(() => {
    stop.current = false
    request().catch(e => setError(e.message))
    return () => { stop.current = true }
  }, [showId])

  async function move() {
    setBusy(true)
    setError('')
    stop.current = false
    try {
      let next = await request(data?.show.hostingMode === 'migrating' ? 'next' : 'start')
      while (!stop.current && (next.pending.length || !next.show.hostingInventoryComplete)) next = await request('next')
      if (!stop.current) await request('finish')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const analytics = data?.analytics || []
  const today = utcDayOffset(0)
  const yesterday = utcDayOffset(-1)
  const selectedCutoff = utcDayOffset(-(days - 1))
  const sevenDayCutoff = utcDayOffset(-6)
  const thirtyDayCutoff = utcDayOffset(-29)

  function totalClientsSince(cutoff) {
    return analytics.reduce((total, row) => total + (row.day >= cutoff ? Number(row.clients || 0) : 0), 0)
  }

  function totalClientsFor(day) {
    return analytics.reduce((total, row) => total + (row.day === day ? Number(row.clients || 0) : 0), 0)
  }

  const todayDownloads = totalClientsFor(today)
  const yesterdayDownloads = totalClientsFor(yesterday)
  const sevenDayDownloads = totalClientsSince(sevenDayCutoff)
  const thirtyDayDownloads = totalClientsSince(thirtyDayCutoff)

  const dailyStats = new Map()
  const episodeStats = new Map()
  for (const row of analytics) {
    if (row.day < selectedCutoff) continue

    const daily = dailyStats.get(row.day) || { downloads: 0, requests: 0 }
    daily.downloads += Number(row.clients || 0)
    daily.requests += Number(row.requests || 0)
    dailyStats.set(row.day, daily)

    const episode = episodeStats.get(row.episode_id) || { downloads: 0, requests: 0, today: 0 }
    episode.downloads += Number(row.clients || 0)
    episode.requests += Number(row.requests || 0)
    if (row.day === today) episode.today += Number(row.clients || 0)
    episodeStats.set(row.episode_id, episode)
  }

  const dailyRows = []
  for (let offset = 0; offset > -days; offset -= 1) {
    const day = utcDayOffset(offset)
    const stat = dailyStats.get(day) || { downloads: 0, requests: 0 }
    dailyRows.push({ day, ...stat })
  }

  const rankedEpisodes = (data?.episodes || [])
    .map(episode => ({ ...episode, ...(episodeStats.get(episode.id) || { downloads: 0, requests: 0, today: 0 }) }))
    .sort((a, b) => b.downloads - a.downloads || b.today - a.today || a.title.localeCompare(b.title))

  const native = data?.show.hostingMode === 'native'

  return <section className="wp-meta-box podcast-analytics-panel">
    <div className="podcast-analytics-header">
      <div>
        <h2>{show.podcastTitle}: Analytics</h2>
        <p className="description">Daily download estimates from Sabot-hosted podcast audio. Days use UTC.</p>
      </div>
      <button type="button" className="button" disabled={busy} onClick={() => request().catch(e => setError(e.message))}>Refresh</button>
    </div>

    {error ? <p role="alert" className="notice notice-error">{error}</p> : null}
    {!data ? <p>Loading podcast analytics…</p> : <>
      <div className="podcast-analytics-summary" aria-label="Podcast download summary">
        <article className="podcast-analytics-hero">
          <span>Downloads today</span>
          <strong>{todayDownloads.toLocaleString()}</strong>
          <small>{formatDay(today)} UTC</small>
        </article>
        <article className="podcast-analytics-kpi">
          <span>Yesterday</span>
          <strong>{yesterdayDownloads.toLocaleString()}</strong>
          <small>{formatDay(yesterday)} UTC</small>
        </article>
        <article className="podcast-analytics-kpi">
          <span>Last 7 days</span>
          <strong>{sevenDayDownloads.toLocaleString()}</strong>
          <small>Estimated downloads</small>
        </article>
        <article className="podcast-analytics-kpi">
          <span>Last 30 days</span>
          <strong>{thirtyDayDownloads.toLocaleString()}</strong>
          <small>Estimated downloads</small>
        </article>
      </div>

      <div className="podcast-analytics-range" aria-label="Analytics period">
        <span>Show detail for</span>
        <div>
          {[7, 30, 90].map(period => <button
            key={period}
            type="button"
            className={`button ${days === period ? 'button--primary' : ''}`}
            aria-pressed={days === period}
            onClick={() => setDays(period)}
          >{period} days</button>)}
        </div>
      </div>

      <div className="podcast-analytics-layout">
        <section className="podcast-analytics-card">
          <div className="podcast-analytics-card__header">
            <div>
              <h3>Daily totals</h3>
              <p className="description">All episodes combined.</p>
            </div>
            <strong>{pluralize(dailyRows.reduce((sum, row) => sum + row.downloads, 0), 'download')}</strong>
          </div>
          <ol className="podcast-daily-list">
            {dailyRows.map((row, index) => <li key={row.day}>
              <div>
                <strong>{index === 0 ? 'Today' : index === 1 ? 'Yesterday' : formatDay(row.day)}</strong>
                <span>{row.day}</span>
              </div>
              <div className="podcast-daily-list__numbers">
                <strong>{row.downloads.toLocaleString()}</strong>
                <span>{pluralize(row.requests, 'request')}</span>
              </div>
            </li>)}
          </ol>
        </section>

        <section className="podcast-analytics-card">
          <div className="podcast-analytics-card__header">
            <div>
              <h3>Episodes</h3>
              <p className="description">Ranked by downloads in the selected period.</p>
            </div>
            <strong>{days} days</strong>
          </div>
          <ol className="podcast-episode-ranking">
            {rankedEpisodes.length ? rankedEpisodes.map((episode, index) => <li key={episode.id}>
              <span className="podcast-episode-ranking__rank">{index + 1}</span>
              <div className="podcast-episode-ranking__title">
                <strong>{episode.title}</strong>
                <span>{episode.today.toLocaleString()} today · {episode.requests.toLocaleString()} requests</span>
              </div>
              <strong className="podcast-episode-ranking__total">{episode.downloads.toLocaleString()}</strong>
            </li>) : <li className="podcast-analytics-empty">No episodes found.</li>}
          </ol>
        </section>
      </div>

      <p className="podcast-analytics-note">A “download” here is an estimated daily episode/client download bucket, not a confirmed human listen or an IAB-certified metric. Repeat range requests from the same episode/client/day are grouped. Known bots and HEAD checks are excluded; no raw IP addresses are saved. Data is retained for 90 days.</p>

      <details className="podcast-hosting-details">
        <summary>Hosting &amp; feed details</summary>
        <div className="podcast-hosting-details__body">
          <p><strong>{native ? 'Hosted by SabotPress' : data.show.hostingMode === 'migrating' ? 'Moving to SabotPress' : 'External audio hosting'}</strong> · {data.totalEpisodes} episodes · {data.pending.length} media references remaining</p>
          {!data.storageReady ? <p role="alert">Media storage is unavailable. Configure SABOT_MEDIA_BUCKET before migrating.</p> : null}
          {!native ? <>
            <p>Copy the complete source archive, audio and artwork into SabotPress. Existing episode identities and edits are preserved. External feed updates stop when migration starts. Keep this page open while files copy; you can pause and resume.</p>
            <button type="button" className="button button--primary" disabled={busy || !data.storageReady} onClick={move}>{busy ? 'Copying files…' : data.show.hostingMode === 'migrating' ? 'Resume migration' : 'Move hosting to SabotPress'}</button>
            {busy ? <button type="button" className="button" onClick={() => { stop.current = true }}>Pause after this file</button> : null}
            {busy && data.pending[0] ? <p role="status">Copying: {data.pending[0].title} ({data.pending[0].field})</p> : null}
            {data.missing.length ? <p role="alert">{data.missing.length} source episodes need to be restored before cutover.</p> : null}
          </> : <p>Publish new episodes here. The website player and RSS downloads use SabotPress audio delivery.</p>}
          <p>Feed: <a href={show.rssFeedUrl} target="_blank" rel="noreferrer">{show.rssFeedUrl}</a></p>
          {native && show.sourceFeedUrl ? <p><strong>Subscriber transfer:</strong> Set the old host’s permanent feed redirect to the Sabot feed above, then verify your existing podcast directory listings. Keep the old redirect active during the transition. This panel does not change your Acast account.</p> : null}
        </div>
      </details>
    </>}
  </section>
}
