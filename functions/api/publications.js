import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)
  return json({
    ok: true,
    canEdit: permission.canEdit,
    mode: hasDb(context) ? 'd1' : 'scaffold',
  })
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || ''
    const slug = url.searchParams.get('slug') || ''
    const status = url.searchParams.get('status') || ''

    if (!hasDb(context)) {
      return json({ ok: true, mode: 'scaffold', items: [] })
    }

    await ensureTables(context.env.BF_DB)

    if (id || slug) {
      const item = await getPublication(context.env.BF_DB, id || slug)
      return json({ ok: true, mode: 'd1', item })
    }

    let query = 'SELECT payload_json FROM publications'
    const params = []
    if (status) {
      query += ' WHERE status = ?'
      params.push(status)
    }
    query += ' ORDER BY updated_at DESC'

    const result = await context.env.BF_DB.prepare(query).bind(...params).all()
    return json({
      ok: true,
      mode: 'd1',
      items: (result.results || []).map((row) => safeParse(row.payload_json)).filter(Boolean),
    })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  return handleWrite(context)
}

export async function onRequestPut(context) {
  return handleWrite(context)
}

async function handleWrite(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) {
      return json({ ok: false, error: permission.reason, canEdit: false }, 403)
    }

    const body = await context.request.json()
    const publication = body?.publication || body?.item || body
    if (!publication?.id || !publication?.slug || !publication?.title) {
      return json({ ok: false, error: 'publication id, slug, and title are required' }, 400)
    }

    if (!hasDb(context)) {
      return json({ ok: true, mode: 'scaffold', item: publication })
    }

    await ensureTables(context.env.BF_DB)
    await upsertPublication(context.env.BF_DB, publication)

    return json({ ok: true, mode: 'd1', item: publication })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

async function ensureTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS publications (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run()
}

async function getPublication(db, idOrSlug) {
  const row = await db.prepare('SELECT payload_json FROM publications WHERE id = ? OR slug = ? LIMIT 1')
    .bind(idOrSlug, idOrSlug)
    .first()
  return row ? safeParse(row.payload_json) : null
}

async function upsertPublication(db, publication) {
  await db.prepare(`
    INSERT INTO publications (id, slug, title, status, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      status = excluded.status,
      payload_json = excluded.payload_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    publication.id,
    publication.slug,
    publication.title,
    publication.status || 'draft',
    JSON.stringify(publication),
    publication.createdAt || null
  ).run()
}

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function hasDb(context) {
  return Boolean(context?.env?.BF_DB)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
