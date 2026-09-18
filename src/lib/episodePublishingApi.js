export async function fetchEpisodePublishingState(episodeId) {
  const id = String(episodeId || '').trim()
  if (!id) return { destinations: [], jobs: [] }
  return request(`/api/episode-publishing?episodeId=${encodeURIComponent(id)}`)
}

export async function publishEpisode(episodeId, destinations, overrides = {}) {
  return request('/api/episode-publishing', {
    method: 'POST',
    body: JSON.stringify({ action: 'publish', episodeId, destinations, overrides }),
  })
}

export async function retryEpisodeDestination(episodeId, destination) {
  return request('/api/episode-publishing', {
    method: 'POST',
    body: JSON.stringify({ action: 'retry', episodeId, destination }),
  })
}

export async function syncEpisodeDestinationMetadata(episodeId, destination, override = {}) {
  return request('/api/episode-publishing', {
    method: 'POST',
    body: JSON.stringify({ action: 'syncMetadata', episodeId, destination, overrides: { [destination]: override } }),
  })
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || `episode publishing request failed: ${response.status}`)
  }
  return data
}
