import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { decorateAiCampaignForPublic } from './_lib/aiCampaignPublic.js'
import { ensureAiCampaign } from './_lib/campaigns.js'
import {
  AI_COVERAGE_CAMPAIGN,
  ensureAiCoverageArchiveTables,
  getAiCoverageArchiveSummary,
  listAiCoverageArchive,
  refreshGdeltCoverageIfStale,
  upsertAiCoverageItems,
} from './_lib/aiCampaignCoverageArchive.js'

export async function onRequestOptions() {
  return json({ ok: true, mode: 'd1', methods: ['GET'] })
}

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign coverage archive reads')
    const url = new URL(context.request.url)
    const campaignSlug = String(url.searchParams.get('campaign') || AI_COVERAGE_CAMPAIGN)
    if (campaignSlug !== AI_COVERAGE_CAMPAIGN) return json({ ok: false, error: 'unknown campaign archive' }, 404)

    await ensureAiCoverageArchiveTables(db)
    let summary = await getAiCoverageArchiveSummary(db, campaignSlug)
    if (summary.total === 0 || url.searchParams.get('refresh') === '1') {
      const campaign = await ensureAiCampaign(db)
      const publicCampaign = await decorateAiCampaignForPublic(campaign, context.request.url, { includeSocial: false })
      await upsertAiCoverageItems(db, publicCampaign.coverage || [])
      summary = await getAiCoverageArchiveSummary(db, campaignSlug)
    }

    const refreshPromise = refreshGdeltCoverageIfStale(db)
    if (url.searchParams.get('refresh') === '1') {
      await refreshPromise
      summary = await getAiCoverageArchiveSummary(db, campaignSlug)
    } else if (typeof context.waitUntil === 'function') {
      context.waitUntil(refreshPromise.catch(() => {}))
    } else {
      refreshPromise.catch(() => {})
    }

    const archive = await listAiCoverageArchive(db, {
      campaignSlug,
      q: url.searchParams.get('q'),
      language: url.searchParams.get('language'),
      outlet: url.searchParams.get('outlet'),
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
    })
    return json({ ok: true, mode: 'd1', ...archive, facets: { languages: summary.languages, outlets: summary.outlets }, lastUpdatedAt: summary.lastUpdatedAt })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=120' },
  })
}
