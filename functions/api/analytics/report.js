import { permissionHasCapability, resolvePublicSitePermission } from '../_lib/publicSiteAuth.js'
import { daysAgo, ensureAnalyticsTable, json } from './_lib.js'
import { resolveNamedQueries } from './reportQueries.js'

export async function onRequestGet(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permissionHasCapability(permission, 'analytics:view')) return json({ ok: false, error: 'analytics-view permission required' }, 403)
  if (!context.env?.BF_DB) return json({ ok: false, error: 'analytics storage unavailable' }, 503)

  try {
    const url = new URL(context.request.url)
    const requestedDays = Number(url.searchParams.get('days') || 30)
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30
    const since = daysAgo(days)
    const today = new Date().toISOString().slice(0, 10)
    const db = context.env.BF_DB
    await ensureAnalyticsTable(db)

    const report = await resolveNamedQueries({
      summary: db.prepare(`SELECT COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors,
          SUM(CASE WHEN day = ? THEN 1 ELSE 0 END) AS views_today,
          COUNT(DISTINCT CASE WHEN day = ? THEN session_hash END) AS visitors_today
        FROM analytics_events WHERE day >= ?`).bind(today, today, since).first(),
      daily: db.prepare(`SELECT day, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE day >= ? GROUP BY day ORDER BY day ASC`).bind(since).all(),
      topPages: db.prepare(`SELECT path, MAX(page_title) AS title, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT 15`).bind(since).all(),
      referrers: db.prepare(`SELECT referrer_host AS referrer, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE day >= ? AND referrer_host != '' GROUP BY referrer_host ORDER BY views DESC LIMIT 12`).bind(since).all(),
      campaigns: db.prepare(`SELECT campaign AS label, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE day >= ? AND campaign != '' GROUP BY campaign ORDER BY views DESC LIMIT 12`).bind(since).all(),
      devices: db.prepare(`SELECT device AS label, COUNT(*) AS views FROM analytics_events WHERE day >= ? GROUP BY device ORDER BY views DESC`).bind(since).all(),
      browsers: db.prepare(`SELECT browser AS label, COUNT(*) AS views FROM analytics_events WHERE day >= ? GROUP BY browser ORDER BY views DESC`).bind(since).all(),
      countries: db.prepare(`SELECT country AS label, COUNT(*) AS views FROM analytics_events
        WHERE day >= ? AND country != '' GROUP BY country HAVING COUNT(*) >= 3 ORDER BY views DESC LIMIT 12`).bind(since).all(),
      realtime: db.prepare(`SELECT COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
        FROM analytics_events WHERE occurred_at >= ?`).bind(new Date(Date.now() - 30 * 60_000).toISOString()).first(),
    })

    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      days,
      summary: normalizeRow(report.summary),
      realtime: normalizeRow(report.realtime),
      daily: rows(report.daily),
      topPages: rows(report.topPages),
      referrers: rows(report.referrers),
      campaigns: rows(report.campaigns),
      devices: rows(report.devices),
      browsers: rows(report.browsers),
      countries: rows(report.countries),
      privacy: { cookies: false, ipAddressesStored: false, sessionScope: 'browser tab session; daily rotating hash', retention: '400 days' },
    })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

function rows(result) { return Array.isArray(result?.results) ? result.results.map(normalizeRow) : [] }
function normalizeRow(row) {
  const next = { ...(row || {}) }
  for (const key of ['views', 'visitors', 'views_today', 'visitors_today']) if (key in next) next[key] = Number(next[key] || 0)
  return next
}
