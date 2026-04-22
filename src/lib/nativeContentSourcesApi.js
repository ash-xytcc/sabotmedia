import { getSavedAdminToken } from './publicConfigApi'

function authHeaders() {
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

export async function fetchNativeSources(nativeContentId) {
  const url = new URL('/api/native-content-sources', window.location.origin)
  url.searchParams.set('nativeContentId', nativeContentId)

  const res = await fetch(url.pathname + url.search, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...authHeaders(),
    },
  })

  const data = await safeJson(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `native sources fetch failed: ${res.status}`)
  }
  return data
}

export async function saveNativeSource(record) {
  const res = await fetch('/api/native-content-sources', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ record }),
  })

  const data = await safeJson(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `native source save failed: ${res.status}`)
  }
  return data
}

export async function removeNativeSource(id) {
  const url = new URL('/api/native-content-sources', window.location.origin)
  url.searchParams.set('id', id)

  const res = await fetch(url.pathname + url.search, {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      ...authHeaders(),
    },
  })

  const data = await safeJson(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `native source delete failed: ${res.status}`)
  }
  return data
}
