const AI_GRAPHICS_BASE = '/campaigns/autistici-inventati/graphics'

const AI_GRAPHICS = [
  ['featured-image.png', 'Featured image', 'A/I campaign featured image'],
  ['web-banner.png', 'Web banner', 'Wide A/I campaign web banner'],
  ['book-download-card.png', 'Book download card', 'A/I campaign book and download card'],
  ...Array.from({ length: 12 }, (_, index) => [`carousel-${String(index + 1).padStart(2, '0')}.png`, `Carousel ${index + 1}`, `A/I campaign carousel slide ${index + 1}`]),
  ...Array.from({ length: 4 }, (_, index) => [`quote-${String(index + 1).padStart(2, '0')}.png`, `Quote ${index + 1}`, `A/I campaign quote graphic ${index + 1}`]),
  ...Array.from({ length: 3 }, (_, index) => [`story-${String(index + 1).padStart(2, '0')}.png`, `Story ${index + 1}`, `A/I campaign vertical story graphic ${index + 1}`]),
]

const BSKY_QUERIES = ['autistici inventati', 'noblogs']
const MASTODON_INSTANCES = ['https://mastodon.social', 'https://kolektiva.social']
const MASTODON_TAGS = ['autistici', 'noblogs']
const MATCH = /\b(?:autistici|inventati|noblogs)\b/i
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 60
const CACHE_TTL_SECONDS = 300

export async function decorateAiCampaignForPublic(campaign, requestUrl) {
  if (!campaign || campaign.slug !== 'autistici-inventati') return campaign
  const origin = new URL(requestUrl).origin
  const builtInGraphics = AI_GRAPHICS.map(([file, title, alt], index) => ({
    id: `built-in-${index + 1}`,
    title,
    imageUrl: `${origin}${AI_GRAPHICS_BASE}/${file}`,
    alt,
    caption: '',
    downloadUrl: `${origin}${AI_GRAPHICS_BASE}/${file}`,
  }))
  const liveSocial = await loadLiveAiSocial(requestUrl).catch(() => [])

  return {
    ...campaign,
    // Existing rows created by the first campaign release included broad words
    // such as “terrorism” and “sanctions”. Those caused unrelated Sabot posts to
    // leak into this campaign. Keep automatic discovery tied to A/I itself.
    campaignKeywords: ['autistici', 'inventati', 'noblogs'],
    graphics: dedupeByUrl([...builtInGraphics, ...(campaign.graphics || [])], 'imageUrl'),
    social: dedupeByUrl([...liveSocial, ...(campaign.social || [])], 'url'),
  }
}

export async function loadLiveAiSocial(requestUrl) {
  const origin = new URL(requestUrl).origin
  const cacheKey = new Request(`${origin}/__campaign-cache/autistici-inventati-social-v2`)
  const cache = globalThis.caches?.default
  if (cache) {
    const cached = await cache.match(cacheKey)
    if (cached) return cached.json()
  }

  const jobs = [
    ...BSKY_QUERIES.map((query) => fetchBluesky(query)),
    ...MASTODON_INSTANCES.flatMap((instance) => MASTODON_TAGS.map((tag) => fetchMastodon(instance, tag))),
  ]
  const settled = await Promise.allSettled(jobs)
  const cutoff = Date.now() - MAX_AGE_MS
  const items = dedupeByUrl(
    settled.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
      .filter((item) => MATCH.test(`${item.excerpt || ''} ${item.url || ''}`))
      .filter((item) => {
        const time = new Date(item.date || 0).getTime()
        return !Number.isFinite(time) || time >= cutoff
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    'url',
  ).slice(0, 12)

  if (cache) {
    await cache.put(cacheKey, new Response(JSON.stringify(items), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    })).catch(() => {})
  }
  return items
}

async function fetchBluesky(query) {
  const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '20')
  url.searchParams.set('sort', 'latest')
  const response = await fetchWithTimeout(url.toString())
  if (!response.ok) throw new Error(`Bluesky search failed: ${response.status}`)
  const data = await response.json()
  return (Array.isArray(data?.posts) ? data.posts : []).map((post) => {
    const handle = String(post?.author?.handle || '')
    const rkey = String(post?.uri || '').split('/').pop() || ''
    const text = String(post?.record?.text || '')
    const image = post?.embed?.images?.[0]?.thumb || post?.embed?.images?.[0]?.fullsize || ''
    return {
      id: `bsky-${String(post?.cid || rkey)}`,
      platform: 'BLUESKY',
      date: String(post?.record?.createdAt || post?.indexedAt || ''),
      account: handle ? `@${handle}` : String(post?.author?.displayName || 'Bluesky'),
      excerpt: text.slice(0, 700),
      url: handle && rkey ? `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}` : '',
      imageUrl: String(image || ''),
    }
  }).filter((item) => item.url && item.excerpt)
}

async function fetchMastodon(instance, tag) {
  const url = new URL(`/api/v1/timelines/tag/${encodeURIComponent(tag)}`, instance)
  url.searchParams.set('limit', '20')
  const response = await fetchWithTimeout(url.toString())
  if (!response.ok) throw new Error(`Mastodon timeline failed: ${response.status}`)
  const data = await response.json()
  return (Array.isArray(data) ? data : []).map((status) => {
    const media = status?.media_attachments?.[0]
    return {
      id: `mastodon-${String(status?.id || '')}`,
      platform: 'MASTODON',
      date: String(status?.created_at || ''),
      account: String(status?.account?.acct ? `@${status.account.acct}` : status?.account?.display_name || 'Mastodon'),
      excerpt: stripHtml(status?.content || '').slice(0, 700),
      url: String(status?.url || status?.uri || ''),
      imageUrl: String(media?.preview_url || media?.url || ''),
    }
  }).filter((item) => item.url && item.excerpt)
}

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4500)
  try {
    return await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'SabotMediaCampaign/1.0 (+https://sabot.media/campaigns/autistici-inventati)' },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

function dedupeByUrl(items, key) {
  const seen = new Set()
  return items.filter((item) => {
    const value = String(item?.[key] || '').trim()
    if (!value || seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
