import { writeFile } from 'node:fs/promises'

const origin = String(process.env.SABOT_ORIGIN || 'https://sabot.media').replace(/\/+$/, '')
const outputPath = new URL('../public/static-fallback.json', import.meta.url)

async function getJson(path, label) {
  const response = await fetch(`${origin}${path}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'user-agent': 'SabotMedia-static-fallback-refresh/1.0',
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data?.mode === 'unavailable') {
    throw new Error(`${label} failed: ${response.status} ${data?.error || 'invalid response'}`)
  }
  return data
}

const nativeContent = await getJson('/api/native-content?status=published', 'native content snapshot')
const publicSiteConfig = await getJson('/api/public-site-config', 'public site config snapshot')
const campaigns = await getJson('/api/campaigns', 'campaign list snapshot')
const collections = await getJson('/api/collections', 'collection snapshot')
const publications = await getJson('/api/publications', 'publication snapshot')

if (!Array.isArray(nativeContent.items)) throw new Error('native content snapshot returned no item list')
if (!publicSiteConfig.config || typeof publicSiteConfig.config !== 'object') throw new Error('public site config snapshot returned no config')
if (!Array.isArray(campaigns.items)) throw new Error('campaign snapshot returned no item list')
if (!Array.isArray(collections.items)) throw new Error('collection snapshot returned no item list')
if (!Array.isArray(publications.items)) throw new Error('publication snapshot returned no item list')

const campaignDetails = {}
for (const campaign of campaigns.items) {
  const slug = String(campaign?.slug || '').trim()
  if (!slug) continue
  const detail = await getJson(`/api/campaigns?slug=${encodeURIComponent(slug)}`, `campaign ${slug} snapshot`)
  if (detail.item) campaignDetails[slug] = detail.item
}

const snapshot = {
  version: 1,
  ready: true,
  nativeContent: {
    items: nativeContent.items,
  },
  publicSiteConfig: {
    scope: publicSiteConfig.scope || 'global',
    updatedAt: publicSiteConfig.updatedAt || '',
    version: publicSiteConfig.version || 0,
    schemaVersion: publicSiteConfig.schemaVersion || 0,
    config: publicSiteConfig.config,
  },
  campaigns: {
    items: campaigns.items,
    details: campaignDetails,
  },
  collections: {
    items: collections.items,
  },
  publications: {
    items: publications.items,
  },
}

await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
console.log(`Static fallback snapshot refreshed: ${nativeContent.items.length} posts, ${campaigns.items.length} campaigns, ${collections.items.length} collections, ${publications.items.length} publications`)
