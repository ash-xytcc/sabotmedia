export const PODCAST_SETTINGS_DEFAULTS = {
  rssFeedUrl: 'https://sabot.media/feeds/podcasts/all.xml',
  podcastTitle: 'Sabot Media Podcast',
  author: 'Sabot Media',
  description: 'Sabot Media podcast and AudioLab episodes.',
  defaultCoverArt: '',
  audioHostBaseUrl: '',
  websiteUrl: 'https://sabot.media',
  language: 'en-us',
  category: 'News',
  explicit: false,
  ownerName: '',
  ownerEmail: '',
  sourceFeedUrl: '',
  sourceFeedResolvedUrl: '',
  sourceFeedLastSyncedAt: '',
}

export function loadPodcastSettings() {
  return { ...PODCAST_SETTINGS_DEFAULTS }
}

export function mergePodcastSettings(value = {}) {
  const input = value && typeof value === 'object' ? value : {}
  return { ...PODCAST_SETTINGS_DEFAULTS, ...input }
}

export async function loadPodcastSettingsAsync() {
  const response = await fetch('/api/podcast-settings', {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1') {
    throw new Error(data?.error || `podcast settings request failed: ${response.status}`)
  }
  return mergePodcastSettings(data.settings)
}

export async function savePodcastSettings(settings) {
  const next = mergePodcastSettings(settings)
  const response = await fetch('/api/podcast-settings', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ settings: next }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1') {
    throw new Error(data?.error || `podcast settings save failed: ${response.status}`)
  }
  return mergePodcastSettings(data.settings || next)
}
