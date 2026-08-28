export const PODCAST_SETTING_KEY = 'podcast-settings-v1'

export const PODCAST_SETTINGS_DEFAULTS = Object.freeze({
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
})

export async function ensureSiteSettingsTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS site_settings (
    setting_key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_site_settings_updated_at ON site_settings(updated_at DESC)').run()
}

export function normalizePodcastSettings(input = {}) {
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  return {
    ...PODCAST_SETTINGS_DEFAULTS,
    ...value,
    rssFeedUrl: cleanUrl(value.rssFeedUrl || PODCAST_SETTINGS_DEFAULTS.rssFeedUrl),
    podcastTitle: clean(value.podcastTitle || PODCAST_SETTINGS_DEFAULTS.podcastTitle, 200),
    author: clean(value.author || PODCAST_SETTINGS_DEFAULTS.author, 200),
    description: clean(value.description || PODCAST_SETTINGS_DEFAULTS.description, 4000),
    defaultCoverArt: cleanUrl(value.defaultCoverArt),
    audioHostBaseUrl: cleanUrl(value.audioHostBaseUrl),
    websiteUrl: cleanUrl(value.websiteUrl || PODCAST_SETTINGS_DEFAULTS.websiteUrl),
    language: clean(value.language || PODCAST_SETTINGS_DEFAULTS.language, 40).toLowerCase(),
    category: clean(value.category || PODCAST_SETTINGS_DEFAULTS.category, 120),
    explicit: Boolean(value.explicit),
    ownerName: clean(value.ownerName, 200),
    ownerEmail: clean(value.ownerEmail, 254).toLowerCase(),
    sourceFeedUrl: cleanUrl(value.sourceFeedUrl),
    sourceFeedResolvedUrl: cleanUrl(value.sourceFeedResolvedUrl),
    sourceFeedLastSyncedAt: cleanDate(value.sourceFeedLastSyncedAt),
  }
}

export async function readPodcastSettings(db) {
  if (!db) throw new Error('BF_DB binding is required for podcast settings')
  await ensureSiteSettingsTable(db)
  const row = await db.prepare('SELECT value_json, updated_at FROM site_settings WHERE setting_key = ? LIMIT 1')
    .bind(PODCAST_SETTING_KEY)
    .first()
  return {
    settings: normalizePodcastSettings(parseObject(row?.value_json) || {}),
    updatedAt: String(row?.updated_at || ''),
  }
}

export async function writePodcastSettings(db, input = {}) {
  if (!db) throw new Error('BF_DB binding is required for podcast settings')
  await ensureSiteSettingsTable(db)
  const settings = normalizePodcastSettings(input)
  const updatedAt = new Date().toISOString()
  await db.prepare(`INSERT INTO site_settings (setting_key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`)
    .bind(PODCAST_SETTING_KEY, JSON.stringify(settings), updatedAt)
    .run()
  return { settings, updatedAt }
}

function parseObject(value) {
  try {
    const parsed = JSON.parse(String(value || 'null'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function cleanUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 2000)
  return ''
}

function cleanDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const time = new Date(raw).getTime()
  return Number.isFinite(time) ? new Date(time).toISOString() : ''
}
