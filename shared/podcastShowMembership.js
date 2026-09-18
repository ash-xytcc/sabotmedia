function clean(value) {
  return String(value || '').trim()
}

function normalizeIdentity(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugifyIdentity(value) {
  return normalizeIdentity(value).replace(/\s+/g, '-')
}

function unique(values = []) {
  return [...new Set(values.map(clean).filter(Boolean))]
}

export function podcastShowSourceUrls(show = {}) {
  return unique([
    ...(Array.isArray(show?.sourceFeedUrls) ? show.sourceFeedUrls : []),
    show?.sourceFeedUrl,
    show?.sourceFeedResolvedUrl,
  ])
}

export function explicitPodcastShowIdentities(entry = {}) {
  return unique([
    entry?.primaryProject,
    entry?.primaryProjectSlug,
    entry?.podcastTitle,
    entry?.showTitle,
    entry?.seriesTitle,
    ...(Array.isArray(entry?.projects) ? entry.projects : []),
    ...(Array.isArray(entry?.categories) ? entry.categories : []),
  ])
}

export function podcastEntryBelongsToShow(entry, show) {
  if (!entry || !show) return false
  const contentType = clean(entry?.contentType || entry?.type).toLowerCase()
  if (contentType !== 'podcast' && contentType !== 'audio') return false

  const sourceUrl = clean(entry?.sourceUrl)
  if (sourceUrl && podcastShowSourceUrls(show).includes(sourceUrl)) return true

  const showKeys = unique([
    show?.id,
    show?.slug,
    show?.podcastTitle,
  ]).flatMap((value) => [normalizeIdentity(value), slugifyIdentity(value)])
  const accepted = new Set(showKeys.filter(Boolean))

  return explicitPodcastShowIdentities(entry).some((value) => {
    const normalized = normalizeIdentity(value)
    const slug = slugifyIdentity(value)
    return accepted.has(normalized) || accepted.has(slug)
  })
}
