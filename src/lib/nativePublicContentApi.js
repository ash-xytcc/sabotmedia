import { getSavedAdminToken } from './publicConfigApi'

function buildAuthHeaders() {
  const token = getSavedAdminToken()
  if (!token) return {}
  return {
    authorization: `Bearer ${token}`,
    'x-sabot-admin-token': token,
  }
}

async function safeJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchNativeEntries(params = {}) {
  const url = new URL('/api/native-content', window.location.origin)

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const res = await fetch(url.pathname + url.search, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...buildAuthHeaders(),
    },
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `native content fetch failed: ${res.status}`)
  }

  return data
}

export async function saveNativeEntry(item, revisionNote = 'save') {
  const res = await fetch('/api/native-content', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify({ item, revisionNote }),
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `native content save failed: ${res.status}`)
  }

  return data
}

export async function removeNativeEntry(idOrSlug) {
  const url = new URL('/api/native-content', window.location.origin)
  url.searchParams.set('id', idOrSlug)

  const res = await fetch(url.pathname + url.search, {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      ...buildAuthHeaders(),
    },
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `native content delete failed: ${res.status}`)
  }

  return data
}

export async function fetchNativeRevisions(params = {}) {
  const url = new URL('/api/native-content-revisions', window.location.origin)

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const res = await fetch(url.pathname + url.search, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...buildAuthHeaders(),
    },
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `native revisions fetch failed: ${res.status}`)
  }

  return data
}

export async function restoreNativeRevision(revisionId) {
  const res = await fetch('/api/native-content-revisions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify({ revisionId }),
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `native revision restore failed: ${res.status}`)
  }

  return data
}
