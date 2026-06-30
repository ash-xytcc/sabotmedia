export function getReaderOrderPages(publication) {
  return Array.isArray(publication?.pages) ? publication.pages : []
}

export function getHalfFoldSpreads(publication) {
  const pages = getReaderOrderPages(publication)
  const spreads = []
  for (let index = 0; index < pages.length; index += 2) {
    spreads.push({
      id: `half-fold-${index / 2 + 1}`,
      label: `Spread ${index / 2 + 1}`,
      left: pages[index] || null,
      right: pages[index + 1] || null,
    })
  }
  return spreads
}

export function getOutputLabel(mode, publication) {
  const pageCount = getReaderOrderPages(publication).length
  if (mode === 'half-fold') return `${Math.max(1, Math.ceil(pageCount / 2))} half-fold spread${pageCount === 2 ? '' : 's'}`
  return `Reader order / ${pageCount} page${pageCount === 1 ? '' : 's'}`
}
