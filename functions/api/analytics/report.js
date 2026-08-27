import { resolvePublicSitePermission } from '../_lib/publicSiteAuth.js'
import { daysAgo, ensureAnalyticsTable, json } from './_lib.js'

export async function onRequestGet(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permission.canEdit) return json({ ok: false, error: 'authentication required' }, 403)
  if (!context.env?.BF_DB) return json({ ok: false, error: 'analytics storage unavailable' }, 503)

  try {
    const url = new URL(context.request.url)
    const requestedDays = Number(url.searchParams.get('days') || 30)
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30
    const since = daysAgo(days)
    const today = new Date().toISOString().slice(0, 10)
    await ensureAnalyticsTable(context.env.BF_DB)

    const [summary, daily, pages, referrers, campaigns, devices, browsers, countries, realtime] = await Promise.all([
      context.env.BF_DB.prepare(`
        SELECT
          COUNT(*) AS views,
          COUNT(DISTINCT session_hash) AS visitors,
          SUM(CASE WHEN day = ? THEN 1 ELSE 0 END) AS views_today,
          COUNT(DISTINCT CASE WHEN day = ? THEN session_hash END) AS visitors_today
        FROM analytics_events WHERE day >= ?
      `).bind(today, today, since).first(),
      context.env.BF_DB.prepare(`
        SELECT day, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE day >= ? GROUP BY day ORDER BY day ASC
      `).bind(since).all(),
      context.env.BF_DB.prepare(`
        SELECT campaign AS label, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE day >= ? AND campaign != ''
        GROUP BY campaign ORDER BY views DESC LIMIT 12
      `).bind(since).all(),
      context.env.BF_DB.prepare(`
        SELECT path, MAX(page_title) AS title, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT 15
      `).bind(since).all(),
      context.env.BF_DB.prepare(`
        SELECT referrer_host AS referrer, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE day >= ? AND referrer_host != ''
        GROUP BY referrer_host ORDER BY views DESC LIMIT 12
      `).bind(since).all(),
      context.env.BF_DB.prepare(`
        SELECT device AS label, COUNT(*) AS views FROM analytics_events
        WHERE day >= ? GROUP BY device ORDER BY views DESC
      `).bind(since).all(),
      context.env.BF_DB.prepare(`
        SELECT browser AS label, COUNT(*) AS views FROM analytics_events
        WHERE day >= ? GROUP BY browser ORDER BY views DESC
      `).bind(since).all(),
      context.env.BF_DB.prepare(`
        SELECT country AS label, COUNT(*) AS views FROM analytics_events
        WHERE day >= ? AND country != '' GROUP BY country HAVING COUNT(*) >= 3 ORDER BY views DESC LIMIT 12
      `).bind(since).all(),
      context.env.BF_DB.prepare(`
        SELECT COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE occurred_at >= ?
      `).bind(new Date(Date.now() - 30 * 60_000).toISOString()).first(),
    ])

    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      days,
      summary: normalizeRow(summary),
      realtime: normalizeRow(realtime),
      daily: rows(daily),
      topPages: rows(pages),
      referrers: rows(referrers),
      campaigns: rows(campaigns),
      devices: rows(devices),
      browsers: rows(browsers),
      countries: rows(countries),
      privacy: {
        cookies: false,
        ipAddressesStored: false,
        sessionScope: 'browser tab session; daily rotating hash',
        retention: '400 days',
      },
    })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

function rows(result) {
  return Array.isArray(result?.results) ? result.results.map(normalizeRow) : []
}

function normalizeRow(row) {
  const next = { ...(row || {}) }
  for (const key of ['views', 'visitors', 'views_today', 'visitors_today']) {
    if (key in next) next[key] = Number(next[key] || 0)
  }
  return next
}
