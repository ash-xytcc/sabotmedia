function escapeXml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function itemDate(item) {
  const d = new Date(String(item.publishedAt || item.updatedAt || item.createdAt || ''))
  return Number.isFinite(d.getTime()) ? d.toUTCString() : new Date().toUTCString()
}

function normalizeFeedItem(item) {
  const slug = item.slug || item.id || ''
  return {
    title: item.title || slug || 'Untitled',
    link: slug ? `https://sabot.media/post/${slug}` : 'https://sabot.media/archive',
    description: item.excerpt || item.summary || '',
    date: itemDate(item),
    author: item.author || 'Sabot Media',
    category: item.contentType || item.type || 'article',
  }
}

export function buildRssXml(title, description, items = []) {
  const feedItems = items.map(normalizeFeedItem)
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>https://sabot.media/</link>
    <description>${escapeXml(description)}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${feedItems.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid>${escapeXml(item.link)}</guid>
      <pubDate>${escapeXml(item.date)}</pubDate>
      <author>${escapeXml(item.author)}</author>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.description)}</description>
    </item>`).join('\n')}
  </channel>
</rss>`
}

function groupBy(items, getter) {
  const groups = {}
  for (const item of items) {
    const keys = getter(item)
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const clean = String(key || '').trim()
      if (!clean) continue
      groups[clean] = groups[clean] || []
      groups[clean].push(item)
    }
  }
  return groups
}

export function buildRssBundle(items = []) {
  const visible = items.filter((item) => item.status === 'published' || item.workflowState === 'published' || item.publishedAt)
  const bundle = {
    'all-content.xml': buildRssXml('Sabot Media', 'All published Sabot Media content.', visible),
  }

  for (const [project, projectItems] of Object.entries(groupBy(visible, (item) => item.projects || item.primaryProject || item.categories || []))) {
    bundle[`projects/${project}.xml`] = buildRssXml(`Sabot Media / ${project}`, `Published content for ${project}.`, projectItems)
  }

  for (const [collection, collectionItems] of Object.entries(groupBy(visible, (item) => item.collections || item.collection || []))) {
    bundle[`collections/${collection}.xml`] = buildRssXml(`Sabot Media / ${collection}`, `Published content in ${collection}.`, collectionItems)
  }

  for (const [format, formatItems] of Object.entries(groupBy(visible, (item) => item.contentType || item.type || 'article'))) {
    bundle[`formats/${format}.xml`] = buildRssXml(`Sabot Media / ${format}`, `Published ${format} content.`, formatItems)
  }

  for (const [author, authorItems] of Object.entries(groupBy(visible, (item) => item.author || 'Sabot Media'))) {
    bundle[`authors/${author}.xml`] = buildRssXml(`Sabot Media / ${author}`, `Published content by ${author}.`, authorItems)
  }

  const podcasts = visible.filter((item) => String(item.contentType || item.type || '').toLowerCase().includes('podcast'))
  bundle['podcasts/all.xml'] = buildRssXml('Sabot Media Podcasts', 'Published podcast episodes from Sabot Media.', podcasts)

  return bundle
}

export function downloadRssBundle(items = []) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const blob = new Blob([JSON.stringify(buildRssBundle(items), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `sabot-rss-bundle-${stamp}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
