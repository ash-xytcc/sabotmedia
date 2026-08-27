export async function fetchAnalyticsReport(days = 30) {
  const response = await fetch(`/api/analytics/report?days=${encodeURIComponent(days)}`, {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) throw new Error(data?.error || `analytics request failed: ${response.status}`)
  return data
}

export function trackPageView({ path, title, referrer }) {
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return
  if (!isTrackablePath(path)) return

  const sessionId = getSessionId()
  const key = `sabot-analytics-last:${path}`
  const last = Number(sessionStorage.getItem(key) || 0)
  if (Date.now() - last < 30_000) return
  sessionStorage.setItem(key, String(Date.now()))

  const params = new URLSearchParams(window.location.search)
  const payload = JSON.stringify({
    sessionId,
    path,
    title,
    referrer,
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
  })
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon('/api/analytics/collect', new Blob([payload], { type: 'application/json' }))
    if (sent) return
  }
  fetch('/api/analytics/collect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {})
}

function getSessionId() {
  const key = 'sabot-analytics-session-v1'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

function isTrackablePath(path) {
  return !/^\/(?:admin|wp-admin|login|logout|printlab|audiolab|api|native-|posts|post-new|add-new|media|settings|tools|users|pages|customize|site-editor|analytics|audit-log|qa|review)(?:\/|$)/.test(String(path || ''))
}
