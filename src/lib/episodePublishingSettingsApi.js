export async function loadEpisodePublishingSettings() {
  const response = await fetch('/api/episode-publishing-settings', {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1') {
    throw new Error(data?.error || `publishing settings request failed: ${response.status}`)
  }
  return data
}

export async function saveEpisodePublishingSettings(settings) {
  const response = await fetch('/api/episode-publishing-settings', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ settings }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1') {
    throw new Error(data?.error || `publishing settings save failed: ${response.status}`)
  }
  return data
}
