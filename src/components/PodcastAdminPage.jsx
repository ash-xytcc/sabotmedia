import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { getPieces } from '../lib/pieces'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { loadPodcastSettings } from '../lib/podcastSettings'

function toDisplayDate(value) {
  const d = new Date(String(value || ''))
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString()
}

export function PodcastAdminPage({ pieces }) {
  const [nativeItems, setNativeItems] = useState([])

  useEffect(() => {
    async function boot() {
      const loaded = await loadNativeCollection({ includeFuture: 1 })
      setNativeItems(Array.isArray(loaded) ? loaded : [])
    }
    boot()
  }, [])

  const importedPodcastPieces = useMemo(
    () => (pieces || getPieces()).filter((piece) => piece.type === 'podcast').map((piece) => ({
      id: `archive-${piece.slug}`,
      title: piece.title,
      slug: piece.slug,
      status: 'published',
      updatedAt: piece.publishedAt || piece.publishedDateLabel || '',
      podcastEpisodeNumber: piece.episodeNumber || '',
      podcastSeason: piece.season || '',
      podcastDuration: piece.duration || '',
      source: 'archive',
    })),
    [pieces]
  )

  const nativePodcastEntries = useMemo(
    () => nativeItems.filter((item) => item.contentType === 'podcast').map((item) => ({
      ...item,
      source: 'native',
    })),
    [nativeItems]
  )

  const episodes = useMemo(() => {
    const bySlug = new Map()
    for (const item of importedPodcastPieces) {
      bySlug.set(item.slug || item.id, item)
    }
    for (const item of nativePodcastEntries) {
      bySlug.set(item.slug || item.id, item)
    }
    return [...bySlug.values()].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
  }, [importedPodcastPieces, nativePodcastEntries])

  const podcastSettings = loadPodcastSettings()

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Podcast Episodes</h1>
          <div className="review-card__actions">
            <Link className="button" to="/podcasts/settings">Podcast Settings</Link>
            <Link className="button button--primary" to="/native-bridge?new=podcast">Add Episode</Link>
          </div>
        </div>

        <p className="description">Podcast is now a first-class content type. Manage episodes in a list table and edit each episode in Native Bridge.</p>

        <section className="wp-meta-box">
          <h2>Current Feed Configuration</h2>
          <table className="content-table wp-posts-table">
            <tbody>
              <tr><th>Podcast title</th><td>{podcastSettings.podcastTitle || '—'}</td></tr>
              <tr><th>Author</th><td>{podcastSettings.author || '—'}</td></tr>
              <tr><th>RSS feed URL</th><td>{podcastSettings.rssFeedUrl || '—'}</td></tr>
              <tr><th>Audio host base URL</th><td>{podcastSettings.audioHostBaseUrl || '—'}</td></tr>
            </tbody>
          </table>
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
                      {episode.source === 'native' ? <Link to={`/native-bridge?edit=${episode.id}`}>Edit</Link> : <span>Imported</span>}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7}>No podcast episodes yet. Use Add Episode to create one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}
