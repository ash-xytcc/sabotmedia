export function getLatestPieces(pieces, limit = 9) {
  return [...pieces]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit)
}

export function getFeaturedPiece(pieces) {
  const explicit = pieces.find((piece) => piece.featured === true)
  if (explicit) return explicit

  return pieces.find((piece) => piece.slug === 'awakening-the-flame-joining-the-anarchist-cause')
    || getLatestPieces(pieces, 1)[0]
    || null
}

export function slugifyProject(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function deslugifyProject(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function isPublicProjectSlug(slug) {
  return slug && slug !== 'general'
}

export function buildProjectMap(pieces) {
  const counts = new Map()

  for (const piece of pieces) {
    const slug = piece.primaryProjectSlug || slugifyProject(piece.primaryProject || 'general')
    if (!isPublicProjectSlug(slug)) continue

    const name = piece.primaryProject || deslugifyProject(slug)
    const current = counts.get(slug) || { slug, name, count: 0 }
    current.count += 1
    counts.set(slug, current)
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function splitDisplayTitle(piece) {
  const rawTitle = String(piece?.title || '').trim()
  const existingSubtitle = String(piece?.subtitle || '').trim()

  if (existingSubtitle) {
    return { title: rawTitle, subtitle: existingSubtitle }
  }

  const parts = rawTitle.split(':').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return {
      title: parts[0],
      subtitle: parts.slice(1).join(': '),
    }
  }

  return { title: rawTitle, subtitle: '' }
}

export function getProjectMeta(slug) {
  const key = String(slug || '').trim().toLowerCase()

  const map = {
    'the-harbor-rat-report': {
      slug: key,
      name: 'The Harbor Rat Report',
      kicker: 'longform / analysis / local signal',
      description: 'Essays, reports, history, and sharp local writing from the Harbor.',
    },
    'harbor-rat-report': {
      slug: key,
      name: 'The Harbor Rat Report',
      kicker: 'longform / analysis / local signal',
      description: 'Essays, reports, history, and sharp local writing from the Harbor.',
    },
    'molotov-now': {
      slug: key,
      name: 'Molotov Now!',
      kicker: 'podcast / audio / broadcast',
      description: 'Podcast episodes, audio dispatches, and broadcast-oriented media.',
    },
    'the-communique': {
      slug: key,
      name: 'The Communique',
      kicker: 'newsletter / updates / bulletins',
      description: 'Newsletter-style writing, updates, and recurring dispatches.',
    },
    'black-cat-distro': {
      slug: key,
      name: 'Black Cat Distro',
      kicker: 'print / distro / material culture',
      description: 'Zines, print material, posters, and physical publishing routes.',
    },
    'the-sabotuers': {
      slug: key,
      name: 'The Sabotuers',
      kicker: 'comic / graphic / strip work',
      description: 'Comics, graphic storytelling, and image-forward narrative work.',
    },
    'zines-and-comics': {
      slug: key,
      name: 'Zines and Comics',
      kicker: 'print / comics / visual work',
      description: 'Zines, comics, and mixed visual publishing experiments.',
    },
  }

  return map[key] || {
    slug: key,
    name: deslugifyProject(key),
    kicker: 'project archive',
    description: 'Imported archive entries grouped under this project.',
  }
}

export function buildTypeOptions(pieces) {
  return [...new Set(
    pieces
      .map((piece) => String(piece.type || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b))
}
