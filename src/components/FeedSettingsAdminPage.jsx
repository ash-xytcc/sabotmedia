import { useMemo, useState } from 'react'
import { AdminFrame } from './AdminRail'
import { getPieces } from '../lib/pieces'
import { loadFeedSettings, resetFeedSettings, saveFeedSettings } from '../lib/feedSettings'
import { buildRssBundle, downloadRssBundle } from '../lib/rssFeeds'

const KINDS = [
  ['format', 'Formats'],
  ['project', 'Projects'],
  ['collection', 'Collections'],
  ['author', 'Author labels'],
  ['topic', 'Topics'],
  ['series', 'Series'],
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

function collectTerms(items = [], kind) {
  const terms = new Set()
  for (const item of items) {
    if (kind === 'format') terms.add(item.contentType || item.type || 'article')
    if (kind === 'author') terms.add(item.author || item.byline || 'Sabot Media')
    if (kind === 'project') [item.primaryProject, ...(item.projects || []), ...(item.categories || [])].forEach((value) => value && terms.add(value))
    if (kind === 'collection') [item.collection, ...(item.collections || [])].forEach((value) => value && terms.add(value))
    if (kind === 'topic') [...(item.topics || []), ...(item.tags || [])].forEach((value) => value && terms.add(value))
    if (kind === 'series') [item.series, item.seriesSlug].forEach((value) => value && terms.add(value))
  }
  return [...terms].sort((a, b) => String(a).localeCompare(String(b)))
}

export function FeedSettingsAdminPage() {
  const [settings, setSettings] = useState(() => loadFeedSettings())
  const [status, setStatus] = useState('')
  const pieces = useMemo(() => getPieces(), [])
  const bundle = useMemo(() => buildRssBundle(pieces, { settings }), [pieces, settings])

  function updateField(field, value) {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  function updateAlias(kind, value) {
    setSettings((current) => ({
      ...current,
      aliases: {
        ...(current.aliases || {}),
        [kind]: textToAliases(value),
      },
    }))
  }

  function updateHidden(kind, value) {
    setSettings((current) => ({
      ...current,
      hiddenTerms: {
        ...(current.hiddenTerms || {}),
        [kind]: textToList(value),
      },
    }))
  }

  function save() {
    const next = saveFeedSettings(settings)
    setSettings(next)
    setStatus('Feed settings saved in this browser. Export a backup after major taxonomy cleanup.')
  }

  function reset() {
    const next = resetFeedSettings()
    setSettings(next)
    setStatus('Feed settings reset to defaults.')
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen feeds-admin-page">
        <div className="wp-screen-header">
          <div>
            <h1>Feeds</h1>
            <p className="description">Control public RSS taxonomy, aliases, labels, visibility, and the public explanation page.</p>
          </div>
          <div className="review-card__actions">
            <button className="button" type="button" onClick={() => downloadRssBundle(pieces, { settings })}>Export RSS Bundle</button>
            <button className="button" type="button" onClick={reset}>Reset</button>
            <button className="button button--primary" type="button" onClick={save}>Save Feed Settings</button>
          </div>
        </div>

        <section className="wp-meta-box">
          <h2>Public feeds page</h2>
          <div className="wp-settings-form">
            <label>
              <span>Page title</span>
              <input value={settings.feedsIntroTitle || ''} onChange={(event) => updateField('feedsIntroTitle', event.target.value)} />
            </label>
            <label>
              <span>Intro copy</span>
              <textarea rows={9} value={settings.feedsIntroBody || ''} onChange={(event) => updateField('feedsIntroBody', event.target.value)} />
            </label>
          </div>
        </section>

        <section className="wp-meta-box">
          <h2>Enabled feed groups</h2>
          <div className="feed-toggle-grid">
            {[
              ['exposeMainFeed', 'Everything'],
              ['exposeFormatFeeds', 'Formats'],
              ['exposeProjectFeeds', 'Projects'],
              ['exposeCollectionFeeds', 'Collections'],
              ['exposeAuthorFeeds', 'Author labels'],
              ['exposeTopicFeeds', 'Topics'],
              ['exposeSeriesFeeds', 'Series'],
            ].map(([field, label]) => (
              <label key={field} className="native-content-editor__check">
                <input type="checkbox" checked={settings[field] !== false} onChange={(event) => updateField(field, event.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="description">Generated now: {Object.keys(bundle).length} feed files.</p>
        </section>

        {KINDS.map(([kind, label]) => (
          <section className="wp-meta-box" key={kind}>
            <h2>{label}</h2>
            <p className="description">Use one alias per line, like <code>old label =&gt; new label</code>. Hide wrong/imported junk terms by listing them below.</p>
            <div className="feed-taxonomy-grid">
              <label>
                <span>Aliases</span>
                <textarea rows={6} value={aliasesToText(settings.aliases?.[kind])} onChange={(event) => updateAlias(kind, event.target.value)} />
              </label>
              <label>
                <span>Hidden terms</span>
                <textarea rows={6} value={listToText(settings.hiddenTerms?.[kind])} onChange={(event) => updateHidden(kind, event.target.value)} />
              </label>
              <div className="feed-term-preview">
                <strong>Detected terms</strong>
                <div>
                  {collectTerms(pieces, kind).slice(0, 80).map((term) => <span key={term}>{term}</span>)}
                </div>
              </div>
            </div>
          </section>
        ))}

        {status ? <p className="description" role="status">{status}</p> : null}
      </main>
    </AdminFrame>
  )
}
