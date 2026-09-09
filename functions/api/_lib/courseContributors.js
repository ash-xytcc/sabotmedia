import { contributorNames,id,sharedQuestion } from '../../../public/guides/become-the-thousand-servers/lms/model.js'
export async function ensureContributors(db) {
 await db.prepare(`CREATE TABLE IF NOT EXISTS course_contributors (id TEXT PRIMARY KEY,name TEXT NOT NULL,edit_hash TEXT,edit_salt TEXT,private_hash TEXT,private_salt TEXT,epoch INTEGER NOT NULL DEFAULT 0,enabled INTEGER NOT NULL DEFAULT 0,draft_json TEXT NOT NULL,published_json TEXT,private_text TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 0)`).run()
 await db.prepare(`CREATE TABLE IF NOT EXISTS course_contributor_revisions (id TEXT PRIMARY KEY,project TEXT NOT NULL,version INTEGER NOT NULL,actor_type TEXT NOT NULL,actor_id TEXT NOT NULL,scope TEXT NOT NULL,status TEXT NOT NULL,content_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run()
 await db.batch(contributorNames.map(name=>db.prepare('INSERT OR IGNORE INTO course_contributors(id,name,draft_json) VALUES(?,?,?)').bind(id(name),name,JSON.stringify({sharedAnswer:'',questions:[],exercise:'',status:'draft'}))))
}
export async function listContributors(db) {await ensureContributors(db);const result=await db.prepare('SELECT id,name FROM course_contributors ORDER BY rowid').all();return result.results||[]}
export function normalizeContribution(value={}) {
 const text=v=>String(v||'').slice(0,30000)
 return {sharedAnswer:text(value.sharedAnswer),questions:(Array.isArray(value.questions)?value.questions:[]).slice(0,8).map(q=>({question:text(q.question),answer:text(q.answer)})),exercise:text(value.exercise),status:['draft','reporting needed','testing','review','published','archived'].includes(value.status)?value.status:'draft'}
}
export {sharedQuestion}
