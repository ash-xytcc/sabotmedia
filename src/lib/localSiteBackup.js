import { loadLocalMediaItems } from './localMediaLibrary'
import { NATIVE_CONTENT_SCHEMA_VERSION } from './nativePublicContent'
import { loadCustomizerSettings } from './customizerLocal'
import { getStoredPublicConfig, resolvePublicConfig } from './publicConfig'
import { loadMenuDraft, loadWpSettings, WP_ROLE_OPTIONS } from './wpAdminLocal'

const NATIVE_CONTENT_KEY = 'sabot-native-public-content-v1'
const USER_ROLE_SETTINGS_KEY = 'sabot-wp-clone-user-role-settings-v1'

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

export function buildLocalStorageInventory() {
  const items = []
  let totalBytes = 0

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key) continue
    const value = window.localStorage.getItem(key) || ''
    const bytes = new Blob([value]).size
    totalBytes += bytes
    items.push({ key, bytes })
  }

  items.sort((a, b) => b.bytes - a.bytes)

  return {
    keyCount: items.length,
    totalBytes,
    items,
  }
}

export function buildMediaAuditSummary({ nativeItems = [] } = {}) {
  const localMedia = loadLocalMediaItems()
  const importedMediaReferences = (nativeItems || []).filter((item) => String(item?.sourceType || '').toLowerCase() !== 'manual').length
  const missingFeaturedImages = (nativeItems || []).filter((item) => !String(item?.heroImage || item?.featuredImage || '').trim()).length

  return {
    totalMediaItems: localMedia.length + importedMediaReferences,
    localUploads: localMedia.length,
    importedMediaReferences,
    missingFeaturedImages,
  }
}

function loadLocalNativeItems() {
  const loaded = readLocalJson(NATIVE_CONTENT_KEY, [])
  return Array.isArray(loaded) ? loaded : []
}

function loadUserRolesScaffold() {
  const legacyShape = readLocalJson(USER_ROLE_SETTINGS_KEY, null)
  if (legacyShape && Array.isArray(legacyShape.users)) {
    return {
      users: legacyShape.users,
      roles: Array.isArray(legacyShape.roles) && legacyShape.roles.length ? legacyShape.roles : WP_ROLE_OPTIONS,
      source: USER_ROLE_SETTINGS_KEY,
    }
  }

  const users = readLocalJson('sabot-wp-clone-user-roles-v1', [])

  return {
    users: Array.isArray(users) ? users : [],
    roles: WP_ROLE_OPTIONS,
    source: 'sabot-wp-clone-user-roles-v1',
  }
}

export function buildLocalSiteBackupPayload({ nativeItems = [] } = {}) {
  const fallbackNativeItems = Array.isArray(nativeItems) && nativeItems.length ? nativeItems : loadLocalNativeItems()
  const mediaAudit = buildMediaAuditSummary({ nativeItems: fallbackNativeItems })
  const localStorageInventory = buildLocalStorageInventory()
  const storedPublicConfig = getStoredPublicConfig()

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    backupType: 'local-site',
    nativePosts: {
      schemaVersion: NATIVE_CONTENT_SCHEMA_VERSION,
      items: fallbackNativeItems,
    },
    media: {
      localItems: loadLocalMediaItems(),
      auditSummary: mediaAudit,
    },
    settings: {
      wpAdmin: loadWpSettings(),
      publicConfigStored: storedPublicConfig,
      publicConfigResolved: resolvePublicConfig(storedPublicConfig),
    },
    customizer: loadCustomizerSettings(),
    navigation: {
      menuDraft: loadMenuDraft(),
    },
    usersRolesScaffold: loadUserRolesScaffold(),
    localStorageInventory,
  }
}

export function exportLocalSiteBackupJson(options = {}) {
  return JSON.stringify(buildLocalSiteBackupPayload(options), null, 2)
}
