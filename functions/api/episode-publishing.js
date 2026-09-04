import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { getExistingNativeEntry } from './_lib/nativePublicContent.js'
import { podcastShowOwnsEntry, readPodcastShows } from './_lib/podcastSettings.js'
import {
  buildEpisodeJobPayload,
  enqueueJob,
  listEpisodePublishingState,
  markDestination,
  normalizeDestinationList,
  retryDestination,
} from './_lib/episodePublishing.js'
import { writeAuditLog, inferActorFromRequest } from './_lib/auditLog.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)
  return json({ ok: true, canEdit: permission.canEdit, authMode: permission.mode })
}

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'valid session required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('episode publishing state')
    const url = new URL(context.request.url)
    const episodeId = String(url.searchParams.get('episodeId') || '').trim()
    if (!episodeId) return json({ ok: false, error: 'episodeId is required' }, 400)
    const episode = await getExistingNativeEntry(db, episodeId)
    if (!episode || episode.contentType !== 'podcast') return json({ ok: false, error: 'podcast episode not found' }, 404)
    const state = await listEpisodePublishingState(db, episode.id)
    return json({ ok: true, mode: 'd1', episodeId: episode.id, ...state })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'valid session required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('episode publishing')

    const body = await context.request.json().catch(() => ({}))
    const action = String(body?.action || 'publish').trim()
    const episodeId = String(body?.episodeId || '').trim()
    if (!episodeId) return json({ ok: false, error: 'episodeId is required' }, 400)
    const episode = await getExistingNativeEntry(db, episodeId)
    if (!episode || episode.contentType !== 'podcast') return json({ ok: false, error: 'podcast episode not found' }, 404)

    const registry = await readPodcastShows(db)
    const show = registry.shows.find((candidate) => podcastShowOwnsEntry(candidate, episode)) || null

    if (action === 'retry') {
      const destination = String(body.destination || '').trim()
      if (!['youtube', 'peertube'].includes(destination)) return json({ ok: false, error: 'retry supports youtube or peertube' }, 400)
      await retryDestination(db, episode.id, destination)
      const state = await listEpisodePublishingState(db, episode.id)
      await audit(context, db, 'episode.publish.retry', episode, { destination })
      return json({ ok: true, mode: 'd1', episodeId: episode.id, ...state })
    }

    if (action === 'syncMetadata') {
      const destination = String(body.destination || '').trim()
      if (!['youtube', 'peertube'].includes(destination)) return json({ ok: false, error: 'metadata sync supports youtube or peertube' }, 400)
      const state = await listEpisodePublishingState(db, episode.id)
      const current = state.destinations.find((item) => item.destination === destination)
      if (!current?.remoteId && !current?.remoteUrl) return json({ ok: false, error: `${destination} has not been published yet` }, 409)
      const override = normalizeOverride(body?.overrides?.[destination] || current.override || {})
      await markDestination(db, episode.id, destination, { status: 'queued', override, remoteId: current.remoteId, remoteUrl: current.remoteUrl })
      await enqueueJob(db, {
        episodeId: episode.id,
        destination,
        jobType: 'sync_metadata',
        idempotencyKey: `${episode.id}:${destination}:metadata:${episode.updatedAt || Date.now()}`,
        payload: {
          ...buildEpisodeJobPayload(episode, show || {}, override),
          remoteId: current.remoteId,
          remoteUrl: current.remoteUrl,
        },
      })
      const nextState = await listEpisodePublishingState(db, episode.id)
      await audit(context, db, 'episode.publish.metadata_sync', episode, { destination })
      return json({ ok: true, mode: 'd1', episodeId: episode.id, ...nextState })
    }

    if (action !== 'publish') return json({ ok: false, error: `unsupported action: ${action}` }, 400)

    const destinations = normalizeDestinationList(body.destinations)
    if (!destinations.length) return json({ ok: false, error: 'select at least one publish destination' }, 400)
    const origin = new URL(context.request.url).origin
    const overrides = body.overrides && typeof body.overrides === 'object' ? body.overrides : {}

    if (destinations.includes('website')) {
      await markDestination(db, episode.id, 'website', {
        status: 'published',
        remoteUrl: `${origin}/post/${encodeURIComponent(episode.slug || episode.id)}`,
      })
    }

    if (destinations.includes('podcastRss')) {
      if (!show) {
        await markDestination(db, episode.id, 'podcastRss', { status: 'failed', lastError: 'Episode is not assigned to a configured podcast show.' })
      } else {
        const feedUrl = absolutize(show.rssFeedUrl || `/feeds/podcasts/${show.slug}.xml`, origin)
        await markDestination(db, episode.id, 'podcastRss', { status: 'published', remoteUrl: feedUrl })
      }
    }

    const videoDestinations = destinations.filter((destination) => destination === 'youtube' || destination === 'peertube')
    if (videoDestinations.length) {
      const audioUrl = episode.podcastRssEnclosureUrl || episode.podcastAudioUrl || ''
      if (!audioUrl) return json({ ok: false, error: 'episode audio is required before video destinations can be queued' }, 400)

      const renderPayload = buildEpisodeJobPayload(episode, show || {}, {})
      const renderJob = await enqueueJob(db, {
        episodeId: episode.id,
        destination: 'video',
        jobType: 'render_video',
        idempotencyKey: `${episode.id}:video:render:v1`,
        payload: renderPayload,
      })

      for (const destination of videoDestinations) {
        const currentState = (await listEpisodePublishingState(db, episode.id)).destinations.find((item) => item.destination === destination)
        if (currentState?.status === 'published' && (currentState.remoteId || currentState.remoteUrl)) continue
        const override = normalizeOverride(overrides[destination])
        await markDestination(db, episode.id, destination, { status: 'queued', lastError: '', override })
        await enqueueJob(db, {
          episodeId: episode.id,
          destination,
          jobType: 'upload_video',
          idempotencyKey: `${episode.id}:${destination}:upload:v1`,
          dependsOnId: renderJob.id,
          payload: buildEpisodeJobPayload(episode, show || {}, override),
        })
      }
    }

    const state = await listEpisodePublishingState(db, episode.id)
    await audit(context, db, 'episode.publish.queue', episode, { destinations })
    return json({ ok: true, mode: 'd1', episodeId: episode.id, ...state })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

async function audit(context, db, action, episode, detail) {
  try {
    await writeAuditLog(db, {
      action,
      entityType: 'podcast_episode',
      entityId: episode.id,
      actor: inferActorFromRequest(context.request),
      detail,
    })
  } catch {
    // Publishing should not fail because the audit table is temporarily unavailable.
  }
}

function normalizeOverride(value = {}) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    title: String(raw.title || '').trim().slice(0, 300),
    description: String(raw.description || '').trim().slice(0, 5000),
    tags: Array.isArray(raw.tags) ? raw.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 50) : [],
    privacy: String(raw.privacy || '').trim().slice(0, 40),
    categoryId: String(raw.categoryId || '').trim().slice(0, 80),
    channelId: String(raw.channelId || '').trim().slice(0, 200),
  }
}

function absolutize(value, origin) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return `${origin}${raw}`
  return raw
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
