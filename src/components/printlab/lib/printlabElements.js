const elementGroups = [
  {
    category: 'Shapes',
    mediaType: 'element',
    template: 'shape',
    tags: ['shape', 'poster', 'layout'],
    items: ['circle', 'square', 'rounded rectangle', 'triangle', 'diamond', 'star', 'burst', 'blob', 'rough blob', 'speech bubble', 'thought bubble', 'caption box'],
  },
  {
    category: 'Lines & Arrows',
    mediaType: 'element',
    template: 'arrow',
    tags: ['arrow', 'line', 'direction', 'underline', 'divider'],
    items: ['straight arrow', 'curved arrow', 'double arrow', 'dashed arrow', 'hand-drawn arrow', 'thick arrow', 'pointer arrow', 'circle arrow', 'underline stroke', 'scribble underline', 'divider line', 'dotted divider', 'zigzag divider'],
  },
  {
    category: 'Frames',
    mediaType: 'element',
    template: 'frame',
    tags: ['frame', 'border', 'layout', 'zine'],
    items: ['simple frame', 'rounded frame', 'polaroid frame', 'film frame', 'newspaper clipping frame', 'zine panel frame', 'rough photocopy border', 'receipt border', 'ticket border', 'label frame'],
  },
  {
    category: 'Labels & Badges',
    mediaType: 'element',
    template: 'badge',
    tags: ['badge', 'label', 'sticker', 'notice'],
    items: ['urgent badge', 'free badge', 'mutual aid badge', 'community notice badge', 'new badge', 'archive badge', 'print-ready badge', 'open source badge', 'solidarity badge', 'support badge', 'volunteer badge'],
  },
  {
    category: 'Stickers',
    mediaType: 'element',
    template: 'badge',
    tags: ['sticker', 'label', 'poster', 'social graphic'],
    items: ['solidarity sticker', 'community sticker', 'print it sticker'],
  },
  {
    category: 'Callouts',
    mediaType: 'element',
    template: 'badge',
    tags: ['callout', 'caption', 'speech bubble', 'notice'],
    items: ['arrow callout', 'note callout', 'warning callout'],
  },
  {
    category: 'Dividers',
    mediaType: 'element',
    template: 'arrow',
    tags: ['divider', 'line', 'zigzag', 'dotted', 'layout'],
    items: ['solid divider', 'dotted divider mark', 'zigzag divider mark'],
  },
  {
    category: 'Bursts',
    mediaType: 'element',
    template: 'shape',
    tags: ['burst', 'starburst', 'attention', 'badge'],
    items: ['sharp burst', 'round burst', 'rough burst'],
  },
  {
    category: 'Protest Graphics',
    mediaType: 'element',
    template: 'protest',
    tags: ['protest', 'labor', 'solidarity', 'organizing', 'collective'],
    items: ['raised fist', 'megaphone', 'banner', 'picket sign', 'crowd silhouettes', 'hands', 'lightning bolt', 'wheat', 'gear', 'network nodes'],
  },
  {
    category: 'Mutual Aid',
    mediaType: 'element',
    template: 'mutual',
    tags: ['mutual aid', 'solidarity', 'community care', 'neighbors', 'volunteers', 'relief', 'support', 'donation', 'commons'],
    items: ['heart in hands', 'house', 'food box', 'soup bowl', 'medical cross', 'water drop', 'care badge', 'donation box', 'volunteer hands', 'pantry box'],
  },
  {
    category: 'Food Distribution',
    mediaType: 'element',
    template: 'food',
    tags: ['food', 'free food', 'food distribution', 'pantry', 'community kitchen', 'meal', 'care'],
    items: ['bread loaf', 'food basket', 'meal tray', 'soup pot', 'grocery bag', 'community kitchen sign'],
  },
  {
    category: 'Labor',
    mediaType: 'element',
    template: 'labor',
    tags: ['labor', 'worker', 'union', 'strike', 'factory', 'gear', 'wrench', 'tools', 'picket', 'banner'],
    items: ['worker badge', 'union label', 'factory roof', 'wrench and gear', 'tools crossed', 'strike banner', 'shop floor mark'],
  },
  {
    category: 'Housing',
    mediaType: 'element',
    template: 'housing',
    tags: ['housing', 'home', 'shelter', 'neighbors', 'rent', 'community'],
    items: ['house outline', 'apartment block', 'shelter sign', 'rent relief badge', 'neighborhood row'],
  },
  {
    category: 'Media / Press',
    mediaType: 'element',
    template: 'media',
    tags: ['media', 'press', 'radio', 'podcast', 'dispatch', 'camera', 'microphone', 'rss'],
    items: ['book', 'newspaper', 'radio tower', 'microphone', 'camera', 'quote marks', 'pull quote box', 'byline label', 'caption label', 'source label', 'breaking news strip', 'dispatch label', 'field note box', 'archive note box', 'editor note box', 'transcript label', 'audio waveform', 'rss symbol', 'podcast mic', 'document stack'],
  },
  {
    category: 'Maps / Location',
    mediaType: 'element',
    template: 'map',
    tags: ['map', 'location', 'transit', 'bike', 'bus', 'phone tree', 'network'],
    items: ['map pin', 'bike', 'bus', 'route line', 'location badge', 'phone tree'],
  },
  {
    category: 'Zine Elements',
    mediaType: 'element',
    template: 'zine',
    tags: ['zine', 'photocopy', 'tape', 'staple', 'paper', 'typewriter', 'collage', 'rough border'],
    items: ['typewriter label', 'torn paper strip', 'tape strip', 'staple', 'paperclip', 'coffee stain', 'ink stamp', 'rubber stamp border', 'collage scrap', 'xerox shadow'],
  },
  {
    category: 'Print Marks',
    mediaType: 'element',
    template: 'print',
    tags: ['print', 'fold', 'cut line', 'crop marks', 'registration', 'redaction', 'halftone', 'riso', 'risograph', 'photocopy'],
    items: ['halftone dot block', 'halftone circle', 'risograph grain block', 'photocopy noise block', 'fold line', 'cut line', 'crop marks', 'registration marks', 'redaction bar', 'newspaper halftone strip'],
  },
  {
    category: 'Accessibility Symbols',
    mediaType: 'element',
    template: 'accessibility',
    tags: ['accessibility', 'care', 'support', 'community', 'symbols'],
    items: ['accessibility circle', 'large type badge', 'audio available badge', 'transcript available badge', 'plain language badge'],
  },
  {
    category: 'Social Icons',
    mediaType: 'element',
    template: 'media',
    tags: ['social', 'share', 'rss', 'network', 'community'],
    items: ['share circle', 'community network icon', 'follow badge'],
  },
]

