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

function parsedMediaUrl(value = '') {
  try {
    return new URL(String(value || ''), 'https://sabot.invalid')
  } catch {
    return null
  }
}

function mediaIdFromSabotUrl(value = '') {
  const parsed = parsedMediaUrl(value)
  if (!parsed) return ''
  const key = String(parsed.searchParams.get('key') || '')
  if (!key.startsWith('media/')) return ''
  const filename = key.split('/').pop() || ''
  const match = filename.match(/^(media-[a-z0-9-]+?)-[^/]+$/i)
  return match?.[1] || ''
}

function mediaUrlHint(value = '') {
  const parsed = parsedMediaUrl(value)
  if (!parsed) return String(value || '').toLowerCase()
  return [
    parsed.pathname,
    parsed.searchParams.get('filename') || '',
    parsed.searchParams.get('key') || '',
  ].join(' ').toLowerCase()
}

function directMediaType(value = '') {
  const hint = mediaUrlHint(value)
  if (/\.(mp4|m4v|mov|ogv|webm)(?:\s|$)/i.test(hint)) return 'video'
  if (/\.(mp3|m4a|aac|ogg|oga|wav|flac)(?:\s|$)/i.test(hint)) return 'audio'
  if (/\.pdf(?:\s|$)/i.test(hint)) return 'pdf'
  if (/\.(png|jpe?g|gif|webp|avif|svg)(?:\s|$)/i.test(hint)) return 'image'
  return ''
}

function providerEmbedUrl(value = '') {
  const src = normalizeEmbedUrl(value)
  if (!src || src.startsWith('/')) return ''
  const parsed = parsedMediaUrl(src)
  if (!parsed) return ''
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '')

  if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    let videoId = ''
    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || ''
    } else {
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (['embed', 'shorts', 'live'].includes(parts[0])) videoId = parts[1] || ''
      else videoId = parsed.searchParams.get('v') || ''
    }
    if (/^[a-z0-9_-]{6,}$/i.test(videoId)) {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
    }
  }

  const peerTubeMatch = parsed.pathname.match(/^\/(?:w|videos\/watch|videos\/embed)\/([^/?#]+)/i)
  if (peerTubeMatch?.[1]) {
    return `${parsed.origin}/videos/embed/${encodeURIComponent(peerTubeMatch[1])}`
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = parsed.pathname.split('/').filter(Boolean)
    const videoId = host === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts[0]
    if (/^\d+$/.test(videoId || '')) return `https://player.vimeo.com/video/${videoId}`
  }

  return ''
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

  const mediaType = directMediaType(src)
  if (mediaType === 'video' || mediaType === 'audio' || mediaType === 'image') {
    return buildMediaEmbed({ url: src, title, mediaType })
  }
  if (mediaType === 'pdf') {
    return buildMediaEmbed({ url: src, title, mimeType: 'application/pdf' })
  }

  const providerSrc = providerEmbedUrl(src)
  const iframeSrc = providerSrc || src
  return `<figure class="sabot-embed sabot-embed--iframe" style="width:100%;max-width:100%;"><iframe src="${escapeAttribute(iframeSrc)}" title="${escapeAttribute(title || 'Embedded content')}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen style="display:block;width:100%;min-height:480px;"></iframe></figure><p><br /></p>`
}

export function buildMediaEmbed(media = {}) {
  const url = normalizeEmbedUrl(media.url)
  if (!url) return ''
  const title = String(media.title || 'Download file')
  const alt = String(media.alt || '')
  const caption = String(media.caption || '')
  const mime = String(media.mimeType || '').toLowerCase()
  const type = String(media.mediaType || '').toLowerCase()
  const mediaId = String(media.id || media.assetId || media.mediaId || mediaIdFromSabotUrl(url) || '').trim()
  const urlHint = mediaUrlHint(url)
  const escapedUrl = escapeAttribute(url)
  const escapedTitle = escapeText(title)
  const escapedCaption = escapeText(caption)
  const mediaMetadata = [
    mediaId ? ` data-media-id="${escapeAttribute(mediaId)}"` : '',
    title ? ` data-media-title="${escapeAttribute(title)}"` : '',
    mime ? ` data-media-mime="${escapeAttribute(mime)}"` : '',
  ].join('')

  if (type === 'image' || type === 'svg' || mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|svg)(?:\s|$)/i.test(urlHint)) {
    const image = `<img src="${escapedUrl}" alt="${escapeAttribute(alt)}" style="max-width:100%;height:auto;" />`
    return caption
      ? `<figure style="width:100%;max-width:100%;">${image}<figcaption>${escapedCaption}</figcaption></figure><p><br /></p>`
      : `${image}<p><br /></p>`
  }

  if (type === 'video' || mime.startsWith('video/') || /\.(mp4|m4v|mov|ogv|webm)(?:\s|$)/i.test(urlHint)) {
    return `<figure class="sabot-embed sabot-embed--video" style="width:100%;max-width:100%;"${mediaMetadata}><video controls preload="metadata" playsinline src="${escapedUrl}" aria-label="${escapeAttribute(title || 'Video player')}" style="display:block;width:100%;height:auto;"${mediaMetadata}></video>${caption ? `<figcaption>${escapedCaption}</figcaption>` : ''}</figure><p><br /></p>`
  }

  if (type === 'audio' || mime.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|oga|wav|flac)(?:\s|$)/i.test(urlHint)) {
    return `<figure class="sabot-embed sabot-embed--audio" style="width:100%;max-width:100%;"${mediaMetadata}><audio controls preload="metadata" src="${escapedUrl}" aria-label="${escapeAttribute(title || 'Audio player')}" style="width:100%;"${mediaMetadata}></audio>${caption ? `<figcaption>${escapedCaption}</figcaption>` : ''}</figure><p><br /></p>`
  }

  if (mime === 'application/pdf' || /\.pdf(?:\s|$)/i.test(urlHint)) {
    const label = escapedCaption || escapedTitle || 'Open PDF'
    return `<figure class="sabot-embed sabot-embed--pdf" style="width:100%;max-width:100%;"><iframe src="${escapedUrl}" title="${escapeAttribute(title || 'PDF document')}" loading="lazy" referrerpolicy="no-referrer" width="100%" height="720" style="display:block;width:100%;min-height:65vh;max-height:80vh;border:1px solid #999;background:#fff;"></iframe><figcaption><a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${label}</a></figcaption></figure><p><br /></p>`
  }

  return `<p><a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedCaption || escapedTitle}</a></p><p><br /></p>`
}
