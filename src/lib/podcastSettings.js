const PODCAST_SETTINGS_KEY = 'sabot-podcast-settings-v1'

const PODCAST_SETTINGS_DEFAULTS = {
  rssFeedUrl: '',
  podcastTitle: 'Sabot Media Podcast',
  author: 'Sabot Media',
  defaultCoverArt: '',
  audioHostBaseUrl: '',
}

export function loadPodcastSettings() {
  try {
    const raw = window.localStorage.getItem(PODCAST_SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      ...PODCAST_SETTINGS_DEFAULTS,
      ...parsed,
    }
  } catch {
    return { ...PODCAST_SETTINGS_DEFAULTS }
  }
}

export function savePodcastSettings(settings) {
  const next = {
    ...PODCAST_SETTINGS_DEFAULTS,
    ...(settings || {}),
  }
  try {
    window.localStorage.setItem(PODCAST_SETTINGS_KEY, JSON.stringify(next))
  } catch {
    // local-only scaffold
  }
  return next
}
