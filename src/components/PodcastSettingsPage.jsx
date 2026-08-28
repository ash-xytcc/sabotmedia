import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { loadPodcastSettings, loadPodcastSettingsAsync, savePodcastSettings } from '../lib/podcastSettings'
import { adminRoutes } from '../routing/routes'

const CANONICAL_PODCAST_FEED = 'https://sabot.media/feeds/podcasts/all.xml'

export function PodcastSettingsPage() {
  const [settings, setSettings] = useState(() => loadPodcastSettings())
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadPodcastSettingsAsync()
      .then((loaded) => {
        if (cancelled) return
        setSettings({ ...loaded, rssFeedUrl: CANONICAL_PODCAST_FEED })
        setState('loaded')
      })
      .catch((err) => {
        if (cancelled) return
        setError(String(err?.message || err))
        setState('error')
      })
    return () => { cancelled = true }
  }, [])

  function update(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function onSave() {
    try {
      setState('saving')
      setError('')
      const next = await savePodcastSettings({ ...settings, rssFeedUrl: CANONICAL_PODCAST_FEED })
      setSettings({ ...next, rssFeedUrl: CANONICAL_PODCAST_FEED })
      setSaved(true)
      setState('loaded')
    } catch (err) {
      setError(String(err?.message || err))
      setState('error')
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Podcast Settings</h1>
            <p className="description">Server-backed channel metadata used by the public podcast RSS feed.</p>
          </div>
          <div className="review-card__actions">
            <Link className="button" to={adminRoutes.podcasts}>Back to Episodes</Link>
            <a className="button" href="/feeds/podcasts/all.xml" target="_blank" rel="noreferrer">Open RSS Feed</a>
            <button className="button button--primary" type="button" onClick={onSave} disabled={state === 'loading' || state === 'saving'}>
              {state === 'saving' ? 'Saving…' : 'Save Podcast Settings'}
            </button>
          </div>
        </div>

        {error ? <div className="notice notice-error" role="alert"><p><strong>Podcast settings error:</strong> {error}</p></div> : null}
        {saved ? <div className="notice notice-success" role="status"><p>Podcast settings saved to the production database.</p></div> : null}

        <section className="wp-meta-box">
          <h2>Feed identity</h2>
          <div className="wp-settings-form">
            <label>
              <span>Canonical RSS feed URL</span>
              <input type="url" value={CANONICAL_PODCAST_FEED} readOnly />
              <small>Use this URL when connecting Spotify, Apple Podcasts, Pocket Casts, AntennaPod, or another RSS client.</small>
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
              <span>Description</span>
              <textarea rows="4" value={settings.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the show for podcast directories." />
            </label>
            <label>
              <span>Website URL</span>
              <input type="url" value={settings.websiteUrl} onChange={(e) => update('websiteUrl', e.target.value)} placeholder="https://sabot.media" />
            </label>
            <label>
              <span>Default cover art</span>
              <input type="url" value={settings.defaultCoverArt} onChange={(e) => update('defaultCoverArt', e.target.value)} placeholder="https://…/podcast-cover.jpg" />
            </label>
          </div>
        </section>

        <section className="wp-meta-box">
          <h2>Directory metadata</h2>
          <div className="wp-settings-form">
            <label>
              <span>Language</span>
              <input value={settings.language} onChange={(e) => update('language', e.target.value)} placeholder="en-us" />
            </label>
            <label>
              <span>Category</span>
              <input value={settings.category} onChange={(e) => update('category', e.target.value)} placeholder="News" />
            </label>
            <label>
              <span>Owner name</span>
              <input value={settings.ownerName} onChange={(e) => update('ownerName', e.target.value)} autoComplete="name" />
            </label>
            <label>
              <span>Owner email</span>
              <input type="email" value={settings.ownerEmail} onChange={(e) => update('ownerEmail', e.target.value)} autoComplete="email" />
              <small>Podcast directories may expose or use this address for ownership verification.</small>
            </label>
            <label>
              <span>Audio host URL/base</span>
              <input type="url" value={settings.audioHostBaseUrl} onChange={(e) => update('audioHostBaseUrl', e.target.value)} placeholder="https://media.sabot.media/podcasts/" />
            </label>
            <label>
              <span><input type="checkbox" checked={Boolean(settings.explicit)} onChange={(e) => update('explicit', e.target.checked)} /> Explicit show</span>
            </label>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}
