import { AI_CAMPAIGN_GRAPHICS } from './aiCampaignGraphics.js'

const CAMPAIGN_URL = 'https://sabot.media/campaigns/autistici-inventati'
// Verified against the public profile endpoints. No We Will Free Us account is
// bundled until one can be resolved from authoritative site data.
const BLUESKY_ACTORS = ['sabotmedia.bsky.social']
const MASTODON_ACCOUNTS = [{ instance: 'https://kolektiva.social', acct: 'AberdeenLocal1312' }]
const SIGNAL = /(?:autistici(?:\s*\/\s*|\s+)?inventati|\bnoblogs\b|communications infrastructure|infrastructure is not terrorism|defend autistici|#defendai)/i
const CACHE_TTL_SECONDS = 300

export async function decorateAiCampaignForPublic(campaign, requestUrl) {
  if (!campaign || campaign.slug !== 'autistici-inventati') return campaign
  const origin = new URL(requestUrl).origin
  const graphics = AI_CAMPAIGN_GRAPHICS.map((item) => ({ ...item, imageUrl: new URL(item.imageUrl, origin).toString(), downloadUrl: new URL(item.downloadUrl, origin).toString() }))
  const feed = await loadLiveAiSocial(requestUrl).catch((error) => ({ items: [], errors: [{ platform: 'social', message: String(error?.message || error) }], sources: [] }))
  return { ...campaign, campaignKeywords: ['autistici/inventati', 'a/i campaign'], graphics: dedupeByUrl([...graphics, ...(campaign.graphics || [])], 'imageUrl'), social: dedupeByUrl([...feed.items, ...(campaign.social || [])], 'url'), socialSources: feed.sources, socialErrors: feed.errors }
}

export async function loadLiveAiSocial(requestUrl, fetcher = fetch) {
  const origin = new URL(requestUrl).origin
  const cacheKey = new Request(`${origin}/__campaign-cache/autistici-inventati-social-v3`)
  const cache = globalThis.caches?.default
  if (cache) { const cached = await cache.match(cacheKey); if (cached) return cached.json() }
  const jobs = [
    ...BLUESKY_ACTORS.map((actor) => ({ platform: 'bluesky', label: actor, promise: fetchBlueskyActor(actor, fetcher) })),
    ...MASTODON_ACCOUNTS.map((account) => ({ platform: 'mastodon', label: `${account.acct}@${new URL(account.instance).host}`, promise: fetchMastodonAccount(account, fetcher) })),
  ]
  const settled = await Promise.allSettled(jobs.map((job) => job.promise))
  const errors = [], sources = [], collected = []
  settled.forEach((result, index) => { const job = jobs[index]; if (result.status === 'fulfilled') { sources.push({ platform: job.platform, account: job.label, ok: true }); collected.push(...result.value) } else { sources.push({ platform: job.platform, account: job.label, ok: false }); errors.push({ platform: job.platform, account: job.label, message: String(result.reason?.message || result.reason) }) } })
  const items = dedupeByUrl(collected.filter(isCampaignSocialPost).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), 'url').slice(0, 16)
  const payload = { ok: errors.length < jobs.length, items, sources, errors, checkedAt: new Date().toISOString() }
  if (cache) await cache.put(cacheKey, new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${CACHE_TTL_SECONDS}` } })).catch(() => {})
  return payload
}

export function isCampaignSocialPost(item) {
  const text = `${item?.text || item?.excerpt || ''} ${item?.external?.url || ''} ${item?.url || ''}`
  return text.includes(CAMPAIGN_URL) || SIGNAL.test(text)
}

async function fetchBlueskyActor(actor, fetcher) {
  const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed'); url.searchParams.set('actor', actor); url.searchParams.set('limit', '50'); url.searchParams.set('filter', 'posts_no_replies')
  const response = await fetchWithTimeout(url, fetcher); if (!response.ok) throw new Error(`Bluesky returned ${response.status}`)
  const data = await response.json(); return (data?.feed || []).map(({ post }) => normalizeBluesky(post)).filter(Boolean)
}

function normalizeBluesky(post) {
  const handle = String(post?.author?.handle || ''), rkey = String(post?.uri || '').split('/').pop() || '', text = String(post?.record?.text || '')
  if (!handle || !rkey || !text) return null
  const images = (post?.embed?.images || []).map((image) => ({ url: String(image?.fullsize || image?.thumb || ''), alt: String(image?.alt || '') })).filter((image) => image.url)
  const externalView = post?.embed?.external || post?.embed?.media?.external
  return { id: `bsky-${post?.cid || rkey}`, platform: 'BLUESKY', date: String(post?.record?.createdAt || post?.indexedAt || ''), account: String(post?.author?.displayName || handle), handle: `@${handle}`, text, excerpt: text, url: `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}`, images, imageUrl: images[0]?.url || '', external: externalView?.uri ? { url: String(externalView.uri), title: String(externalView.title || ''), description: String(externalView.description || '') } : null }
}

async function fetchMastodonAccount({ instance, acct }, fetcher) {
  const lookup = new URL('/api/v1/accounts/lookup', instance); lookup.searchParams.set('acct', acct)
  const accountResponse = await fetchWithTimeout(lookup, fetcher); if (!accountResponse.ok) throw new Error(`Mastodon account lookup returned ${accountResponse.status}`)
  const account = await accountResponse.json(), statusesUrl = new URL(`/api/v1/accounts/${encodeURIComponent(account.id)}/statuses`, instance); statusesUrl.searchParams.set('limit', '40'); statusesUrl.searchParams.set('exclude_replies', 'true')
  const response = await fetchWithTimeout(statusesUrl, fetcher); if (!response.ok) throw new Error(`Mastodon returned ${response.status}`)
  return (await response.json()).map((status) => { const text = stripHtml(status?.content || ''); const images = (status?.media_attachments || []).map((media) => ({ url: String(media?.url || media?.preview_url || ''), alt: String(media?.description || '') })).filter((image) => image.url); return { id: `mastodon-${status.id}`, platform: 'MASTODON', date: String(status.created_at || ''), account: String(status?.account?.display_name || acct), handle: `@${status?.account?.acct || acct}`, text, excerpt: text, url: String(status?.url || status?.uri || ''), images, imageUrl: images[0]?.url || '', contentWarning: String(status?.spoiler_text || '') } })
}

async function fetchWithTimeout(url, fetcher) { const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000); try { return await fetcher(url.toString(), { headers: { accept: 'application/json', 'user-agent': 'SabotMediaCampaign/1.0 (+https://sabot.media)' }, signal: controller.signal }) } finally { clearTimeout(timer) } }
function dedupeByUrl(items, key) { const seen = new Set(); return items.filter((item) => { const value = String(item?.[key] || '').trim(); if (!value || seen.has(value)) return false; seen.add(value); return true }) }
function stripHtml(value) { return String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#(?:39|x27);/gi, "'").replace(/\s+/g, ' ').trim() }
