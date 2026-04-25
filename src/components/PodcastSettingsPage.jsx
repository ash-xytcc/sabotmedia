import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { loadPodcastSettings, savePodcastSettings } from '../lib/podcastSettings'

export function PodcastSettingsPage() {
  const [settings, setSettings] = useState(() => loadPodcastSettings())
  const [saved, setSaved] = useState(false)

  function update(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function onSave() {
    savePodcastSettings(settings)
    setSaved(true)
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Podcast Settings</h1>
          <div className="review-card__actions">
            <Link className="button" to="/podcasts">Back to Episodes</Link>
            <button className="button button--primary" type="button" onClick={onSave}>Save Podcast Settings</button>
          </div>
        </div>

        <section className="wp-meta-box">
          <h2>Feed Defaults</h2>
          <div className="wp-settings-form">
            <label>
              <span>RSS feed URL</span>
              <input type="url" value={settings.rssFeedUrl} onChange={(e) => update('rssFeedUrl', e.target.value)} placeholder="https://example.com/feed/podcast.xml" />
            </label>
            <label>
              <span>Podcast title</span>
              <input value={settings.podcastTitle} onChange={(e) => update('podcastTitle', e.target.value)} placeholder="Sabot Media Podcast" />
            </label>
            <label>
              <span>Author</span>
              <input value={settings.author} onChange={(e) => update('author', e.target.value)} placeholder="Sabot Media" />
            </label>
            <label>
              <span>Default cover art</span>
              <input type="url" value={settings.defaultCoverArt} onChange={(e) => update('defaultCoverArt', e.target.value)} placeholder="https://cdn.example.com/podcast-cover.jpg" />
            </label>
            <label>
              <span>Audio host URL/base</span>
              <input type="url" value={settings.audioHostBaseUrl} onChange={(e) => update('audioHostBaseUrl', e.target.value)} placeholder="https://audio.example.com/shows/sabot/" />
            </label>
          </div>
          {saved ? <p className="description">Podcast settings saved locally.</p> : null}
        </section>
      </main>
    </AdminFrame>
  )
}
