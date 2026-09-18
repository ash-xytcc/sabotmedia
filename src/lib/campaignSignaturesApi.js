const API = '/api/campaign-signatures'
const PUBLIC_WRITE_API = '/campaign-signatures-public'

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: options.credentials || 'same-origin', ...options, headers: { accept: 'application/json', ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) throw new Error(data?.error || `Request failed (${response.status})`)
  return data
}

// Public signature actions must not depend on the editor/admin session cookie.
// Anonymous writes use a dedicated public route because the global middleware
// deliberately protects arbitrary write requests under /api. The signature
// handler itself still enforces same-origin, rate limiting, email verification,
// moderation, and management-token authorization.
export async function loadCampaignSignatures(campaign) {
  return request(`${API}?action=public&campaign=${encodeURIComponent(campaign)}`, { credentials: 'omit' })
}

export async function submitCampaignSignature(campaign, payload) {
  return request(`${PUBLIC_WRITE_API}?action=submit`, { method: 'POST', credentials: 'omit', body: JSON.stringify({ campaign, ...payload }) })
}

export async function loadManagedSignature(token) {
  return request(`${API}?action=manage&token=${encodeURIComponent(token)}`, { credentials: 'omit' })
}

export async function updateManagedSignature(token, patch) {
  return request(`${PUBLIC_WRITE_API}?action=manage`, { method: 'POST', credentials: 'omit', body: JSON.stringify({ token, patch }) })
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
