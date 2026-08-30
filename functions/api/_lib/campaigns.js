const CAMPAIGN_SCHEMA_VERSION = 1
export const AI_CAMPAIGN_SLUG = 'autistici-inventati'

export function defaultAiCampaign() {
  return normalizeCampaign({
    id: 'campaign-autistici-inventati',
    slug: AI_CAMPAIGN_SLUG,
    status: 'published',
    campaignStatus: 'active',
    kicker: 'BEFORE SEPT. 25',
    title: 'Communications Infrastructure Is Not Terrorism',
    shortTitle: 'Defend Autistici/Inventati',
    deck: 'A living campaign hub for reporting, public letters, graphics, press coverage, social circulation, infrastructure status, and ways to act before September 25.',
    summary: 'Sabot Media is independently documenting and opposing the treatment of resistant communications infrastructure as terrorism. This page gathers the campaign in one place and will remain as a public archive after the deadline.',
    deadline: '2026-09-25T23:59:59Z',
    heroImage: '',
    heroAlt: '',
    monitorUrl: 'https://kuma.accol.li/status/aimonitor',
    monitorLabel: 'A/I infrastructure monitor',
    partners: ['Sabot Media'],
    campaignKeywords: ['autistici', 'inventati', 'noblogs', 'communications infrastructure', 'a/i campaign'],
    disclaimer: 'Sabot Media is an independent publisher. We are not affiliated with Autistici/Inventati and do not represent or speak on behalf of A/I. Campaign material is political advocacy and reporting, not legal advice.',
    actions: [
      { id: 'action-letter', title: 'Send a letter', body: 'Use the individual letter and recipient guide to contact public officials, civil-liberties groups, digital-rights organizations, and other institutions.', href: '#letters', label: 'Get the letter' },
      { id: 'action-reporting', title: 'Read the reporting', body: 'Start with the investigation and source material, then circulate the strongest factual account rather than a screenshot of a screenshot.', href: '#reporting', label: 'Read the reporting' },
      { id: 'action-share', title: 'Circulate the campaign', body: 'Download campaign graphics, copy accessible captions and alt text, and share the canonical campaign page.', href: '#graphics', label: 'Get campaign graphics' },
      { id: 'action-monitor', title: 'Watch the infrastructure', body: 'Follow the public A/I monitor and document meaningful outages or service degradation without turning ordinary blips into prophecy.', href: '#monitor', label: 'Check live status' },
    ],
    updates: [
      { id: 'update-launch', date: '2026-08-28T21:30:00Z', title: 'Campaign hub launched', body: 'Sabot Media consolidated reporting, letters, graphics, infrastructure status, and campaign updates into one public page.', url: '', pinned: true },
    ],
    resources: [],
    social: [],
    graphics: [],
    coverage: [],
    signatories: [],
    sources: [],
    timeline: [
      { id: 'timeline-designation', date: '2026-08-26', title: 'Designation announced', body: 'The U.S. designation and sanctions action becomes the immediate trigger for this campaign.' },
      { id: 'timeline-launch', date: '2026-08-28', title: 'Public campaign launched', body: 'Reporting, public letters, journalist outreach, graphics, and direct advocacy begin circulating.' },
      { id: 'timeline-deadline', date: '2026-09-25', title: 'September 25 deadline', body: 'The campaign is organized around the September 25 wind-down deadline and the consequences that may follow.' },
    ],
    faq: [
      { id: 'faq-ai', question: 'What is Autistici/Inventati?', answer: 'A/I is an Italian volunteer technology collective that has provided noncommercial communications infrastructure, including services associated with Noblogs. The reporting linked on this page contains the fuller history and sourcing.' },
      { id: 'faq-why', question: 'Why does this matter beyond one collective?', answer: 'The campaign focuses on the distinction between communications infrastructure and the conduct of users. Privacy-preserving hosts, independent publishers, journalists, researchers, organizers, and civil-society projects all depend on that distinction remaining meaningful.' },
      { id: 'faq-affiliation', question: 'Is Sabot Media affiliated with A/I?', answer: 'No. Sabot Media is an independent publisher and does not represent or speak for A/I.' },
      { id: 'faq-status', question: 'Is the monitor operated by Sabot?', answer: 'No. Sabot reads the public A/I status page at kuma.accol.li and presents a compact summary here. The original monitor remains the authoritative view of its own data.' },
    ],
    translations: [],
    createdAt: '2026-08-28T21:30:00Z',
  })
}

export async function ensureCampaignsTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    campaign_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    title TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_updated_at ON campaigns(updated_at DESC)').run()
}

export async function ensureAiCampaign(db) {
  await ensureCampaignsTable(db)
  const existing = await getCampaign(db, AI_CAMPAIGN_SLUG)
  if (existing) return existing
  const seeded = defaultAiCampaign()
  await upsertCampaign(db, seeded)
  return seeded
}

export async function listCampaigns(db, { includeDrafts = false } = {}) {
  await ensureCampaignsTable(db)
  const where = includeDrafts ? '' : "WHERE status = 'published'"
  const result = await db.prepare(`SELECT id, slug, campaign_json, status, title, created_at, updated_at
    FROM campaigns ${where} ORDER BY updated_at DESC`).all()
  const rows = Array.isArray(result?.results) ? result.results : []
  return rows.map(rowToCampaign)
}

export async function getCampaign(db, idOrSlug) {
  await ensureCampaignsTable(db)
  const row = await db.prepare(`SELECT id, slug, campaign_json, status, title, created_at, updated_at
    FROM campaigns WHERE id = ? OR slug = ? LIMIT 1`).bind(idOrSlug, idOrSlug).first()
  return row ? rowToCampaign(row) : null
}

