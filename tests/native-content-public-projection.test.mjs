import assert from 'node:assert/strict'
import test from 'node:test'
import { publicNativeItem } from '../functions/api/native-content.js'

test('public native content projection keeps publishable fields and strips internal metadata', () => {
  const item = publicNativeItem({
    id: 'native-1',
    slug: 'public-post',
    title: 'Public post',
    status: 'published',
    workflowState: 'published',
    sourceNotes: 'internal import note',
    transcriptNotes: 'private editor note',
    bodyHtml: '<p>Public body</p>',
    relatedAssets: [{
      id: 'asset-1',
      url: 'https://sabot.media/api/media/files?key=public',
      mimeType: 'audio/mpeg',
      storageKey: 'private/storage/key',
      customMetadata: { private: true },
      contributorId: 'contributor-secret',
      campaignId: 'campaign-internal',
      privateUrl: 'https://private.invalid/file',
      internalNotes: 'do not publish',
    }],
  })

  assert.equal(item.title, 'Public post')
  assert.equal(item.bodyHtml, '<p>Public body</p>')
  assert.equal(item.relatedAssets[0].url, 'https://sabot.media/api/media/files?key=public')
  assert.equal(item.relatedAssets[0].mimeType, 'audio/mpeg')
  for (const key of ['sourceNotes', 'transcriptNotes', 'workflowState']) assert.equal(Object.hasOwn(item, key), false)
  for (const key of ['storageKey', 'customMetadata', 'contributorId', 'campaignId', 'privateUrl', 'internalNotes']) {
    assert.equal(Object.hasOwn(item.relatedAssets[0], key), false)
  }
})
