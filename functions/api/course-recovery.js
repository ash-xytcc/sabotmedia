import { getBoundDb } from './_lib/database.js'
import { resolvePublicSitePermission, permissionHasCapability } from './_lib/publicSiteAuth.js'
import { json, sameOrigin } from './_lib/courseStore.js'
import { rateLimit, equal, b64 } from './_lib/courseSecurity.js'
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
    await db.prepare('CREATE TABLE IF NOT EXISTS course_recovery_writers(id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, revision INTEGER NOT NULL)').run()
    const setting = await db.prepare('SELECT retention FROM course_recovery_settings WHERE id=1').first(),
      days = setting?.retention || 365
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
      const writer = await db.prepare('SELECT revision FROM course_recovery_writers WHERE id=?').bind(b.recoveryId).first()
      return row
        ? json({
            ok: true,
            revision: writer?.revision ?? null,
            retentionDays: days,
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
      !['create', 'update'].includes(b.action) ||
      b.schemaVersion !== 1 ||
      !/^[A-Za-z0-9_-]{16}$/.test(b.iv || '') ||
      typeof b.ciphertext !== 'string' ||
      b.ciphertext.length < 24 ||
      b.ciphertext.length > 2700000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(b.ciphertext)
    )
      return json({ ok: false, error: 'Invalid encrypted backup' }, 400)
    const writer = await db.prepare('SELECT token_hash,revision FROM course_recovery_writers WHERE id=?').bind(b.recoveryId).first()
    const old = await db.prepare('SELECT length(ciphertext) AS bytes FROM course_recovery WHERE id=?').bind(b.recoveryId).first()
    let tokenHash = null
    if (b.writeToken !== undefined) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(b.writeToken)) return json({ok:false,error:'Invalid write credential'},403)
      tokenHash = b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(b.writeToken))))
    }
    if (b.action === 'update') {
      if (!writer || !tokenHash || !equal(writer.token_hash, tokenHash)) return json({ok:false,error:'Invalid write credential'},403)
      if (b.revision !== writer.revision) return json({ok:false,error:'Another device has a newer backup. Restore it before updating from this device.'},409)
    } else if (writer || old) return json({ok:false,error:'Recovery already exists'},400)
    const usage = await db.prepare('SELECT COALESCE(SUM(length(ciphertext)),0) AS bytes FROM course_recovery').first()
    if (Number(usage?.bytes || 0) - Number(old?.bytes || 0) + b.ciphertext.length > 250000000)
      return json({ok:false,error:'Recovery storage is full. Export progress instead.'},503)
    const revision = (writer?.revision || 0) + 1
    const statements = []
    if (writer) statements.push(db.prepare('UPDATE course_recovery_writers SET revision=CASE WHEN revision=? THEN ? ELSE NULL END WHERE id=? AND token_hash=?').bind(b.revision,revision,b.recoveryId,tokenHash))
    else if (tokenHash) statements.push(db.prepare('INSERT INTO course_recovery_writers(id,token_hash,revision) VALUES(?,?,?)').bind(b.recoveryId,tokenHash,revision))
    statements.push(db.prepare('INSERT INTO course_recovery(id,ciphertext,iv,schema_version,expires) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,expires=excluded.expires').bind(b.recoveryId,b.ciphertext,b.iv,1,now+days*86400))
    await db.batch(statements)
    return json({ok:true,retentionDays:days,revision:tokenHash ? revision : null,expires:now+days*86400})
  } catch {
    return json({ ok: false, error: 'Recovery unavailable' }, 400)
  }
}
