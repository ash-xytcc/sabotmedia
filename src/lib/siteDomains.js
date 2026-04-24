const SITES_STORAGE_KEY = 'sabot-wp-clone-sites-v1'

export const SITE_STATUS_OPTIONS = ['connected', 'scaffold', 'needs DNS']

export const DEFAULT_SITE = {
  id: 'sabot-media-default',
  name: 'Sabot Media',
  domain: 'sabotmedia.pages.dev',
  basePath: '/',
  status: 'connected',
}

function normalizeBasePath(value) {
  const trimmed = (value || '').trim()
  if (!trimmed || trimmed === '/') return '/'
  const withoutSlashes = trimmed.replace(/^\/+|\/+$/g, '')
  return `/${withoutSlashes}`
}

function normalizeSite(site) {
  const status = SITE_STATUS_OPTIONS.includes(site?.status) ? site.status : 'scaffold'
  return {
    id: site?.id || `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: site?.name?.trim() || 'Untitled site',
    domain: site?.domain?.trim() || 'example.com',
    basePath: normalizeBasePath(site?.basePath),
    status,
  }
}

export function loadSites() {
  if (typeof window === 'undefined') return [DEFAULT_SITE]

  try {
    const raw = window.localStorage.getItem(SITES_STORAGE_KEY)
    if (!raw) return [DEFAULT_SITE]

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_SITE]

    return parsed.map(normalizeSite)
  } catch {
    return [DEFAULT_SITE]
  }
}

export function saveSites(sites) {
  if (typeof window === 'undefined') return

  try {
    const normalized = (Array.isArray(sites) && sites.length ? sites : [DEFAULT_SITE]).map(normalizeSite)
    window.localStorage.setItem(SITES_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // local scaffold only
  }
}

export function createSiteDraft(fields) {
  return normalizeSite({
    ...fields,
    id: `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  })
}
