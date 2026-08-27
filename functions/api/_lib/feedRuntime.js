import { ensureNativePublicContentTable, listNativeEntries } from './nativePublicContent.js'
import { buildRssBundle } from '../../../src/lib/rssFeeds.js'
import { mergeFeedSettings } from '../../../src/lib/feedSettings.js'

const SETTING_KEY = 'feed-settings-v1'

export async function buildLiveFeedBundle(db) {
  if (!db) throw new Error('BF_DB binding is required for live feeds')

  await ensureNativePublicContentTable(db)
  await ensureFeedSettingsTable(db)

  const [entries, row] = await Promise.all([
    // No status filter here: listNativeEntries applies the native public-visibility
    // contract, including scheduled entries whose release time has arrived.
    listNativeEntries(db, {}),
    db.prepare('SELECT value_json, updated_at FROM site_settings WHERE setting_key = ? LIMIT 1').bind(SETTING_KEY).first(),
  ])

  const settings = mergeFeedSettings(parseSettings(row?.value_json) || {})
  const bundle = buildRssBundle(Array.isArray(entries) ? entries : [], { settings })

  return {
    settings,
    bundle,
    updatedAt: row?.updated_at || '',
    itemCount: Array.isArray(entries) ? entries.length : 0,
  }
}

export function normalizeFeedRequestPath(value) {
  const parts = Array.isArray(value) ? value : value == null ? [] : [value]
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('/')
    .replace(/^\/+|\/+$/g, '')
}

async function ensureFeedSettingsTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_site_settings_updated_at ON site_settings(updated_at DESC);
  `)
}

function parseSettings(value) {
  try {
    const parsed = JSON.parse(String(value || 'null'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}
