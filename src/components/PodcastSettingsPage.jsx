import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { importPodcastFeed, previewPodcastFeed, syncPodcastFeed } from '../lib/podcastImportApi'
import { loadPodcastSettings, loadPodcastSettingsAsync, savePodcastSettings } from '../lib/podcastSettings'
import { adminRoutes } from '../routing/routes'

const CANONICAL_PODCAST_FEED = 'https://sabot.media/feeds/podcasts/all.xml'
const IMPORT_BATCH_LIMIT = 250

export function PodcastSettingsPage() {
  const [settings, setSettings] = useState(() => loadPodcastSettings())
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importState, setImportState] = useState('idle')
  const [importError, setImportError] = useState('')
  const [preview, setPreview] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [importChannelSettings, setImportChannelSettings] = useState(true)
  const [importNotice, setImportNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    loadPodcastSettingsAsync()
      .then((loaded) => {
        if (cancelled) return
        const next = { ...loaded, rssFeedUrl: CANONICAL_PODCAST_FEED }
        setSettings(next)
        setImportUrl(next.sourceFeedUrl || '')
        setState('loaded')
      })
      .catch((err) => {
        if (cancelled) return
        setError(String(err?.message || err))
        setState('error')
      })
    return () => { cancelled = true }
  }, [])

  const selectedCount = selectedKeys.size
  const newCount = useMemo(() => preview?.episodes?.filter((episode) => !episode.alreadyImported).length || 0, [preview])

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

  async function previewFeed(url = importUrl) {
    const source = String(url || '').trim()
    if (!source) {
      setImportError('Paste the current podcast RSS feed URL first.')
      return
    }
    try {
      setImportState('previewing')
      setImportError('')
      setImportNotice('')
      const data = await previewPodcastFeed(source)
      setPreview(data)
      setImportUrl(data.sourceUrl || source)
      const defaultSelection = data.episodes
        .filter((episode) => !episode.alreadyImported)
        .slice(0, IMPORT_BATCH_LIMIT)
        .map((episode) => episode.key)
      setSelectedKeys(new Set(defaultSelection.length ? defaultSelection : data.episodes.slice(0, IMPORT_BATCH_LIMIT).map((episode) => episode.key)))
      setImportState('ready')
    } catch (err) {
      setImportError(String(err?.message || err))
      setImportState('error')
    }
  }

  async function runImport(mode) {
    if (!preview) return
    const selected = [...selectedKeys]
    if (!selected.length) {
      setImportError('Select at least one episode.')
      return
    }
    if (selected.length > IMPORT_BATCH_LIMIT) {
      setImportError(`Select no more than ${IMPORT_BATCH_LIMIT} episodes for one import batch.`)
      return
    }
    try {
      setImportState('importing')
      setImportError('')
      setImportNotice('')
      const data = mode === 'sync'
        ? await syncPodcastFeed({ feedUrl: importUrl, selectedKeys: selected, importChannelSettings })
        : await importPodcastFeed({ feedUrl: importUrl, selectedKeys: selected, syncExisting: false, importChannelSettings })
      const summary = data.result || {}
      setImportNotice(`${mode === 'sync' ? 'Sync' : 'Import'} complete: ${summary.created || 0} created, ${summary.updated || 0} updated, ${summary.skipped || 0} skipped.`)
      if (data.settings) {
        const next = { ...data.settings, rssFeedUrl: CANONICAL_PODCAST_FEED }
        setSettings(next)
        setImportUrl(next.sourceFeedUrl || importUrl)
      }
      await previewFeed(importUrl)
    } catch (err) {
      setImportError(String(err?.message || err))
      setImportState('error')
    }
  }

  function toggleEpisode(key) {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectEpisodes(kind) {
    const episodes = preview?.episodes || []
    if (kind === 'none') return setSelectedKeys(new Set())
    const filtered = kind === 'new' ? episodes.filter((episode) => !episode.alreadyImported) : episodes
    setSelectedKeys(new Set(filtered.slice(0, IMPORT_BATCH_LIMIT).map((episode) => episode.key)))
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Podcast Settings</h1>
            <p className="description">Import an existing podcast, keep it synchronized during migration, and control the server-backed metadata used by Sabot's public podcast RSS feed.</p>
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
          <h2>Import or synchronize an existing podcast RSS feed</h2>
          <p className="description">Paste the feed from your current podcast host. Sabot fetches it server-side, previews the channel and episodes, preserves original GUIDs and publication dates, and keeps existing public audio enclosure URLs in place. Importing does not delete or move audio from the old host.</p>
          <div className="wp-settings-form">
            <label>
              <span>Current / source RSS feed URL</span>
              <input type="url" value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="https://current-host.example/show/rss" />
              <small>This is the feed Sabot imports from. It is different from Sabot's canonical outgoing feed below.</small>
            </label>
          </div>
          <div className="review-card__actions">
            <button className="button button--primary" type="button" onClick={() => previewFeed()} disabled={importState === 'previewing' || importState === 'importing'}>{importState === 'previewing' ? 'Fetching feed…' : 'Preview source feed'}</button>
            {settings.sourceFeedUrl ? <button className="button" type="button" onClick={() => previewFeed(settings.sourceFeedUrl)} disabled={importState === 'previewing' || importState === 'importing'}>Refresh saved source</button> : null}
          </div>
          {settings.sourceFeedLastSyncedAt ? <p className="description">Last successful source sync: {new Date(settings.sourceFeedLastSyncedAt).toLocaleString()}</p> : null}
          {importError ? <div className="notice notice-error" role="alert"><p><strong>RSS import error:</strong> {importError}</p></div> : null}
          {importNotice ? <div className="notice notice-success" role="status"><p>{importNotice}</p></div> : null}
        </section>

        {preview ? (
          <section className="wp-meta-box">
            <div className="wp-screen-header">
              <div>
                <h2>{preview.podcast?.title || 'Source podcast'}</h2>
                <p className="description">{preview.counts?.total || 0} episodes found · {newCount} new · {preview.counts?.existing || 0} already imported.</p>
              </div>
              <div className="review-card__actions">
                <button className="button" type="button" onClick={() => selectEpisodes('new')}>Select new</button>
                <button className="button" type="button" onClick={() => selectEpisodes('all')}>Select first {Math.min(IMPORT_BATCH_LIMIT, preview.episodes.length)}</button>
                <button className="button" type="button" onClick={() => selectEpisodes('none')}>Clear</button>
              </div>
            </div>
            <p className="description">One request can import or resync up to {IMPORT_BATCH_LIMIT} episodes. Large archives can be moved in repeated batches without creating duplicates.</p>
            <label className="native-content-editor__check">
              <input type="checkbox" checked={importChannelSettings} onChange={(event) => setImportChannelSettings(event.target.checked)} />
              <span>Also import/update show title, description, author, artwork, language, category, owner information, and explicit status</span>
            </label>
            <div className="review-card__actions">
              <button className="button button--primary" type="button" onClick={() => runImport('import')} disabled={importState === 'importing' || !selectedCount}>{importState === 'importing' ? 'Working…' : `Import selected (${selectedCount})`}</button>
              <button className="button" type="button" onClick={() => runImport('sync')} disabled={importState === 'importing' || !selectedCount}>Resync selected</button>
            </div>
            <div className="wp-list-table-wrap">
              <table className="wp-list-table widefat striped">
                <thead><tr><th>Select</th><th>Episode</th><th>Published</th><th>Audio</th><th>Status</th></tr></thead>
                <tbody>
                  {preview.episodes.map((episode) => (
                    <tr key={episode.key}>
                      <td><input type="checkbox" checked={selectedKeys.has(episode.key)} onChange={() => toggleEpisode(episode.key)} aria-label={`Select ${episode.title}`} /></td>
                      <td><strong>{episode.title}</strong>{episode.episodeNumber ? <div className="description">Episode {episode.episodeNumber}{episode.season ? ` · Season ${episode.season}` : ''}</div> : null}</td>
                      <td>{episode.publishedAt ? new Date(episode.publishedAt).toLocaleDateString() : 'unknown'}</td>
                      <td>{episode.enclosureUrl ? <a href={episode.enclosureUrl} target="_blank" rel="noreferrer">enclosure</a> : <span className="description">missing</span>}</td>
                      <td>{episode.alreadyImported ? 'Already imported' : 'New'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="wp-meta-box">
          <h2>Feed identity</h2>
          <div className="wp-settings-form">
            <label>
              <span>Canonical Sabot RSS feed URL</span>
              <input type="url" value={CANONICAL_PODCAST_FEED} readOnly />
              <small>This is the URL to submit to Spotify, Apple Podcasts, Pocket Casts, AntennaPod, and other podcast directories after you verify the imported archive.</small>
            </label>
            <label><span>Podcast title</span><input value={settings.podcastTitle} onChange={(e) => update('podcastTitle', e.target.value)} placeholder="Sabot Media Podcast" /></label>
            <label><span>Author</span><input value={settings.author} onChange={(e) => update('author', e.target.value)} placeholder="Sabot Media" /></label>
            <label><span>Description</span><textarea rows="4" value={settings.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the show for podcast directories." /></label>
            <label><span>Website URL</span><input type="url" value={settings.websiteUrl} onChange={(e) => update('websiteUrl', e.target.value)} placeholder="https://sabot.media" /></label>
            <label><span>Default cover art</span><input type="url" value={settings.defaultCoverArt} onChange={(e) => update('defaultCoverArt', e.target.value)} placeholder="https://…/podcast-cover.jpg" /></label>
          </div>
        </section>

        <section className="wp-meta-box">
          <h2>Directory metadata</h2>
          <div className="wp-settings-form">
            <label><span>Language</span><input value={settings.language} onChange={(e) => update('language', e.target.value)} placeholder="en-us" /></label>
            <label><span>Category</span><input value={settings.category} onChange={(e) => update('category', e.target.value)} placeholder="News" /></label>
            <label><span>Owner name</span><input value={settings.ownerName} onChange={(e) => update('ownerName', e.target.value)} autoComplete="name" /></label>
            <label><span>Owner email</span><input type="email" value={settings.ownerEmail} onChange={(e) => update('ownerEmail', e.target.value)} autoComplete="email" /><small>Podcast directories may expose or use this address for ownership verification.</small></label>
            <label><span>Audio host URL/base</span><input type="url" value={settings.audioHostBaseUrl} onChange={(e) => update('audioHostBaseUrl', e.target.value)} placeholder="https://media.sabot.media/podcasts/" /></label>
            <label><span><input type="checkbox" checked={Boolean(settings.explicit)} onChange={(e) => update('explicit', e.target.checked)} /> Explicit show</span></label>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}
