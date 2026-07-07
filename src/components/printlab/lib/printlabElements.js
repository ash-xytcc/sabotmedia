const editorialElements = [
  ['Mutual Aid Notice Label', 'Community / Mutual Aid', 'labels', ['mutual aid', 'solidarity', 'community', 'notice', 'label', 'support'], 'MUTUAL AID'],
  ['Free Food Label', 'Community / Mutual Aid', 'labels', ['food', 'free food', 'pantry', 'meal', 'label', 'mutual aid'], 'FREE FOOD'],
  ['Community Care Badge', 'Community / Mutual Aid', 'labels', ['community', 'care', 'support', 'heart', 'badge', 'mutual aid'], 'CARE'],
  ['Volunteer Needed Badge', 'Community / Mutual Aid', 'labels', ['volunteer', 'support', 'people', 'badge', 'mutual aid'], 'VOLUNTEER'],
  ['Donation Box Label', 'Community / Mutual Aid', 'labels', ['donation', 'box', 'supplies', 'mutual aid', 'label'], 'SUPPLIES'],
  ['Community Notice Label', 'Community / Mutual Aid', 'labels', ['community', 'notice', 'neighbors', 'label', 'poster'], 'NOTICE'],
  ['Work Stoppage Notice Badge', 'Labor', 'labels', ['labor', 'worker', 'union', 'tools', 'badge'], 'WORK STOPPAGE'],
  ['Union Printer Mark', 'Labor', 'labels', ['labor', 'union', 'printer', 'mark'], 'UNION'],
  ['Event Info Box', 'Layout Elements', 'layout', ['event', 'info', 'box', 'frame', 'flyer', 'poster', 'layout'], 'WHEN / WHERE / WHAT'],
  ['Poster Headline Block', 'Layout Elements', 'layout', ['poster', 'flyer', 'headline', 'layout', 'title'], 'HEADLINE'],
  ['Pull Quote Frame', 'Media / Editorial', 'editorial', ['quote', 'pull quote', 'frame', 'article', 'newspaper'], 'QUOTE'],
  ['Byline Strip', 'Media / Editorial', 'editorial', ['byline', 'author', 'newspaper', 'article', 'strip'], 'BYLINE'],
  ['Caption Frame', 'Media / Editorial', 'editorial', ['caption', 'frame', 'photo', 'newspaper', 'article'], 'CAPTION'],
  ['Source Label', 'Media / Editorial', 'editorial', ['source', 'citation', 'archive', 'document', 'label'], 'SOURCE'],
  ['Dispatch Label', 'Media / Editorial', 'editorial', ['dispatch', 'press', 'news', 'radio', 'label'], 'DISPATCH'],
  ['Field Note Box', 'Media / Editorial', 'editorial', ['field note', 'note', 'archive', 'box', 'article'], 'FIELD NOTE'],
  ['Archive Note Box', 'Media / Editorial', 'editorial', ['archive', 'note', 'document', 'newspaper', 'box'], 'ARCHIVE NOTE'],
  ['Zine Panel Frame', 'Zine / Print Marks', 'print', ['zine', 'panel', 'frame', 'comic', 'layout', 'paper'], 'PANEL'],
  ['Photocopy Border', 'Zine / Print Marks', 'print', ['photocopy', 'xerox', 'border', 'rough', 'zine', 'paper'], 'COPY'],
  ['Torn Paper Strip', 'Zine / Print Marks', 'print', ['torn paper', 'paper', 'collage', 'zine', 'strip'], 'TORN PAPER'],
  ['Tape Strip', 'Zine / Print Marks', 'print', ['tape', 'collage', 'zine', 'paper', 'strip'], 'TAPE'],
  ['Blackout Bar', 'Zine / Print Marks', 'print', ['blackout', 'document', 'bar'], ''],
  ['Halftone Block', 'Zine / Print Marks', 'print', ['halftone', 'dots', 'newspaper', 'print', 'texture'], ''],
  ['Newspaper Halftone Strip', 'Zine / Print Marks', 'print', ['halftone', 'newspaper', 'strip', 'print', 'texture'], ''],
  ['Fold Line', 'Zine / Print Marks', 'print', ['fold', 'line', 'zine', 'print', 'layout'], 'FOLD'],
  ['Cut Line', 'Zine / Print Marks', 'print', ['cut', 'line', 'scissors', 'zine', 'print'], 'CUT'],
  ['Crop Marks', 'Zine / Print Marks', 'print', ['crop', 'marks', 'print', 'registration', 'layout'], ''],
  ['Registration Marks', 'Zine / Print Marks', 'print', ['registration', 'print', 'crop', 'marks', 'riso'], ''],
  ['Map Label', 'Maps / Location', 'layout', ['map', 'location', 'pin', 'label', 'route'], 'LOCATION'],
  ['Route Callout', 'Maps / Location', 'layout', ['route', 'map', 'arrow', 'callout', 'location'], 'ROUTE'],
  ['Audio Waveform Strip', 'Media / Editorial', 'media', ['audio', 'waveform', 'podcast', 'radio', 'strip'], ''],
  ['Podcast Label', 'Media / Editorial', 'media', ['podcast', 'audio', 'mic', 'label', 'radio'], 'PODCAST'],
  ['Radio Dispatch Badge', 'Media / Editorial', 'media', ['radio', 'dispatch', 'broadcast', 'badge', 'audio'], 'RADIO'],
]

