export async function connectPeerTubeCredential({ baseUrl, username, password, otp = '' }) {
  return credentialRequest({ action: 'connectPeerTube', baseUrl, username, password, otp })
}

export async function savePeerTubeCredential(accessToken) {
  return credentialRequest({ action: 'setPeerTubeToken', accessToken })
}

export async function clearPeerTubeCredential() {
  return credentialRequest({ action: 'clearPeerTube' })
}

export async function clearYouTubeCredential() {
  return credentialRequest({ action: 'clearYouTube' })
}

async function credentialRequest(body) {
  const response = await fetch('/api/episode-publishing-credentials', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) throw new Error(data?.error || `publishing credential request failed: ${response.status}`)
  return data
}