export async function upsertCampaign(db, campaign) {
  await ensureCampaignsTable(db)
  const normalized = normalizeCampaign({ ...campaign, updatedAt: new Date().toISOString() })
  await db.prepare(`INSERT INTO campaigns (id, slug, campaign_json, status, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      campaign_json = excluded.campaign_json,
      status = excluded.status,
      title = excluded.title,
      updated_at = excluded.updated_at`)
    .bind(
      normalized.id,
      normalized.slug,
      JSON.stringify(normalized),
      normalized.status,
      normalized.title,
      normalized.createdAt,
      normalized.updatedAt,
    ).run()
  return normalized
}

export function normalizeCampaign(input = {}) {
  const now = new Date().toISOString()
  const title = String(input.title || 'Campaign')
  const slug = slugify(input.slug || title || input.id)
  return {
    id: String(input.id || `campaign-${slug || randomId()}`),
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    slug,
    status: ['draft', 'published', 'archived'].includes(input.status) ? input.status : 'published',
    campaignStatus: ['active', 'urgent', 'monitoring', 'archived'].includes(input.campaignStatus) ? input.campaignStatus : 'active',
    kicker: String(input.kicker || ''),
    title,
    shortTitle: String(input.shortTitle || title),
    deck: String(input.deck || ''),
    summary: String(input.summary || ''),
    deadline: normalizeDate(input.deadline),
    heroImage: String(input.heroImage || ''),
    heroAlt: String(input.heroAlt || ''),
    monitorUrl: String(input.monitorUrl || ''),
    monitorLabel: String(input.monitorLabel || 'Infrastructure monitor'),
    partners: normalizeStrings(input.partners),
    campaignKeywords: normalizeStrings(input.campaignKeywords),
    disclaimer: String(input.disclaimer || ''),
    actions: normalizeRows(input.actions, ['title', 'body', 'href', 'label']),
    updates: normalizeRows(input.updates, ['date', 'title', 'body', 'url'], { booleanFields: ['pinned'] }),
    resources: normalizeRows(input.resources, ['type', 'title', 'description', 'href', 'label', 'imageUrl']),
    social: normalizeRows(input.social, ['platform', 'date', 'account', 'excerpt', 'url', 'imageUrl', 'language', 'languageCode']),
    graphics: normalizeRows(input.graphics, ['title', 'imageUrl', 'alt', 'caption', 'downloadUrl']),
    coverage: normalizeRows(input.coverage, ['date', 'outlet', 'title', 'translatedTitle', 'language', 'languageCode', 'url', 'summary']),
    signatories: normalizeRows(input.signatories, ['name', 'location', 'statement', 'url']),
    sources: normalizeRows(input.sources, ['title', 'publisher', 'url', 'note']),
    timeline: normalizeRows(input.timeline, ['date', 'title', 'body']),
    faq: normalizeRows(input.faq, ['question', 'answer']),
    translations: normalizeRows(input.translations, ['language', 'title', 'url']),
    createdAt: String(input.createdAt || now),
    updatedAt: String(input.updatedAt || now),
  }
}

export function buildCampaignRssXml({ campaign, requestUrl }) {
  const origin = new URL(requestUrl).origin
  const pageUrl = `${origin}/campaigns/${encodeURIComponent(campaign.slug)}`
  const selfUrl = `${origin}/feeds/campaigns/${encodeURIComponent(campaign.slug)}.xml`
  const items = [...(campaign.updates || [])]
    .filter((item) => item.title || item.body)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

  const xmlItems = items.map((item) => {
    const link = item.url ? absoluteUrl(item.url, origin) : `${pageUrl}#updates`
    const guid = `${campaign.slug}:${item.id}`
    const pubDate = validRssDate(item.date || campaign.updatedAt)
    return `    <item>\n      <title>${xml(item.title || 'Campaign update')}</title>\n      <link>${xml(link)}</link>\n      <guid isPermaLink="false">${xml(guid)}</guid>\n      <pubDate>${xml(pubDate)}</pubDate>\n      <description>${xml(item.body || '')}</description>\n    </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${xml(`${campaign.shortTitle || campaign.title} — Campaign Updates`)}</title>\n    <link>${xml(pageUrl)}</link>\n    <description>${xml(campaign.deck || campaign.summary || campaign.title)}</description>\n    <language>en</language>\n    <atom:link href="${xml(selfUrl)}" rel="self" type="application/rss+xml" />\n    <lastBuildDate>${xml(validRssDate(campaign.updatedAt))}</lastBuildDate>\n${xmlItems}\n  </channel>\n</rss>`
}

function rowToCampaign(row) {
  let parsed = {}
  try { parsed = JSON.parse(row.campaign_json || '{}') } catch { parsed = {} }
  return normalizeCampaign({
    ...parsed,
    id: row.id,
    slug: row.slug,
    status: row.status,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

function normalizeRows(value, fields, options = {}) {
  const rows = Array.isArray(value) ? value : []
  const booleanFields = options.booleanFields || []
  return rows.map((row = {}) => {
    const next = { id: String(row.id || `row-${randomId()}`) }
    for (const field of fields) next[field] = String(row[field] || '')
    for (const field of booleanFields) next[field] = Boolean(row[field])
    return next
  })
}

function normalizeStrings(value) {
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

function normalizeDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const time = new Date(raw).getTime()
  return Number.isFinite(time) ? new Date(time).toISOString() : raw
}

function validRssDate(value) {
  const date = new Date(value || Date.now())
  return Number.isFinite(date.getTime()) ? date.toUTCString() : new Date().toUTCString()
}

function absoluteUrl(value, origin) {
  try { return new URL(String(value || ''), origin).toString() } catch { return origin }
}

function xml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function randomId() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10)
}
