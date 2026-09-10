import { loadFeedSettings, normalizeFeedTerm, slugifyFeedTerm } from './feedSettings.js'
import { isGenericProject, resolveArchiveProject } from './projectCatalog.js'

const KNOWN_SOURCE_FORMATS = new Set([
  'article',
  'audio',
  'comic',
  'dispatch',
  'newsletter',
  'note',
  'podcast',
  'print',
  'zine',
])

const SPECIFIC_SOURCE_FORMATS = new Set(['audio', 'comic', 'newsletter', 'podcast', 'print', 'zine'])

function escapeXml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function itemDate(item) {
  const d = new Date(String(item.publishedAt || item.scheduledFor || item.updatedAt || item.createdAt || ''))
  return Number.isFinite(d.getTime()) ? d.toUTCString() : new Date().toUTCString()
}

function normalizedKnownFormat(value, settings) {
  const normalized = normalizeFeedTerm('format', value, settings).toLowerCase()
  return KNOWN_SOURCE_FORMATS.has(normalized) ? normalized : ''
}

function sourceFormatHint(item, settings) {
  for (const field of ['sourceContentType', 'sourcePostType', 'sourceLabel']) {
    const format = normalizedKnownFormat(item?.[field], settings)
    if (format) return format
  }
  return ''
}

function titleFormatHint(item) {
  const title = String(item?.title || '').trim().toLowerCase()
  if (/\baudiozine\b/.test(title)) return 'audio'
  if (/\bzine\b/.test(title)) return 'zine'
  return ''
}

function assetLooksAudio(asset) {
  if (!asset) return false
  if (typeof asset === 'string') return /\.(?:mp3|m4a|ogg|oga|wav|flac)(?:$|[?#])/i.test(asset)
  const text = [asset.type, asset.mediaType, asset.mimeType, asset.url, asset.href, asset.publicUrl, asset.filename]
    .map((value) => String(value || ''))
    .join(' ')
  return /\baudio\b|audio\/|\.(?:mp3|m4a|ogg|oga|wav|flac)(?:\b|$)/i.test(text)
}

function hasLegacyAudio(item) {
  if (String(item?.audioSourceUrl || '').trim()) return true
  if (/\baudiozine\b/i.test(`${item?.title || ''} ${item?.sourceLabel || ''}`)) return true
  return (Array.isArray(item?.relatedAssets) ? item.relatedAssets : []).some(assetLooksAudio)
}

function hasPodcastMedia(item) {
  return Boolean(
    String(item?.podcastAudioUrl || '').trim() ||
    String(item?.podcastRssEnclosureUrl || '').trim() ||
    String(item?.podcastDeliveryAudioUrl || '').trim() ||
    String(item?.podcastMasterAudioUrl || '').trim() ||
    String(item?.podcastDuration || '').trim()
  )
}

function projectFormat(project) {
  switch (project?.slug) {
    case 'the-communique':
      return 'newsletter'
    case 'the-sabotuers':
      return 'comic'
    case 'black-cat-distro':
    case 'zines-and-comics':
      return 'print'
    case 'molotov-now':
    case 'the-child-and-its-enemies':
      return 'podcast'
    default:
      return ''
  }
}

export function resolveFeedProject(item, settings = loadFeedSettings()) {
  const storedFormat = normalizedKnownFormat(item?.contentType || item?.type, settings)
  const sourceFormat = sourceFormatHint(item, settings)
  const explicitFormat = titleFormatHint(item) || (hasLegacyAudio(item) ? 'audio' : '')
  const typeHint = hasPodcastMedia(item) ? 'podcast' : explicitFormat || sourceFormat || storedFormat || 'article'
  const project = resolveArchiveProject(item, typeHint)
  if (!project?.name || isGenericProject(project.name)) return ''
  return project.name
}

export function resolveFeedFormat(item, settings = loadFeedSettings()) {
  const storedFormat = normalizedKnownFormat(item?.contentType || item?.type, settings)
  if (storedFormat === 'podcast' || hasPodcastMedia(item)) return 'podcast'

  // Explicit object identity answers "what is this?" before project identity answers
  // "where does it live?". A Black Cat audiozine is audio, and a Black Cat zine is a zine.
  const titleHint = titleFormatHint(item)
  if (titleHint) return titleHint
  if (hasLegacyAudio(item)) return 'audio'

  const sourceFormat = sourceFormatHint(item, settings)
  if (SPECIFIC_SOURCE_FORMATS.has(sourceFormat)) return sourceFormat

  const project = resolveArchiveProject(item, sourceFormat || storedFormat || 'article')
  const canonicalProjectFormat = projectFormat(project)

  // Project identity recovers formats that were lost to broad migration buckets:
  // Communique -> newsletter, Sabotuers -> comic, Black Cat -> print by default.
  if (canonicalProjectFormat) return canonicalProjectFormat

  // Generic source labels such as post/article are still more informative than the
  // migration buckets (dispatch, note and publicBlock).
  if (sourceFormat) return sourceFormat

  // Public reading routes already present native note/dispatch storage records as
  // articles. RSS must follow that editorial type instead of exposing database buckets.
  if (['dispatch', 'note'].includes(storedFormat) || String(item?.contentType || '').toLowerCase() === 'publicblock') {
    return 'article'
  }

  return storedFormat || 'article'
}

function normalizeFeedItem(item, settings) {
  const slug = item.slug || item.id || ''
  const author = normalizeFeedTerm('author', item.author || item.byline || 'Sabot Media Collective', settings) || 'Sabot Media Collective'
  const category = normalizeFeedTerm('format', resolveFeedFormat(item, settings), settings) || 'article'
  return {
    title: item.title || slug || 'Untitled',
    link: slug ? `https://sabot.media/post/${slug}` : 'https://sabot.media/archive',
    description: item.excerpt || item.summary || '',
    date: itemDate(item),
    author,
    category,
  }
}

export function buildRssXml(title, description, items = [], options = {}) {
  const settings = options.settings || loadFeedSettings()
  const feedItems = items.map((item) => normalizeFeedItem(item, settings))
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>https://sabot.media/</link>
    <description>${escapeXml(description)}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${feedItems.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid>${escapeXml(item.link)}</guid>
      <pubDate>${escapeXml(item.date)}</pubDate>
      <author>${escapeXml(item.author)}</author>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.description)}</description>
    </item>`).join('\n')}
  </channel>
</rss>`
}

function getValues(item, fields = []) {
  const values = []
  for (const field of fields) {
    const value = item?.[field]
    if (Array.isArray(value)) values.push(...value)
    else if (value) values.push(value)
  }
  return values
}

function groupBy(items, kind, getter, settings) {
  const groups = {}
  for (const item of items) {
    const keys = getter(item)
    const seen = new Set()
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const clean = normalizeFeedTerm(kind, key, settings)
      if (!clean || seen.has(clean)) continue
      seen.add(clean)
      groups[clean] = groups[clean] || []
      groups[clean].push(item)
    }
  }
  return groups
}

