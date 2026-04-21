export function getLatestPieces(pieces, limit = 9) {
  return [...pieces]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit)
}

export function getFeaturedPiece(pieces) {
  return pieces.find((piece) => piece.slug === 'awakening-the-flame-joining-the-anarchist-cause') || getLatestPieces(pieces, 1)[0] || null
}

export function buildProjectMap(pieces) {
  const counts = new Map()
  for (const piece of pieces) {
    for (const project of piece.projects || []) {
      counts.set(project, (counts.get(project) || 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}
