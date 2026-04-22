const NATIVE_CONTENT_SCHEMA_VERSION = 1

export async function ensureNativePublicContentTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS native_public_content (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      content_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      target TEXT NOT NULL DEFAULT 'general',
      content_type TEXT NOT NULL DEFAULT 'note',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT
    );
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_native_public_content_status
    ON native_public_content(status);
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_native_public_content_target
    ON native_public_content(target);
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_native_public_content_updated_at
    ON native_public_content(updated_at DESC);
  `)
}

export function createNativeId() {
  return `native-${Math.random().toString(36).slice(2, 10)}`
}

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeNativeEntry(input) {
  const raw = input || {}
  const now = new Date().toISOString()

  return {
    id: String(raw.id || createNativeId()),
    schemaVersion: NATIVE_CONTENT_SCHEMA_VERSION,
    contentType: normalizeEnum(raw.contentType, ['note', 'publicBlock', 'dispatch']) || 'note',
    status: normalizeEnum(raw.status, ['draft', 'published', 'archived']) || 'draft',
    target: normalizeEnum(raw.target, ['general', 'home', 'press', 'projects']) || 'general',
    title: String(raw.title || ''),
    slug: slugify(raw.slug || raw.title || raw.id || ''),
    excerpt: String(raw.excerpt || ''),
    body: String(raw.body || ''),
    author: String(raw.author || ''),
    tags: normalizeTags(raw.tags),
    createdAt: String(raw.createdAt || now),
    updatedAt: String(raw.updatedAt || now),
    publishedAt: String(
      raw.status === 'published'
        ? raw.publishedAt || now
        : raw.publishedAt || ''
    ),
  }
}

export function normalizeNativeCollection(input) {
  const arr = Array.isArray(input) ? input : []
  return arr
    .map(normalizeNativeEntry)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function listNativeEntries(db, options = {}) {
  await ensureNativePublicContentTable(db)

  const clauses = []
  const binds = []

  if (options.status) {
    clauses.push('status = ?')
    binds.push(options.status)
  }

  if (options.target) {
    clauses.push('target = ?')
    binds.push(options.target)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

  const stmt = db.prepare(`
    SELECT id, slug, content_json, status, target, content_type, created_at, updated_at, published_at
    FROM native_public_content
    ${where}
    ORDER BY datetime(updated_at) DESC
  `)

  const result = binds.length ? await stmt.bind(...binds).all() : await stmt.all()
  const rows = Array.isArray(result?.results) ? result.results : []

  return normalizeNativeCollection(
    rows.map((row) => {
      let parsed = {}
      try {
        parsed = JSON.parse(row.content_json || '{}')
      } catch {
        parsed = {}
      }

      return {
        ...parsed,
        id: row.id,
        slug: row.slug,
        status: row.status,
        target: row.target,
        contentType: row.content_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        publishedAt: row.published_at || '',
      }
    })
  )
}

export async function getNativeEntry(db, idOrSlug) {
  await ensureNativePublicContentTable(db)

  const row = await db
    .prepare(`
      SELECT id, slug, content_json, status, target, content_type, created_at, updated_at, published_at
      FROM native_public_content
      WHERE id = ? OR slug = ?
      LIMIT 1
    `)
    .bind(idOrSlug, idOrSlug)
    .first()

  if (!row) return null

  let parsed = {}
  try {
    parsed = JSON.parse(row.content_json || '{}')
  } catch {
    parsed = {}
  }

  return normalizeNativeEntry({
    ...parsed,
    id: row.id,
    slug: row.slug,
    status: row.status,
    target: row.target,
    contentType: row.content_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || '',
  })
}

export async function upsertNativeEntry(db, entry) {
  await ensureNativePublicContentTable(db)

  const normalized = normalizeNativeEntry({
    ...entry,
    updatedAt: new Date().toISOString(),
    publishedAt:
      entry?.status === 'published'
        ? String(entry?.publishedAt || new Date().toISOString())
        : String(entry?.publishedAt || ''),
  })

  const contentJson = JSON.stringify(normalized)

  await db
    .prepare(`
      INSERT INTO native_public_content (
        id, slug, content_json, status, target, content_type, created_at, updated_at, published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        content_json = excluded.content_json,
        status = excluded.status,
        target = excluded.target,
        content_type = excluded.content_type,
        updated_at = excluded.updated_at,
        published_at = excluded.published_at
    `)
    .bind(
      normalized.id,
      normalized.slug,
      contentJson,
      normalized.status,
      normalized.target,
      normalized.contentType,
      normalized.createdAt,
      normalized.updatedAt,
      normalized.publishedAt || null
    )
    .run()

  return normalized
}

export async function deleteNativeEntry(db, idOrSlug) {
  await ensureNativePublicContentTable(db)

  await db
    .prepare(`
      DELETE FROM native_public_content
      WHERE id = ? OR slug = ?
    `)
    .bind(idOrSlug, idOrSlug)
    .run()

  return { ok: true, deleted: idOrSlug }
}

function normalizeEnum(value, allowed) {
  const str = String(value || '').trim()
  return allowed.includes(str) ? str : ''
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}
