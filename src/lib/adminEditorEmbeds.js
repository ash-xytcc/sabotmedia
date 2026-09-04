function escapeAttribute(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeText(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function normalizeEmbedUrl(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/')) return raw
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : ''
  } catch {
    return ''
  }
}

export function iframeSourceFromInput(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const iframeMatch = raw.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i)
  return normalizeEmbedUrl(iframeMatch ? iframeMatch[2] : raw)
}

export function buildIframeEmbed(value = '', title = 'Embedded content') {
  const src = iframeSourceFromInput(value)
  if (!src) return ''
  return `<figure class="sabot-embed sabot-embed--iframe" style="width:100%;max-width:100%;"><iframe src="${escapeAttribute(src)}" title="${escapeAttribute(title || 'Embedded content')}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen style="display:block;width:100%;min-height:480px;"></iframe></figure><p><br /></p>`
}

export function buildMediaEmbed(media = {}) {
  const url = normalizeEmbedUrl(media.url)
  if (!url) return ''
  const title = String(media.title || 'Download file')
  const alt = String(media.alt || '')
  const caption = String(media.caption || '')
  const mime = String(media.mimeType || '').toLowerCase()
  const type = String(media.mediaType || '').toLowerCase()
  const lowerUrl = url.toLowerCase().split(/[?#]/)[0]
  const escapedUrl = escapeAttribute(url)
  const escapedTitle = escapeText(title)
  const escapedCaption = escapeText(caption)

  if (type === 'image' || type === 'svg' || mime.startsWith('image/')) {
    const image = `<img src="${escapedUrl}" alt="${escapeAttribute(alt)}" style="max-width:100%;height:auto;" />`
    return caption
      ? `<figure style="width:100%;max-width:100%;">${image}<figcaption>${escapedCaption}</figcaption></figure><p><br /></p>`
      : `${image}<p><br /></p>`
  }

  if (type === 'audio' || mime.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|oga|wav|webm)$/.test(lowerUrl)) {
    return `<figure class="sabot-embed sabot-embed--audio" style="width:100%;max-width:100%;"><audio controls preload="metadata" src="${escapedUrl}" style="width:100%;"></audio>${caption ? `<figcaption>${escapedCaption}</figcaption>` : ''}</figure><p><br /></p>`
  }

  if (mime === 'application/pdf' || lowerUrl.endsWith('.pdf')) {
    const label = escapedCaption || escapedTitle || 'Open PDF'
    return `<figure class="sabot-embed sabot-embed--pdf" style="width:100%;max-width:100%;"><iframe src="${escapedUrl}" title="${escapeAttribute(title || 'PDF document')}" loading="lazy" width="100%" height="720" style="display:block;width:100%;min-height:65vh;max-height:80vh;border:1px solid #999;background:#fff;"></iframe><figcaption><a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${label}</a></figcaption></figure><p><br /></p>`
  }

  return `<p><a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedCaption || escapedTitle}</a></p><p><br /></p>`
}
