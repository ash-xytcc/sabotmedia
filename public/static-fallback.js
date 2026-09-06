(() => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return

  const liveFetch = window.fetch.bind(window)
  const snapshotPath = '/static-fallback.json'
  let snapshotPromise = null

  function isPublicPage() {
    const path = window.location.pathname || '/'
    return path === '/' || /^\/(?:post|piece|archive|search|about|security|contact|submit|support|press|feeds|collections|publications|reader|updates|project|projects|campaigns|investigations)(?:\/|$)/i.test(path)
  }

  function requestUrl(input) {
    try {
      const raw = typeof input === 'string' || input instanceof URL ? input : input?.url
      return new URL(raw, window.location.origin)
    } catch {
      return null
    }
  }

  function requestMethod(input, init) {
    return String(init?.method || input?.method || 'GET').toUpperCase()
  }

  function supportsFallback(url) {
    if (!url || url.origin !== window.location.origin) return false
    return new Set([
      '/api/native-content',
      '/api/public-site-config',
      '/api/campaigns',
      '/api/collections',
      '/api/publications',
    ]).has(url.pathname)
  }

  async function loadSnapshot() {
    if (!snapshotPromise) {
      snapshotPromise = liveFetch(snapshotPath, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { accept: 'application/json' },
      })
        .then(async (response) => {
          if (!response.ok) return null
          const data = await response.json().catch(() => null)
          return data?.ready === true ? data : null
        })
        .catch(() => null)
    }
    return snapshotPromise
  }

  function findByIdOrSlug(items, url) {
    const key = String(url.searchParams.get('id') || url.searchParams.get('slug') || '').trim()
    if (!key) return null
    const lower = key.toLowerCase()
    return (items || []).find((item) => String(item?.id || '').toLowerCase() === lower || String(item?.slug || '').toLowerCase() === lower) || null
  }

  function syntheticPayload(url, snapshot) {
    if (!snapshot) return null

    if (url.pathname === '/api/native-content') {
      let items = Array.isArray(snapshot.nativeContent?.items) ? snapshot.nativeContent.items : []
      const status = String(url.searchParams.get('status') || '')
      const target = String(url.searchParams.get('target') || '')
      const workflowState = String(url.searchParams.get('workflowState') || '')
      if (status) {
        items = items.filter((item) => status === 'published'
          ? ['published', 'scheduled'].includes(String(item?.status || ''))
          : String(item?.status || '') === status)
      }
      if (target) items = items.filter((item) => String(item?.target || '') === target)
      if (workflowState) items = items.filter((item) => String(item?.workflowState || '') === workflowState)
      if (url.searchParams.has('id') || url.searchParams.has('slug')) {
        return { ok: true, mode: 'd1', fallback: true, item: findByIdOrSlug(items, url) }
      }
      return { ok: true, mode: 'd1', fallback: true, items }
    }

    if (url.pathname === '/api/public-site-config') {
      const stored = snapshot.publicSiteConfig || {}
      return {
        ok: true,
        mode: 'd1',
        fallback: true,
        scope: stored.scope || 'global',
        updatedAt: stored.updatedAt || '',
        version: stored.version || 0,
        schemaVersion: stored.schemaVersion || 0,
        config: stored.config || {},
      }
    }

    if (url.pathname === '/api/campaigns') {
      const items = Array.isArray(snapshot.campaigns?.items) ? snapshot.campaigns.items : []
      if (url.searchParams.has('id') || url.searchParams.has('slug')) {
        const requested = findByIdOrSlug(items, url)
        const slug = String(requested?.slug || url.searchParams.get('slug') || '')
        const detailed = slug ? snapshot.campaigns?.details?.[slug] : null
        return { ok: true, mode: 'd1', fallback: true, item: detailed || requested || null }
      }
      return { ok: true, mode: 'd1', fallback: true, items }
    }

    if (url.pathname === '/api/collections') {
      const items = Array.isArray(snapshot.collections?.items) ? snapshot.collections.items : []
      if (url.searchParams.has('id') || url.searchParams.has('slug')) {
        return { ok: true, mode: 'd1', fallback: true, item: findByIdOrSlug(items, url) }
      }
      return { ok: true, mode: 'd1', fallback: true, items }
    }

    if (url.pathname === '/api/publications') {
      let items = Array.isArray(snapshot.publications?.items) ? snapshot.publications.items : []
      const status = String(url.searchParams.get('status') || '')
      if (status) items = items.filter((item) => String(item?.status || '') === status)
      if (url.searchParams.has('id') || url.searchParams.has('slug')) {
        return { ok: true, mode: 'd1', fallback: true, item: findByIdOrSlug(items, url) }
      }
      return { ok: true, mode: 'd1', fallback: true, items }
    }

    return null
  }

  async function fallbackResponse(url) {
    const snapshot = await loadSnapshot()
    const payload = syntheticPayload(url, snapshot)
    if (!payload) return null
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-sabot-static-fallback': '1',
      },
    })
  }

  async function liveResponseNeedsFallback(response) {
    const contentType = String(response?.headers?.get('content-type') || '').toLowerCase()
    if (!contentType.includes('application/json')) return true
    if (response.status === 402 || response.status === 429 || response.status >= 500) return true
    if (!response.ok) return false
    const data = await response.clone().json().catch(() => null)
    return data?.ok === false && data?.mode === 'unavailable'
  }

  window.fetch = async function sabotFallbackFetch(input, init) {
    const url = requestUrl(input)
    if (!isPublicPage() || requestMethod(input, init) !== 'GET' || !supportsFallback(url)) {
      return liveFetch(input, init)
    }

    try {
      const response = await liveFetch(input, init)
      if (!(await liveResponseNeedsFallback(response))) return response
      return (await fallbackResponse(url)) || response
    } catch (error) {
      const fallback = await fallbackResponse(url)
      if (fallback) return fallback
      throw error
    }
  }
})()
