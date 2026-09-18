import { loadLiveAiIntelligence } from './_lib/aiCampaignIntelligence.js'

export async function onRequestGet(context) {
  try {
    const data = await loadLiveAiIntelligence(context.request.url)
    return json(data, 200, 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  } catch (error) {
    return json({ ok: false, updates: [], coverage: [], sources: [], errors: [{ source: 'campaign intelligence', message: String(error?.message || error) }], checkedAt: '' }, 502, 'public, max-age=30')
  }
}

function json(data, status, cacheControl) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cacheControl },
  })
}
