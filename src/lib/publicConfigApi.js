export async function savePublicConfigPayload(payload) {
  const res = await fetch('/api/public-site-config', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
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
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
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
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
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
