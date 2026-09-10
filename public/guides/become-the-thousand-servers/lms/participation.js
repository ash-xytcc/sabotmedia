// Project opt-outs apply to both seeded and previously saved participation.
// They do not erase lessons, historical reporting, or private revision records.
const withdrawn = new Set(['autistici-inventati', 'systemli', 'systemli-org'])
const key = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')
export function participatingContributor(value) {
  if (value && typeof value === 'object') return participatingContributor(value.id) && participatingContributor(value.name)
  return !withdrawn.has(key(value))
}
export function withoutWithdrawnAssignments(course) {
  if (!course) return course
  return {...course, sections:(course.sections || []).map((s)=>({...s, contributors:(s.contributors || []).filter(participatingContributor)}))}
}
