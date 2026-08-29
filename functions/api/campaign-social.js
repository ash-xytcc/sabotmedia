const BLUESKY_SEARCH_URL = 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts'
const MASTODON_RSS_URL = 'https://kolektiva.social/@AberdeenLocal1312.rss'
const CAMPAIGN_TERMS = ['autistici', 'inventati', 'noblogs', 'communications infrastructure', 'server called paranoia']

export async function onRequestGet() {
  const [bluesky, mastodon] = await Promise.allSettled([
    loadBluesky(),
    loadMastodon(),
  ])

  const blueskyItems = bluesky.status === 'fulfilled' ? bluesky.value : []
  const mastodonItems = mastodon.status === 'fulfilled' ? mastodon.value : []
  const items = dedupe([...blueskyItems, ...mastodonItems])
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 18)

  return json({
    ok: items.length > 0,
    checkedAt: new Date().toISOString(),
    items,
    sources: {
      bluesky: {
        ok: bluesky.status === 'fulfilled',
        count: blueskyItems.length,
        error: bluesky.status === 'rejected' ? cleanError(bluesky.reason) : '',
      },
      mastodon: {
        ok: mastodon.status === 'fulfilled',
        count: mastodonItems.length,
        account: '@AberdeenLocal1312@kolektiva.social',
        error: mastodon.status === 'rejected' ? cleanError(mastodon.reason) : '',
      },
    },
  }, items.length ? 200 : 502)
}

async function loadBluesky() {
  const queryTerms = ['autistici', 'inventati', 'noblogs']
  const payloads = await Promise.all(queryTerms.map(async (term) => {
    const url = new URL(BLUESKY_SEARCH_URL)
    url.searchParams.set('q', term)
    url.searchParams.set('limit', '30')
    url.searchParams.set('sort', 'latest')
    return fetchJson(url.toString(), 'application/json')
  }))

  const posts = payloads.flatMap((payload) => Array.isArray(payload?.posts) ? payload.posts : [])
  return posts.map(normalizeBlueskyPost).filter(Boolean).filter(isCampaignPost).slice(0, 12)
}

function normalizeBlueskyPost(post) {
  const record = post?.record && typeof post.record === 'object' ? post.record : {}
  const text = String(record.text || '').trim()
  const handle = String(post?.author?.handle || '').trim()
  const uri = String(post?.uri || '')
  const rkey = uri.split('/').filter(Boolean).pop() || ''
  if (!text || !handle || !rkey) return null
  const images = Array.isArray(post?.embed?.images) ? post.embed.images : []
  const image = images[0]?.thumb || images[0]?.fullsize || post?.embed?.thumbnail || ''
  return {
    id: `bluesky-${String(post?.cid || rkey)}`,
    platform: 'Bluesky',
    account: `@${handle}`,
    date: String(record.createdAt || post?.indexedAt || ''),
    excerpt: text,
    url: `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}`,
    imageUrl: String(image || ''),
  }
}

async function loadMastodon() {
  const xml = await fetchText(MASTODON_RSS_URL, 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8')
  const itemMatches = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
  const items = itemMatches.map((match, index) => normalizeMastodonItem(match[1], index)).filter(Boolean)
  return items.filter(isCampaignPost).slice(0, 12)
}

function normalizeMastodonItem(itemXml, index) {
  const title = readXmlTag(itemXml, 'title')
  const description = readXmlTag(itemXml, 'description') || readXmlTag(itemXml, 'content:encoded')
  const excerpt = stripHtml(description || title)
  const url = readXmlTag(itemXml, 'link') || readXmlTag(itemXml, 'guid')
  const date = readXmlTag(itemXml, 'pubDate') || readXmlTag(itemXml, 'dc:date')
  const image = firstMediaUrl(itemXml)
  if (!excerpt || !url) return null
  return {
    id: `mastodon-${hashString(url || `${date}-${index}`)}`,
    platform: 'Mastodon',
    account: '@AberdeenLocal1312@kolektiva.social',
    date,
    excerpt,
    url,
    imageUrl: image,
  }
}

function isCampaignPost(item) {
  const text = `${item?.excerpt || ''} ${item?.url || ''}`.toLowerCase()
  return CAMPAIGN_TERMS.some((term) => text.includes(term))
}

function dedupe(items) {
  const output = []
  const seen = new Set()
  for (const item of items) {
    if (!item) continue
    const key = item.url || item.id
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }
  return output
}

async function fetchJson(url, accept) {
  const text = await fetchText(url, accept)
  try { return JSON.parse(text) } catch { throw new Error('social source returned invalid JSON') }
}

async function fetchText(url, accept) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept,
        'user-agent': 'SabotMedia-CampaignSocial/1.0',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`social source returned ${response.status}`)
    const length = Number(response.headers.get('content-length') || 0)
    if (length > 2_000_000) throw new Error('social source response exceeded size limit')
    const text = await response.text()
    if (text.length > 2_000_000) throw new Error('social source response exceeded size limit')
    return text
  } finally {
    clearTimeout(timer)
  }
}

function readXmlTag(xml, tag) {
  const safeTag = String(tag || '').replace(/[^a-zA-Z0-9:_-]/g, '')
  if (!safeTag) return ''
  const match = xml.match(new RegExp(`<${safeTag}\\b[^>]*>([\\s\\S]*?)<\\/${safeTag}>`, 'i'))
  return decodeEntities(stripCdata(match?.[1] || '')).trim()
}

function firstMediaUrl(xml) {
  const media = xml.match(/<media:(?:content|thumbnail)\b[^>]*\burl=["']([^"']+)["'][^>]*>/i)
  if (media?.[1]) return decodeEntities(media[1])
  const enclosure = xml.match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\//i)
  return enclosure?.[1] ? decodeEntities(enclosure[1]) : ''
}

function stripCdata(value) {
  return String(value || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')
}

function stripHtml(value) {
  return decodeEntities(String(value || ''))
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const point = Number(code)
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ''
    })
}

function hashString(value) {
  let hash = 2166136261
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function cleanError(error) {
  const message = String(error?.message || error || 'source unavailable')
  return message.length > 180 ? `${message.slice(0, 177)}...` : message
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=90, s-maxage=120, stale-while-revalidate=300',
      'access-control-allow-origin': '*',
    },
  })
}
