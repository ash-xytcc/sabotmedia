import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { getPieces } from '../lib/pieces'
import { buildRssBundle } from '../lib/rssFeeds'
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
    'all-content.xml': 'The broad feed for everything published across the archive.',
    formats: 'Follow one kind of work, such as articles, comics, newsletters, print material, or podcasts.',
    projects: 'Follow work connected to a project or public organizing body.',
    collections: 'Follow curated bodies of work, campaigns, issues, readers, or publication packages.',
    bylines: 'Follow public byline labels. These may be collective names, pseudonyms, handles, or house labels.',
    authors: 'Follow public byline labels. These may be collective names, pseudonyms, handles, or house labels.',
    topics: 'Follow subjects across formats and projects.',
    series: 'Follow recurring columns, comics, newsletters, shows, or other serial work.',
    podcasts: 'Follow audio and podcast material.',
  }
  return descriptions[group] || 'A generated feed from the public archive metadata.'
}

export function PublicFeedsPage() {
  const [settings, setSettings] = useState(DEFAULT_FEED_SETTINGS)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadFeedSettingsAsync()
      .then((loaded) => {
        if (!cancelled) {
          setSettings(loaded)
          setState('loaded')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err?.message || err))
          setState('error')
        }
      })
    return () => { cancelled = true }
  }, [])

  const bundle = useMemo(() => buildRssBundle(getPieces(), { settings }), [settings])
  const grouped = groupFeedFiles(Object.keys(bundle).sort())

  return (
    <main className="page feeds-public-page">
      <PublicationTopbar />
      <section className="public-info-page__hero">
        <p className="public-info-page__eyebrow">feeds / syndication / archive</p>
        <h1>{settings.feedsIntroTitle || 'Follow the Sabot Media archive'}</h1>
        <div className="public-info-page__body">{renderParagraphs(settings.feedsIntroBody)}</div>
        {state === 'loading' ? <p className="description" role="status">Loading feed configuration…</p> : null}
        {error ? <p className="description" role="status">Feed configuration could not be loaded. Showing safe defaults. {error}</p> : null}
      </section>

      <section className="feeds-public-page__panel">
        <h2>How this works</h2>
        <p>Feeds are small machine-readable files that update when new work is published. A reader can subscribe with an RSS reader or compatible app. An archivist can mirror them. Another site can syndicate them. A podcast app can follow audio feeds.</p>
        <p>One piece can appear in several feeds at once. Editors control those labels from the backend.</p>
      </section>

      <section className="feeds-public-page__panel">
        <h2>Available feed groups</h2>
        <p>These are generated from the current archive metadata and the persisted public feed configuration.</p>
        <div className="feeds-public-page__grid">
          {Object.entries(grouped).map(([group, files]) => (
            <article className="feeds-public-page__group" key={group}>
              <h3>{groupLabel(group)}</h3>
              <p>{groupDescription(group)}</p>
              <ul>{files.slice(0, 30).map((file) => <li key={file}><code>{file}</code></li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="feeds-public-page__panel">
        <h2>Privacy and bylines</h2>
        <p>A feed byline is not required to be a legal name. It can be a collective name, a role, a handle, a house label, or a pseudonym. That choice belongs to the people publishing and to the safety needs of the work.</p>
        <p>Editors can rename or hide bad imported labels in the backend.</p>
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
