import { inferActorFromRequest, writeAuditLog } from './_lib/auditLog.js'
import { MAX_IMPORT_EPISODES, importPodcastSource, previewPodcastSource } from './_lib/podcastImportService.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'

export async function onRequestPost(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permissionHasCapability(permission, 'publishing:write')) {
    return json({ ok: false, error: 'publishing permission required' }, 403)
  }
  const db = context.env?.BF_DB
  if (!db) return json({ ok: false, error: 'podcast RSS import unavailable: BF_DB is not bound' }, 503)

  try {
    const body = await context.request.json()
    const action = String(body?.action || 'preview').trim().toLowerCase()
    const feedUrl = String(body?.feedUrl || '').trim()
    const requestedShowId = String(body?.showId || '').trim()
    if (!feedUrl) return json({ ok: false, error: 'feedUrl is required' }, 400)

    if (action === 'preview') {
      const preview = await previewPodcastSource(db, { feedUrl, showId: requestedShowId })
      return json({ ok: true, mode: 'd1', action: 'preview', ...preview })
    }

    if (!['import', 'sync', 'resync'].includes(action)) {
      return json({ ok: false, error: 'action must be preview, import, or sync' }, 400)
    }

    const selectedKeys = Array.isArray(body?.selectedKeys)
      ? body.selectedKeys.map((value) => String(value || '')).filter(Boolean)
      : null
    if (selectedKeys && selectedKeys.length > MAX_IMPORT_EPISODES) {
      return json({ ok: false, error: `import at most ${MAX_IMPORT_EPISODES} episodes at a time; select a smaller batch` }, 400)
    }

    const imported = await importPodcastSource(db, {
      feedUrl,
      showId: requestedShowId,
      selectedKeys,
      syncExisting: body?.syncExisting !== false,
      importChannelSettings: body?.importChannelSettings !== false,
    })

    await writeAuditLog(db, {
      action: action === 'import' ? 'podcasts.rss.import' : 'podcasts.rss.sync',
      entityType: 'podcast_show',
      entityId: imported.show.id,
      actor: inferActorFromRequest(context.request),
      detail: {
        showId: imported.show.id,
        showTitle: imported.show.podcastTitle,
        sourceUrl: imported.sourceUrl,
        resolvedUrl: imported.resolvedUrl,
        canonicalFeedUrl: imported.show.rssFeedUrl,
        selected: imported.selectedCount,
        created: imported.result.created,
        updated: imported.result.updated,
        skipped: imported.result.skipped,
        channelSettingsImported: body?.importChannelSettings !== false,
      },
    })

    return json({ ok: true, mode: 'd1', action, ...imported })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, Number(error?.status || 400))
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
