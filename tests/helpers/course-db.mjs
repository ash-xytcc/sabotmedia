import { DatabaseSync } from 'node:sqlite'
export function testDb() {
  const sqlite = new DatabaseSync(':memory:')
  const db = {
    prepare(sql) {
      let args = []
      const s = {
        bind(...values) {
          args = values
          return s
        },
        async first() {
          return sqlite.prepare(sql).get(...args) || null
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...args) }
        },
        async run() {
          const r = sqlite.prepare(sql).run(...args)
          return { meta: { changes: Number(r.changes) } }
        },
      }
      return s
    },
    async batch(statements) {
      sqlite.exec('BEGIN')
      try {
        const results = []
        for (const s of statements) results.push(await s.run())
        sqlite.exec('COMMIT')
        return results
      } catch (e) {
        sqlite.exec('ROLLBACK')
        throw e
      }
    },
  }
  return db
}
