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

export function PublicFeedsPage() {
  const settings = loadFeedSettings()
  const bundle = useMemo(() => buildRssBundle(getPieces(), { settings }), [settings])
  const grouped = groupFeedFiles(Object.keys(bundle).sort())

  return (
    <main className="page feeds-public-page">
      <PublicationTopbar />
      <section className="public-info-page__hero">
        <p className="public-info-page__eyebrow">feeds / syndication / archive</p>
        <h1>{settings.feedsIntroTitle || 'Subscribe to Sabot Media'}</h1>
        <div className="public-info-page__body">
          {renderParagraphs(settings.feedsIntroBody)}
        </div>
      </section>

      <section className="feeds-public-page__panel">
        <h2>Available feeds</h2>
        <p>These feeds are generated from the archive metadata. Some are broad, some are narrow, and all of them are meant for RSS readers, podcast apps, archiving tools, and other software that follows published work.</p>
        <div className="feeds-public-page__grid">
          {Object.entries(grouped).map(([group, files]) => (
            <article className="feeds-public-page__group" key={group}>
              <h3>{group === 'all-content.xml' ? 'everything' : group.replace(/-/g, ' ')}</h3>
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
        <h2>What this means</h2>
        <p>Readers can follow only what they care about: everything, articles, podcasts, comics, print work, a collection, a project, a topic, or an author label. Editors can rename or hide messy imported labels from the backend as the archive gets cleaned up.</p>
        <p>This is deliberately boring old-internet infrastructure. Boring infrastructure survives better than algorithmic confetti.</p>
        <Link className="button" to="/archive">Browse the archive</Link>
      </section>
      <PublicationFooter />
    </main>
  )
}