function addGroupedFeeds(bundle, { prefix, titlePrefix, descriptionPrefix, groups, settings }) {
  for (const [term, groupItems] of Object.entries(groups)) {
    const slug = slugifyFeedTerm(term)
    bundle[`${prefix}/${slug}.xml`] = buildRssXml(`${titlePrefix} / ${term}`, `${descriptionPrefix} ${term}.`, groupItems, { settings })
  }
}

function isFeedVisible(item, now = Date.now()) {
  if (item?.status === 'published' || item?.workflowState === 'published') return true
  if (item?.status === 'scheduled' || item?.workflowState === 'scheduled') {
    const scheduled = new Date(String(item?.scheduledFor || '')).getTime()
    return Number.isFinite(scheduled) && scheduled <= now
  }
  return false
}

export function buildRssBundle(items = [], options = {}) {
  const settings = options.settings || loadFeedSettings()
  const now = Number(options.now || Date.now())
  const visible = items.filter((item) => isFeedVisible(item, now))
  const bundle = {}

  if (settings.exposeMainFeed !== false) bundle['all-content.xml'] = buildRssXml('Sabot Media', 'All published Sabot Media content.', visible, { settings })

  if (settings.exposeProjectFeeds !== false) addGroupedFeeds(bundle, {
    prefix: 'projects', titlePrefix: 'Sabot Media', descriptionPrefix: 'Published content for',
    // Project RSS follows the same canonical identity used by the public archive.
    // Generic WordPress categories such as General, podcast, article, etc. are not projects.
    groups: groupBy(visible, 'project', (item) => resolveFeedProject(item, settings), settings), settings,
  })
  if (settings.exposeCollectionFeeds !== false) addGroupedFeeds(bundle, {
    prefix: 'collections', titlePrefix: 'Sabot Media', descriptionPrefix: 'Published content in',
    groups: groupBy(visible, 'collection', (item) => getValues(item, ['collections', 'collection']), settings), settings,
  })
  if (settings.exposeFormatFeeds !== false) addGroupedFeeds(bundle, {
    prefix: 'formats', titlePrefix: 'Sabot Media', descriptionPrefix: 'Published',
    groups: groupBy(visible, 'format', (item) => resolveFeedFormat(item, settings), settings), settings,
  })
  if (settings.exposeAuthorFeeds !== false) addGroupedFeeds(bundle, {
    prefix: 'bylines', titlePrefix: 'Sabot Media', descriptionPrefix: 'Published under the public byline label',
    groups: groupBy(visible, 'author', (item) => item.author || item.byline || 'Sabot Media Collective', settings), settings,
  })
  if (settings.exposeTopicFeeds !== false) addGroupedFeeds(bundle, {
    prefix: 'topics', titlePrefix: 'Sabot Media', descriptionPrefix: 'Published content tagged',
    groups: groupBy(visible, 'topic', (item) => getValues(item, ['topics', 'tags']), settings), settings,
  })
  if (settings.exposeSeriesFeeds !== false) addGroupedFeeds(bundle, {
    prefix: 'series', titlePrefix: 'Sabot Media', descriptionPrefix: 'Published content in',
    groups: groupBy(visible, 'series', (item) => getValues(item, ['series', 'seriesSlug']), settings), settings,
  })

  // Podcast show feeds are deliberately not generated here. The podcast
  // subsystem owns directory-grade RSS (enclosures, iTunes metadata, GUIDs,
  // and one feed per show). A generic formats/podcast.xml feed can still exist
  // as a website-content lane, but it is not a replacement for a show feed.
  return bundle
}

export function downloadRssBundle(items = [], options = {}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const blob = new Blob([JSON.stringify(buildRssBundle(items, options), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `sabot-rss-bundle-${stamp}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
