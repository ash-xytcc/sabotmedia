export const EPISODE_PUBLISHING_SETTINGS_KEY = 'episode-publishing-settings-v1'

export const EPISODE_PUBLISHING_DEFAULTS = Object.freeze({
  youtube: {
    categoryId: '22',
    privacy: 'public',
  },
  peertube: {
    baseUrl: '',
    channelId: '',
    privacy: 'public',
  },
  videoTemplate: {
    width: 1920,
    height: 1080,
    frameRate: 30,
    waveform: true,
    brandingText: 'Sabot Media',
    preset: 'medium',
    crf: 20,
    audioBitrate: '192k',
  },
})

export async function ensureEpisodePublishingSettingsTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS site_settings (
    setting_key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
}

export async function readEpisodePublishingSettings(db) {
  await ensureEpisodePublishingSettingsTable(db)
  const row = await db.prepare('SELECT value_json, updated_at FROM site_settings WHERE setting_key = ? LIMIT 1')
    .bind(EPISODE_PUBLISHING_SETTINGS_KEY)
    .first()
  return {
    settings: normalizeEpisodePublishingSettings(parseObject(row?.value_json)),
    updatedAt: String(row?.updated_at || ''),
  }
}

export async function writeEpisodePublishingSettings(db, input = {}) {
  await ensureEpisodePublishingSettingsTable(db)
  const settings = normalizeEpisodePublishingSettings(input)
  const updatedAt = new Date().toISOString()
  await db.prepare(`INSERT INTO site_settings (setting_key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`)
    .bind(EPISODE_PUBLISHING_SETTINGS_KEY, JSON.stringify(settings), updatedAt)
    .run()
  return { settings, updatedAt }
}

export function episodePublishingConnectionSummary(env = {}, settings = EPISODE_PUBLISHING_DEFAULTS) {
  return {
    worker: {
      configured: Boolean(String(env.EPISODE_WORKER_TOKEN || '').trim()),
    },
    youtube: {
      configured: Boolean(
        String(env.YOUTUBE_CLIENT_ID || '').trim()
        && String(env.YOUTUBE_CLIENT_SECRET || '').trim()
        && String(env.YOUTUBE_REFRESH_TOKEN || '').trim()
      ),
    },
    peertube: {
      configured: Boolean(
        String(env.PEERTUBE_ACCESS_TOKEN || '').trim()
        && String(settings?.peertube?.baseUrl || '').trim()
        && String(settings?.peertube?.channelId || '').trim()
      ),
    },
  }
}

export function normalizeEpisodePublishingSettings(input = {}) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const youtube = raw.youtube && typeof raw.youtube === 'object' ? raw.youtube : {}
  const peertube = raw.peertube && typeof raw.peertube === 'object' ? raw.peertube : {}
  const videoTemplate = raw.videoTemplate && typeof raw.videoTemplate === 'object' ? raw.videoTemplate : {}

  return {
    youtube: {
      categoryId: clean(youtube.categoryId || EPISODE_PUBLISHING_DEFAULTS.youtube.categoryId, 80),
      privacy: youtubePrivacy(youtube.privacy),
    },
    peertube: {
      baseUrl: cleanHttpUrl(peertube.baseUrl),
      channelId: clean(peertube.channelId, 200),
      privacy: peertubePrivacy(peertube.privacy),
    },
    videoTemplate: {
      width: clamp(videoTemplate.width, 640, 3840, EPISODE_PUBLISHING_DEFAULTS.videoTemplate.width),
      height: clamp(videoTemplate.height, 360, 2160, EPISODE_PUBLISHING_DEFAULTS.videoTemplate.height),
      frameRate: clamp(videoTemplate.frameRate, 20, 60, EPISODE_PUBLISHING_DEFAULTS.videoTemplate.frameRate),
      waveform: videoTemplate.waveform !== false,
      brandingText: clean(videoTemplate.brandingText ?? EPISODE_PUBLISHING_DEFAULTS.videoTemplate.brandingText, 200),
      preset: clean(videoTemplate.preset || EPISODE_PUBLISHING_DEFAULTS.videoTemplate.preset, 40),
      crf: clamp(videoTemplate.crf, 16, 30, EPISODE_PUBLISHING_DEFAULTS.videoTemplate.crf),
      audioBitrate: clean(videoTemplate.audioBitrate || EPISODE_PUBLISHING_DEFAULTS.videoTemplate.audioBitrate, 20),
    },
  }
}

function parseObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(String(value || 'null'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function clean(value, max) {
  return String(value || '').trim().slice(0, max)
}

function cleanHttpUrl(value) {
  const raw = clean(value, 2000).replace(/\/$/, '')
  return /^https?:\/\//i.test(raw) ? raw : ''
}

function youtubePrivacy(value) {
  const raw = String(value || '').trim().toLowerCase()
  return ['public', 'private', 'unlisted'].includes(raw) ? raw : EPISODE_PUBLISHING_DEFAULTS.youtube.privacy
}

function peertubePrivacy(value) {
  const raw = String(value || '').trim().toLowerCase()
  return ['public', 'unlisted', 'private', 'internal', 'password'].includes(raw) ? raw : EPISODE_PUBLISHING_DEFAULTS.peertube.privacy
}

function clamp(value, min, max, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback
}
