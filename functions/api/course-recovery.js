import { getBoundDb } from './_lib/database.js'
import { resolvePublicSitePermission, permissionHasCapability } from './_lib/publicSiteAuth.js'
import { json, sameOrigin } from './_lib/courseStore.js'
import { rateLimit } from './_lib/courseSecurity.js'
export async function onRequest(context) {
  try {
    if (context.request.method !== 'POST' || !sameOrigin(context.request))
      return json({ ok: false, error: 'Invalid request' }, 403)
    const db = getBoundDb(context)
    if (!db) return json({ ok: false, error: 'Recovery unavailable' }, 503)
    if (!(await rateLimit(context, db, 'recovery', 30)))
      return json({ ok: false, error: 'Try again later' }, 429)
    const raw = await context.request.text()
    if (raw.length > 2800000) return json({ ok: false, error: 'Backup too large' }, 413)
    const b = JSON.parse(raw)
    await db
      .prepare(
        'CREATE TABLE IF NOT EXISTS course_recovery(id TEXT PRIMARY KEY,ciphertext TEXT NOT NULL,iv TEXT NOT NULL,schema_version INTEGER NOT NULL,expires INTEGER NOT NULL)',
      )
      .run()
    await db
      .prepare(
        'CREATE TABLE IF NOT EXISTS course_recovery_settings(id INTEGER PRIMARY KEY,retention INTEGER NOT NULL)',
      )
      .run()
    const setting = await db.prepare('SELECT retention FROM course_recovery_settings WHERE id=1').first(),
      days = setting?.retention || 90
    if (b.action === 'settings') {
      const p = await resolvePublicSitePermission(context)
      if (!permissionHasCapability(p, 'site:manage'))
        return json({ ok: false, error: 'Authentication required' }, 403)
      if (b.days !== undefined) {
        if (!Number.isInteger(b.days) || b.days < 1 || b.days > 365)
          return json({ ok: false, error: 'Use 1–365 days' }, 400)
        await db
          .prepare(
            'INSERT INTO course_recovery_settings(id,retention) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET retention=excluded.retention',
          )
          .bind(b.days)
          .run()
      }
      return json({ ok: true, days: b.days ?? days })
    }
    const now = Math.floor(Date.now() / 1000)
    await db.prepare('DELETE FROM course_recovery WHERE expires < ?').bind(now).run()
    if (!/^[A-Za-z0-9_-]{43}$/.test(b.recoveryId || ''))
      return json({ ok: false, error: 'Invalid request' }, 400)
    if (b.action === 'read') {
      const row = await db
        .prepare('SELECT ciphertext,iv,schema_version FROM course_recovery WHERE id=? AND expires>?')
        .bind(b.recoveryId, now)
        .first()
      return row
        ? json({
            ok: true,
            blob: {
              recoveryId: b.recoveryId,
              ciphertext: row.ciphertext,
              iv: row.iv,
              schemaVersion: row.schema_version,
            },
          })
        : json({ ok: false, error: 'Backup unavailable or expired' }, 404)
    }
    if (
      b.action !== 'create' ||
      b.schemaVersion !== 1 ||
      !/^[A-Za-z0-9_-]{16}$/.test(b.iv || '') ||
      typeof b.ciphertext !== 'string' ||
      b.ciphertext.length < 24 ||
      b.ciphertext.length > 2700000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(b.ciphertext)
    )
      return json({ ok: false, error: 'Invalid encrypted backup' }, 400)
    const usage = await db
      .prepare('SELECT COALESCE(SUM(length(ciphertext)),0) AS bytes FROM course_recovery')
      .first()
    if (Number(usage?.bytes || 0) + b.ciphertext.length > 250000000)
      return json({ ok: false, error: 'Recovery storage is full. Export progress instead.' }, 503)
    await db
      .prepare('INSERT INTO course_recovery(id,ciphertext,iv,schema_version,expires) VALUES(?,?,?,?,?)')
      .bind(b.recoveryId, b.ciphertext, b.iv, 1, now + days * 86400)
      .run()
    return json({ ok: true, retentionDays: days })
  } catch {
    return json({ ok: false, error: 'Recovery unavailable' }, 400)
  }
}
