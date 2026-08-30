async function safeJson(response) {
  try { return await response.json() } catch { return null }
}

export async function loadCampaign(slug = 'autistici-inventati', { includeDrafts = false } = {}) {
  const params = new URLSearchParams({ slug })
  if (includeDrafts) params.set('includeDrafts', '1')
  const response = await fetch(`/api/campaigns?${params.toString()}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await safeJson(response)
  if (!response.ok || !data?.ok || !data?.item) throw new Error(data?.error || `campaign load failed: ${response.status}`)
  return data.item
}

export async function loadCampaigns({ includeDrafts = false } = {}) {
  const params = new URLSearchParams()
  if (includeDrafts) params.set('includeDrafts', '1')
  const query = params.toString()
  const response = await fetch(`/api/campaigns${query ? `?${query}` : ''}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await safeJson(response)
  if (!response.ok || !data?.ok || !Array.isArray(data?.items)) throw new Error(data?.error || `campaign list failed: ${response.status}`)
  return data.items
}

export async function saveCampaign(item) {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ item }),
  })
  const data = await safeJson(response)
  if (!response.ok || !data?.ok || !data?.item) throw new Error(data?.error || `campaign save failed: ${response.status}`)
  return data.item
}

export async function loadCampaignMonitor() {
  const response = await fetch('/api/campaign-monitor', {
    method: 'GET',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await safeJson(response)
  if (!data) throw new Error(`campaign monitor failed: ${response.status}`)
  if (!response.ok || !data.ok) return data
  return data
}

export async function loadCampaignCoverage(options = {}) {
  const params = new URLSearchParams({ campaign: 'autistici-inventati' })
  if (options.q) params.set('q', options.q)
  if (options.language) params.set('language', options.language)
  if (options.outlet) params.set('outlet', options.outlet)
  if (options.page) params.set('page', String(options.page))
  if (options.limit) params.set('limit', String(options.limit))
  const response = await fetch(`/api/campaign-coverage?${params.toString()}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await safeJson(response)
  if (!response.ok || !data?.ok || !Array.isArray(data.items)) throw new Error(data?.error || `campaign coverage archive failed: ${response.status}`)
  return data
}
