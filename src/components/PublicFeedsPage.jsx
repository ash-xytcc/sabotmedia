import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { DEFAULT_FEED_SETTINGS, loadFeedSettingsAsync } from '../lib/feedSettings'

function renderParagraphs(text = '') {
  return String(text || '').split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph, index) => (
    <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>
  ))
}

function groupFeedFiles(files = []) {
  return files.reduce((groups, file) => {
    const [group = 'other'] = file.split('/')
    groups[group] = groups[group] || []
    groups[group].push(file)
    return groups
  }, {})
}

function groupLabel(group) {
  const labels = {
    'all-content.xml': 'everything', formats: 'formats', projects: 'projects', collections: 'collections',
    bylines: 'public byline labels', authors: 'public byline labels', topics: 'topics', series: 'series', podcasts: 'podcasts',
  }
  return labels[group] || group.replace(/-/g, ' ')
}

function groupDescription(group) {
  const descriptions = {
    'all-content.xml': 'The broad live feed for published server-backed Sabot Media content.',
    formats: 'Follow one kind of work, such as articles, comics, newsletters, print material, or podcasts.',
    projects: 'Follow work connected to a project or public organizing body.',
    collections: 'Follow curated bodies of work, campaigns, issues, readers, or publication packages.',
    bylines: 'Follow public byline labels. These may be collective names, pseudonyms, handles, or house labels.',
    authors: 'Follow public byline labels. These may be collective names, pseudonyms, handles, or house labels.',
    topics: 'Follow subjects across formats and projects.',
    series: 'Follow recurring columns, comics, newsletters, shows, or other serial work.',
    podcasts: 'Follow audio and podcast material.',
  }
  return descriptions[group] || 'A live RSS feed generated from published server metadata.'
}

async function loadFeedManifest() {
  const response = await fetch('/api/feed-manifest', {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1' || !Array.isArray(data.files)) {
    throw new Error(data?.error || `live feed manifest request failed: ${response.status}`)
  }
  return data
}

export function PublicFeedsPage() {
  const [settings, setSettings] = useState(DEFAULT_FEED_SETTINGS)
  const [files, setFiles] = useState([])
  const [state, setState] = useState('loading')
  const [errors, setErrors] = useState([])
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setState('loading')
      setErrors([])
      const [settingsResult, manifestResult] = await Promise.allSettled([
        loadFeedSettingsAsync(),
        loadFeedManifest(),
      ])
      if (cancelled) return

      const nextErrors = []
      if (settingsResult.status === 'fulfilled') {
        setSettings(settingsResult.value)
      } else {
        nextErrors.push(`Feed configuration: ${String(settingsResult.reason?.message || settingsResult.reason)}`)
      }

      if (manifestResult.status === 'fulfilled') {
        setFiles(manifestResult.value.files)
        setItemCount(Number(manifestResult.value.itemCount || 0))
      } else {
        setFiles([])
        setItemCount(0)
        nextErrors.push(`Live feed endpoints: ${String(manifestResult.reason?.message || manifestResult.reason)}`)
      }

      setErrors(nextErrors)
      setState(nextErrors.length ? 'error' : 'loaded')
    }
    boot()
    return () => { cancelled = true }
  }, [])

  const grouped = useMemo(() => groupFeedFiles(files), [files])
  const mainFeedAvailable = files.includes('all-content.xml')

  return (
    <main className="page feeds-public-page">
      <PublicationTopbar />
      <section className="public-info-page__hero">
        <p className="public-info-page__eyebrow">feeds / syndication / archive</p>
        <h1>{settings.feedsIntroTitle || 'Follow the Sabot Media archive'}</h1>
        <div className="public-info-page__body">{renderParagraphs(settings.feedsIntroBody)}</div>
        {state === 'loading' ? <p className="description" role="status">Loading live feed endpoints…</p> : null}
        {errors.length ? (
          <div className="notice notice-error" role="alert">
            <p><strong>Some live feed data could not be loaded.</strong></p>
            <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        ) : null}
        {mainFeedAvailable ? <a className="button button--primary" href="/feeds/all-content.xml">Open main RSS feed</a> : null}
      </section>

      <section className="feeds-public-page__panel">
        <h2>How this works</h2>
        <p>These are real RSS endpoints, not download-package placeholders. A reader can subscribe with an RSS reader or compatible app, an archivist can mirror them, and another site can syndicate them.</p>
        <p>The live XML endpoints are generated from published native records in the server database and respect the persisted feed aliases and hidden-term settings. Scheduled work enters the feeds when it becomes publicly visible.</p>
        <p>Older imported archive pieces remain browseable on Sabot and enter these live feeds as they are migrated into native server-backed content.</p>
      </section>

      <section className="feeds-public-page__panel">
        <h2>Available live feeds</h2>
        <p>{itemCount} published server-backed {itemCount === 1 ? 'entry is' : 'entries are'} currently eligible for the live feed system.</p>
        <div className="feeds-public-page__grid">
          {Object.entries(grouped).map(([group, groupFiles]) => (
            <article className="feeds-public-page__group" key={group}>
              <h3>{groupLabel(group)}</h3>
              <p>{groupDescription(group)}</p>
              <ul>
                {groupFiles.slice(0, 50).map((file) => (
                  <li key={file}><a href={`/feeds/${file}`}><code>{file}</code></a></li>
                ))}
              </ul>
            </article>
          ))}
          {state !== 'loading' && !files.length ? (
            <article className="feeds-public-page__group">
              <h3>No live endpoints available</h3>
              <p>The server did not return a usable feed manifest. Nothing is being presented as a working subscription URL until it does.</p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="feeds-public-page__panel">
        <h2>Privacy and bylines</h2>
        <p>A feed byline is not required to be a legal name. It can be a collective name, a role, a handle, a house label, or a pseudonym. That choice belongs to the people publishing and to the safety needs of the work.</p>
        <p>Editors can rename or hide bad imported labels in the backend, and the same persisted rules are applied by the live XML endpoints.</p>
      </section>

      <section className="feeds-public-page__panel">
        <h2>Why this matters</h2>
        <p>Feeds make Sabot easier to follow, mirror, cite, preserve, and rebuild. If the homepage changes, the archive still has structure. If social platforms bury a post, the feed still publishes it.</p>
        <Link className="button" to="/archive">Browse the archive</Link>
      </section>
      <PublicationFooter />
    </main>
  )
}
