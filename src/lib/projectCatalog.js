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
])

export const PUBLIC_PROJECTS = [
  {
    name: 'The Harbor Rat Report',
    slug: 'the-harbor-rat-report',
    format: 'reporting + essays',
    featured: true,
    aliases: ['harbor rat report', 'harbor rat'],
    signals: ['the harbor rat report', 'harbor rat report'],
    description: 'Reporting, essays, interviews, and dispatches rooted in Grays Harbor and connected struggles elsewhere.',
  },
  {
    name: 'Molotov Now!',
    slug: 'molotov-now',
    format: 'podcast',
    featured: true,
    aliases: ['molotov now', 'molotov now podcast'],
    signals: ['molotov now!', 'molotov now', 'molotov-now'],
    description: 'Sabot Media’s audio feed for interviews, field recordings, analysis, and conversations from the places we work.',
  },
  {
    name: 'The Child and Its Enemies',
    slug: 'the-child-and-its-enemies',
    format: 'podcast',
    featured: true,
    aliases: ['the child and its enemies', 'child and its enemies', 'tcaie'],
    signals: ['the child and its enemies', 'child and its enemies', 'tcaie'],
    description: 'A distinct podcast project in the Sabot archive, preserved as its own body of work rather than folded into the main feed.',
  },
  {
    name: 'The Communique',
    slug: 'the-communique',
    format: 'newsletter',
    featured: true,
    aliases: ['communique', 'the communiqué', 'communiqué'],
    signals: ['the communique', 'the communiqué', 'communiqué'],
    description: 'Newsletters, roundups, notices, and direct correspondence from Sabot Media.',
  },
  {
    name: 'Black Cat Distro',
    slug: 'black-cat-distro',
    format: 'print + zines',
    featured: true,
    aliases: ['black cat', 'black cat distro'],
    signals: ['black cat distro', 'black-cat-distro'],
    description: 'Print matter, zines, pamphlets, and other objects made to leave the screen and circulate by hand.',
  },
  {
    name: 'The Sabotuers',
    slug: 'the-sabotuers',
    format: 'comics',
    featured: true,
    aliases: ['sabotuers', 'the sabotuers'],
    signals: ['the sabotuers', 'sabotuers'],
    description: 'Comics and illustrated work from the Sabot archive.',
  },
  {
    name: 'Glaring Examples',
    slug: 'glaring-examples',
    format: 'series',
    featured: false,
    aliases: ['glaring examples'],
    signals: ['glaring examples'],
    description: 'A legacy Sabot Media series preserved in the archive.',
  },
  {
    name: 'Get To Know Your Neighborhood',
    slug: 'get-to-know-your-neighborhood',
    format: 'series',
    featured: false,
    aliases: ['get to know your neighborhood'],
    signals: ['get to know your neighborhood'],
    description: 'A legacy Sabot Media series preserved in the archive.',
  },
  {
    name: 'Sabots Bay',
    slug: 'sabots-bay',
    format: 'series',
    featured: false,
    aliases: ["sabot's bay", 'sabots bay'],
    signals: ["sabot's bay", 'sabots bay'],
    description: 'A legacy Sabot Media project preserved in the archive.',
  },
  {
    name: 'AL1312',
    slug: 'al1312',
    format: 'project',
    featured: false,
    aliases: ['al1312'],
    signals: ['al1312'],
    description: 'A legacy project preserved in the Sabot archive.',
  },
  {
    name: 'Zines and Comics',
    slug: 'zines-and-comics',
    format: 'archive',
    featured: false,
    aliases: ['zines and comics'],
    signals: ['zines and comics'],
    description: 'Legacy print and comics material preserved as an archive project.',
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

function collectProjectCandidates(piece) {
  const raw = [
    piece?.primaryProject,
    piece?.primaryProjectSlug,
    piece?.project,
    piece?.projectName,
    piece?.projects,
  ]

  return raw
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => (typeof value === 'object' && value ? value.name || value.title || value.slug : value))
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

function collectIdentityText(piece) {
  return [
    piece?.title,
    piece?.subtitle,
    piece?.slug,
    piece?.nativeSlug,
    piece?.canonicalSlug,
    piece?.sourceUrl,
    piece?.permalink,
    piece?.href,
    ...(Array.isArray(piece?.categories) ? piece.categories : []),
    ...(Array.isArray(piece?.tags) ? piece.tags : []),
  ]
    .map((value) => (typeof value === 'object' && value ? value.name || value.title || value.slug : value))
    .join(' ')
    .toLowerCase()
}

function projectFromIdentity(piece, type) {
  const identity = collectIdentityText(piece)
  if (!identity.trim()) return null

  for (const project of PUBLIC_PROJECTS) {
    const signalMatch = (project.signals || []).some((signal) => identity.includes(String(signal).toLowerCase()))
    if (!signalMatch) continue

    // The two podcast projects are the most common collision in imported data.
    // Only let podcast identity signals override an explicit project on podcast/audio records.
    if (project.format === 'podcast' && !['podcast', 'audio'].includes(type)) continue
    return project
  }

  return null
}

export function fallbackProjectForType(type) {
  switch (String(type || '').toLowerCase()) {
    case 'podcast':
    case 'audio':
      return findPublicProject('Molotov Now!')
    case 'comic':
      return findPublicProject('The Sabotuers')
    case 'zine':
    case 'print':
      return findPublicProject('Black Cat Distro')
    case 'newsletter':
      return findPublicProject('The Communique')
    default:
      return findPublicProject('The Harbor Rat Report')
  }
}

export function resolveArchiveProject(piece, type = 'article') {
  const candidates = collectProjectCandidates(piece)
  const identityProject = projectFromIdentity(piece, type)

  // Strong identity clues in the title, slug, source URL, tags, or categories can
  // repair obvious import collisions such as TCAIE episodes filed under Molotov Now!.
  if (identityProject) return identityProject

  for (const candidate of candidates) {
    const canonical = findPublicProject(candidate)
    if (canonical) return canonical
  }

  const explicit = candidates.find((candidate) => !isGenericProject(candidate))
  if (explicit) {
    return {
      name: explicit,
      slug: toProjectSlug(explicit),
      format: String(type || 'project'),
      featured: false,
      aliases: [],
      signals: [],
      description: 'Archive project.',
      dynamic: true,
    }
  }

  return fallbackProjectForType(type)
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
