import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildArchiveProjectOptions,
  resolveArchiveProject,
} from '../src/lib/projectCatalog.js'

test('AL1312 no longer appears as a public archive project', () => {
  const project = resolveArchiveProject({
    title: 'Episode 6 - Brian Bean on Palestine, Socialism, and Liberation',
    primaryProject: 'AL1312',
    type: 'newsletter',
    excerpt: 'Download and Subscribe: RSS. Find us wherever you get your podcast.',
  }, 'newsletter')

  assert.equal(project.slug, 'molotov-now')

  const options = buildArchiveProjectOptions([{
    type: 'newsletter',
    projectMeta: project,
  }])

  assert.deepEqual(options.map((item) => item.slug), ['molotov-now'])
})

test('podcast-like posts filed under The Communique resolve to Molotov Now', () => {
  const project = resolveArchiveProject({
    title: 'Episode 10 Food Not Bombs Round Table',
    primaryProject: 'The Communique',
    type: 'newsletter',
    excerpt: 'Download and Subscribe: RSS. Find us wherever you get your podcast.',
  }, 'newsletter')

  assert.equal(project.slug, 'molotov-now')
})

test('Molotov artwork identity outranks a stale Harbor Rat category', () => {
  const project = resolveArchiveProject({
    title: 'Episode 17 Solitude VS Isolation, Relationships As Anarchy',
    primaryProject: 'The Harbor Rat Report',
    type: 'newsletter',
    featuredImage: 'https://sabot.media/uploads/molotov-now-episode-17.jpg',
    excerpt: 'Download and Subscribe: RSS. Find us wherever you get your podcast.',
  }, 'newsletter')

  assert.equal(project.slug, 'molotov-now')
})

test('real Communique newsletters remain in The Communique', () => {
  const project = resolveArchiveProject({
    title: 'The Communique Volume 18',
    primaryProject: 'The Communique',
    type: 'newsletter',
    excerpt: 'News, notices, and updates from Sabot Media.',
  }, 'newsletter')

  assert.equal(project.slug, 'the-communique')
})
