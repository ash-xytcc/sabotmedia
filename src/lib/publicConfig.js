import { publicSiteDefaults } from '../content/publicSiteDefaults'

const STORAGE_KEY = 'sabot-public-site-config-v1'

export function getStoredPublicConfig() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredPublicConfig(config) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // ignore
  }
}

export function clearStoredPublicConfig() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function mergePublicConfig(base, patch) {
  return {
    text: {
      ...(base?.text || {}),
      ...(patch?.text || {}),
    },
    styles: {
      ...(base?.styles || {}),
      ...(patch?.styles || {}),
    },
    blocks: {
      ...(base?.blocks || {}),
      ...(patch?.blocks || {}),
    },
  }
}

export function resolvePublicConfig(runtimeConfig) {
  return mergePublicConfig(publicSiteDefaults, runtimeConfig || getStoredPublicConfig() || {})
}

export function getConfiguredText(config, field, fallback = '') {
  return config?.text?.[field] ?? fallback
}

export function getConfiguredStyle(config, field) {
  return config?.styles?.[field] || {}
}

export function getConfiguredBlock(config, path) {
  const parts = String(path || '').split('.').filter(Boolean)
  let cur = config?.blocks || {}
  for (const part of parts) {
    cur = cur?.[part]
    if (!cur) return null
  }
  return cur
}
