import { ensureNativePublicContentTable, listNativeEntries } from '../api/_lib/nativePublicContent.js'

export async function onRequestGet(context) {
  try {
    if (!context?.env?.BF_DB) {
      return xml(feedXml({ requestUrl: context.request.url, items: [], note: 'No database binding is configured yet.' }))
    }

    await ensureNativePublicContentTable(context.env.BF_DB)
    const entries = await listNativeEntries(context.env.BF_DB, { status: 'published' })
    const items = entries
      .filter((entry) => entry?.contentType === 'podcast')
      .filter((entry) => isPublicAudioUrl(getAudioUrl(entry)))

    return xml(feedXml({ requestUrl: context.request.url, items }))
  } catch (error) {
    return new Response(`RSS feed error: ${String(error?.message || error)}`, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    })
  }
}

function feedXml({ requestUrl, items = [], note = '' }) {
  const url = new URL(requestUrl)
  const origin = url.origin
  const selfUrl = `${origin}/rss/podcast.xml`
  const channelDescription = note || 'Sabot Media podcast and AudioLab episodes.'
  const body = items.map((item) => itemXml(item, origin)).join('\n')
  const lastBuildDate = new Date().toUTCString()

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${escapeXml('Sabot Media Podcast')}</title>
    <description>${escapeXml(channelDescription)}</description>
    <link>${escapeXml(origin)}</link>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <generator>SabotPress AudioLab</generator>
    <!-- TODO: add channel artwork, owner, and contact email once podcast settings exist. -->
${body}
  </channel>
</rss>`
}

function itemXml(item, origin) {
  const audioUrl = absolutize(getAudioUrl(item), origin)
  const slug = String(item.slug || item.id || '').trim()
  const link = `${origin}/post/${encodeURIComponent(slug)}`
  const mimeType = getMimeType(item)
  const size = getFileSize(item)
  const pubDate = new Date(item.publishedAt || item.updatedAt || item.createdAt || Date.now()).toUTCString()
  const description = item.podcastSummary || item.excerpt || stripHtml(item.bodyHtml || item.body || '')
  const duration = String(item.podcastDuration || '').trim()
  const explicit = item.podcastExplicit ? 'yes' : 'no'

  return `    <item>
      <title>${escapeXml(item.title || 'Untitled episode')}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(item.id || link)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <enclosure url="${escapeXml(audioUrl)}" type="${escapeXml(mimeType)}" length="${escapeXml(String(size || 0))}" />
${duration ? `      <itunes:duration>${escapeXml(duration)}</itunes:duration>\n` : ''}      <itunes:explicit>${escapeXml(explicit)}</itunes:explicit>
    </item>`
}

function getAudioUrl(item = {}) {
  const delivery = getDeliveryAsset(item)
  const deliveryUrl = delivery?.url || delivery?.publicUrl || delivery?.rssEnclosure?.url || item.podcastDeliveryAudioUrl || ''
  if (isPublicAudioUrl(deliveryUrl)) return String(deliveryUrl).trim()

  const direct = String(item.podcastRssEnclosureUrl || item.podcastAudioUrl || item.audioSourceUrl || '').trim()
  if (isPublicAudioUrl(direct)) return direct

  const asset = getAudioAsset(item)
  const assetUrl = asset?.url || asset?.publicUrl || asset?.rssEnclosure?.url || ''
  return isPublicAudioUrl(assetUrl) ? String(assetUrl).trim() : ''
}

function getMimeType(item = {}) {
  const delivery = getDeliveryAsset(item)
  if (delivery?.mimeType || delivery?.type) return String(delivery.mimeType || delivery.type)
  if (item.podcastMimeType) return String(item.podcastMimeType)
  const asset = getAudioAsset(item)
  return String(asset?.mimeType || asset?.type || 'audio/wav')
}

function getFileSize(item = {}) {
  const delivery = getDeliveryAsset(item)
  if (delivery?.size || delivery?.length) return Number(delivery.size || delivery.length || 0)
  if (item.podcastFileSize) return Number(item.podcastFileSize || 0)
  const asset = getAudioAsset(item)
  return Number(asset?.size || asset?.length || 0)
}

function getDeliveryAsset(item = {}) {
  return (Array.isArray(item.relatedAssets) ? item.relatedAssets : []).find((asset) => {
    const haystack = `${asset?.type || ''} ${asset?.role || ''} ${asset?.source || ''} ${asset?.mimeType || ''}`
    const url = asset?.url || asset?.publicUrl || asset?.rssEnclosure?.url || ''
    return /delivery|compressed|opus|mp3|m4a|webm/i.test(haystack) && isPublicAudioUrl(url)
  }) || null
}

function getAudioAsset(item = {}) {
  return (Array.isArray(item.relatedAssets) ? item.relatedAssets : []).find((asset) => {
    const haystack = `${asset?.type || ''} ${asset?.source || ''} ${asset?.mimeType || ''}`
    const url = asset?.url || asset?.publicUrl || asset?.rssEnclosure?.url || ''
    return /audiolab|audio/i.test(haystack) && isPublicAudioUrl(url)
  }) || null
}

function isPublicAudioUrl(value = '') {
  const raw = String(value || '').trim()
  if (!raw || raw.startsWith('audiolab-local://')) return false
  return /^https?:\/\//i.test(raw) || raw.startsWith('/api/audiolab/media')
}

function absolutize(value = '', origin = '') {
  const raw = String(value || '')
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return `${origin}${raw}`
  return raw
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function escapeXml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function xml(body) {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  })
}
