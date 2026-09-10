import test from 'node:test'
import assert from 'node:assert/strict'

import { buildRssBundle, resolveFeedFormat, resolveFeedProject } from '../src/lib/rssFeeds.js'

test('Black Cat audiozines stay audio while remaining in the Black Cat project', () => {
  const item = {
    id: 'audiozine-organizing-unhoused',
    slug: 'audiozine-organizing-unhoused',
    title: '[AUDIOZINE] Organizing the Unhoused: An Organizer’s Manual',
    status: 'published',
    contentType: 'print',
    sourceKind: 'imported',
    sourceLabel: 'post',
    primaryProject: 'Black Cat Distro',
    audioSourceUrl: 'https://sabot.media/media/organizing-the-unhoused.mp3',
  }

  assert.equal(resolveFeedProject(item), 'Black Cat Distro')
  assert.equal(resolveFeedFormat(item), 'audio')

  const bundle = buildRssBundle([item])
  assert.match(bundle['projects/black-cat-distro.xml'], /Organizing the Unhoused/)
  assert.match(bundle['formats/audio.xml'], /Organizing the Unhoused/)
  assert.equal(bundle['formats/print.xml'], undefined)
})

test('explicit zines stay zines while remaining in the Black Cat project', () => {
  const item = {
    id: 'server-called-paranoia',
    slug: 'server-called-paranoia',
    title: '[ZINE] The Server Called Paranoia',
    status: 'published',
    contentType: 'print',
    sourceKind: 'native',
    primaryProject: 'Black Cat Distro',
  }

  assert.equal(resolveFeedProject(item), 'Black Cat Distro')
  assert.equal(resolveFeedFormat(item), 'zine')

  const bundle = buildRssBundle([item])
  assert.match(bundle['projects/black-cat-distro.xml'], /The Server Called Paranoia/)
  assert.match(bundle['formats/zine.xml'], /The Server Called Paranoia/)
  assert.equal(bundle['formats/print.xml'], undefined)
})

test('ordinary Black Cat print remains print when no more specific format is present', () => {
  const item = {
    id: 'pamphlet',
    slug: 'pamphlet',
    title: 'A Black Cat pamphlet',
    status: 'published',
    contentType: 'print',
    sourceKind: 'native',
    primaryProject: 'Black Cat Distro',
  }

  assert.equal(resolveFeedProject(item), 'Black Cat Distro')
  assert.equal(resolveFeedFormat(item), 'print')
})
