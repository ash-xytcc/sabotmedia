const DAY_MS = 86_400_000

export async function ensureAnalyticsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      day TEXT NOT NULL,
      path TEXT NOT NULL,
      page_title TEXT NOT NULL DEFAULT '',
      session_hash TEXT NOT NULL,
      referrer_host TEXT NOT NULL DEFAULT '',
      referrer_path TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'direct',
      medium TEXT NOT NULL DEFAULT 'none',
      campaign TEXT NOT NULL DEFAULT '',
      device TEXT NOT NULL DEFAULT 'desktop',
      browser TEXT NOT NULL DEFAULT 'other',
      country TEXT NOT NULL DEFAULT '',
      event_type TEXT NOT NULL DEFAULT 'pageview'
    );
  `).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events(occurred_at DESC);').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_events_day ON analytics_events(day);').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(day, session_hash);').run()
}

export function cleanPath(value) {
  const path = String(value || '/').split('?')[0].split('#')[0]
  if (!path.startsWith('/') || path.length > 500) return '/'
  return path.replace(/\/{2,}/g, '/') || '/'
}

export function cleanText(value, max = 180) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)
}

export function parseReferrer(value, siteOrigin) {
  try {
    const ref = new URL(String(value || ''))
    const site = new URL(siteOrigin)
    if (ref.hostname === site.hostname || ref.hostname === `www.${site.hostname}`) {
      return { host: '', path: cleanPath(ref.pathname), source: 'internal', medium: 'navigation' }
    }
    return {
      host: cleanText(ref.hostname.replace(/^www\./, ''), 120),
      path: cleanPath(ref.pathname),
      source: cleanText(ref.hostname.replace(/^www\./, ''), 120),
      medium: 'referral',
    }
  } catch {
    return { host: '', path: '', source: 'direct', medium: 'none' }
  }
}

export function parseDevice(userAgent) {
  const ua = String(userAgent || '')
  if (/bot|crawler|spider|preview|facebookexternalhit|slurp/i.test(ua)) return { bot: true, device: 'bot', browser: 'bot' }
  const device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobile|iphone|android/i.test(ua) ? 'mobile' : 'desktop'
  const browser = /firefox/i.test(ua)
    ? 'Firefox'
    : /edg\//i.test(ua)
      ? 'Edge'
      : /chrome|crios/i.test(ua)
        ? 'Chrome'
        : /safari/i.test(ua)
          ? 'Safari'
          : 'Other'
  return { bot: false, device, browser }
}

export async function hashSession(value) {
  const bytes = new TextEncoder().encode(String(value || ''))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function daysAgo(days) {
  return new Date(Date.now() - Math.max(0, days - 1) * DAY_MS).toISOString().slice(0, 10)
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
