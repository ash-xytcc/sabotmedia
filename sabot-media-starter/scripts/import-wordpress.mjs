import fs from 'node:fs'
import path from 'node:path'
import { XMLParser } from 'fast-xml-parser'

const inputArg = process.argv[2] || 'sabotmedia.WordPress.2026-04-21.xml'
const inputPath = path.resolve(process.cwd(), inputArg)
const outputPath = path.resolve(process.cwd(), 'src/content/pieces.imported.json')

if (!fs.existsSync(inputPath)) {
  console.error(`Missing XML export at: ${inputPath}`)
  process.exit(1)
}

const xml = fs.readFileSync(inputPath, 'utf8')
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: false,
})

const data = parser.parse(xml)
const rawItems = toArray(data?.rss?.channel?.item)

const attachmentsByParent = new Map()
for (const item of rawItems) {
  if (item['wp:post_type'] !== 'attachment' || !item['wp:post_parent']) continue
  const parent = String(item['wp:post_parent'])
  const entry = {
    id: String(item['wp:post_id'] || ''),
    title: item.title || item['wp:post_name'] || 'Attachment',
    slug: item['wp:post_name'] || '',
    url: item['wp:attachment_url'] || item.guid || item.link || '',
    mime: readMeta(item, '_wp_attachment_metadata') || '',
  }
  if (!attachmentsByParent.has(parent)) attachmentsByParent.set(parent, [])
  attachmentsByParent.get(parent).push(entry)
}

const items = rawItems
  .filter((item) => item['wp:post_type'] === 'post' && item['wp:status'] === 'publish')
  .map((item) => normalizePiece(item, attachmentsByParent))
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

const projects = [...new Set(items.flatMap((item) => item.projects))].sort()
const payload = {
  generatedAt: new Date().toISOString(),
  sourceFile: path.basename(inputPath),
  projectCount: projects.length,
  count: items.length,
  projects,
  items,
}

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2))
console.log(`Imported ${items.length} posts into ${outputPath}`)

function normalizePiece(item, attachmentsByParent) {
  const id = String(item['wp:post_id'])
  const categories = toArray(item.category)
    .filter((entry) => entry?.['@_domain'] === 'category')
    .map((entry) => coerceText(entry['#text'] ?? entry))
    .filter(Boolean)

  const tags = toArray(item.category)
    .filter((entry) => entry?.['@_domain'] === 'post_tag')
    .map((entry) => coerceText(entry['#text'] ?? entry))
    .filter(Boolean)

  const relatedAssets = attachmentsByParent.get(id) || []
  const bodyHtml = sanitizeImportedHtml(item['content:encoded'] || '')
  const excerpt = cleanExcerpt(item['excerpt:encoded'] || bodyHtml)
  const relatedPrintLinks = relatedAssets
    .filter((asset) => /pdf$/i.test(asset.url) || /imposed|reader|print|bw/i.test(asset.title))
    .map((asset) => ({ title: asset.title, url: asset.url }))

  return {
    id,
    title: coerceText(item.title),
    slug: item['wp:post_name'],
    author: coerceText(item['dc:creator']) || 'sabotmedia',
    publishedAt: toIso(item['wp:post_date_gmt'] || item['wp:post_date']),
    publishedDateLabel: formatDate(item['wp:post_date_gmt'] || item['wp:post_date']),
    type: inferType(categories, relatedAssets, bodyHtml),
    projects: mapProjects(categories),
    primaryProject: mapProjects(categories)[0] || 'General',
    tags,
    excerpt,
    subtitle: inferSubtitle(bodyHtml),
    bodyHtml,
    sourceUrl: item.link || item.guid || '',
    originalId: id,
    hasPrintAssets: relatedPrintLinks.length > 0,
    relatedPrintLinks,
  }
}

function sanitizeImportedHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
}

function cleanExcerpt(value) {
  const stripped = String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return stripped.slice(0, 240)
}

function inferSubtitle(html) {
  const match = String(html || '').match(/<p>(.*?)<\/p>/i)
  if (!match) return ''
  return match[1].replace(/<[^>]+>/g, '').trim().slice(0, 140)
}

function inferType(categories, relatedAssets, bodyHtml) {
  const joined = `${categories.join(' ')} ${bodyHtml}`.toLowerCase()
  if (categories.includes('Podcasts') || categories.includes('Molotov Now!')) return 'podcast'
  if (categories.includes('Zines and Comics') || /comic/i.test(joined)) return 'zine'
  if (/newsletter|communique/i.test(joined)) return 'newsletter'
  if (/essay/i.test(joined)) return 'essay'
  if (relatedAssets.some((asset) => /pdf$/i.test(asset.url))) return 'article'
  return 'article'
}

function mapProjects(categories) {
  const order = [
    'The Harbor Rat Report',
    'Black Cat Distro',
    'The Communique',
    'The Sabotuers',
    'Molotov Now!',
    'The Child and Its Enemies',
    'Glaring Examples',
    'Get To Know Your Neighborhood',
    'General',
  ]
  const projects = categories.filter((name) => order.includes(name))
  return projects.sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

function readMeta(item, key) {
  const meta = toArray(item['wp:postmeta'])
  const found = meta.find((entry) => entry['wp:meta_key'] === key)
  return found?.['wp:meta_value'] || ''
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null) return []
  return [value]
}

function coerceText(value) {
  return String(value || '').trim()
}

function toIso(value) {
  if (!value) return ''
  const normalized = String(value).replace(' ', 'T')
  return `${normalized}Z`
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(toIso(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
