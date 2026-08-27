import { fetchNativeEntries, fetchNativeRevisions } from './nativePublicContentApi'
import { fetchTaxonomyTerms } from './taxonomyApi'
import { fetchEditorRoles, fetchAuditLog } from './editorRolesApi'
import { fetchMediaAssets } from './mediaAssetsApi'
import { loadPublicConfigPayload } from './publicConfigApi'

export async function collectSystemSnapshot(loaders = {}) {
  const loadNative = loaders.fetchNativeEntries || fetchNativeEntries
  const loadRevisions = loaders.fetchNativeRevisions || fetchNativeRevisions
  const loadTaxonomy = loaders.fetchTaxonomyTerms || fetchTaxonomyTerms
  const loadRoles = loaders.fetchEditorRoles || fetchEditorRoles
  const loadAudit = loaders.fetchAuditLog || fetchAuditLog
  const loadMedia = loaders.fetchMediaAssets || fetchMediaAssets
  const loadPublicConfig = loaders.loadPublicConfigPayload || loadPublicConfigPayload
  const loadCollections = loaders.fetchCollections || fetchCollectionsForBackup
  const loadPublications = loaders.fetchPublications || fetchPublicationsForBackup

  const [nativeData, taxonomyData, rolesData, auditData, mediaData, collectionsData, publicationsData, publicConfigData] = await Promise.all([
    loadNative({ includeFuture: 1 }),
    loadTaxonomy(),
    loadRoles(),
    loadAudit(),
    loadMedia(),
    loadCollections(),
    loadPublications(),
    loadPublicConfig(),
  ])

  const nativeItems = requireItems(nativeData, 'native content')
  const taxonomyTerms = requireItems(taxonomyData, 'taxonomy')
  const editorRoles = requireItems(rolesData, 'editor roles')
  const auditLog = requireItems(auditData, 'audit log')
  const mediaAssets = requireItems(mediaData, 'media assets')
  const collections = requireItems(collectionsData, 'collections')
  const publications = requireItems(publicationsData, 'publications')
  const revisionsByNativeId = {}

  for (const item of nativeItems) {
    const revData = await loadRevisions({ nativeId: item.id })
    revisionsByNativeId[item.id] = requireItems(revData, `revisions for ${item.id}`)
  }

  const snapshot = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 2,
    backupType: 'server-system',
    source: 'BF_DB-backed APIs',
    manifest: {
      complete: true,
      datasets: [
        'nativeContent',
        'revisionsByNativeId',
        'taxonomyTerms',
        'editorRoles',
        'auditLog',
        'mediaAssets',
        'collections',
        'publications',
        'publicSiteConfig',
      ],
    },
    nativeContent: nativeItems,
    revisionsByNativeId,
    taxonomyTerms,
    editorRoles,
    auditLog,
    mediaAssets,
    collections,
    publications,
    publicSiteConfig: publicConfigData?.config || publicConfigData?.settings || publicConfigData?.payload || publicConfigData || {},
  }

  return snapshot
}

export async function exportSystemSnapshot() {
  return collectSystemSnapshot()
}

export function summarizeSnapshot(snapshot) {
  const data = snapshot || {}
  return {
    nativeCount: Array.isArray(data.nativeContent) ? data.nativeContent.length : 0,
    revisionCount: Object.values(data.revisionsByNativeId || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
    taxonomyCount: Array.isArray(data.taxonomyTerms) ? data.taxonomyTerms.length : 0,
    roleCount: Array.isArray(data.editorRoles) ? data.editorRoles.length : 0,
    auditCount: Array.isArray(data.auditLog) ? data.auditLog.length : 0,
    mediaCount: Array.isArray(data.mediaAssets) ? data.mediaAssets.length : 0,
    collectionCount: Array.isArray(data.collections) ? data.collections.length : 0,
    publicationCount: Array.isArray(data.publications) ? data.publications.length : 0,
    complete: data?.manifest?.complete === true,
  }
}

export function downloadSnapshot(snapshot) {
  if (snapshot?.manifest?.complete !== true) {
    throw new Error('Refusing to download an incomplete system snapshot')
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `sabot-system-snapshot-${stamp}.json`
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function requireItems(data, label) {
  if (!data?.ok || !Array.isArray(data.items)) {
    throw new Error(`${label} backup response was incomplete`)
  }
  return data.items
}

async function fetchCollectionsForBackup() {
  return fetchRequiredList('/api/collections?includeDrafts=1', 'collections')
}

async function fetchPublicationsForBackup() {
  return fetchRequiredList('/api/publications?includeDrafts=1', 'publications')
}

async function fetchRequiredList(url, label) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || !Array.isArray(data.items)) {
    throw new Error(data?.error || `${label} backup fetch failed: ${response.status}`)
  }
  return data
}
