import test from 'node:test'
import assert from 'node:assert/strict'
import { podcastEntryBelongsToShow } from '../shared/podcastShowMembership.js'
import { mergeNativeAndImportedPieces } from '../src/lib/publicPieceMerge.js'
import { podcastShowOwnsEntry } from '../functions/api/_lib/podcastSettings.js'

const molotov = {
  id: 'molotov-now',
  slug: 'molotov-now',
  podcastTitle: 'Molotov Now!',
  sourceFeedUrl: 'https://feeds.acast.com/public/shows/63b498adb04df50010b4f14d',
  sourceFeedUrls: ['https://feeds.acast.com/public/shows/63b498adb04df50010b4f14d'],
}

test('legacy podcast posts explicitly assigned to Molotov belong to it despite an old source URL', () => {
  const legacy = {
    contentType: 'podcast',
    sourceUrl: 'https://sabotmedia.noblogs.org/where-do-we-go-a-fight-for-our-lives/',
    projects: ['Molotov Now!'],
    categories: ['Molotov Now!'],
  }
  assert.equal(podcastEntryBelongsToShow(legacy, molotov), true)
  assert.equal(podcastShowOwnsEntry(molotov, legacy), true)
})

test('explicit assignment to another podcast does not leak into Molotov', () => {
  const tcaie = {
    contentType: 'podcast',
    sourceUrl: 'https://sabotmedia.noblogs.org/some-old-post/',
    projects: ['The Child and Its Enemies'],
    categories: ['The Child and Its Enemies'],
  }
  assert.equal(podcastEntryBelongsToShow(tcaie, molotov), false)
  assert.equal(podcastShowOwnsEntry(molotov, tcaie), false)
})

test('renamed native legacy posts replace stale imported copies by stable source id', () => {
  const imported = [{
    id: '2356',
    sourcePostId: '2356',
    slug: 'episode-17-solitude-vs-isolation-relationships-as-anarchy',
    type: 'newsletter',
  }]
  const native = [{
    id: 'imported-2356',
    sourcePostId: '2356',
    slug: 'solitude-vs-isolation-relationships-as-anarchy',
    contentType: 'podcast',
    projects: ['Molotov Now!'],
    categories: ['Molotov Now!'],
  }]

  const merged = mergeNativeAndImportedPieces(imported, native)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].slug, 'solitude-vs-isolation-relationships-as-anarchy')
  assert.equal(merged[0].contentType, 'podcast')
})
