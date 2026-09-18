import { seed, legacySeed } from './model.js'
import { sectionBodies } from './course-copy.js'
import { lessonCopy } from './lesson-copy.js'
import { courseMeta } from './course-meta.js'
import { applyRecoveryTechnicalReview } from './recovery-technical.js'
import { initialActivities } from './activities.js'

const text = (value) => typeof value === 'string' && value.trim() ? value : null
const nonempty = (value) => Array.isArray(value) && value.length
const clone = (value) => structuredClone(value)
const same = (a,b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const legacySectionBodies = new Set([
  "The Anarchist's Guide to Losing Everyone's Email Because Dave Forgot to Patch Debian.",
  'A thousand machines maintained by twelve exhausted people is not a thousand servers. It is twelve people with a very serious problem.',
  "The unit of resilience isn't the machine. It's the person who can reproduce the machine.",
  'Each one, teach one.',
])

function mergeLesson(base, current = {}) {
  const old = legacySeed.lessons.find((lesson) => lesson.slug === base.slug) || base
  const canonical = { ...clone(base), ...clone(lessonCopy[base.slug] || {}) }
  const merged = { ...clone(canonical), ...clone(current) }

  for (const key of ['title','difficulty','time','learn','do','test','teach','lastTestedDate','lastTestedEnvironment']) {
    if (!text(current[key]) || current[key] === old[key]) merged[key] = canonical[key]
  }
  for (const key of ['objectives','checks','resources']) {
    if (!nonempty(current[key]) || same(current[key], old[key])) merged[key] = clone(canonical[key] || [])
  }
  for (const key of ['activities','prerequisites']) {
    if (!nonempty(current[key])) merged[key] = clone(canonical[key] || [])
  }
  if (!current.completion || typeof current.completion !== 'object') merged.completion = clone(canonical.completion)
  if (!text(current.slug)) merged.slug = canonical.slug
  if (!Number.isFinite(Number(current.number))) merged.number = canonical.number
  return merged
}

function mergeSection(base, current = {}) {
  const merged = { ...clone(base), ...clone(current) }
  merged.id = base.id
  if (!text(current.title)) merged.title = base.title
  const currentBody = text(current.body)
  const baseBody = text(base.body)
  const placeholder = currentBody === 'Reporting and section prose are still being assembled.' || legacySectionBodies.has(currentBody) || (!!baseBody && currentBody === baseBody)
  if (!currentBody || placeholder) merged.body = sectionBodies[base.id] || base.body || ''
  if (!nonempty(current.lessonSlugs)) merged.lessonSlugs = clone(base.lessonSlugs || [])
  for (const key of ['activities','sources','contributors','prerequisites']) {
    if (!Array.isArray(current[key])) merged[key] = clone(base[key] || [])
  }
  if (!current.completion || typeof current.completion !== 'object') merged.completion = clone(base.completion)
  return merged
}

export function restorePublishedCourse(input) {
  const course = clone(input || {})
  const currentLessons = new Map((course.lessons || []).map((lesson) => [lesson.slug, lesson]))
  const canonicalLessonIds = new Set(seed.lessons.map((lesson) => lesson.slug))
  course.lessons = [
    ...seed.lessons.map((lesson) => mergeLesson(lesson, currentLessons.get(lesson.slug))),
    ...(course.lessons || []).filter((lesson) => lesson?.slug && !canonicalLessonIds.has(lesson.slug)),
  ]

  const currentSections = new Map((course.sections || []).map((section) => [section.id, section]))
  const canonicalSectionIds = new Set(seed.sections.map((section) => section.id))
  course.sections = [
    ...seed.sections.map((section) => mergeSection(section, currentSections.get(section.id))),
    ...(course.sections || []).filter((section) => section?.id && !canonicalSectionIds.has(section.id)),
  ]

  const currentActivities = new Map((course.activities || []).map((activity) => [activity.id, activity]))
  const legacyActivities = new Map(initialActivities(legacySeed.lessons).map((activity) => [activity.id, activity]))
  const reviewedActivities = new Map(initialActivities(course.lessons).map((activity) => [activity.id, activity]))
  const canonicalActivityIds = new Set(seed.activities.map((activity) => activity.id))
  course.activities = [
    ...seed.activities.map((activity) => {
      const current = currentActivities.get(activity.id) || {}
      const old = legacyActivities.get(activity.id) || activity
      const canonical = reviewedActivities.get(activity.id) || activity
      const merged = { ...clone(canonical), ...clone(current) }
      if (!text(current.prompt) || current.prompt === old.prompt) merged.prompt = canonical.prompt
      for (const key of ['options','sources']) {
        if (!nonempty(current[key]) || same(current[key], old[key])) merged[key] = clone(canonical[key] || [])
      }
      return merged
    }),
    ...(course.activities || []).filter((activity) => activity?.id && !canonicalActivityIds.has(activity.id)),
  ]

  for (const key of ['title','subtitle','deck','contentVersion']) {
    if (!text(course[key])) course[key] = seed[key]
  }
  if (!text(course.intro) || course.intro === legacySeed.intro) course.intro = courseMeta.intro
  if (!Array.isArray(course.documents)) course.documents = []
  if (!Array.isArray(course.pathways)) course.pathways = []
  if (!Array.isArray(course.modules)) course.modules = []
  course.modules = applyRecoveryTechnicalReview(course.modules)
  return course
}
