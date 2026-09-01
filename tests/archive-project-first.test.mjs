import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildArchiveProjectOptions,
  fallbackProjectForType,
  resolveArchiveProject,
} from '../src/lib/projectCatalog.js'

test('podcast identity repairs an imported TCAIE episode filed under Molotov Now', () => {
  const project = resolveArchiveProject({
    type: 'podcast',
    primaryProject: 'Molotov Now!',
    title: 'The Child and Its Enemies: Episode 12',
    slug: 'the-child-and-its-enemies-episode-12',
  }, 'podcast')

  assert.equal(project.slug, 'the-child-and-its-enemies')
})

test('generic legacy categories fall back to a real project instead of becoming projects', () => {
  assert.equal(resolveArchiveProject({ primaryProject: 'General' }, 'article').slug, 'the-harbor-rat-report')
  assert.equal(resolveArchiveProject({ primaryProject: 'podcast' }, 'podcast').slug, 'molotov-now')
  assert.equal(fallbackProjectForType('comic').slug, 'the-sabotuers')
  assert.equal(fallbackProjectForType('newsletter').slug, 'the-communique')
})

test('legitimate unknown project names survive for future projects', () => {
  const project = resolveArchiveProject({ primaryProject: 'Future Project' }, 'article')
  assert.equal(project.name, 'Future Project')
  assert.equal(project.slug, 'future-project')
  assert.equal(project.dynamic, true)
})

test('archive project options never expose General or podcast as fake projects', () => {
  const items = [
    { type: 'article', projectMeta: resolveArchiveProject({ primaryProject: 'General' }, 'article') },
    { type: 'podcast', projectMeta: resolveArchiveProject({ primaryProject: 'podcast' }, 'podcast') },
    { type: 'podcast', projectMeta: resolveArchiveProject({ title: 'The Child and Its Enemies Ep 1' }, 'podcast') },
  ]

  const options = buildArchiveProjectOptions(items)
  const names = options.map((project) => project.name)

  assert.deepEqual(names, ['The Harbor Rat Report', 'Molotov Now!', 'The Child and Its Enemies'])
  assert.equal(names.includes('General'), false)
  assert.equal(names.includes('podcast'), false)
})
