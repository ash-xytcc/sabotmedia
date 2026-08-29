const STATUS_PAGE_URL = 'https://kuma.accol.li/status/aimonitor'
const STATUS_API_URL = 'https://kuma.accol.li/api/status-page/aimonitor'
const HEARTBEAT_API_URL = 'https://kuma.accol.li/api/status-page/heartbeat/aimonitor'

export async function onRequestGet() {
  try {
    const [page, heartbeat] = await Promise.all([
      fetchJson(STATUS_API_URL),
      fetchJson(HEARTBEAT_API_URL),
    ])

    const groups = Array.isArray(page?.publicGroupList) ? page.publicGroupList : []
    const heartbeatList = heartbeat?.heartbeatList && typeof heartbeat.heartbeatList === 'object' ? heartbeat.heartbeatList : {}
    const uptimeList = heartbeat?.uptimeList && typeof heartbeat.uptimeList === 'object' ? heartbeat.uptimeList : {}

    const monitors = []
    for (const group of groups) {
      for (const monitor of Array.isArray(group?.monitorList) ? group.monitorList : []) {
        const id = String(monitor?.id ?? '')
        if (!id) continue
        const beats = Array.isArray(heartbeatList[id]) ? heartbeatList[id] : []
        const latest = beats.length ? beats[beats.length - 1] : null
        const statusCode = Number(latest?.status)
        monitors.push({
          id,
          group: String(group?.name || ''),
          name: String(monitor?.name || `Monitor ${id}`),
          type: String(monitor?.type || ''),
          statusCode: Number.isFinite(statusCode) ? statusCode : null,
          status: statusLabel(statusCode),
          message: String(latest?.msg || ''),
          ping: Number.isFinite(Number(latest?.ping)) ? Number(latest.ping) : null,
          lastCheckedAt: String(latest?.time || ''),
          uptime24h: resolveUptime24h(uptimeList, id),
        })
      }
    }

    const overall = aggregateStatus(monitors)
    return json({
      ok: true,
      source: STATUS_PAGE_URL,
      checkedAt: new Date().toISOString(),
      overall,
      title: String(page?.config?.title || page?.config?.name || 'A/I Monitor'),
      description: String(page?.config?.description || ''),
      monitors,
    }, 200, 'public, max-age=45, s-maxage=60, stale-while-revalidate=120')
  } catch (error) {
    return json({
      ok: false,
      source: STATUS_PAGE_URL,
      checkedAt: new Date().toISOString(),
      overall: 'unknown',
      monitors: [],
      error: String(error?.message || error),
    }, 502, 'public, max-age=15, s-maxage=15')
  }
}

async function fetchJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6500)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'SabotMedia-CampaignMonitor/1.0',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`monitor endpoint returned ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

function aggregateStatus(monitors) {
  if (!monitors.length) return 'unknown'
  const codes = monitors.map((monitor) => monitor.statusCode)
  if (codes.some((code) => code === 0)) return 'down'
  if (codes.some((code) => code === 2 || code == null)) return 'degraded'
  if (codes.some((code) => code === 3)) return 'maintenance'
  if (codes.every((code) => code === 1)) return 'operational'
  return 'unknown'
}

function statusLabel(code) {
  if (code === 1) return 'operational'
  if (code === 0) return 'down'
  if (code === 2) return 'pending'
  if (code === 3) return 'maintenance'
  return 'unknown'
}

function resolveUptime24h(uptimeList, id) {
  const candidates = [`${id}_24`, `${id}_24h`, `${id}_1d`]
  for (const key of candidates) {
    const value = Number(uptimeList[key])
    if (Number.isFinite(value)) return Math.max(0, Math.min(1, value))
  }
  return null
}

function json(data, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'access-control-allow-origin': '*',
    },
  })
}
