import { useEffect, useRef, useState } from 'react'

export function PodcastHostingPanel({ show }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [days, setDays] = useState(30)
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

  const cutoff = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)
  const rows = (data?.analytics || []).filter(row => row.day >= cutoff)
  const stats = new Map()
  for (const row of rows) {
    const value = stats.get(row.episode_id) || { clients: 0, requests: 0 }
    value.clients += Number(row.clients)
    value.requests += Number(row.requests)
    stats.set(row.episode_id, value)
  }
  const native = data?.show.hostingMode === 'native'

  return <section className="wp-meta-box">
    <h2>{show.podcastTitle}: Hosting &amp; Analytics</h2>
    {error ? <p role="alert" className="notice notice-error">{error}</p> : null}
    {!data ? <p>Loading hosting status…</p> : <>
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
      <h3>Download requests</h3>
      <p className="description">Requests reaching SabotPress, including podcast apps. Repeat range requests are grouped by episode, client and UTC day. Daily client totals are estimates, not unique people or confirmed listens. Preloads and app downloads can count; app caches can hide listening. Known bots and HEAD checks are excluded. No raw IP addresses are saved. Reports retain 90 days; Acast history is not included.</p>
      <label>Period <select value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>{' '}
      <button type="button" className="button" disabled={busy} onClick={() => request().catch(e => setError(e.message))}>Refresh</button>
      <div className="wp-list-table-wrap"><table className="content-table wp-posts-table">
        <thead><tr><th>Episode</th><th>Daily client total</th><th>Requests</th></tr></thead>
        <tbody>{data.episodes.map(episode => <tr key={episode.id}><td>{episode.title}</td><td>{stats.get(episode.id)?.clients || 0}</td><td>{stats.get(episode.id)?.requests || 0}</td></tr>)}</tbody>
      </table></div>
    </>}
  </section>
}
