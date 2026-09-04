import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import { loadEpisodePublishingSettings, saveEpisodePublishingSettings } from '../lib/episodePublishingSettingsApi'
import { clearPeerTubeCredential, clearYouTubeCredential, savePeerTubeCredential } from '../lib/episodePublishingCredentialsApi'
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
  const [searchParams] = useSearchParams()
  const [settings, setSettings] = useState(DEFAULTS)
  const [connections, setConnections] = useState({ worker: {}, youtube: {}, peertube: {}, credentialStore: {} })
  const [peerTubeToken, setPeerTubeToken] = useState('')
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const { pushNotice } = useAdminNotices()

  async function reload() {
    const data = await loadEpisodePublishingSettings()
    setSettings(data.settings || DEFAULTS)
    setConnections(data.connections || {})
    return data
  }

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

  useEffect(() => {
    const youtube = searchParams.get('youtube')
    if (youtube === 'connected') pushNotice('YouTube connected.', 'success')
    if (youtube === 'cancelled') pushNotice('YouTube connection was cancelled.', 'info')
    if (youtube === 'error') pushNotice(`YouTube connection failed: ${searchParams.get('reason') || 'unknown error'}`, 'error')
  }, [searchParams, pushNotice])

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

  async function savePeerTubeToken() {
    const token = peerTubeToken.trim()
    if (!token) {
      pushNotice('Paste the PeerTube access token first.', 'error')
      return
    }
    try {
      setState('saving')
      await savePeerTubeCredential(token)
      setPeerTubeToken('')
      await reload()
      setState('ready')
      pushNotice('PeerTube token saved encrypted on the server.', 'success')
    } catch (nextError) {
      setState('error')
      pushNotice(`PeerTube connection failed: ${String(nextError?.message || nextError)}`, 'error')
    }
  }

  async function disconnect(destination) {
    try {
      setState('saving')
      if (destination === 'youtube') await clearYouTubeCredential()
      if (destination === 'peertube') await clearPeerTubeCredential()
      await reload()
      setState('ready')
      pushNotice(`${destination === 'youtube' ? 'YouTube' : 'PeerTube'} saved credential removed.`, 'success')
    } catch (nextError) {
      setState('error')
      pushNotice(`Could not remove credential: ${String(nextError?.message || nextError)}`, 'error')
    }
  }

  const youtubeConnectUrl = `/api/episode-youtube-auth-start?returnTo=${encodeURIComponent('/wp-admin/podcasts?publishing=settings')}`

  return (
    <AdminFrame>
      <main className="page wp-admin-screen episode-publishing-settings-page">
        <div className="wp-screen-header">
          <div>
            <h1>Episode Publishing</h1>
            <p className="description">Connect publishing accounts and set defaults for YouTube, PeerTube and generated podcast video. Saved tokens are encrypted server-side and never returned to the browser.</p>
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
          {!connections.credentialStore?.configured ? (
            <div className="notice notice-warning"><p><strong>Encrypted credential storage is not enabled.</strong> Set <code>EPISODE_CREDENTIALS_KEY</code> on the site before connecting accounts from this screen. Existing environment-managed credentials still work.</p></div>
          ) : null}
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
              description="OAuth connection for the YouTube Data API. Upload and metadata permissions are requested from Google; the refresh token stays encrypted on the site."
              required={connections.youtube?.clientConfigured ? 'OAuth client is configured.' : 'YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are required on the site.'}
            >
              {connections.youtube?.canConnect ? <a className="button button--primary" href={youtubeConnectUrl}>{connections.youtube?.configured ? 'Reconnect YouTube' : 'Connect YouTube'}</a> : null}
              {connections.youtube?.configured ? <button className="button" type="button" onClick={() => disconnect('youtube')}>Remove saved YouTube credential</button> : null}
            </ConnectionCard>
            <ConnectionCard
              title="PeerTube"
              configured={connections.peertube?.configured}
              description="Uses the configured PeerTube instance and channel with a server-side bearer token."
              required="Instance URL + channel ID below, plus an account access token."
            >
              {connections.peertube?.canConnect ? (
                <label>
                  <span>Access token</span>
                  <input type="password" value={peerTubeToken} onChange={(event) => setPeerTubeToken(event.target.value)} autoComplete="off" placeholder={connections.peertube?.tokenConfigured ? 'Token already saved' : 'Paste PeerTube token'} />
                </label>
              ) : null}
              {connections.peertube?.canConnect ? <button className="button button--primary" type="button" onClick={savePeerTubeToken}>Save PeerTube token</button> : null}
              {connections.peertube?.tokenConfigured ? <button className="button" type="button" onClick={() => disconnect('peertube')}>Remove saved PeerTube credential</button> : null}
            </ConnectionCard>
          </div>
          <p className="description">Connection status exposes only booleans. Token values are write-only from this screen.</p>
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

function ConnectionCard({ title, configured, description, required, children = null }) {
  return (
    <article className={`review-card episode-connection-card${configured ? ' is-connected' : ' is-missing'}`}>
      <h3>{title}</h3>
      <strong>{connectionLabel({ configured })}</strong>
      <p>{description}</p>
      <small>{required}</small>
      {children ? <div className="review-card__actions">{children}</div> : null}
    </article>
  )
}
