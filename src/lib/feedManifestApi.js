export async function loadFeedManifest() {
  const response = await fetch('/api/feed-manifest', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1' || !Array.isArray(data.files)) {
    throw new Error(data?.error || `live feed manifest request failed: ${response.status}`)
  }
  return {
    ...data,
    files: data.files,
    terms: data.terms && typeof data.terms === 'object' ? data.terms : {},
  }
}

export function downloadFeedManifest(manifest) {
  if (!manifest?.files || !Array.isArray(manifest.files)) throw new Error('No live feed manifest is loaded')
  const payload = {
    exportedAt: new Date().toISOString(),
    basePath: manifest.basePath || '/feeds',
    files: manifest.files,
    itemCount: Number(manifest.itemCount || 0),
    podcastItemCount: Number(manifest.podcastItemCount || 0),
    terms: manifest.terms || {},
    settingsUpdatedAt: manifest.settingsUpdatedAt || '',
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `sabot-live-feed-manifest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
