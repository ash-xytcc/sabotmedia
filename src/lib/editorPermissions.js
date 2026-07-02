import { getPublicConfigPermissions, getSavedAdminToken } from './publicConfigApi'

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

export async function getNativeContentPermissions() {
  const res = await fetch('/api/native-content', {
    method: 'OPTIONS',
    headers: {
      accept: 'application/json',
      ...authHeaders(),
    },
  })

  const data = await safeJson(res)

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `native content permissions failed: ${res.status}`)
  }

  return data
}

export async function getEditorPermissionsSnapshot() {
  const [publicConfig, nativeContent] = await Promise.all([
    getPublicConfigPermissions().catch((error) => ({
      ok: false,
      canEdit: false,
      error: String(error?.message || error),
      mode: 'unknown',
    })),
    getNativeContentPermissions().catch((error) => ({
      ok: false,
      canEdit: false,
      error: String(error?.message || error),
      mode: 'unknown',
    })),
  ])

  return {
    publicConfig,
    nativeContent,
    canEditAnything: Boolean(publicConfig?.canEdit || nativeContent?.canEdit),
  }
}
