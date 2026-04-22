import { fetchNativeEntries, fetchNativeRevisions } from './nativePublicContentApi'
import { fetchTaxonomyTerms } from './taxonomyApi'
import { fetchEditorRoles, fetchAuditLog } from './editorRolesApi'

async function safeRun(fn, fallback) {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export async function exportSystemSnapshot() {
  const nativeData = await safeRun(
    () => fetchNativeEntries({ includeFuture: 1 }),
    { items: [] }
  )

  const taxonomyData = await safeRun(
    () => fetchTaxonomyTerms(),
    { items: [] }
  )

  const rolesData = await safeRun(
    () => fetchEditorRoles(),
    { items: [] }
  )

  const auditData = await safeRun(
    () => fetchAuditLog(),
    { items: [] }
  )

  const nativeItems = Array.isArray(nativeData?.items) ? nativeData.items : []
  const revisionsByNativeId = {}

  for (const item of nativeItems) {
    const revData = await safeRun(
      () => fetchNativeRevisions({ nativeId: item.id }),
      { items: [] }
    )
    revisionsByNativeId[item.id] = Array.isArray(revData?.items) ? revData.items : []
  }

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    nativeContent: nativeItems,
    revisionsByNativeId,
    taxonomyTerms: Array.isArray(taxonomyData?.items) ? taxonomyData.items : [],
    editorRoles: Array.isArray(rolesData?.items) ? rolesData.items : [],
    auditLog: Array.isArray(auditData?.items) ? auditData.items : [],
  }
}

export function summarizeSnapshot(snapshot) {
  const data = snapshot || {}
  return {
    nativeCount: Array.isArray(data.nativeContent) ? data.nativeContent.length : 0,
    revisionCount: Object.values(data.revisionsByNativeId || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
    taxonomyCount: Array.isArray(data.taxonomyTerms) ? data.taxonomyTerms.length : 0,
    roleCount: Array.isArray(data.editorRoles) ? data.editorRoles.length : 0,
    auditCount: Array.isArray(data.auditLog) ? data.auditLog.length : 0,
  }
}

export function downloadSnapshot(snapshot) {
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
