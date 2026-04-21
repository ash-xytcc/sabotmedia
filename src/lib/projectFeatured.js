export function getFeaturedPieceForProject(pieces, slug) {
  const filtered = pieces.filter((piece) => piece.primaryProjectSlug === slug)

  const explicit = filtered.find((piece) => piece.featured === true)
  if (explicit) return explicit

  return [...filtered].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0] || null
}
