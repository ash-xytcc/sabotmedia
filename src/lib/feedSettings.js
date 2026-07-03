const STORAGE_KEY = 'sabot.feedSettings.v1'

export const DEFAULT_FEED_SETTINGS = {
  feedsIntroTitle: 'Subscribe to Sabot Media',
  feedsIntroBody: `Sabot Media publishes as a public archive, not just a scrolling website. The archive can be followed through feeds for the whole publication, formats, projects, collections, authors, and future series.

Feeds let readers use their own tools instead of waiting for an algorithm to notice us. RSS readers, podcast apps, archiving tools, and other sites can check these feeds for new work and mirror or preserve what we publish.

Every feed is generated from editable metadata. If a category, project, author label, topic, or series name is wrong, it can be changed from the backend without rewriting the site.`,
  feedBasePath: '/feeds',
  exposeMainFeed: true,
  exposeFormatFeeds: true,
  exposeProjectFeeds: true,
  exposeCollectionFeeds: true,
  exposeAuthorFeeds: true,
  exposeTopicFeeds: true,
  exposeSeriesFeeds: true,
  aliases: {
    author: {
      sabotmedia: 'Sabot Media',
      'Sabot Media': 'Sabot Media',
    },
    format: {
      post: 'article',
      posts: 'article',
      audiozine: 'audio',
    },
    project: {},
    collection: {},
    topic: {},
    series: {},
  },
  hiddenTerms: {
    author: [],
    format: [],
    project: [],
    collection: [],
    topic: [],
    series: [],
  },
}

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_FEED_SETTINGS))
}

function mergeSettings(value = {}) {
  const defaults = cloneDefaults()
  return {
    ...defaults,
    ...value,
    aliases: {
      ...defaults.aliases,
      ...(value.aliases || {}),
      author: { ...defaults.aliases.author, ...(value.aliases?.author || {}) },
      format: { ...defaults.aliases.format, ...(value.aliases?.format || {}) },
      project: { ...defaults.aliases.project, ...(value.aliases?.project || {}) },
      collection: { ...defaults.aliases.collection, ...(value.aliases?.collection || {}) },
      topic: { ...defaults.aliases.topic, ...(value.aliases?.topic || {}) },
      series: { ...defaults.aliases.series, ...(value.aliases?.series || {}) },
    },
    hiddenTerms: {
      ...defaults.hiddenTerms,
      ...(value.hiddenTerms || {}),
      author: Array.isArray(value.hiddenTerms?.author) ? value.hiddenTerms.author : defaults.hiddenTerms.author,
      format: Array.isArray(value.hiddenTerms?.format) ? value.hiddenTerms.format : defaults.hiddenTerms.format,
      project: Array.isArray(value.hiddenTerms?.project) ? value.hiddenTerms.project : defaults.hiddenTerms.project,
      collection: Array.isArray(value.hiddenTerms?.collection) ? value.hiddenTerms.collection : defaults.hiddenTerms.collection,
      topic: Array.isArray(value.hiddenTerms?.topic) ? value.hiddenTerms.topic : defaults.hiddenTerms.topic,
      series: Array.isArray(value.hiddenTerms?.series) ? value.hiddenTerms.series : defaults.hiddenTerms.series,
    },
  }
}

export function loadFeedSettings() {
  if (typeof window === 'undefined') return cloneDefaults()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return mergeSettings(raw ? JSON.parse(raw) : {})
  } catch {
    return cloneDefaults()
  }
}

export function saveFeedSettings(settings) {
  const next = mergeSettings(settings)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next, null, 2))
  }
  return next
}

export function resetFeedSettings() {
  const defaults = cloneDefaults()
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults, null, 2))
  }
  return defaults
}

export function normalizeFeedTerm(kind, value, settings = loadFeedSettings()) {
  const clean = String(value || '').trim()
  if (!clean) return ''
  const aliasMap = settings.aliases?.[kind] || {}
  const hidden = new Set((settings.hiddenTerms?.[kind] || []).map((term) => String(term).trim().toLowerCase()))
  const mapped = String(aliasMap[clean] || aliasMap[clean.toLowerCase()] || clean).trim()
  if (!mapped || hidden.has(clean.toLowerCase()) || hidden.has(mapped.toLowerCase())) return ''
  return mapped
}

export function slugifyFeedTerm(value = '') {
  return String(value || 'feed')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'feed'
}
