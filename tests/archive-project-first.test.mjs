import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PUBLIC_PROJECTS,
  buildArchiveProjectOptions,
  fallbackProjectForType,
  resolveArchiveProject,
} from '../src/lib/projectCatalog.js'

test('podcast identity repairs an imported TCAIE episode filed under Molotov Now', () => {
  const project = resolveArchiveProject({
    type: 'podcast',
    primaryProject: 'Molotov Now!',
    title: 'Madeline Lane-McKinley and Childhood as a Concept',
    slug: 'madeline-lane-mckinley-and-childhood-as-a-concept',
    bodyHtml: '<p>Hello and welcome to The Child and Its Enemies, a podcast about queer and neurodivergent kids living out anarchy and youth liberation.</p>',
  }, 'podcast')

  assert.equal(project.slug, 'the-child-and-its-enemies')
})

test('TCAIE show identity beats a bad Molotov category without rewriting source taxonomy', () => {
  const source = {
    type: 'podcast',
    primaryProject: 'Molotov Now!',
    projects: ['Molotov Now!'],
    categories: ['Molotov Now!'],
    title: 'Jennie Bastian, founder of Communication',
    bodyHtml: '<p>MK: Hello and welcome to the Child and its Enemies, a podcast about queer and neurodivergent kids living out anarchy and youth liberation.</p>',
  }

  const project = resolveArchiveProject(source, 'podcast')
  assert.equal(project.slug, 'the-child-and-its-enemies')
  assert.equal(source.primaryProject, 'Molotov Now!')
})

test('actual Molotov records remain Molotov Now', () => {
  const project = resolveArchiveProject({
    type: 'podcast',
    primaryProject: 'Molotov Now!',
    title: 'Episode 16: Royt on the new Aberdeen IWW and organizing the unhoused',
    sourceUrl: 'https://sabotmedia.noblogs.org/episode-16-royt-on-the-new-aberdeen-iww-and-organizing-the-unhoused/',
  }, 'podcast')

  assert.equal(project.slug, 'molotov-now')
})

test('generic legacy categories fall back to a real project instead of becoming projects', () => {
  assert.equal(resolveArchiveProject({ primaryProject: 'General' }, 'article').slug, 'the-harbor-rat-report')
  assert.notEqual(resolveArchiveProject({ primaryProject: 'podcast' }, 'podcast').slug, 'molotov-now')
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
    { type: 'podcast', projectMeta: resolveArchiveProject({ primaryProject: 'Molotov Now!' }, 'podcast') },
    { type: 'podcast', projectMeta: resolveArchiveProject({ title: 'The Child and Its Enemies Ep 1' }, 'podcast') },
  ]

  const options = buildArchiveProjectOptions(items)
  const names = options.map((project) => project.name)

  assert.deepEqual(names, ['The Harbor Rat Report', 'Molotov Now!', 'The Child and Its Enemies'])
  assert.equal(names.includes('General'), false)
  assert.equal(names.includes('podcast'), false)
})

test('archive order keeps Molotov, TCAIE, and Get To Know Your Neighborhood together', () => {
  const slugs = PUBLIC_PROJECTS.map((project) => project.slug)
  const molotov = slugs.indexOf('molotov-now')
  const tcaie = slugs.indexOf('the-child-and-its-enemies')
  const neighborhood = slugs.indexOf('get-to-know-your-neighborhood')

  assert.equal(tcaie, molotov + 1)
  assert.equal(neighborhood, tcaie + 1)
})
