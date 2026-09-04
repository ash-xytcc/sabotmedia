const GENERIC_PROJECT_KEYS = new Set([
  '',
  'general',
  'podcast',
  'podcasts',
  'article',
  'articles',
  'post',
  'posts',
  'comic',
  'comics',
  'zine',
  'zines',
  'newsletter',
  'newsletters',
  'print',
  'audio',
  // Legacy catch-all taxonomy. It was never a useful public archive shelf.
  'al1312',
])

export const PUBLICATION_IDENTITY = {
  name: 'Sabot Media',
  logoUrl: '/project-logos/sabot-media.svg',
}

export const PUBLIC_PROJECTS = [
  {
    name: 'The Harbor Rat Report',
    slug: 'the-harbor-rat-report',
    format: 'reporting + essays',
    featured: true,
    aliases: ['harbor rat report', 'harbor rat'],
    signals: ['the harbor rat report', 'harbor rat report'],
    description: 'Reporting, essays, interviews, and dispatches rooted in Grays Harbor and connected struggles elsewhere.',
    logoUrl: '/project-logos/the-harbor-rat-report.svg',
  },
  {
    name: 'The Communique',
    slug: 'the-communique',
    format: 'newsletter',
    featured: true,
    aliases: ['communique', 'the communiqué', 'communiqué'],
    signals: ['the communique', 'the communiqué', 'communiqué'],
    description: 'Newsletters, roundups, notices, and direct correspondence from Sabot Media.',
    logoUrl: '/project-logos/the-communique.svg',
  },
  {
    name: 'Black Cat Distro',
    slug: 'black-cat-distro',
    format: 'print + zines',
    featured: true,
    aliases: ['black cat', 'black cat distro'],
    signals: ['black cat distro', 'black-cat-distro'],
    description: 'Print matter, zines, pamphlets, and other objects made to leave the screen and circulate by hand.',
    logoUrl: '/project-logos/black-cat-distro.svg',
  },
  {
    name: 'The Sabotuers',
    slug: 'the-sabotuers',
    format: 'comics',
    featured: true,
    aliases: ['sabotuers', 'the sabotuers'],
    signals: ['the sabotuers', 'sabotuers'],
    description: 'Comics and illustrated work from the Sabot archive.',
    logoUrl: '',
  },
  {
    name: 'Molotov Now!',
    slug: 'molotov-now',
    format: 'podcast',
    featured: true,
    aliases: ['molotov now', 'molotov now podcast'],
    signals: ['molotov now!', 'molotov now', 'molotov-now'],
    description: 'Sabot Media’s podcast for interviews, field recordings, analysis, and conversations from the places we work.',
    logoUrl: '/project-logos/molotov-now.svg',
  },
  {
    name: 'The Child and Its Enemies',
    slug: 'the-child-and-its-enemies',
    format: 'podcast',
    featured: true,
    aliases: ['the child and its enemies', 'child and its enemies', 'tcaie', 'tcaies'],
    signals: [
      'the child and its enemies',
      'the-child-and-its-enemies',
      'child and its enemies',
      'tcaie',
      'tcaies',
    ],
    description: 'A youth-liberation podcast about queer and neurodivergent life, anarchy, autonomy, and the worlds young people build against adult control.',
    logoUrl: '/project-logos/the-child-and-its-enemies.svg',
  },
  {
    name: 'Get To Know Your Neighborhood',
    slug: 'get-to-know-your-neighborhood',
    format: 'series',
    featured: true,
    aliases: ['get to know your neighborhood'],
    signals: ['get to know your neighborhood'],
    description: 'A Sabot Media neighborhood series preserved as its own project in the archive.',
    logoUrl: '/project-logos/get-to-know-your-neighborhood.svg',
  },
  {
    name: 'Glaring Examples',
    slug: 'glaring-examples',
    format: 'anthology',
    featured: true,
    aliases: ['glaring examples'],
    signals: ['glaring examples'],
    description: 'An anthology of collective experience, struggle, oppression, anarchy, and the beauty dredged up from underneath it all.',
    logoUrl: '/project-logos/glaring-examples.svg',
  },
  {
    name: 'Sabots Bay',
    slug: 'sabots-bay',
    format: 'series',
    featured: false,
    aliases: ["sabot's bay", 'sabots bay'],
    signals: ["sabot's bay", 'sabots bay'],
    description: 'A legacy Sabot Media project preserved in the archive.',
    logoUrl: '',
  },
  {
    name: 'Zines and Comics',
    slug: 'zines-and-comics',
    format: 'archive',
    featured: false,
    aliases: ['zines and comics'],
    signals: ['zines and comics'],
    description: 'Legacy print and comics material preserved as an archive project.',
    logoUrl: '',
  },
]

