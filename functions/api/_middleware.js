import { getBoundDb } from './_lib/database.js'
import { ensurePublicRecordsSchema } from './_lib/publicRecordsRuntimeSchema.js'

export async function onRequest(context) {
  const url = new URL(context.request.url)
  if (url.pathname === '/api/public-records') {
    const db = getBoundDb(context)
    if (db) await ensurePublicRecordsSchema(db)
  }
  return context.next()
}
