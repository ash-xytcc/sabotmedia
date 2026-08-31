import { getBoundDb, databaseUnavailable } from './_lib/database.js'
import { authenticateContributor } from './_lib/campaignCorrespondence.js'

export async function onRequestPost(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign contributor access')
    const body = await context.request.json()
    const result = await authenticateContributor(db, { token: body.token, pin: body.pin, ip: context.request.headers.get('cf-connecting-ip') || '' })
    return json({ ok: true, ...result })
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, Number(error?.status) || 400) }
}
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } }) }
