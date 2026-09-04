import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeNativeAndImportedPieces } from '../src/lib/nativePublicFeed.js'

test('native edited podcast replaces stale imported newsletter copy of the same release', () => {
  const imported = [{
    id: 'legacy-newsletter-17',
    slug: 'episode-17-solitude-vs-isolation-relationships-as-anarchy',
    title: 'Episode 17: Solitude vs Isolation, Relationships as Anarchy',
    type: 'newsletter',
    publishedAt: '2024-03-02T12:00:00.000Z',
    primaryProject: 'The Harbor Rat Report',
  }]

  const native = [{
    id: 'native-podcast-17',
    slug: 'solitude-vs-isolation-relationships-as-anarchy',
    title: 'Solitude vs Isolation, Relationships as Anarchy',
    type: 'podcast',
    contentType: 'podcast',
    publishedAt: '2024-03-02T18:00:00.000Z',
    primaryProject: 'Molotov Now!',
    sourceKind: 'native',
  }]

  const merged = mergeNativeAndImportedPieces(imported, native)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].slug, 'solitude-vs-isolation-relationships-as-anarchy')
  assert.equal(merged[0].type, 'podcast')
  assert.equal(merged[0].primaryProject, 'Molotov Now!')
})

test('separate releases with the same title on different days are preserved', () => {
  const merged = mergeNativeAndImportedPieces([
    { id: 'a', slug: 'roundup-a', title: 'Monthly News Roundup', publishedAt: '2024-01-01T12:00:00Z' },
    { id: 'b', slug: 'roundup-b', title: 'Monthly News Roundup', publishedAt: '2024-02-01T12:00:00Z' },
  ], [])

  assert.equal(merged.length, 2)
})
