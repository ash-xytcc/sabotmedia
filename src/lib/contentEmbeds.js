const HTTPS = 'https:'

function safeUrl(value) {
  try {
    const url = new URL(String(value || '').trim())
    return url.protocol === HTTPS ? url : null
  } catch {
    return null
  }
}

function youtubeId(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || ''
  if (!['youtube.com', 'm.youtube.com'].includes(host)) return ''
  if (url.pathname === '/watch') return url.searchParams.get('v') || ''
  return url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] || ''
}

function vimeoId(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return ''
  return url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1] || ''
}

function xStatusId(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (!['x.com', 'twitter.com', 'mobile.twitter.com'].includes(host)) return ''
  return url.pathname.match(/\/status\/(\d+)/)?.[1] || ''
}

function instagramCode(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (!['instagram.com', 'm.instagram.com'].includes(host)) return ''
  return url.pathname.match(/^\/(?:p|reel|tv)\/([^/?#]+)/)?.[1] || ''
}

function tiktokId(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (!['tiktok.com', 'm.tiktok.com'].includes(host)) return ''
  return url.pathname.match(/\/video\/(\d+)/)?.[1] || ''
}

function spotifyPath(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (host !== 'open.spotify.com') return ''
  const match = url.pathname.match(/^\/(track|episode|show|playlist|album)\/([^/?#]+)/)
  return match ? `${match[1]}/${match[2]}` : ''
}

function peertubeId(url) {
  return url.pathname.match(/^\/(?:w|videos\/watch|videos\/embed)\/([A-Za-z0-9_-]+)/)?.[1] || ''
}

function mastodonEmbed(url) {
  const path = url.pathname.replace(/\/$/, '')
  if (!/^\/@[^/]+\/\d+$/.test(path) && !/^\/users\/[^/]+\/statuses\/\d+$/.test(path)) return ''
  return `${url.origin}${path}/embed`
}

export function detectContentEmbed(value) {
  const url = safeUrl(value)
  if (!url) return null
  const normalizedUrl = url.toString()

  const yt = youtubeId(url)
  if (yt) return { provider: 'youtube', url: normalizedUrl, embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`, title: 'YouTube video', aspect: 'video' }

  const vimeo = vimeoId(url)
  if (vimeo) return { provider: 'vimeo', url: normalizedUrl, embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(vimeo)}`, title: 'Vimeo video', aspect: 'video' }

  const status = xStatusId(url)
  if (status) return { provider: 'x', url: normalizedUrl, embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(status)}&dnt=true`, title: 'X post', aspect: 'social', height: 520 }

  const instagram = instagramCode(url)
  if (instagram) return { provider: 'instagram', url: normalizedUrl, embedUrl: `https://www.instagram.com/p/${encodeURIComponent(instagram)}/embed/captioned/`, title: 'Instagram post', aspect: 'social', height: 720 }

  const tiktok = tiktokId(url)
  if (tiktok) return { provider: 'tiktok', url: normalizedUrl, embedUrl: `https://www.tiktok.com/player/v1/${encodeURIComponent(tiktok)}?music_info=1&description=1`, title: 'TikTok post', aspect: 'vertical', height: 760 }

  const spotify = spotifyPath(url)
  if (spotify) return { provider: 'spotify', url: normalizedUrl, embedUrl: `https://open.spotify.com/embed/${spotify}`, title: 'Spotify player', aspect: 'audio', height: spotify.startsWith('episode/') || spotify.startsWith('show/') ? 232 : 352 }

  const host = url.hostname.toLowerCase()
  const peertube = peertubeId(url)
  if (peertube && !/(youtube|vimeo|tiktok|instagram|twitter|x\.com)$/i.test(host)) {
    return { provider: 'peertube', url: normalizedUrl, embedUrl: `${url.origin}/videos/embed/${encodeURIComponent(peertube)}`, title: 'PeerTube video', aspect: 'video' }
  }

  const mastodon = mastodonEmbed(url)
  if (mastodon) return { provider: 'mastodon', url: normalizedUrl, embedUrl: mastodon, title: 'Mastodon post', aspect: 'social', height: 520 }

  const bskyHost = host.replace(/^www\./, '')
  if (bskyHost === 'bsky.app' && /^\/profile\/[^/]+\/post\/[^/]+/.test(url.pathname)) {
    return { provider: 'bluesky', url: normalizedUrl, embedUrl: '', title: 'Bluesky post', aspect: 'link' }
  }

  if (/(^|\.)soundcloud\.com$/i.test(host)) {
    return { provider: 'soundcloud', url: normalizedUrl, embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(normalizedUrl)}&auto_play=false&show_artwork=true`, title: 'SoundCloud player', aspect: 'audio', height: 166 }
  }

  if (/(^|\.)bandcamp\.com$/i.test(host)) return { provider: 'bandcamp', url: normalizedUrl, embedUrl: '', title: 'Bandcamp', aspect: 'link' }

  return null
}

export function isStandaloneEmbedText(value) {
  const text = String(value || '').trim()
  if (!text || /\s/.test(text)) return null
  return detectContentEmbed(text)
}

function buildEmbedFigure(doc, embed) {
  if (!embed?.embedUrl) return null
  const figure = doc.createElement('figure')
  figure.className = `sabot-embed sabot-embed--${embed.provider}`
  figure.setAttribute('data-embed-provider', embed.provider)
  figure.setAttribute('data-embed-url', embed.url)

  const iframe = doc.createElement('iframe')
  iframe.src = embed.embedUrl
  iframe.title = embed.title
  iframe.loading = 'lazy'
  iframe.setAttribute('allowfullscreen', '')
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  iframe.setAttribute('width', '100%')
  iframe.setAttribute('height', String(embed.height || (embed.aspect === 'video' ? 560 : 520)))
  figure.appendChild(iframe)

  const caption = doc.createElement('figcaption')
  const anchor = doc.createElement('a')
  anchor.href = embed.url
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.textContent = `Open original ${embed.title.toLowerCase()} ↗`
  caption.appendChild(anchor)
  figure.appendChild(caption)
  return figure
}

export function expandStandaloneEmbedsInHtml(html) {
  const value = String(html || '')
  if (!value || typeof DOMParser === 'undefined') return value

  const doc = new DOMParser().parseFromString(value, 'text/html')

  // Repair official X/Twitter embed snippets whose script was correctly stripped by
  // the article sanitizer. This also fixes older posts without requiring a resave.
  Array.from(doc.body.querySelectorAll('blockquote.twitter-tweet')).forEach((node) => {
    const href = Array.from(node.querySelectorAll('a[href]'))
      .map((anchor) => anchor.getAttribute('href') || '')
      .find((candidate) => detectContentEmbed(candidate)?.provider === 'x')
    const embed = href ? detectContentEmbed(href) : null
    const figure = buildEmbedFigure(doc, embed)
    if (figure) node.replaceWith(figure)
  })

  const candidates = Array.from(doc.body.querySelectorAll('p, div'))
  candidates.forEach((node) => {
    if (node.closest('figure, blockquote, pre, code, .sabot-embed')) return
    const children = Array.from(node.children || [])
    let raw = String(node.textContent || '').trim()
    if (children.length === 1 && children[0].tagName?.toLowerCase() === 'a') {
      const anchor = children[0]
      const label = String(anchor.textContent || '').trim()
      const href = String(anchor.getAttribute('href') || '').trim()
      if (label === href || !label) raw = href
    } else if (children.length) {
      return
    }

    const embed = isStandaloneEmbedText(raw)
    if (!embed) return

    const figure = buildEmbedFigure(doc, embed)
    if (figure) {
      node.replaceWith(figure)
      return
    }

    node.className = `${node.className || ''} sabot-embed-link`.trim()
    node.innerHTML = ''
    const anchor = doc.createElement('a')
    anchor.href = embed.url
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.textContent = `${embed.title}: ${embed.url}`
    node.appendChild(anchor)
  })

  return doc.body.innerHTML
}
