export function getImportedImage(piece) {
  // 1. relatedAssets
  const assets = Array.isArray(piece?.relatedAssets) ? piece.relatedAssets : []

  const imgAsset = assets.find((a) => {
    const kind = String(a?.kind || a?.type || '').toLowerCase()
    return kind.includes('image')
  })

  if (imgAsset?.url) return imgAsset.url
  if (imgAsset?.src) return imgAsset.src

  // 2. fallback: first <img> in bodyHtml
  const html = String(piece?.bodyHtml || '')
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (match) return match[1]

  return null
}
