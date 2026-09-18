import imported from '../../../src/content/pieces.imported.json'
import overrides from '../../../src/content/piece-overrides.json'
import { listNativeEntries, isPubliclyVisible } from './nativePublicContent.js'
import { mergeNativeAndImportedPieces, getPublicPieceMergeKeys } from '../../../src/lib/publicPieceMerge.js'

// The WordPress importer includes only published posts. Native records, including
// withdrawals, take precedence so an old import cannot resurrect hidden content.
export const importedReadingPosts = (imported.items || []).map(item => ({ ...item, ...(overrides[item.slug] || {}), hidden: item.hidden === true || overrides[item.slug]?.hidden === true }))
  .filter(item => !item.hidden && !item.private && !item.isPrivate && !['draft','private','hidden','archived','trash','unpublished'].includes(item.status) && !['draft','private','hidden','archived','trash','unpublished'].includes(item.workflowState))

export async function listReadingPosts(db) {
  const native = await listNativeEntries(db, { includeFuture: true })
  const nativeKeys = new Set(native.flatMap(getPublicPieceMergeKeys))
  const legacy = importedReadingPosts.filter(item => !getPublicPieceMergeKeys(item).some(key => nativeKeys.has(key)))
  return mergeNativeAndImportedPieces(legacy,native.filter(isPubliclyVisible).map(item => ({...item,sourceKind:'native'})))
}