function slugify(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function titleCase(value = '') {
  return String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function escapeXml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function iconLetter(title) {
  return title.split(/\s+/).map((part) => part[0]).join('').slice(0, 3).toUpperCase()
}

function getSymbol(title, template) {
  const name = title.toLowerCase()
  if (name.includes('heart')) return '<path d="M128 214C72 166 42 137 42 94c0-31 24-54 55-54 18 0 35 9 45 23 10-14 27-23 45-23 31 0 55 23 55 54 0 43-30 72-114 120Z" fill="#c22b26"/><path d="M62 210c34 26 98 26 132 0" fill="none" stroke="#111" stroke-width="12" stroke-linecap="round"/>'
  if (name.includes('house') || name.includes('home') || name.includes('shelter')) return '<path d="M48 124 128 58l80 66v86H72v-72h112v72" fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round"/><path d="M104 210v-54h48v54" fill="none" stroke="#c22b26" stroke-width="12"/>'
  if (name.includes('food') || name.includes('box') || name.includes('pantry') || name.includes('basket')) return '<path d="M54 104h148l-18 108H72Z" fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round"/><path d="M82 104c8-34 84-34 92 0M86 146h84" fill="none" stroke="#c22b26" stroke-width="12" stroke-linecap="round"/>'
  if (name.includes('soup') || name.includes('meal')) return '<path d="M62 134h132c0 44-26 76-66 76s-66-32-66-76Z" fill="none" stroke="#111" stroke-width="14"/><path d="M84 96c-10-16 10-24 0-40M128 96c-10-16 10-24 0-40M172 96c-10-16 10-24 0-40" fill="none" stroke="#c22b26" stroke-width="10" stroke-linecap="round"/>'
  if (name.includes('cross') || name.includes('medical')) return '<path d="M106 48h44v58h58v44h-58v58h-44v-58H48v-44h58Z" fill="#c22b26" stroke="#111" stroke-width="10" stroke-linejoin="round"/>'
  if (name.includes('fist')) return '<path d="M74 112V54c0-16 25-16 25 0v52M101 106V42c0-17 26-17 26 0v64M128 106V48c0-17 26-17 26 0v66M154 112V64c0-16 26-16 26 0v70c0 48-26 78-61 78-36 0-62-28-62-72v-28Z" fill="#111"/><path d="M62 124h130" stroke="#f6f1e8" stroke-width="10"/>'
  if (name.includes('megaphone')) return '<path d="M48 132h44l102-58v116L92 132H48Z" fill="none" stroke="#111" stroke-width="14" stroke-linejoin="round"/><path d="m86 134 22 62" stroke="#c22b26" stroke-width="14" stroke-linecap="round"/>'
  if (name.includes('arrow')) return '<path d="M48 136h132" stroke="#111" stroke-width="16" stroke-linecap="round"/><path d="m150 88 54 48-54 48" fill="none" stroke="#c22b26" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>'
  if (name.includes('radio') || name.includes('rss')) return '<path d="M70 92h116v96H70Z" fill="none" stroke="#111" stroke-width="12"/><circle cx="104" cy="140" r="20" fill="none" stroke="#c22b26" stroke-width="10"/><path d="M138 128h28M138 154h28M92 92 160 48" stroke="#111" stroke-width="10" stroke-linecap="round"/>'
  if (name.includes('microphone') || name.includes('mic')) return '<rect x="94" y="42" width="68" height="112" rx="34" fill="none" stroke="#111" stroke-width="14"/><path d="M66 126c0 40 24 66 62 66s62-26 62-66M128 192v32" stroke="#c22b26" stroke-width="12" stroke-linecap="round"/>'
  if (name.includes('camera')) return '<path d="M50 88h52l14-24h52l14 24h24v112H50Z" fill="none" stroke="#111" stroke-width="12"/><circle cx="128" cy="144" r="34" fill="none" stroke="#c22b26" stroke-width="12"/>'
  if (name.includes('map') || name.includes('pin')) return '<path d="M128 224s62-64 62-116a62 62 0 0 0-124 0c0 52 62 116 62 116Z" fill="none" stroke="#111" stroke-width="14"/><circle cx="128" cy="106" r="22" fill="#c22b26"/>'
  if (name.includes('newspaper') || name.includes('dispatch') || name.includes('byline') || name.includes('caption') || name.includes('source')) return '<rect x="46" y="50" width="164" height="156" fill="none" stroke="#111" stroke-width="10"/><path d="M70 84h116M70 112h116M70 142h48M136 142h50M70 170h116" stroke="#c22b26" stroke-width="9" stroke-linecap="square"/>'
  if (name.includes('halftone')) return '<g fill="#111"><circle cx="66" cy="66" r="12"/><circle cx="112" cy="66" r="10"/><circle cx="158" cy="66" r="8"/><circle cx="204" cy="66" r="6"/><circle cx="66" cy="112" r="10"/><circle cx="112" cy="112" r="8"/><circle cx="158" cy="112" r="6"/><circle cx="204" cy="112" r="4"/><circle cx="66" cy="158" r="8"/><circle cx="112" cy="158" r="6"/><circle cx="158" cy="158" r="4"/><circle cx="204" cy="158" r="3"/></g>'
  if (name.includes('redaction')) return '<path d="M48 74h160v34H48ZM48 132h124v34H48Z" fill="#111"/><path d="M48 204h160" stroke="#c22b26" stroke-width="10"/>'
  if (name.includes('fold') || name.includes('cut')) return '<path d="M128 28v200" stroke="#111" stroke-width="8" stroke-dasharray="18 14"/><path d="M76 76h104M76 180h104" stroke="#c22b26" stroke-width="8" stroke-linecap="round"/>'
  if (name.includes('frame') || name.includes('border')) return '<rect x="42" y="44" width="172" height="168" fill="none" stroke="#111" stroke-width="12"/><rect x="68" y="70" width="120" height="116" fill="none" stroke="#c22b26" stroke-width="8" stroke-dasharray="12 10"/>'
  if (name.includes('badge') || name.includes('label') || name.includes('notice') || name.includes('free') || name.includes('urgent')) return `<path d="M46 80h164v96l-36 32H46Z" fill="#f6f1e8" stroke="#111" stroke-width="12"/><path d="M68 112h120" stroke="#c22b26" stroke-width="12"/><text x="128" y="162" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="32" fill="#111">${escapeXml(iconLetter(title))}</text>`
  if (template === 'arrow') return '<path d="M46 138h126" stroke="#111" stroke-width="14" stroke-linecap="round"/><path d="m142 96 54 42-54 42" fill="none" stroke="#c22b26" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>'
  if (template === 'shape') return '<circle cx="128" cy="128" r="76" fill="none" stroke="#111" stroke-width="14"/><path d="M74 166c38-54 76-54 108 0" fill="none" stroke="#c22b26" stroke-width="12" stroke-linecap="round"/>'
  return `<rect x="48" y="56" width="160" height="144" rx="18" fill="none" stroke="#111" stroke-width="12"/><text x="128" y="144" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="44" fill="#c22b26">${escapeXml(iconLetter(title))}</text>`
}

function renderElementSvg(element) {
  const title = titleCase(element.title)
  const symbol = getSymbol(element.title, element.template)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256" role="img" aria-label="${escapeXml(title)}"><rect width="256" height="256" rx="28" fill="#fffdf8"/><g>${symbol}</g></svg>`
}

export function getPrintlabElements() {
  return elementGroups.flatMap((group) => group.items.map((title) => {
    const svg = renderElementSvg({ title, template: group.template })
    const url = dataUrl(svg)
    const tags = [...group.tags, group.category, title, ...title.split(/\s+/)]
    return {
      id: `printlab-element:${slugify(group.category)}:${slugify(title)}`,
      title: titleCase(title),
      description: `${group.category} design element for Printlab layouts.`,
      thumbnailUrl: url,
      previewUrl: url,
      downloadUrl: url,
      source: 'printlab-elements',
      sourceLabel: 'Printlab Elements',
      mediaType: group.mediaType,
      mimeType: 'image/svg+xml',
      license: 'MIT',
      licenseUrl: '',
      creator: 'SabotPress',
      attributionText: 'Printlab Elements / SabotPress',
      tags,
      category: group.category,
      raw: { title, category: group.category, template: group.template, tags },
    }
  }))
}
