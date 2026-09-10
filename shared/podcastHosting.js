export function podcastAudioPath(id) {
  return `/api/podcasts/audio?id=${encodeURIComponent(id)}`
}

export function podcastCoverPath(slug) {
  const clean = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return clean ? `/podcast-covers/${clean}` : ''
}

export function storedMediaKey(value, origin = 'https://sabot.media') {
  try {
    const url = new URL(value, origin)
    const key = url.searchParams.get('key') || ''
    return url.origin === new URL(origin).origin && url.pathname === '/api/media/files'
      && key.startsWith('media/uploads/') && !key.includes('..') ? key : ''
  } catch { return '' }
}

// Podcast migrations may have been initiated from a Pages/preview hostname even
// though the canonical public site is sabot.media. The object key is still ours.
// Only trust cross-origin references for the dedicated migration namespace.
export function migratedPodcastMediaKey(value, origin = 'https://sabot.media') {
  const sameOrigin = storedMediaKey(value, origin)
  if (sameOrigin) return sameOrigin
  try {
    const url = new URL(value, origin)
    const key = url.searchParams.get('key') || ''
    return url.pathname === '/api/media/files'
      && key.startsWith('media/uploads/podcast-migration/') && !key.includes('..') ? key : ''
  } catch { return '' }
}

export function isPodcastCoverMimeType(value = '') {
  const mimeType = String(value || '').split(';')[0].trim().toLowerCase()
  return mimeType === 'image/jpeg' || mimeType === 'image/png'
}

export function podcastAudioSource(item = {}) {
  const canonical = (item.relatedAssets || []).find(asset => asset.role === 'canonical-audio')
  const delivery = (item.relatedAssets || []).find(asset => asset.role === 'delivery')
  return canonical?.url || delivery?.url || item.podcastDeliveryAudioUrl || item.podcastRssEnclosureUrl || item.podcastAudioUrl || item.audioSourceUrl || ''
}

// Invalid/multipart syntax is ignored; unsatisfiable byte ranges receive 416.
export function podcastRange(header, size) {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) return null
  if (!size) return { unsatisfiable: true }
  let start, end
  if (!match[1]) {
    const suffix = Number(match[2])
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return { unsatisfiable: true }
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Number(match[2]) : size - 1
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return { unsatisfiable: true }
    end = Math.min(end, size - 1)
  }
  return { start, end, length: end - start + 1 }
}

// Remove only Acast's automatically appended hosting/privacy sentence.
export function withoutAcastFooter(value = '') {
  return String(value).replace(/Hosted on Acast\.\s*See\s*(?:<a\b[^>]*>)?acast\.com\/privacy(?:<\/a>)?\s*for more information\./gi, '')
    // Imported plain-text summaries can end partway through the automatic footer.
    .replace(/Hosted on Acast\.\s*See\s+acast[^<\n]*$/gi, '')
    .replace(/<p\b[^>]*>\s*(?:&nbsp;\s*)*<\/p>/gi, '').trim()
}
