async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) throw new Error(data?.error || `editorial discussion request failed: ${response.status}`)
  return data
}

export function fetchEditorialComments(nativeId) {
  return requestJson(`/api/editorial-comments?nativeId=${encodeURIComponent(nativeId)}`)
}

export function createEditorialComment({ nativeId, body, kind = 'comment' }) {
  return requestJson('/api/editorial-comments', {
    method: 'POST',
    body: JSON.stringify({ nativeId, body, kind }),
  })
}
