const MENUS_KEY = 'sabot-wp-clone-menu-v1'
const SETTINGS_KEY = 'sabot-wp-clone-settings-v1'
const QUICK_DRAFTS_KEY = 'sabot-wp-clone-quick-drafts-v1'

export const DEFAULT_MENU_ITEMS = [
  { id: 'archive', label: 'Archive', to: '/archive' },
  { id: 'press', label: 'Press', to: '/press' },
  { id: 'projects', label: 'Projects', to: '/projects' },
]

export const DEFAULT_SETTINGS = {
  siteTitle: 'Sabot Media',
  tagline: 'Internal WordPress-classic admin clone',
  homepageSource: 'updates',
  postsPerPage: 10,
  defaultPostType: 'dispatch',
  mediaMode: 'local-only',
}

function readLocalJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export function loadMenuDraft() {
  const loaded = readLocalJson(MENUS_KEY, DEFAULT_MENU_ITEMS)
  return Array.isArray(loaded) ? loaded : DEFAULT_MENU_ITEMS
}

export function saveMenuDraft(items) {
  const normalized = Array.isArray(items) ? items : DEFAULT_MENU_ITEMS
  try {
    window.localStorage.setItem(MENUS_KEY, JSON.stringify(normalized))
  } catch {
    // ignore local storage failures
  }
  return normalized
}

export function loadWpSettings() {
  const loaded = readLocalJson(SETTINGS_KEY, DEFAULT_SETTINGS)
  return { ...DEFAULT_SETTINGS, ...(loaded || {}) }
}

export function saveWpSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) }
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
  } catch {
    // ignore local storage failures
  }
  return merged
}

export function loadQuickDrafts() {
  const loaded = readLocalJson(QUICK_DRAFTS_KEY, [])
  return Array.isArray(loaded) ? loaded : []
}

export function saveQuickDraft(entry) {
  const next = [
    {
      id: `quick-${Math.random().toString(36).slice(2, 8)}`,
      title: String(entry?.title || '').trim() || 'Untitled quick draft',
      content: String(entry?.content || ''),
      createdAt: new Date().toISOString(),
    },
    ...loadQuickDrafts(),
  ].slice(0, 12)

  try {
    window.localStorage.setItem(QUICK_DRAFTS_KEY, JSON.stringify(next))
  } catch {
    // ignore local storage failures
  }

  return next
}
