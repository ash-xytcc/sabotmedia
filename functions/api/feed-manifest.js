import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { buildLiveFeedBundle } from './_lib/feedRuntime.js'

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('live feed manifest')

    const runtime = await buildLiveFeedBundle(db)
    const files = Object.keys(runtime.bundle || {}).sort()

    return json({
      ok: true,
      mode: 'd1',
      basePath: '/feeds',
      files,
      itemCount: runtime.itemCount,
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
