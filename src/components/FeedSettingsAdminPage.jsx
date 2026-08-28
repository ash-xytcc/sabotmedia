import { useEffect, useState } from 'react'
import { AdminFrame } from './AdminRail'
import { DEFAULT_FEED_SETTINGS, loadFeedSettingsAsync, resetFeedSettings, saveFeedSettings } from '../lib/feedSettings'
import { downloadFeedManifest, loadFeedManifest } from '../lib/feedManifestApi'

const KINDS = [
  ['format', 'Formats', 'Formats are broad reading lanes like article, podcast, comic, newsletter, zine, print, or audio.'],
  ['project', 'Projects', 'Projects are public buckets used to browse bodies of work. Imported categories may need cleanup here.'],
  ['collection', 'Collections', 'Collections are curated bodies of work, campaigns, issues, or publication packages.'],
  ['author', 'Public byline labels', 'Bylines are public labels only. Use handles, collectives, pseudonyms, or house names. Never expose a legal name unless that is intentional.'],
  ['topic', 'Topics', 'Topics are subject tags readers can follow across formats and projects.'],
  ['series', 'Series', 'Series are recurring lines of work, columns, comics, newsletters, or podcasts.'],
]

function listToText(value = []) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function textToList(value = '') {
  return String(value || '').split(/\n|,/).map((item) => item.trim()).filter(Boolean)
}

function aliasesToText(value = {}) {
  return Object.entries(value || {}).map(([from, to]) => `${from} => ${to}`).join('\n')
}

