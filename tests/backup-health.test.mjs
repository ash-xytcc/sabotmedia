import test from 'node:test'
import assert from 'node:assert/strict'
import { collectSystemSnapshot, summarizeSnapshot } from '../src/lib/systemBackup.js'
import { onRequestGet as getSiteHealth } from '../functions/api/site-health.js'

function okItems(items = []) { return Promise.resolve({ ok: true, mode: 'd1', items }) }

function backupLoaders(overrides = {}) {
  return {
    fetchNativeEntries: () => okItems([{ id: 'post-1', title: 'One' }]),
    fetchNativeRevisions: () => okItems([{ id: 'rev-1' }]),
    fetchTaxonomyTerms: () => okItems([{ id: 'tag-1' }]),
    fetchAdminUsers: () => okItems([{ id: 'user-1', email: 'editor@example.org', displayName: 'Editor', role: 'editor', status: 'active', password_hash: 'must-not-export' }]),
    fetchEditorRoles: () => okItems([{ id: 'role-1' }]),
    fetchAuditLog: () => okItems([{ id: 'audit-1' }]),
    fetchMediaAssets: () => okItems([{ id: 'media-1' }]),
    fetchCollections: () => okItems([{ id: 'collection-1' }]),
    fetchPublications: () => okItems([{ id: 'publication-1' }]),
    fetchSites: () => okItems([{ id: 'site-1', domain: 'sabot.media' }]),
    fetchFeedSettings: () => Promise.resolve({ ok: true, mode: 'd1', settings: { exposeMainFeed: true } }),
    fetchPodcastSettings: () => Promise.resolve({ ok: true, mode: 'd1', settings: { podcastTitle: 'Sabot Media Podcast', rssFeedUrl: 'https://sabot.media/feeds/podcasts/all.xml' } }),
    loadPublicConfigPayload: () => Promise.resolve({ ok: true, config: { siteTitle: 'Sabot Media' } }),
    ...overrides,
  }
}

test('verified system backup includes every required dataset without credential material', async () => {
  const snapshot = await collectSystemSnapshot(backupLoaders())
  const summary = summarizeSnapshot(snapshot)
  assert.equal(snapshot.manifest.complete, true)
  assert.equal(snapshot.manifest.credentialMaterialExcluded, true)
  assert.equal(snapshot.schemaVersion, 5)
  assert.equal(summary.complete, true)
  assert.equal(summary.nativeCount, 1)
  assert.equal(summary.revisionCount, 1)
  assert.equal(summary.taxonomyCount, 1)
  assert.equal(summary.userCount, 1)
  assert.equal(summary.roleCount, 1)
  assert.equal(summary.auditCount, 1)
  assert.equal(summary.mediaCount, 1)
  assert.equal(summary.collectionCount, 1)
  assert.equal(summary.publicationCount, 1)
  assert.equal(summary.siteCount, 1)
  assert.equal(summary.feedSettingsIncluded, true)
  assert.equal(summary.podcastSettingsIncluded, true)
  assert.equal(summary.publicConfigIncluded, true)
  assert.equal(snapshot.sites[0].domain, 'sabot.media')
  assert.equal(snapshot.adminUsers[0].email, 'editor@example.org')
  assert.equal('password_hash' in snapshot.adminUsers[0], false)
  assert.equal(snapshot.feedSettings.exposeMainFeed, true)
  assert.equal(snapshot.podcastSettings.podcastTitle, 'Sabot Media Podcast')
  assert.equal(snapshot.publicSiteConfig.siteTitle, 'Sabot Media')
  assert.deepEqual(snapshot.manifest.datasets, [
    'nativeContent', 'revisionsByNativeId', 'taxonomyTerms', 'adminUsers', 'editorRoles', 'auditLog', 'mediaAssets', 'collections', 'publications', 'sites', 'feedSettings', 'podcastSettings', 'publicSiteConfig',
  ])
})

test('verified system backup aborts when a required dataset fails', async () => {
  await assert.rejects(collectSystemSnapshot(backupLoaders({ fetchMediaAssets: async () => { throw new Error('media storage unavailable') } })), /media storage unavailable/)
})

test('verified system backup rejects malformed successful-looking list data', async () => {
  await assert.rejects(collectSystemSnapshot(backupLoaders({ fetchTaxonomyTerms: async () => ({ ok: true, mode: 'd1' }) })), /taxonomy backup response was incomplete/)
})

test('verified system backup rejects scaffold list data', async () => {
  await assert.rejects(collectSystemSnapshot(backupLoaders({ fetchSites: async () => ({ ok: true, mode: 'scaffold', items: [] }) })), /sites backup response was incomplete/)
})

test('verified system backup rejects missing feed settings', async () => {
  await assert.rejects(collectSystemSnapshot(backupLoaders({ fetchFeedSettings: async () => ({ ok: true, mode: 'd1' }) })), /feed settings backup response was incomplete/)
})

test('verified system backup rejects missing podcast settings', async () => {
  await assert.rejects(collectSystemSnapshot(backupLoaders({ fetchPodcastSettings: async () => ({ ok: true, mode: 'd1' }) })), /podcast settings backup response was incomplete/)
})

test('site health fails explicitly without BF_DB', async () => {
  const response = await getSiteHealth({
    request: new Request('https://sabot.media/api/site-health', { headers: { 'cf-access-authenticated-user-email': 'editor@example.org' } }),
    env: { SABOT_TRUST_CF_ACCESS: 'true' },
  })
  assert.equal(response.status, 503)
  const payload = await response.json()
  assert.equal(payload.ok, false)
  assert.match(payload.error, /BF_DB binding is required/)
})
