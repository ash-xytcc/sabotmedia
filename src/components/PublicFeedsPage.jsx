import { useEffect, useMemo, useState } from 'react'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { DEFAULT_FEED_SETTINGS, loadFeedSettingsAsync } from '../lib/feedSettings.js'
import { loadFeedManifest } from '../lib/feedManifestApi.js'
import { EditableText } from './EditableText'
import { EditableLink } from './EditableLink'

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
    bylines: 'public byline labels', authors: 'public byline labels', series: 'series',
    campaigns: 'campaigns',
  }
  return labels[group] || group.replace(/-/g, ' ')
}

function groupDescription(group) {
  const descriptions = {
    'all-content.xml': 'New work from across Sabot Media, in one feed.',
    formats: 'Follow one kind of published website content, such as articles, comics, newsletters, print material, audio, or podcast posts.',
    projects: 'Follow work connected to a project or public organizing body.',
    collections: 'Follow curated bodies of work, campaigns, issues, readers, or publication packages.',
    bylines: 'Follow public byline labels. These may be collective names, pseudonyms, handles, or house labels.',
    authors: 'Follow public byline labels. These may be collective names, pseudonyms, handles, or house labels.',
    series: 'Follow recurring columns, comics, newsletters, shows, or other serial work.',
    campaigns: 'Follow updates from a specific published campaign hub.',
  }
  return descriptions[group] || 'Subscribe for new work in this part of the archive.'
}

export function PublicFeedsPage() {
  const [settings, setSettings] = useState(DEFAULT_FEED_SETTINGS)
  const [files, setFiles] = useState([])
  const [podcastShows, setPodcastShows] = useState([])
  const [podcastDefaultAlias, setPodcastDefaultAlias] = useState('')
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
      if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value)
      else nextErrors.push(`Feed configuration: ${String(settingsResult.reason?.message || settingsResult.reason)}`)

      if (manifestResult.status === 'fulfilled') {
        setFiles(manifestResult.value.files)
        setPodcastShows(manifestResult.value.podcastShows || [])
        setPodcastDefaultAlias(String(manifestResult.value.podcastDefaultAlias || ''))
        setItemCount(Number(manifestResult.value.itemCount || 0))
      } else {
        setFiles([])
        setPodcastShows([])
        setPodcastDefaultAlias('')
        setItemCount(0)
        nextErrors.push(`Live feed endpoints: ${String(manifestResult.reason?.message || manifestResult.reason)}`)
      }

      setErrors(nextErrors)
      setState(nextErrors.length ? 'error' : 'loaded')
    }
    boot()
    return () => { cancelled = true }
  }, [])

  const grouped = useMemo(() => groupFeedFiles(files.filter((file) => !file.startsWith('podcasts/') && !file.startsWith('topics/'))), [files])
  const mainFeedAvailable = files.includes('all-content.xml')

  return (
    <main className="page feeds-public-page">
      <PublicationTopbar />
      <section className="public-info-page__hero">
        <EditableText as="p" className="public-info-page__eyebrow" field="feeds.hero.eyebrow">feeds / syndication / archive</EditableText>
        <EditableText as="h1" field="feeds.hero.title">{settings.feedsIntroTitle === 'Follow the Sabot Media archive' ? 'Follow Sabot on your own terms' : settings.feedsIntroTitle}</EditableText>
        <EditableText as="div" className="public-info-page__body" field="feeds.hero.body" multiline>{String(settings.feedsIntroBody || '').startsWith('Sabot Media is built as a public archive, not just a front page') ? 'Get new articles, dispatches and podcast episodes in an app you choose. RSS is a simple way to follow our work without a social media account or an algorithm deciding what reaches you.' : settings.feedsIntroBody}</EditableText>
        {state === 'loading' ? <p className="description" role="status">Loading live feed endpoints…</p> : null}
        {errors.length ? (
          <div className="notice notice-error" role="alert">
            <p><strong>Some live feed data could not be loaded.</strong></p>
            <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        ) : null}
        {mainFeedAvailable ? <EditableLink className="button button--primary" labelField="feeds.actions.main.label" hrefField="feeds.actions.main.href" defaultLabel="Open main RSS feed" defaultHref="/feeds/all-content.xml" /> : null}
      </section>

      <section className="feeds-public-page__panel">
        <EditableText as="h2" field="feeds.how.title">How this works</EditableText>
        <EditableText as="div" className="public-info-page__body" field="feeds.how.body" multiline>{`For reading: copy the main RSS feed link into your feed reader. To follow a particular project or kind of work, choose one of the feeds below.

For listening: copy a named podcast feed into your podcast app. Look for “Add by RSS” or “Follow by URL.” Each show has its own feed, so you can subscribe to the ones you want.

Sabot Media hosts our podcast audio and publishes these RSS feeds directly. New episodes are published here and delivered to the apps following these feeds.

The podcast format feed (formats/podcast.xml) follows website posts across our shows. Use a named show feed for a podcast subscription. Older imported archive pieces may not yet appear in the live feeds; you can still find them in the archive.`}</EditableText>
      </section>

      <section className="feeds-public-page__panel">
        <EditableText as="h2" field="feeds.available.title">Choose a feed</EditableText>
        <p>{itemCount} published {itemCount === 1 ? 'entry is' : 'entries are'} available through these feeds.</p>
        <div className="feeds-public-page__grid">
          {podcastShows.length ? (
            <article className="feeds-public-page__group">
              <h3>Listen to our podcasts</h3>
              <p>Audio hosted by Sabot Media. Copy a show’s feed link into your podcast app to follow new episodes.</p>
              <ul>
                {podcastShows.map((show) => (
                  <li key={show.id || show.slug}>
                    <a href={`/feeds/${show.feedPath}`}><strong>{show.title || show.slug}</strong></a>
                    {' '}<code>{show.feedPath}</code>
                    {show.episodeCount != null ? <span> · {Number(show.episodeCount)} episode{Number(show.episodeCount) === 1 ? '' : 's'}</span> : null}
                  </li>
                ))}
              </ul>
              {podcastDefaultAlias ? <p className="description"><code>{podcastDefaultAlias}</code> is an older address for the default show, not a combined feed of every podcast. Use the named show links above when subscribing.</p> : null}
            </article>
          ) : null}

          {Object.entries(grouped).map(([group, groupFiles]) => (
            <article className="feeds-public-page__group" key={group}>
              <h3>{groupLabel(group)}</h3>
              <p>{groupDescription(group)}</p>
              <ul>
                {groupFiles.slice(0, 50).map((file) => <li key={file}><a href={`/feeds/${file}`}><code>{file}</code></a></li>)}
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
        <EditableText as="h2" field="feeds.privacy.title">Privacy and bylines</EditableText>
        <EditableText as="div" field="feeds.privacy.body" multiline>{`A feed byline is not required to be a legal name. It can be a collective name, a role, a handle, a house label, or a pseudonym. That choice belongs to the people publishing and to the safety needs of the work.

The byline you see in a feed follows the public credit on the work.`}</EditableText>
      </section>

      <section className="feeds-public-page__panel">
        <EditableText as="h2" field="feeds.why.title">Why this matters</EditableText>
        <EditableText as="p" field="feeds.why.body" multiline>Feeds make Sabot easier to follow, mirror, cite, preserve, and rebuild. If the homepage changes, the archive still has structure. If social platforms bury a post, the feed still publishes it.</EditableText>
        <EditableLink className="button" labelField="feeds.actions.archive.label" hrefField="feeds.actions.archive.href" defaultLabel="Browse the archive" defaultHref="/archive" />
      </section>
      <PublicationFooter />
    </main>
  )
}
