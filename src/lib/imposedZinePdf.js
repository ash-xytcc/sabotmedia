function decodeHtmlAttribute(value = '') {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function getImposedPdfFromAssets(assets = []) {
  const candidates = (Array.isArray(assets) ? assets : [])
    .map((asset) => ({ title: String(asset?.title || asset?.label || '').toLowerCase(), url: asset?.url || asset?.href || '' }))
    .filter(({ title, url }) => /impos|printer.?friendly/.test(title) && /^https?:\/\//i.test(url))
  const selected = candidates.find(({ title }) => /printer.?friendly/.test(title)) || candidates.find(({ title }) => /impos/.test(title))
  return selected?.url || ''
}

function getImposedPdfFromBody(piece) {
  const html = String(piece?.bodyHtml || piece?.contentHtml || piece?.content || piece?.body || piece?.html || '')
  const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)].map((match) => {
    const href = decodeHtmlAttribute(match[1].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2] || '')
    const label = decodeHtmlAttribute(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    return { href, label: `${match[1]} ${label}`.toLowerCase() }
  }).filter(({ href, label }) => /impos/.test(label) && !/reader/.test(label) && /^https?:\/\//i.test(href))

  const selected = links.find(({ label }) => /printer.?friendly/.test(label)) || links[0]
  return selected?.href || ''
}

export function getImposedZinePdf(piece, publications = []) {
  const piecePdf = getImposedPdfFromAssets([
    ...(Array.isArray(piece?.relatedPrintLinks) ? piece.relatedPrintLinks : []),
    ...(Array.isArray(piece?.relatedAssets) ? piece.relatedAssets : []),
  ])
  if (piecePdf) return piecePdf

  const bodyPdf = getImposedPdfFromBody(piece)
  if (bodyPdf) return bodyPdf

  const publication = (Array.isArray(publications) ? publications : []).find((item) =>
    ['public', 'published'].includes(String(item?.visibility || item?.status || '').toLowerCase()) &&
    (item?.pieceSlugs || []).includes(piece?.slug)
  )
  return publication?.assets?.imposedPdf || publication?.printEditions?.find((edition) => edition?.imposedPdf)?.imposedPdf || ''
}
