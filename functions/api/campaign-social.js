import { loadLiveAiSocial } from './_lib/aiCampaignPublic.js'

export async function onRequestGet(context) {
  const slug = new URL(context.request.url).searchParams.get('slug') || 'autistici-inventati'
  if (slug !== 'autistici-inventati') return json({ ok: false, error: 'Unknown campaign' }, 404)
  try { return json(await loadLiveAiSocial(context.request.url), 200, 'public, max-age=60, s-maxage=300, stale-while-revalidate=600') }
  catch (error) { return json({ ok: false, items: [], sources: [], errors: [{ platform: 'social', message: String(error?.message || error) }] }, 502, 'public, max-age=30') }
}
function json(data, status, cacheControl = 'no-store') { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cacheControl, 'access-control-allow-origin': '*' } }) }
