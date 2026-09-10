import { getBoundDb } from './_lib/database.js'
import { resolvePublicSitePermission, permissionHasCapability } from './_lib/publicSiteAuth.js'
import { json, sameOrigin } from './_lib/courseStore.js'
import { rateLimit, equal, b64 } from './_lib/courseSecurity.js'

const validId = (value) => /^[A-Za-z0-9_-]{43}$/.test(value || '')

export async function onRequest(context) {
  try {
    if (context.request.method !== 'POST' || !sameOrigin(context.request))
      return json({ ok: false, error: 'Invalid request' }, 403)
    const db = getBoundDb(context)
    if (!db) return json({ ok: false, error: 'Recovery unavailable' }, 503)
    const raw = await context.request.text()
    if (raw.length > 2800000) return json({ ok: false, error: 'Backup too large' }, 413)
    const b = JSON.parse(raw)
    await db.prepare('CREATE TABLE IF NOT EXISTS course_recovery(id TEXT PRIMARY KEY,ciphertext TEXT NOT NULL,iv TEXT NOT NULL,schema_version INTEGER NOT NULL,expires INTEGER NOT NULL)').run()
    await db.prepare('CREATE TABLE IF NOT EXISTS course_recovery_settings(id INTEGER PRIMARY KEY,retention INTEGER NOT NULL)').run()
    await db.prepare('CREATE TABLE IF NOT EXISTS course_recovery_writers(id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, revision INTEGER NOT NULL)').run()
    const setting = await db.prepare('SELECT retention FROM course_recovery_settings WHERE id=1').first()
    const days = setting?.retention || 365

    if (b.action === 'settings') {
      const p = await resolvePublicSitePermission(context)
      if (!permissionHasCapability(p, 'site:manage')) return json({ ok: false, error: 'Authentication required' }, 403)
      if (b.days !== undefined) {
        if (!Number.isInteger(b.days) || b.days < 1 || b.days > 365) return json({ ok: false, error: 'Use 1–365 days' }, 400)
        await db.prepare('INSERT INTO course_recovery_settings(id,retention) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET retention=excluded.retention').bind(b.days).run()
      }
      return json({ ok: true, days: b.days ?? days })
    }

    const now = Math.floor(Date.now() / 1000)
    await db.prepare('DELETE FROM course_recovery WHERE expires < ?').bind(now).run()
    if (!validId(b.recoveryId)) return json({ ok: false, error: 'Invalid request' }, 400)

    if (b.action === 'read') {
      if (!(await rateLimit(context, db, 'recovery-read', 120))) return json({ ok: false, error: 'Too many recovery attempts from this network. Try again later.' }, 429)
      const row = await db.prepare('SELECT ciphertext,iv,schema_version,expires FROM course_recovery WHERE id=? AND expires>?').bind(b.recoveryId, now).first()
      const writer = await db.prepare('SELECT revision FROM course_recovery_writers WHERE id=?').bind(b.recoveryId).first()
      return row ? json({ ok: true, revision: writer?.revision ?? null, retentionDays: days, expires: row.expires, blob: { recoveryId: b.recoveryId, ciphertext: row.ciphertext, iv: row.iv, schemaVersion: row.schema_version } }) : json({ ok: false, error: 'Backup unavailable or expired' }, 404)
    }

    if (!['create', 'update'].includes(b.action) || b.schemaVersion !== 1 || !/^[A-Za-z0-9_-]{16}$/.test(b.iv || '') || typeof b.ciphertext !== 'string' || b.ciphertext.length < 24 || b.ciphertext.length > 2700000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.ciphertext)) return json({ ok: false, error: 'Invalid encrypted backup' }, 400)

    const writer = await db.prepare('SELECT token_hash,revision FROM course_recovery_writers WHERE id=?').bind(b.recoveryId).first()
    const old = await db.prepare('SELECT length(ciphertext) AS bytes FROM course_recovery WHERE id=?').bind(b.recoveryId).first()
    let tokenHash = null
    if (b.writeToken !== undefined) {
      if (!validId(b.writeToken)) return json({ ok: false, error: 'Invalid write credential' }, 403)
      tokenHash = b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(b.writeToken))))
    }

    if (b.action === 'update') {
      if (!writer || !tokenHash || !equal(writer.token_hash, tokenHash)) {
        await rateLimit(context, db, 'recovery-failed-write', 30)
        return json({ ok: false, error: 'Invalid write credential' }, 403)
      }
      if (b.revision !== writer.revision) return json({ ok: false, error: 'Another device has a newer backup. Preserve this copy, then restore or compare before updating.' }, 409)
      if (!(await rateLimit(context, db, `recovery-update:${b.recoveryId}`, 180))) return json({ ok: false, error: 'This recovery card is updating too frequently. Try again later.' }, 429)
    } else {
      if (!(await rateLimit(context, db, 'recovery-create', 60))) return json({ ok: false, error: 'Too many new recovery cards are being created from this network. Try again later.' }, 429)
      if (writer || old) return json({ ok: false, error: 'Recovery already exists' }, 400)
    }

    const usage = await db.prepare('SELECT COALESCE(SUM(length(ciphertext)),0) AS bytes FROM course_recovery').first()
    if (Number(usage?.bytes || 0) - Number(old?.bytes || 0) + b.ciphertext.length > 250000000) return json({ ok: false, error: 'Recovery storage is full. Export progress instead.' }, 503)
    const expires = now + days * 86400

    if (b.action === 'create') {
      const statements = []
      if (tokenHash) statements.push(db.prepare('INSERT INTO course_recovery_writers(id,token_hash,revision) VALUES(?,?,1)').bind(b.recoveryId, tokenHash))
      statements.push(db.prepare('INSERT INTO course_recovery(id,ciphertext,iv,schema_version,expires) VALUES(?,?,?,?,?)').bind(b.recoveryId, b.ciphertext, b.iv, 1, expires))
      await db.batch(statements)
      return json({ ok: true, retentionDays: days, revision: tokenHash ? 1 : null, expires })
    }

    const revision = writer.revision + 1
    const results = await db.batch([
      db.prepare('UPDATE course_recovery_writers SET revision=? WHERE id=? AND token_hash=? AND revision=?').bind(revision, b.recoveryId, tokenHash, b.revision),
      db.prepare('UPDATE course_recovery SET ciphertext=?,iv=?,schema_version=1,expires=? WHERE id=? AND changes()=1').bind(b.ciphertext, b.iv, expires, b.recoveryId),
    ])
    if (results?.[0]?.meta?.changes === 0) return json({ ok: false, error: 'Another device saved first. Preserve this copy and compare it with the newer backup.' }, 409)
    return json({ ok: true, retentionDays: days, revision, expires })
  } catch {
    return json({ ok: false, error: 'Recovery unavailable' }, 400)
  }
}