export function normalizeProjectKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.!?]+$/g, '')
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function toProjectSlug(value) {
  return normalizeProjectKey(value)
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const PROJECT_BY_ALIAS = new Map()
for (const project of PUBLIC_PROJECTS) {
  const values = [project.name, project.slug, ...(project.aliases || [])]
  for (const value of values) PROJECT_BY_ALIAS.set(normalizeProjectKey(value), project)
}

export function isGenericProject(value) {
  return GENERIC_PROJECT_KEYS.has(normalizeProjectKey(value))
}

export function findPublicProject(value) {
  const key = normalizeProjectKey(value)
  if (!key) return null
  return PROJECT_BY_ALIAS.get(key) || PUBLIC_PROJECTS.find((project) => project.slug === toProjectSlug(value)) || null
}

function flattenIdentityValues(values = []) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => {
      if (!value || typeof value !== 'object') return value
      return value.name || value.title || value.slug || value.label || value.url || ''
    })
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

function collectProjectCandidates(piece) {
  return flattenIdentityValues([
    piece?.primaryProject,
    piece?.primaryProjectSlug,
    piece?.project,
    piece?.projectName,
    piece?.projects,
  ])
}

function collectDirectIdentityText(piece) {
  return flattenIdentityValues([
    piece?.title,
    piece?.subtitle,
    piece?.slug,
    piece?.nativeSlug,
    piece?.canonicalSlug,
    piece?.sourceUrl,
    piece?.permalink,
    piece?.href,
    piece?.feedTitle,
    piece?.sourceTitle,
    piece?.podcastTitle,
    piece?.showTitle,
    piece?.seriesTitle,
    piece?.featuredImage,
    piece?.heroImage,
    piece?.imageUrl,
    piece?.relatedAssets,
  ]).join(' ').toLowerCase()
}

function collectIntroIdentityText(piece) {
  return flattenIdentityValues([
    piece?.excerpt,
    piece?.bodyHtml,
    piece?.contentHtml,
    piece?.content,
  ]).join(' ').slice(0, 2400).toLowerCase()
}

function collectBodyIdentityText(piece) {
  return flattenIdentityValues([
    piece?.bodyHtml,
    piece?.contentHtml,
    piece?.content,
  ]).join(' ').toLowerCase()
}

function collectWeakIdentityText(piece) {
  return flattenIdentityValues([
    piece?.categories,
    piece?.tags,
  ]).join(' ').toLowerCase()
}

function countOccurrences(text, needle) {
  const haystack = String(text || '')
  const target = String(needle || '').toLowerCase()
  if (!haystack || !target) return 0

  let count = 0
  let offset = 0
  while (offset < haystack.length) {
    const match = haystack.indexOf(target, offset)
    if (match < 0) break
    count += 1
    offset = match + target.length
  }
  return count
}

function looksLikePodcastPiece(piece, type) {
  if (['podcast', 'audio'].includes(String(type || '').toLowerCase())) return true
  const text = [
    collectDirectIdentityText(piece),
    collectIntroIdentityText(piece),
  ].join(' ')
  return /\bpodcast\b|download and subscribe:\s*rss|wherever you get your podcast|channel zero podcast network|\bacast\b|\bspotify\b|\bitunes\b|\biheart\b/i.test(text)
}

function projectAllowedForType(project, type) {
  if (project.format !== 'podcast') return true
  return ['podcast', 'audio'].includes(String(type || '').toLowerCase())
}

function scoreProjectSignals(project, text, weight = 1) {
  if (!text || !project) return 0
  return (project.signals || []).reduce((score, signal) => {
    const normalizedSignal = String(signal || '').toLowerCase()
    const occurrences = countOccurrences(text, normalizedSignal)
    if (!occurrences) return score
    // Longer, more specific names beat tiny aliases when both happen to appear.
    const specificity = Math.max(1, Math.min(3, normalizedSignal.length / 12))
    return score + (occurrences * weight * specificity)
  }, 0)
}

function bestProjectForIdentity(piece, type, { includeBody = false } = {}) {
  const direct = collectDirectIdentityText(piece)
  const intro = collectIntroIdentityText(piece)
  const body = includeBody ? collectBodyIdentityText(piece) : ''

  let best = null
  let bestScore = 0

  for (const project of PUBLIC_PROJECTS) {
    if (!projectAllowedForType(project, type)) continue

    const score =
      scoreProjectSignals(project, direct, 100) +
      scoreProjectSignals(project, intro, 30) +
      scoreProjectSignals(project, body, 1)

    if (score > bestScore) {
      best = project
      bestScore = score
    }
  }

  return best
}