function slugify(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function escapeXml(value = '') {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function dataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
function shortText(value = '') {
  return String(value || '').slice(0, 18).toUpperCase()
}
function textSvg(text, x, y, size = 24) {
  return text ? `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="${size}" fill="#111">${escapeXml(shortText(text))}</text>` : ''
}
function shapeFor(bucket, text) {
  if (bucket === 'labels') return `<path d="M34 78h188v92l-34 34H34Z" fill="#fffdf8" stroke="#111" stroke-width="10"/><path d="M52 112h152" stroke="#c22b26" stroke-width="10"/>${textSvg(text, 128, 154, text.length > 11 ? 17 : 24)}`
  if (bucket === 'layout') return `<rect x="34" y="42" width="188" height="172" fill="#fffdf8" stroke="#111" stroke-width="10"/><path d="M54 84h148M54 126h132M54 168h148" stroke="#c22b26" stroke-width="8"/>${textSvg(text, 128, 210, 17)}`
  if (bucket === 'editorial') return `<path d="M46 46h150l28 28v136H46Z" fill="#fffdf8" stroke="#111" stroke-width="9"/><path d="M196 48v30h30M66 104h128M66 138h112M66 172h128" stroke="#c22b26" stroke-width="7"/>${textSvg(text, 128, 88, 15)}`
  if (bucket === 'media') return `<rect x="24" y="82" width="208" height="92" fill="#fffdf8" stroke="#111" stroke-width="8"/><path d="M50 128h12m14 0h8m16-26v52m20-76v104m22-62v40m20-92v120m22-72v64m20-42h14" stroke="#c22b26" stroke-width="9" stroke-linecap="round"/>${textSvg(text, 128, 216, 17)}`
  if (/halftone/i.test(text)) return `<g fill="#111"><circle cx="54" cy="54" r="16"/><circle cx="102" cy="54" r="13"/><circle cx="150" cy="54" r="10"/><circle cx="198" cy="54" r="7"/><circle cx="54" cy="102" r="13"/><circle cx="102" cy="102" r="10"/><circle cx="150" cy="102" r="7"/><circle cx="198" cy="102" r="5"/><circle cx="54" cy="150" r="10"/><circle cx="102" cy="150" r="7"/><circle cx="150" cy="150" r="5"/><circle cx="198" cy="150" r="3"/></g>`
  if (/crop|registration/i.test(text)) return `<path d="M38 86V38h48M218 86V38h-48M38 170v48h48M218 170v48h-48" fill="none" stroke="#111" stroke-width="10"/><circle cx="128" cy="128" r="34" fill="none" stroke="#c22b26" stroke-width="7"/>`
  return `<rect x="34" y="80" width="188" height="96" fill="#fffdf8" stroke="#111" stroke-width="10"/><path d="M54 128h148" stroke="#c22b26" stroke-width="9" stroke-dasharray="16 10"/>${textSvg(text, 128, 154, 18)}`
}
function renderElementSvg(title, bucket, text) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256" role="img" aria-label="${escapeXml(title)}"><rect width="256" height="256" rx="24" fill="#fffdf8"/><g>${shapeFor(bucket, text || title)}</g></svg>`
}

export function getPrintlabElements() {
  return editorialElements.map(([title, category, bucket, tags, label]) => {
    const svg = renderElementSvg(title, bucket, label)
    const url = dataUrl(svg)
    const allTags = [...tags, category, bucket, title, ...title.split(/\s+/)]
    return {
      id: `printlab-element:${slugify(category)}:${slugify(title)}`,
      title,
      description: `${category} editorial design component for Printlab layouts.`,
      thumbnailUrl: url,
      previewUrl: url,
      downloadUrl: url,
      source: 'printlab-elements',
      sourceLabel: 'Printlab Elements',
      mediaType: 'element',
      mimeType: 'image/svg+xml',
      license: 'MIT',
      licenseUrl: '',
      creator: 'SabotPress',
      attributionText: 'Printlab Elements / SabotPress',
      tags: allTags,
      category,
      bucket,
      raw: { title, category, bucket, tags: allTags },
    }
  })
}
