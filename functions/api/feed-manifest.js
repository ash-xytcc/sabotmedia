import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { buildLiveFeedBundle } from './_lib/feedRuntime.js'
import { ensureAiCampaign, listCampaigns } from './_lib/campaigns.js'
import { getPodcastFeedItems } from '../rss/podcast.xml.js'

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('live feed manifest')

    await ensureAiCampaign(db)
    const [runtime, podcastItems, campaigns] = await Promise.all([
      buildLiveFeedBundle(db),
      getPodcastFeedItems(db),
      listCampaigns(db),
    ])
    const files = [...new Set([
      ...Object.keys(runtime.bundle || {}),
      'podcasts/all.xml',
      ...campaigns.map((campaign) => `campaigns/${campaign.slug}.xml`),
    ])].sort()

    return json({
      ok: true,
      mode: 'd1',
      basePath: '/feeds',
      files,
      terms: runtime.terms || {},
      itemCount: runtime.itemCount,
      podcastItemCount: podcastItems.length,
      campaignFeeds: campaigns.map((campaign) => ({ slug: campaign.slug, title: campaign.shortTitle || campaign.title, itemCount: campaign.updates.length })),
      settingsUpdatedAt: runtime.updatedAt,
    })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  })
}
