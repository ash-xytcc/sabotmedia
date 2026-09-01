import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { loadPodcastSettings, loadPodcastSettingsAsync } from '../lib/podcastSettings'
import { adminRoutes } from '../routing/routes'

function toDisplayDate(value) {
  const d = new Date(String(value || ''))
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString()
}

export function PodcastAdminPage() {
  const [nativeItems, setNativeItems] = useState([])
  const [podcastSettings, setPodcastSettings] = useState(() => loadPodcastSettings())

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const [loadedItems, loadedSettings] = await Promise.allSettled([
        loadNativeCollection({ includeFuture: 1 }),
        loadPodcastSettingsAsync(),
      ])

      if (cancelled) return
      if (loadedItems.status === 'fulfilled') {
        setNativeItems(Array.isArray(loadedItems.value) ? loadedItems.value : [])
      }
      if (loadedSettings.status === 'fulfilled') {
        setPodcastSettings(loadedSettings.value)
      }
    }

    boot()
    return () => { cancelled = true }
  }, [])

  // The canonical podcast feed is backed by native D1 podcast entries. Do not
  // merge the legacy static archive here: that archive includes audio/podcast
  // material from other shows and would make this page look like one giant feed.
  const episodes = useMemo(
    () => nativeItems
      .filter((item) => item.contentType === 'podcast')
      .map((item) => ({ ...item, source: 'native' }))
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()),
    [nativeItems]
  )

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Podcast Episodes</h1>
            <p className="description">Manage episodes, migrate an existing RSS archive, and publish the canonical Sabot podcast feed.</p>
          </div>
          <div className="review-card__actions">
            <Link className="button" to={adminRoutes.podcastSettings}>Podcast Settings / Import RSS</Link>
            <a className="button" href="/feeds/podcasts/all.xml" target="_blank" rel="noreferrer">Open RSS Feed</a>
            <Link className="button button--primary" to={`${adminRoutes.nativeBridge}?new=podcast`}>Add Episode</Link>
          </div>
        </div>

        <section className="wp-meta-box">
          <h2>Current Feed Configuration</h2>
          <table className="content-table wp-posts-table">
            <tbody>
              <tr><th>Podcast title</th><td>{podcastSettings.podcastTitle || '—'}</td></tr>
              <tr><th>Author</th><td>{podcastSettings.author || '—'}</td></tr>
              <tr><th>RSS feed URL</th><td><a href={podcastSettings.rssFeedUrl || '/feeds/podcasts/all.xml'} target="_blank" rel="noreferrer">{podcastSettings.rssFeedUrl || '/feeds/podcasts/all.xml'}</a></td></tr>
              <tr><th>Audio host base URL</th><td>{podcastSettings.audioHostBaseUrl || '—'}</td></tr>
            </tbody>
          </table>
          <p><Link className="button button--primary" to={adminRoutes.podcastSettings}>Import or resync an existing podcast RSS feed</Link></p>
        </section>

        <section className="wp-meta-box">
          <h2>Episodes</h2>
          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Episode</th>
                <th>Season</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Last updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {episodes.length ? episodes.map((episode) => (
                <tr key={episode.id || episode.slug}>
                  <td><strong>{episode.title || '(Untitled episode)'}</strong></td>
                  <td>{episode.podcastEpisodeNumber || '—'}</td>
                  <td>{episode.podcastSeason || '—'}</td>
                  <td>{episode.podcastDuration || '—'}</td>
                  <td>{episode.status || 'draft'}</td>
                  <td>{toDisplayDate(episode.updatedAt)}</td>
                  <td>
                    <div className="wp-row-actions">
                      {episode.slug ? <Link to={`/post/${episode.slug}`} target="_blank" rel="noreferrer">View</Link> : null}
                      <Link to={`${adminRoutes.nativeBridge}?edit=${episode.id}`}>Edit</Link>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7}>No podcast episodes yet. Use Import RSS or Add Episode to get started.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}
