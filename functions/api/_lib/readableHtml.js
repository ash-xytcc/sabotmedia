// Shared, conservative HTML projection for script-free public reading.
export const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const decode = value => String(value).replace(/&#(x[\da-f]+|\d+);?/gi, (_, n) => { const c = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n); return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : '' }).replace(/&colon;/gi, ':').replace(/&Tab;|&NewLine;/g, '').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
export function safeUrl(value) {
  const href = decode(value || '').trim().replace(/^https?:\/\/(?:www\.)?sabot\.media\/#\//i,'/')
  if (!href || /[\u0000-\u0020\u007f\\]/.test(href)) return ''
  if (href.startsWith('#') || /^\/(?!\/)/.test(href)) return href.replace(/^\/#\//, '/')
  return /^(https?:|mailto:)/i.test(href) ? href : ''
}
export const link = (url, label) => safeUrl(url) ? `<a href="${escapeHtml(safeUrl(url))}">${escapeHtml(label || url)}</a>` : escapeHtml(label || '')
export const paragraphs = value => String(value || '').split(/\n\s*\n/).filter(Boolean).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')
export function readableBody(value) {
  const source = String(value || '')
  if (!/<[a-z][\s\S]*>/i.test(source)) return paragraphs(source)
  const allowed = new Set('p div section article h1 h2 h3 h4 h5 h6 strong b em i u s del ins mark small sub sup br hr ul ol li blockquote pre code table caption thead tbody tfoot tr th td figure figcaption a img audio video source details summary span time'.split(' '))
  return source.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|template|svg|math|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<[^>]*>/g, tag => {
    const m = tag.match(/^<\s*(\/?)\s*([a-z][\w-]*)\b/i)
    if (!m) return ''
    const name = m[2].toLowerCase()
    const attrs = new Map()
    for (const a of tag.slice(m[0].length).matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s<>`]+))/g)) attrs.set(a[1].toLowerCase(), a[2] ?? a[3] ?? a[4])
    if (['iframe','object','embed'].includes(name)) return m[1] ? '' : `<p>${link(attrs.get('src') || attrs.get('data'), attrs.get('title') || 'Open embedded document or media')}</p>`
    if (!allowed.has(name)) return ''
    if (m[1]) return `</${name}>`
    let out = ''
    for (const [key, raw] of attrs) {
      let val = decode(raw)
      if (['href','src','poster'].includes(key)) { val = safeUrl(raw); if (!val) continue }
      else if (!['alt','title','lang','dir','colspan','rowspan','id'].includes(key)) continue
      out += ` ${key}="${escapeHtml(val)}"`
    }
    if (name === 'audio' || name === 'video') out += ' controls preload="metadata"'
    if (name === 'img') out += ' loading="lazy"'
    return `<${name}${out}>`
  })
}
export function image(item = {}) {
  const url = safeUrl(item.imageUrl || item.url || item.src)
  return url ? `<figure>${link(url, 'Open full-size image')}<img src="${escapeHtml(url)}" alt="${escapeHtml(item.altText || item.alt || item.title || '')}" loading="lazy">${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}</figure>` : ''
}
export function media(url, type = '', label = 'Download media') {
  const src = safeUrl(url)
  if (!src) return ''
  const tag = /audio|\.(mp3|ogg|wav|m4a)(\?|$)/i.test(type + src) ? 'audio' : /video|\.(mp4|webm)(\?|$)/i.test(type + src) ? 'video' : ''
  return `${tag ? `<${tag} controls preload="metadata" src="${escapeHtml(src)}"></${tag}>` : ''}<p>${link(src, label)}</p>`
}
export function readingDocument(title, body) {
  const nav = [['/','Sabot Media'],['/archive','Archive'],['/campaigns','Campaigns'],['/investigations','Investigations'],['/collections','Collections'],['/publications','Publications'],['/aberdeen-local-1312-gallery','Gallery'],['/updates','Updates'],['/press','Press'],['/about','About'],['/contact','Contact'],['/submit','Submit'],['/support','Support'],['/security','Security'],['/feeds','Feeds']]
  return `<noscript data-sabot-plain-html><style>
  [data-sabot-plain-html] .ns-wrap{box-sizing:border-box;max-width:900px;margin:auto;padding:24px;font:1rem/1.65 system-ui,sans-serif;color:#111;background:#fff;overflow-wrap:anywhere}
  [data-sabot-plain-html] *{box-sizing:border-box} [data-sabot-plain-html] a{color:inherit;text-decoration:underline} [data-sabot-plain-html] a:focus-visible{outline:3px solid #b00;outline-offset:3px}
  [data-sabot-plain-html] nav{display:flex;flex-wrap:wrap;gap:8px 18px;border-bottom:2px solid;padding-bottom:16px} [data-sabot-plain-html] img,[data-sabot-plain-html] video{max-width:100%;height:auto} [data-sabot-plain-html] audio{max-width:100%}
  [data-sabot-plain-html] h1,[data-sabot-plain-html] h2,[data-sabot-plain-html] h3{line-height:1.2} [data-sabot-plain-html] article,[data-sabot-plain-html] section{margin:24px 0} [data-sabot-plain-html] pre{white-space:pre-wrap} [data-sabot-plain-html] table{display:block;overflow:auto} [data-sabot-plain-html] figure{margin:20px 0}
  [data-sabot-plain-html] input,[data-sabot-plain-html] button{font:inherit;max-width:100%;padding:8px} @media print{[data-sabot-plain-html] nav,[data-sabot-plain-html] form{display:none}}
  </style><div class="ns-wrap"><a href="#reading-content">Skip to content</a><nav aria-label="Plain HTML navigation">${nav.map(([url,label]) => link(url,label)).join(' ')}</nav><main id="reading-content"><p>Plain HTML reading view</p>${body}</main><footer>Ⓐ Intellectual property is bullshit - steal this website. Site runs on <a href="https://github.com/colophon-hub/colophon">Colophon</a>. Build your own.</footer></div></noscript>`
}
