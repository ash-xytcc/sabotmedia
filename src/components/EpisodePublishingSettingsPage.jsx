import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import { loadEpisodePublishingSettings, saveEpisodePublishingSettings } from '../lib/episodePublishingSettingsApi'
import { adminRoutes } from '../routing/routes'

const DEFAULTS = {
  youtube: { categoryId: '22', privacy: 'public' },
  peertube: { baseUrl: '', channelId: '', privacy: 'public' },
  videoTemplate: {
    width: 1920,
    height: 1080,
    frameRate: 30,
    waveform: true,
    brandingText: 'Sabot Media',
    preset: 'medium',
    crf: 20,
    audioBitrate: '192k',
  },
}

function connectionLabel(value) {
  return value?.configured ? 'Configured' : 'Not configured'
}

export function EpisodePublishingSettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [connections, setConnections] = useState({ worker: {}, youtube: {}, peertube: {} })
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const { pushNotice } = useAdminNotices()

  useEffect(() => {
    let cancelled = false
    loadEpisodePublishingSettings()
      .then((data) => {
        if (cancelled) return
        setSettings(data.settings || DEFAULTS)
        setConnections(data.connections || {})
        setState('ready')
      })
      .catch((nextError) => {
        if (cancelled) return
        setError(String(nextError?.message || nextError))
        setState('error')
      })
    return () => { cancelled = true }
  }, [])

  function update(section, field, value) {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }))
  }

  async function save() {
    try {
      setState('saving')
      setError('')
      const data = await saveEpisodePublishingSettings(settings)
      setSettings(data.settings || settings)
      setConnections(data.connections || connections)
      setState('ready')
      pushNotice('Episode publishing settings saved.', 'success')
    } catch (nextError) {
      setState('error')
      setError(String(nextError?.message || nextError))
      pushNotice(`Publishing settings save failed: ${String(nextError?.message || nextError)}`, 'error')
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen episode-publishing-settings-page">
        <div className="wp-screen-header">
          <div>
            <h1>Episode Publishing</h1>
            <p className="description">Defaults for YouTube, PeerTube and generated podcast video. Access tokens and OAuth secrets stay in server or worker environment configuration and are never returned to the browser.</p>
          </div>
          <div className="review-card__actions">
            <Link className="button" to={adminRoutes.podcasts}>Back to Podcasts</Link>
            <button className="button button--primary" type="button" onClick={save} disabled={state === 'loading' || state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save Publishing Settings'}</button>
          </div>
        </div>
        <WpAdminNotices />
        {error ? <div className="notice notice-error" role="alert"><p>{error}</p></div> : null}

        <section className="wp-meta-box">
          <h2>Connections</h2>
          <div className="episode-connection-grid">
            <ConnectionCard
              title="Media worker"
              configured={connections.worker?.configured}
              description="Runs FFmpeg and external uploads after the browser has finished publishing the episode."
              required="EPISODE_WORKER_TOKEN on both the site and worker"
            />
            <ConnectionCard
              title="YouTube"
              configured={connections.youtube?.configured}
              description="Uses the YouTube Data API from the media worker."
              required="YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN on the worker/site environment"
            />
            <ConnectionCard
              title="PeerTube"
              configured={connections.peertube?.configured}
              description="Uses the configured PeerTube instance and channel with a server-side bearer token."
              required="PEERTUBE_ACCESS_TOKEN plus instance and channel below"
            />
          </div>
          <p className="description">Connection status is intentionally boolean. Secret values are not readable from this screen after deployment.</p>
        </section>

        <section className="wp-meta-box">
          <h2>YouTube defaults</h2>
          <div className="wp-settings-form">
            <label>
              <span>Default category ID</span>
              <input value={settings.youtube?.categoryId || '22'} onChange={(event) => update('youtube', 'categoryId', event.target.value)} inputMode="numeric" />
              <small>Used unless an episode supplies a YouTube override.</small>
            </label>
            <label>
              <span>Default visibility</span>
              <select value={settings.youtube?.privacy || 'public'} onChange={(event) => update('youtube', 'privacy', event.target.value)}>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </label>
          </div>
        </section>

        <section className="wp-meta-box">
          <h2>PeerTube defaults</h2>
          <div className="wp-settings-form">
            <label>
              <span>PeerTube instance URL</span>
              <input type="url" value={settings.peertube?.baseUrl || ''} onChange={(event) => update('peertube', 'baseUrl', event.target.value)} placeholder="https://video.example.org" />
            </label>
            <label>
              <span>Channel ID</span>
              <input value={settings.peertube?.channelId || ''} onChange={(event) => update('peertube', 'channelId', event.target.value)} inputMode="numeric" />
            </label>
            <label>
              <span>Default visibility</span>
              <select value={settings.peertube?.privacy || 'public'} onChange={(event) => update('peertube', 'privacy', event.target.value)}>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
                <option value="internal">Internal</option>
                <option value="password">Password protected</option>
              </select>
            </label>
          </div>
        </section>

        <section className="wp-meta-box">
          <h2>Video template</h2>
          <p className="description">Reusable defaults for the FFmpeg audio-to-video render. Per-show templates can be added later without changing the episode model or job interface.</p>
          <div className="wp-settings-form">
            <label><span>Width</span><input type="number" min="640" max="3840" value={settings.videoTemplate?.width || 1920} onChange={(event) => update('videoTemplate', 'width', Number(event.target.value))} /></label>
            <label><span>Height</span><input type="number" min="360" max="2160" value={settings.videoTemplate?.height || 1080} onChange={(event) => update('videoTemplate', 'height', Number(event.target.value))} /></label>
            <label><span>Frame rate</span><input type="number" min="20" max="60" value={settings.videoTemplate?.frameRate || 30} onChange={(event) => update('videoTemplate', 'frameRate', Number(event.target.value))} /></label>
            <label><span>Branding text</span><input value={settings.videoTemplate?.brandingText || ''} onChange={(event) => update('videoTemplate', 'brandingText', event.target.value)} /></label>
            <label><span>FFmpeg preset</span><select value={settings.videoTemplate?.preset || 'medium'} onChange={(event) => update('videoTemplate', 'preset', event.target.value)}><option value="veryfast">Very fast</option><option value="fast">Fast</option><option value="medium">Medium</option><option value="slow">Slow</option></select></label>
            <label><span>CRF quality</span><input type="number" min="16" max="30" value={settings.videoTemplate?.crf ?? 20} onChange={(event) => update('videoTemplate', 'crf', Number(event.target.value))} /><small>Lower is higher quality and larger output. 20 is a reasonable default.</small></label>
            <label><span>Audio bitrate</span><input value={settings.videoTemplate?.audioBitrate || '192k'} onChange={(event) => update('videoTemplate', 'audioBitrate', event.target.value)} /></label>
            <label><span><input type="checkbox" checked={settings.videoTemplate?.waveform !== false} onChange={(event) => update('videoTemplate', 'waveform', event.target.checked)} /> Show waveform</span></label>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}

function ConnectionCard({ title, configured, description, required }) {
  return (
    <article className={`review-card episode-connection-card${configured ? ' is-connected' : ' is-missing'}`}>
      <h3>{title}</h3>
      <strong>{connectionLabel({ configured })}</strong>
      <p>{description}</p>
      <small>{required}</small>
    </article>
  )
}
