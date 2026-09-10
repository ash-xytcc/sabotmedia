import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCourse, publicCourse, seed } from '../public/guides/become-the-thousand-servers/lms/model.js'

const marker = 'Choosing publishing software is a separate decision from choosing a host.'

function destination(course) {
  return course.modules.find((module) => module.id === 'blog-destination')
}

test('recovery destination compares publishing software alongside hosting', () => {
  const course = publicCourse(seed)
  const module = destination(course)
  assert.ok(module)
  for (const name of ['Colophon', 'WriteFreely', 'WordPress', 'Ghost', 'Grav']) assert.match(module.body, new RegExp(name))
  assert.match(module.body, /Sabot Media uses and contributes to Colophon/)
  assert.match(module.body, /WordPress remains the direct path covered by this course/)
  assert.match(module.body, /verify the current import or conversion path/i)
  assert.deepEqual(course.sections.map((section) => section.id), Array.from({length: 13}, (_, index) => `G${String(index + 1).padStart(2, '0')}`))
  assert.equal(course.lessons.length, 12)
  assert.ok(module.sources.some((source) => source.url === 'https://github.com/colophon-hub/colophon'))
})

test('CMS choice guidance backfills an older recovery snapshot only once', () => {
  const old = structuredClone(seed)
  const module = destination(old)
  const index = module.body.indexOf(marker)
  assert.ok(index > 0)
  module.body = module.body.slice(0, index).trim()

  const once = normalizeCourse(old)
  const twice = normalizeCourse(once)
  assert.equal(destination(once).body.split(marker).length - 1, 1)
  assert.equal(destination(twice).body.split(marker).length - 1, 1)
})