function projectFromWeakIdentity(piece, type) {
  const identity = collectWeakIdentityText(piece)
  if (!identity.trim()) return null

  let best = null
  let bestScore = 0
  for (const project of PUBLIC_PROJECTS) {
    if (!projectAllowedForType(project, type)) continue
    const score = scoreProjectSignals(project, identity, 1)
    if (score > bestScore) {
      best = project
      bestScore = score
    }
  }
  return best
}

export function fallbackProjectForType(type) {
  switch (String(type || '').toLowerCase()) {
    case 'comic':
      return findPublicProject('The Sabotuers')
    case 'zine':
    case 'print':
      return findPublicProject('Black Cat Distro')
    case 'newsletter':
      return findPublicProject('The Communique')
    case 'podcast':
    case 'audio':
      // Never invent a Molotov Now! attribution merely because an imported item is audio.
      // Known podcast projects are resolved from show identity or explicit project metadata above.
      return findPublicProject('The Harbor Rat Report')
    default:
      return findPublicProject('The Harbor Rat Report')
  }
}

export function resolveArchiveProject(piece, type = 'article') {
  const candidates = collectProjectCandidates(piece)
  const effectiveType = looksLikePodcastPiece(piece, type) ? 'podcast' : type

  // Direct show/title/source/artwork identity and the opening copy outrank legacy taxonomy.
  // This catches TCAIE episodes whose guest-only titles were imported under Molotov and
  // old Molotov entries filed under newsletter/reporting categories.
  const strongIdentityProject = bestProjectForIdentity(piece, effectiveType)
  if (strongIdentityProject) return strongIdentityProject

  // AL1312 was a legacy catch-all, not a real archive project. Every podcast-like item
  // that survived under that bucket belongs with Molotov Now! unless a stronger show
  // identity above already identified TCAIE.
  if (effectiveType === 'podcast' && candidates.some((candidate) => normalizeProjectKey(candidate) === 'al1312')) {
    return findPublicProject('Molotov Now!')
  }

  // Same deal for podcast posts that were historically filed under The Communique.
  // Genuine newsletters stay put because this only applies to podcast-like content.
  if (effectiveType === 'podcast' && candidates.some((candidate) => {
    const key = normalizeProjectKey(candidate)
    return key === 'the communique' || key === 'communique'
  })) {
    return findPublicProject('Molotov Now!')
  }

  for (const candidate of candidates) {
    const canonical = findPublicProject(candidate)
    if (canonical) return canonical
  }

  // Only use incidental full-body mentions when there is no canonical project metadata.
  // That prevents a guest mentioning another Sabot show halfway through an interview from
  // re-filing the entire piece under that show.
  const bodyIdentityProject = bestProjectForIdentity(piece, effectiveType, { includeBody: true })
  if (bodyIdentityProject) return bodyIdentityProject

  const weakIdentityProject = projectFromWeakIdentity(piece, effectiveType)
  if (weakIdentityProject) return weakIdentityProject

  const explicit = candidates.find((candidate) => !isGenericProject(candidate))
  if (explicit) {
    return {
      name: explicit,
      slug: toProjectSlug(explicit),
      format: String(effectiveType || 'project'),
      featured: false,
      aliases: [],
      signals: [],
      description: 'Archive project.',
      logoUrl: '',
      dynamic: true,
    }
  }

  return fallbackProjectForType(effectiveType)
}

export function buildArchiveProjectOptions(items = []) {
  const counts = new Map()
  const dynamic = new Map()

  for (const item of items) {
    const project = item?.projectMeta || resolveArchiveProject(item, item?.type)
    if (!project?.slug) continue
    counts.set(project.slug, (counts.get(project.slug) || 0) + 1)
    if (project.dynamic) dynamic.set(project.slug, project)
  }

  const known = PUBLIC_PROJECTS
    .filter((project) => counts.has(project.slug))
    .map((project) => ({ ...project, count: counts.get(project.slug) || 0 }))

  const extras = [...dynamic.values()]
    .filter((project) => counts.has(project.slug))
    .map((project) => ({ ...project, count: counts.get(project.slug) || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return [...known, ...extras]
}

export function getFeaturedPublicProjects() {
  return PUBLIC_PROJECTS.filter((project) => project.featured)
}
