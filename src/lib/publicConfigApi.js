export async function savePublicConfigPayload(payload) {
  const res = await fetch('/api/public-site-config', {
    method: 'PUT',
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
    headers: {
      'accept': 'application/json',
    },
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `load failed: ${res.status}`)
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
