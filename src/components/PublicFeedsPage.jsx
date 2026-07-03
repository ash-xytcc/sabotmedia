import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { getPieces } from '../lib/pieces'
import { buildRssBundle } from '../lib/rssFeeds'
import { loadFeedSettings } from '../lib/feedSettings'

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
    'all-content.xml': 'everything',
    formats: 'formats',
    projects: 'projects',
    collections: 'collections',
    bylines: 'public byline labels',
    authors: 'public byline labels',
    topics: 'topics',
    series: 'series',
    podcasts: 'podcasts',
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
  const settings = loadFeedSettings()
  const bundle = useMemo(() => buildRssBundle(getPieces(), { settings }), [settings])
  const grouped = groupFeedFiles(Object.keys(bundle).sort())

  return (
    <main className="page feeds-public-page">
      <PublicationTopbar />
      <section className="public-info-page__hero">
        <p className="public-info-page__eyebrow">feeds / syndication / archive</p>
        <h1>{settings.feedsIntroTitle || 'Follow the Sabot Media archive'}</h1>
        <div className="public-info-page__body">
          {renderParagraphs(settings.feedsIntroBody)}
        </div>
      </section>

      <section className="feeds-public-page__panel">
        <h2>How this works</h2>
        <p>Feeds are small machine-readable files that update when new work is published. A reader can subscribe with an RSS reader or compatible app. An archivist can mirror them. Another site can syndicate them. A podcast app can follow audio feeds.</p>
        <p>One piece can appear in several feeds at once. A comic about housing in Grays Harbor could appear in the main feed, the comics feed, a housing topic feed, a Grays Harbor project feed, and a public byline feed. Editors control those labels from the backend.</p>
      </section>

      <section className="feeds-public-page__panel">
        <h2>Available feed groups</h2>
        <p>These are generated from the current archive metadata. Labels may change as the archive is cleaned up, especially for older imported posts whose original categories were inconsistent.</p>
        <div className="feeds-public-page__grid">
          {Object.entries(grouped).map(([group, files]) => (
            <article className="feeds-public-page__group" key={group}>
              <h3>{groupLabel(group)}</h3>
              <p>{groupDescription(group)}</p>
              <ul>
                {files.slice(0, 30).map((file) => (
                  <li key={file}><code>{file}</code></li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="feeds-public-page__panel">
        <h2>Privacy and bylines</h2>
        <p>A feed byline is not required to be a legal name. It can be a collective name, a role, a handle, a house label, or a pseudonym. That choice belongs to the people publishing and to the safety needs of the work.</p>
        <p>Editors can rename or hide bad imported labels in the backend. If a feed label looks wrong, it means the metadata still needs cleanup, not that the archive structure is broken.</p>
      </section>

      <section className="feeds-public-page__panel">
        <h2>Why this matters</h2>
        <p>Feeds make Sabot easier to follow, mirror, cite, preserve, and rebuild. If the homepage changes, the archive still has structure. If social platforms bury a post, the feed still publishes it. If someone wants only comics, only podcasts, only a campaign collection, or only one recurring series, they can follow exactly that.</p>
        <p>This is public infrastructure for independent media: useful, portable, and not trapped inside one platform.</p>
        <Link className="button" to="/archive">Browse the archive</Link>
      </section>
      <PublicationFooter />
    </main>
  )
}
