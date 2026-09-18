import { permissionHasCapability, resolvePublicSitePermission } from '../_lib/publicSiteAuth.js'
import { beginHosting, migrateNextAsset, finishHosting, hostingStatus } from '../_lib/podcastHosting.js'
import { ensurePodcastAnalytics } from '../_lib/podcastAnalytics.js'
import { inferActorFromRequest, writeAuditLog } from '../_lib/auditLog.js'

export async function onRequestGet(context) { return handle(context, false) }
export async function onRequestPost(context) { return handle(context, true) }
async function handle(context, mutate) {
  const permission = await resolvePublicSitePermission(context)
  if (mutate ? !permissionHasCapability(permission, 'publishing:write') : !permission.canAccessAdmin) return json({ ok: false, error: 'Podcast admin access required' }, 403)
  if (!context.env?.BF_DB) return json({ ok: false, error: 'BF_DB binding required' }, 503)
  try {
    const body = mutate ? await context.request.json() : {}
    const showId = body.showId || new URL(context.request.url).searchParams.get('show')
    if (!showId) throw new Error('Choose a podcast show')
    if (mutate) {
      if (body.action === 'start') await beginHosting(context, showId)
      else if (body.action === 'next') await migrateNextAsset(context, showId)
      else if (body.action === 'finish') await finishHosting(context, showId)
      else throw new Error('Unknown hosting action')
      if (body.action !== 'next') await writeAuditLog(context.env.BF_DB, { action: `podcasts.hosting.${body.action}`, entityType: 'podcast_show', entityId: showId, actor: inferActorFromRequest(context.request) })
    }
    const status = await hostingStatus(context, showId)
    await ensurePodcastAnalytics(context.env.BF_DB)
    const report = await context.env.BF_DB.prepare(`SELECT episode_id, day, COUNT(*) AS clients, SUM(requests) AS requests,
      SUM(requested_bytes) AS requested_bytes FROM podcast_downloads WHERE day >= date('now', '-89 days') GROUP BY episode_id, day ORDER BY day DESC`).all()
    const ids = new Set(status.entries.map(entry => entry.id))
    return json({ ok: true, show: status.show, storageReady: status.storageReady, totalEpisodes: status.entries.length,
      pending: status.pending.map(({ source, ...task }) => task), missing: status.missing,
      episodes: status.entries.map(entry => ({ id: entry.id, title: entry.title })),
      analytics: (report.results || []).filter(row => ids.has(row.episode_id)) })
  } catch (error) { return json({ ok: false, error: String(error.message || error) }, 400) }
}
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }) }
