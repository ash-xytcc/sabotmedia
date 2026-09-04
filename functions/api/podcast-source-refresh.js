import { importPodcastSource } from './_lib/podcastImportService.js'
import { findPodcastShow } from './_lib/podcastSettings.js'
import { SABOT_PODCAST_SOURCES } from './_lib/sabotPodcastSources.js'

const MIN_REFRESH_INTERVAL_MS = 15 * 60 * 1000

export async function onRequestGet(context) {
  const db = context.env?.BF_DB
  if (!db) return json({ ok: false, error: 'podcast refresh unavailable: BF_DB is not bound' }, 503)

  const url = new URL(context.request.url)
  if (url.searchParams.get('refresh') !== '1') {
    return json({ ok: true, refresh: false, sources: SABOT_PODCAST_SOURCES.map(publicSource) })
  }

  const results = []
  let failed = false
  for (const source of SABOT_PODCAST_SOURCES) {
    try {
      const existing = await findPodcastShow(db, source.id) || await findPodcastShow(db, source.feedUrl)
      const lastSynced = new Date(String(existing?.sourceFeedLastSyncedAt || '')).getTime()
      if (Number.isFinite(lastSynced) && Date.now() - lastSynced < MIN_REFRESH_INTERVAL_MS) {
        results.push({ id: source.id, title: source.title, skipped: true, reason: 'recently synced' })
        continue
      }

      const imported = await importPodcastSource(db, {
        feedUrl: source.feedUrl,
        showId: existing?.id || source.id,
        selectedKeys: null,
        syncExisting: true,
        importChannelSettings: true,
      })
      results.push({
        id: source.id,
        title: imported.show?.podcastTitle || source.title,
        sourceEpisodes: imported.selectedCount,
        created: imported.result.created,
        updated: imported.result.updated,
        skipped: imported.result.skipped,
        lastSyncedAt: imported.show?.sourceFeedLastSyncedAt || '',
      })
    } catch (error) {
      failed = true
      results.push({ id: source.id, title: source.title, error: safeError(error) })
    }
  }

  return json({ ok: !failed, refresh: true, results }, failed ? 502 : 200)
}

function publicSource(source) {
  return { id: source.id, title: source.title, feedUrl: source.feedUrl }
}
function safeError(error) {
  const message = String(error?.message || 'refresh failed')
  return message.replace(/https?:\/\/[^\s]+/gi, '[source feed]')
}
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