function textToAliases(value = '') {
  const next = {}
  for (const line of String(value || '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const [from, ...rest] = trimmed.split(/=>|→/)
    const key = String(from || '').trim()
    const target = rest.join('=>').trim()
    if (key && target) next[key] = target
  }
  return next
}

export function FeedSettingsAdminPage() {
  const [settings, setSettings] = useState(DEFAULT_FEED_SETTINGS)
  const [manifest, setManifest] = useState(null)
  const [state, setState] = useState('loading')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [manifestError, setManifestError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setState('loading')
      setError('')
      setManifestError('')
      const [settingsResult, manifestResult] = await Promise.allSettled([
        loadFeedSettingsAsync(),
        loadFeedManifest(),
      ])
      if (cancelled) return

      if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value)
      else setError(String(settingsResult.reason?.message || settingsResult.reason))

      if (manifestResult.status === 'fulfilled') setManifest(manifestResult.value)
      else setManifestError(String(manifestResult.reason?.message || manifestResult.reason))

      setState(settingsResult.status === 'fulfilled' ? 'loaded' : 'error')
    }
    boot()
    return () => { cancelled = true }
  }, [])

  function updateField(field, value) {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  function updateAlias(kind, value) {
    setSettings((current) => ({
      ...current,
      aliases: { ...(current.aliases || {}), [kind]: textToAliases(value) },
    }))
  }

  function updateHidden(kind, value) {
    setSettings((current) => ({
      ...current,
      hiddenTerms: { ...(current.hiddenTerms || {}), [kind]: textToList(value) },
    }))
  }

  async function refreshManifest() {
    try {
      setManifestError('')
      const next = await loadFeedManifest()
      setManifest(next)
      return next
    } catch (err) {
      setManifestError(String(err?.message || err))
      return null
    }
  }

  async function save() {
    try {
      setState('saving')
      setError('')
      setStatus('')
      const next = await saveFeedSettings(settings)
      setSettings(next)
      await refreshManifest()
      setState('loaded')
      setStatus('Feed settings saved to the production database. The live server manifest has been refreshed.')
    } catch (err) {
      setState('error')
      setError(String(err?.message || err))
    }
  }

  async function reset() {
    try {
      setState('saving')
      setError('')
      setStatus('')
      const next = await resetFeedSettings()
      setSettings(next)
      await refreshManifest()
      setState('loaded')
      setStatus('Feed settings reset to defaults in the production database. The live server manifest has been refreshed.')
    } catch (err) {
      setState('error')
      setError(String(err?.message || err))
    }
  }

  const disabled = state === 'loading' || state === 'saving'
  const liveFiles = Array.isArray(manifest?.files) ? manifest.files : []

  return (
    <AdminFrame>
      <main className="page wp-admin-screen feeds-admin-page">
        <div className="wp-screen-header">
          <div>
            <h1>Feeds & Syndication</h1>
            <p className="description">Control the live server-backed RSS taxonomy, aliases, hidden labels, public explanation copy, and privacy-safe byline behavior.</p>
          </div>
          <div className="review-card__actions">
            <a className="button" href="/feeds" target="_blank" rel="noreferrer">Open Public Feeds</a>
            <button className="button" type="button" onClick={reset} disabled={disabled}>Reset</button>
            <button className="button button--primary" type="button" onClick={save} disabled={disabled}>Save Feed Settings</button>
          </div>
        </div>

        {state === 'loading' ? <div className="notice notice-info" role="status"><p>Loading feed settings and live feed manifest…</p></div> : null}
        {error ? <div className="notice notice-error" role="alert"><p><strong>Feed settings error:</strong> {error}</p></div> : null}
        {manifestError ? <div className="notice notice-error" role="alert"><p><strong>Live feed manifest error:</strong> {manifestError}</p></div> : null}
        {status ? <div className="notice notice-success" role="status"><p>{status}</p></div> : null}

        <section className="wp-meta-box">
          <h2>What this controls</h2>
          <p className="description">Every published piece can appear in multiple live feeds at once: the main feed, a format feed, a project feed, a collection feed, a topic feed, a series feed, and a public byline feed. The counts and detected terms below come from the same D1-backed server manifest used by the public <code>/feeds</code> page.</p>
        </section>

        <section className="wp-meta-box">
          <h2>Live feed status</h2>
          <div className="newsroom-stat-grid">
            <article className="review-summary-card"><div className="review-summary-card__eyebrow">published records</div><strong>{Number(manifest?.itemCount || 0)}</strong><span>eligible for feed generation</span></article>
            <article className="review-summary-card"><div className="review-summary-card__eyebrow">live endpoints</div><strong>{liveFiles.length}</strong><span>server-confirmed RSS URLs</span></article>
            <article className="review-summary-card"><div className="review-summary-card__eyebrow">podcast episodes</div><strong>{Number(manifest?.podcastItemCount || 0)}</strong><span>with public audio enclosures</span></article>
          </div>
          <div className="review-card__actions">
            <button className="button" type="button" onClick={refreshManifest}>Refresh live manifest</button>
            <a className="button" href="/feeds/all-content.xml" target="_blank" rel="noreferrer">Open main RSS</a>
            <a className="button" href="/feeds/podcasts/all.xml" target="_blank" rel="noreferrer">Open podcast RSS</a>
          </div>
        </section>

        <section className="wp-meta-box">
          <h2>Public feeds page</h2>
          <p className="description">These fields change the human-readable explanation at <code>/feeds</code>. They do not change the podcast title or podcast-directory metadata.</p>
          <div className="wp-settings-form">
            <label><span>Page title</span><input value={settings.feedsIntroTitle || ''} onChange={(event) => updateField('feedsIntroTitle', event.target.value)} /></label>
            <label><span>Intro copy</span><textarea rows={11} value={settings.feedsIntroBody || ''} onChange={(event) => updateField('feedsIntroBody', event.target.value)} /></label>
          </div>
        </section>

        <section className="wp-meta-box">
          <h2>Enabled feed groups</h2>
          <div className="feed-toggle-grid">
            {[
              ['exposeMainFeed', 'Everything'], ['exposeFormatFeeds', 'Formats'], ['exposeProjectFeeds', 'Projects'],
              ['exposeCollectionFeeds', 'Collections'], ['exposeAuthorFeeds', 'Public byline labels'],
              ['exposeTopicFeeds', 'Topics'], ['exposeSeriesFeeds', 'Series'],
            ].map(([field, label]) => (
              <label key={field} className="native-content-editor__check">
                <input type="checkbox" checked={settings[field] !== false} onChange={(event) => updateField(field, event.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="description">Save these settings before expecting the live endpoint list to change. The manifest above is authoritative; unsaved form edits are not.</p>
        </section>

        {KINDS.map(([kind, label, help]) => (
          <section className="wp-meta-box" key={kind}>
            <h2>{label}</h2>
            <p className="description">{help}</p>
            <p className="description">Use one alias per line, like <code>old label =&gt; new label</code>. Hide wrong/imported terms by listing them below.</p>
            <div className="feed-taxonomy-grid">
              <label><span>Aliases</span><textarea rows={6} value={aliasesToText(settings.aliases?.[kind])} onChange={(event) => updateAlias(kind, event.target.value)} /></label>
              <label><span>Hidden terms</span><textarea rows={6} value={listToText(settings.hiddenTerms?.[kind])} onChange={(event) => updateHidden(kind, event.target.value)} /></label>
              <div className="feed-term-preview">
                <strong>Server-detected terms</strong>
                <div>{(manifest?.terms?.[kind] || []).slice(0, 80).map((term) => <span key={term}>{term}</span>)}</div>
                {!(manifest?.terms?.[kind] || []).length ? <p className="description">No live terms detected.</p> : null}
              </div>
            </div>
          </section>
        ))}

        <section className="wp-meta-box">
          <h2>Diagnostics & export</h2>
          <p className="description">Podcast directories and RSS readers use the live URLs above. This optional JSON export is only a snapshot of the server manifest for debugging, archiving, or external tooling; it is not the feed you submit to Spotify or Apple Podcasts.</p>
          <div className="review-card__actions">
            <button className="button" type="button" onClick={() => downloadFeedManifest(manifest)} disabled={!manifest}>Download feed manifest (JSON)</button>
          </div>
          {liveFiles.length ? <details><summary>Show live endpoint paths</summary><ul>{liveFiles.slice(0, 150).map((file) => <li key={file}><a href={`/feeds/${file}`} target="_blank" rel="noreferrer"><code>/feeds/{file}</code></a></li>)}</ul></details> : null}
        </section>
      </main>
    </AdminFrame>
  )
}
