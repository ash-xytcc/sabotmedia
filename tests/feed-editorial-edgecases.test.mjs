import test from 'node:test'
import assert from 'node:assert/strict'

import { articleSupplementHtml, zineSupplementHtml } from '../src/content/articleSupplements.js'

import { buildRssBundle, resolveFeedFormat, resolveFeedProject } from '../src/lib/rssFeeds.js'
import { podcastFeedOwnsEntry } from '../functions/rss/podcast.xml.js'

test('audiozines live in Molotov Now while remaining audio as a format', () => {
  const audioUrl = 'https://sabot.media/media/organizing-the-unhoused.mp3'
  const item = {
    id: 'audiozine-organizing-unhoused',
    slug: 'audiozine-organizing-unhoused',
    title: '[AUDIOZINE] Organizing the Unhoused: An Organizer’s Manual',
    status: 'published',
    contentType: 'print',
    sourceKind: 'imported',
    sourceLabel: 'post',
    primaryProject: 'Black Cat Distro',
    audioSourceUrl: audioUrl,
    // Server normalization mirrors generic audioSourceUrl here for backwards compatibility.
    // That mirror alone must never promote arbitrary audio into a podcast show.
    podcastAudioUrl: audioUrl,
  }

  assert.equal(resolveFeedProject(item), 'Molotov Now!')
  assert.equal(resolveFeedFormat(item), 'audio')

  const bundle = buildRssBundle([item])
  assert.match(bundle['projects/molotov-now.xml'], /Organizing the Unhoused/)
  assert.equal(bundle['projects/black-cat-distro.xml'], undefined)
  assert.match(bundle['formats/audio.xml'], /Organizing the Unhoused/)
  assert.equal(bundle['formats/podcast.xml'], undefined)
  assert.equal(bundle['formats/print.xml'], undefined)
})

test('audiozines are owned by the actual Molotov Now podcast RSS only', () => {
  const audiozine = {
    title: '[AUDIOZINE] Organizing the Unhoused',
    contentType: 'print',
    primaryProject: 'Black Cat Distro',
    audioSourceUrl: 'https://sabot.media/media/audiozine.mp3',
  }
  const molotov = { id: 'molotov-now', slug: 'molotov-now', podcastTitle: 'Molotov Now!' }
  const tcaie = { id: 'the-child-and-its-enemies', slug: 'the-child-and-its-enemies', podcastTitle: 'The Child and Its Enemies' }

  assert.equal(podcastFeedOwnsEntry(molotov, audiozine), true)
  assert.equal(podcastFeedOwnsEntry(tcaie, audiozine), false)
  assert.equal(podcastFeedOwnsEntry(molotov, { ...audiozine, title: 'Ordinary audio handout' }), false)
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

test('zine markers anywhere in legacy titles remain zines', () => {
  for (const title of [
    '[Zine Version] Who is Terry Emmert?',
    'A Zine on Homelessness, Encampments, and the Limits of Enforcement',
    'Chehalis River Mutual Aid Info Zine',
  ]) {
    assert.equal(resolveFeedFormat({ title, status: 'published', contentType: 'print', primaryProject: 'Black Cat Distro' }), 'zine')
  }
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


test('the Catalan edition is attached to the zine surface, not the article translation', () => {
  for (const slug of ['server-called-paranoia', 'the-server-called-paranoia']) {
    const html = zineSupplementHtml(slug)
    assert.match(html, /https:\/\/vfc\.codeberg\.page\/Fanzinamel\//)
    assert.match(html, /Catalan edition/)
  }
  assert.equal(articleSupplementHtml('server-called-paranoia'), '')
  assert.equal(articleSupplementHtml('the-server-called-paranoia'), '')
  assert.equal(zineSupplementHtml('unrelated-post'), '')
})
