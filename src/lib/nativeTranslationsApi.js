export async function loadNativeTranslations({ slug, contentId, includeUnpublished = false, syncWeblate = true } = {}) {
  // Editors should not have to manually shuttle translation files into Sabot.
  // On the A/I translation dashboard, sync the current public Weblate component
  // first, then load D1. A transient Weblate failure never blocks access to
  // already-saved translation records, but it is returned for diagnostics.
  let weblateSync = null
  if (syncWeblate && includeUnpublished && slug === 'the-server-called-paranoia') {
    try {
      const syncResponse = await fetch('/api/weblate-sync', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { accept: 'application/json' },
      })
      const syncData = await syncResponse.json().catch(() => ({}))
      if (!syncResponse.ok || !syncData?.ok) {
        weblateSync = { ok: false, error: syncData?.error || `Weblate sync failed (${syncResponse.status})` }
        console.warn('[SabotPress] Weblate sync unavailable:', weblateSync.error)
      } else {
        weblateSync = syncData
      }
    } catch (error) {
      weblateSync = { ok: false, error: String(error?.message || error) }
      console.warn('[SabotPress] Weblate sync unavailable:', weblateSync.error)
    }
  }

  const params = new URLSearchParams()
  if (slug) params.set('slug', slug)
  if (contentId) params.set('contentId', contentId)
  if (includeUnpublished) params.set('includeUnpublished', '1')
  const response = await fetch(`/api/native-translations?${params.toString()}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Translation request failed (${response.status})`)
  return weblateSync ? { ...data, weblateSync } : data
}

export async function exportWeblateSource({ slug, contentId } = {}) {
  const params = new URLSearchParams({ format: 'weblate-source' })
  if (slug) params.set('slug', slug)
  if (contentId) params.set('contentId', contentId)
  const response = await fetch(`/api/native-translations?${params.toString()}`, { headers: { accept: 'application/json' }, credentials: 'same-origin' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.ok || !data?.bundle) throw new Error(data?.error || `Source export failed (${response.status})`)
  return data.bundle
}

export async function syncWeblateTranslations() {
  const response = await fetch('/api/weblate-sync', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Weblate sync failed (${response.status})`)
  return data
}

export async function saveNativeTranslation(payload = {}) {
  const response = await fetch('/api/native-translations', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Translation save failed (${response.status})`)
  return data.translation
}

export async function deleteNativeTranslation({ contentId, languageCode }) {
  const params = new URLSearchParams({ contentId: String(contentId || ''), languageCode: String(languageCode || '') })
  const response = await fetch(`/api/native-translations?${params.toString()}`, { method: 'DELETE', credentials: 'same-origin', headers: { accept: 'application/json' } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Translation deletion failed (${response.status})`)
  return data
}

export function unwrapWeblateBundle(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Translation file must contain a JSON object')
  if (value.bundle && typeof value.bundle === 'object' && !Array.isArray(value.bundle)) return value.bundle
  return value
}
