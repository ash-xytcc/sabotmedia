const TOKEN_KEY = 'sabot_admin_token'

export function getSavedAdminToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setSavedAdminToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token)
    } else {
      window.localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // ignore
  }
}

function buildAuthHeaders() {
  const token = getSavedAdminToken()

  if (!token) return {}

  return {
    authorization: `Bearer ${token}`,
    'x-sabot-admin-token': token,
  }
}

export async function savePublicConfigPayload(payload) {
  const res = await fetch('/api/public-site-config', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify(payload),
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `save failed: ${res.status}`)
  }

  return data
}

export async function loadPublicConfigPayload() {
  const res = await fetch('/api/public-site-config', {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...buildAuthHeaders(),
    },
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `load failed: ${res.status}`)
  }

  return data
}

export async function getPublicConfigPermissions() {
  const res = await fetch('/api/public-site-config', {
    method: 'OPTIONS',
    headers: {
      accept: 'application/json',
      ...buildAuthHeaders(),
    },
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `permissions failed: ${res.status}`)
  }

  return data
}

async function safeJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}
