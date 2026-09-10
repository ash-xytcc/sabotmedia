import { ensureSiteSettingsTable } from './podcastSettings.js'

export async function ensurePodcastAnalytics(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS podcast_downloads (
    day TEXT NOT NULL, episode_id TEXT NOT NULL, client_hash TEXT NOT NULL,
    requests INTEGER NOT NULL DEFAULT 1, requested_bytes INTEGER NOT NULL DEFAULT 0,
    app TEXT NOT NULL DEFAULT 'Other', country TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (day, episode_id, client_hash)
  )`).run()
}

export function podcastApp(ua = '') {
  if (/applecoremedia|podcasts\/|itunes/i.test(ua)) return 'Apple Podcasts'
  if (/spotify/i.test(ua)) return 'Spotify'
  if (/antenna.?pod/i.test(ua)) return 'AntennaPod'
  if (/pocket.?casts/i.test(ua)) return 'Pocket Casts'
  if (/overcast/i.test(ua)) return 'Overcast'
  if (/mozilla/i.test(ua)) return 'Web browser'
  return 'Other'
}

export async function recordPodcastDownload(context, episodeId, bytes) {
  const db = context.env?.BF_DB
  const ua = context.request.headers.get('user-agent') || ''
  const ip = context.request.headers.get('cf-connecting-ip') || ''
  if (!db || !ip || !ua || /bot|crawler|spider|preview|headless|curl|wget|uptime/i.test(ua)
    || context.request.cf?.botManagement?.verifiedBot) return
  await ensurePodcastAnalytics(db)
  await ensureSiteSettingsTable(db)
  await db.prepare('INSERT OR IGNORE INTO site_settings (setting_key, value_json) VALUES (?, ?)')
    .bind('podcast-analytics-secret-v1', JSON.stringify(crypto.randomUUID())).run()
  const secret = await db.prepare('SELECT value_json FROM site_settings WHERE setting_key = ?')
    .bind('podcast-analytics-secret-v1').first()
  const day = new Date().toISOString().slice(0, 10)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret.value_json), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${day}\n${episodeId}\n${ip}\n${ua.slice(0, 500)}`))
  const hash = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('')
  await db.prepare(`INSERT INTO podcast_downloads (day, episode_id, client_hash, requested_bytes, app, country)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(day, episode_id, client_hash) DO UPDATE SET
    requests = requests + 1, requested_bytes = requested_bytes + excluded.requested_bytes`)
    .bind(day, episodeId, hash, bytes, podcastApp(ua), String(context.request.cf?.country || '').slice(0, 2)).run()
  // Retain daily deduplication records for 90 days; no raw IP or user agent is stored.
  await db.prepare("DELETE FROM podcast_downloads WHERE day < date('now', '-89 days')").run()
}
