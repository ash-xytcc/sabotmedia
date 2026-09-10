import { participatingContributor } from '../../../public/guides/become-the-thousand-servers/lms/participation.js'
import { contributionDraft } from './courseContributorPrompts.js'
import {
  contributorNames,
  id,
  sharedQuestion,
} from '../../../public/guides/become-the-thousand-servers/lms/model.js'

export async function ensureContributors(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS course_contributors (id TEXT PRIMARY KEY,name TEXT NOT NULL,edit_hash TEXT,edit_salt TEXT,private_hash TEXT,private_salt TEXT,epoch INTEGER NOT NULL DEFAULT 0,enabled INTEGER NOT NULL DEFAULT 0,draft_json TEXT NOT NULL,published_json TEXT,private_text TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 0)`,
    )
    .run()
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS course_contributor_revisions (id TEXT PRIMARY KEY,project TEXT NOT NULL,version INTEGER NOT NULL,actor_type TEXT NOT NULL,actor_id TEXT NOT NULL,scope TEXT NOT NULL,status TEXT NOT NULL,content_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    )
    .run()
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS course_contributor_submissions (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        revision INTEGER NOT NULL,
        content_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        decided_at TEXT,
        decision TEXT,
        reviewer_id TEXT,
        reviewer_note TEXT NOT NULL DEFAULT '',
        UNIQUE(project, revision)
      )`,
    )
    .run()
  await db.batch(
    contributorNames.map((name) =>
      db
        .prepare('INSERT OR IGNORE INTO course_contributors(id,name,draft_json) VALUES(?,?,?)')
        .bind(id(name), name, JSON.stringify(contributionDraft(id(name)))),
    ),
  )
}

export async function listContributors(db) {
  await ensureContributors(db)
  const result = await db.prepare('SELECT id,name FROM course_contributors ORDER BY rowid').all()
  return (result.results || []).filter(participatingContributor)
}

export function normalizeContribution(value = {}) {
  const text = (v) => String(v || '').slice(0, 30000)
  return {
    sharedAnswer: text(value.sharedAnswer),
    questions: (Array.isArray(value.questions) ? value.questions : [])
      .slice(0, 8)
      .map((q) => ({ question: text(q.question), answer: text(q.answer) })),
    exercise: text(value.exercise),
    suggestedExercise: text(value.suggestedExercise),
    status: ['draft', 'reporting needed', 'testing', 'review', 'published', 'archived'].includes(value.status)
      ? value.status
      : 'draft',
  }
}

export function publicContribution(value) {
  const normalized = normalizeContribution(value)
  delete normalized.status
  return normalized
}

export function compareContribution(publishedValue, proposedValue) {
  const published = normalizeContribution(publishedValue || {})
  const proposed = normalizeContribution(proposedValue || {})
  const fields = ['sharedAnswer', 'exercise', 'suggestedExercise']
  const changes = []
  for (const field of fields) {
    if (published[field] !== proposed[field]) {
      changes.push({
        kind: !published[field] ? 'added' : !proposed[field] ? 'removed' : 'changed',
        field,
        before: published[field],
        after: proposed[field],
      })
    }
  }
  const max = Math.max(published.questions.length, proposed.questions.length)
  for (let index = 0; index < max; index += 1) {
    const before = published.questions[index] || null
    const after = proposed.questions[index] || null
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({
        kind: !before ? 'added' : !after ? 'removed' : 'changed',
        field: 'question',
        index,
        before,
        after,
      })
    }
  }
  return changes
}

export { sharedQuestion }
