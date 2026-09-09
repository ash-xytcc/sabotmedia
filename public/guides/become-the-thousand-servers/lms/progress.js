import { SLUG, seed } from './model.js?v=audit-1'
export const KEY = 'sabot.course.become-the-thousand-servers.v1'
export const blank = () => ({
  course: SLUG,
  version: 2,
  contentVersion: seed.contentVersion,
  completedLessons: [],
  startedLessons: [],
  completedSections: [],
  startedSections: [],
  viewed: [],
  practical: [],
  lastLesson: '',
  lastUnit: '',
  scrollByLesson: {},
  bookmarks: [],
  notes: {},
  activities: {},
})
export function validateProgress(x) {
  if (
    !x ||
    Array.isArray(x) ||
    x.course !== SLUG ||
    ![1, 2].includes(x.version) ||
    JSON.stringify(x).length > 2000000
  )
    throw Error('Invalid progress file for this course')
  const out = blank(),
    unitIds = new Set([...seed.lessons.map((l) => l.slug), ...seed.sections.map((s) => s.id)])
  const strings = (v, max = 1000) =>
    Array.isArray(v)
      ? [...new Set(v.filter((s) => typeof s === 'string' && s.length < 500))].slice(0, max)
      : []
  for (const key of [
    'completedLessons',
    'startedLessons',
    'completedSections',
    'startedSections',
    'viewed',
    'practical',
  ])
    out[key] = strings(x[key]).filter((s) => unitIds.has(s))
  out.bookmarks = strings(x.bookmarks)
  out.lastLesson = unitIds.has(x.lastLesson) ? x.lastLesson : ''
  out.lastUnit = unitIds.has(x.lastUnit) ? x.lastUnit : out.lastLesson
  for (const [k, v] of Object.entries(x.notes || {}))
    if (unitIds.has(k) && typeof v === 'string' && v.length <= 20000) out.notes[k] = v
  for (const [k, v] of Object.entries(x.scrollByLesson || {}))
    if (unitIds.has(k) && Number.isFinite(v) && v >= 0 && v < 1e7) out.scrollByLesson[k] = Math.round(v)
  for (const [k, attempts] of Object.entries(x.activities || {}).slice(0, 200)) {
    if (!/^[a-z0-9-]{1,120}$/.test(k) || !Array.isArray(attempts)) continue
    out.activities[k] = attempts
      .slice(-20)
      .filter((a) => a && typeof a === 'object' && typeof a.passed === 'boolean')
      .map((a) => ({
        version: Math.max(1, Number(a.version) || 1),
        at: typeof a.at === 'string' ? a.at.slice(0, 40) : '',
        passed: a.passed,
        answer: Array.isArray(a.answer) ? a.answer.slice(0, 30).map((v) => String(v).slice(0, 20000)) : [],
      }))
  }
  if (x.version === 1) out.practical = [...out.completedLessons]
  return out
}
export function evaluate(activity, answer) {
  const a = Array.isArray(answer) ? answer.map(String) : []
  if (activity.type === 'short-reflection') return a.some((x) => x.trim().length > 0)
  if (activity.type === 'teach-back') return a.includes('__teachback_confirmed__') && a.some((x) => x !== '__teachback_confirmed__' && x.trim().length > 0)
  if (activity.type === 'practical') return a.includes('confirmed')
  if (activity.type === 'checklist')
    return activity.options.length > 0 && activity.options.every((o) => a.includes(o.id))
  if (activity.type === 'matching')
    return activity.pairs.length > 0 && activity.pairs.every((p, i) => a[i] === p.right)
  const expected = activity.answer || []
  if (!expected.length) return false
  if (activity.type === 'ordered-sequence') return JSON.stringify(a) === JSON.stringify(expected)
  return a.length === expected.length && expected.every((x) => a.includes(x))
}
export function activityPassed(c, s, id) {
  const a = c.activities.find((a) => a.id === id)
  const last = s.activities[id]?.filter((t) => t.version === a?.version).at(-1)
  return !!a && !!last?.passed && (a.type !== 'teach-back' || evaluate(a, last.answer))
}
export function complete(c, s, unit) {
  const key = unit.slug || unit.id,
    r = unit.completion || { manual: true }
  if (!r.manual && !r.viewed && !r.practical && !r.activities?.length) return false
  const manual = (unit.slug ? s.completedLessons : s.completedSections).includes(key)
  return (
    (!r.manual || manual) &&
    (!r.viewed || s.viewed.includes(key)) &&
    (!r.practical || s.practical.includes(key)) &&
    (r.activities || []).every((id) => activityPassed(c, s, id))
  )
}
export function unlocked(c, s, unit) {
  return (unit.prerequisites || []).every((id) => {
    const p = [...c.lessons, ...c.sections].find((u) => (u.slug || u.id) === id)
    return p && complete(c, s, p)
  })
}

export function attemptFeedback(activity, attempt) {
  if (!attempt) return ''
  if (activity.type === 'short-reflection') return attempt.passed ? 'Response saved. This is not automatically graded.' : 'Response saved for further practice.'
  if (activity.type === 'teach-back') return attempt.passed && evaluate(activity, attempt.answer) ? 'Teach-back self-confirmed.' : 'Response saved. Confirm after teaching this to someone.'
  if (['practical', 'checklist'].includes(activity.type)) return attempt.passed ? 'Work self-confirmed.' : 'More practice needed.'
  return attempt.passed ? 'Completed.' : 'Needs another attempt.'
}
