const API = '/api/campaign-signatures'

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { accept: 'application/json', ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) throw new Error(data?.error || `Request failed (${response.status})`)
  return data
}

export async function loadCampaignSignatures(campaign) {
  return request(`${API}?action=public&campaign=${encodeURIComponent(campaign)}`)
}

export async function submitCampaignSignature(campaign, payload) {
  return request(`${API}?action=submit`, { method: 'POST', body: JSON.stringify({ campaign, ...payload }) })
}

export async function loadManagedSignature(token) {
  return request(`${API}?action=manage&token=${encodeURIComponent(token)}`)
}

export async function updateManagedSignature(token, patch) {
  return request(`${API}?action=manage`, { method: 'POST', body: JSON.stringify({ token, patch }) })
}

export async function loadSignatureQueue(campaign, status = 'all') {
  return request(`${API}?action=queue&campaign=${encodeURIComponent(campaign)}&status=${encodeURIComponent(status)}`)
}

export async function moderateCampaignSignature(campaign, id, moderationAction, patch = {}) {
  return request(`${API}?action=moderate`, { method: 'POST', body: JSON.stringify({ campaign, id, moderationAction, patch }) })
}

export async function bulkModerateCampaignSignatures(campaign, ids, moderationAction) {
  return request(`${API}?action=bulk`, { method: 'POST', body: JSON.stringify({ campaign, ids, moderationAction }) })
}

export async function resendCampaignSignatureVerification(campaign, id) {
  return request(`${API}?action=resend`, { method: 'POST', body: JSON.stringify({ campaign, id }) })
}

export function campaignSignatureExportUrl(campaign) {
  return `${API}?action=export&campaign=${encodeURIComponent(campaign)}`
}
