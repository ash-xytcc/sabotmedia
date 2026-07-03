const STORAGE_KEY = 'sabot.feedSettings.v1'

export const DEFAULT_FEED_SETTINGS = {
  feedsIntroTitle: 'Follow the Sabot Media archive',
  feedsIntroBody: `Sabot Media is built as a public archive, not just a front page that disappears into yesterday. Feeds let readers, researchers, RSS apps, podcast apps, librarians, mirror sites, and other tools follow new work without waiting for an algorithm to notice us.

The main feed follows everything we publish. Format feeds follow one kind of work, like articles, comics, podcasts, newsletters, or print material. Project and collection feeds follow bodies of work. Topic and series feeds follow recurring subjects. Byline feeds follow public byline labels, not legal names.

Those labels are editorial metadata, and they are editable. If an imported category is wrong, if a project name changes, if a contributor publishes under a collective name, or if a byline should never expose a real name, editors can rename or hide the feed term from the backend.

This is boring old-internet infrastructure on purpose. Boring infrastructure can be subscribed to, mirrored, printed, archived, scraped, and preserved by people instead of trapped inside a platform feed run by someone else's machinery.`,
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
      sabotmedia: 'Sabot Media Collective',
      'sabotmedia': 'Sabot Media Collective',
      'Sabot Media': 'Sabot Media Collective',
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
