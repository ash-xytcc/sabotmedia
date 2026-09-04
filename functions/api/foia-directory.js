import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'

const API_BASE = 'https://api.foia.gov/api'

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: 'editor access required' }, 403)
    const apiKey = String(context.env?.FOIA_GOV_API_KEY || '').trim()
    if (!apiKey) return json({ ok: false, error: 'FOIA_GOV_API_KEY is not configured', setup: 'Create a FOIA.gov/data.gov API key and add it as a server-side environment secret. Never expose it to browser code.' }, 503)

    const url = new URL(context.request.url)
    const action = String(url.searchParams.get('action') || 'components')
    if (action === 'request-form') {
      const componentId = cleanId(url.searchParams.get('component'))
      if (!componentId) return json({ ok: false, error: 'component is required' }, 400)
      const data = await foiaFetch(`${API_BASE}/agency_components/${encodeURIComponent(componentId)}/request_form`, apiKey)
      return json({ ok: true, action, componentId, form: data })
    }
    if (action === 'component') {
      const componentId = cleanId(url.searchParams.get('component'))
      if (!componentId) return json({ ok: false, error: 'component is required' }, 400)
      const data = await foiaFetch(`${API_BASE}/agency_components/${encodeURIComponent(componentId)}?include=agency`, apiKey)
      return json({ ok: true, action, component: data })
    }
    const query = String(url.searchParams.get('q') || '').trim().slice(0, 160)
    const params = new URLSearchParams()
    params.set('include', 'agency')
    params.set('page[limit]', '50')
    params.set('fields[agency]', 'name,abbreviation')
    params.set('fields[agency_component]', 'title,abbreviation,agency,request_form,submission_method,website')
    if (query) params.set('filter[title-filter][condition][path]', 'title'), params.set('filter[title-filter][condition][operator]', 'CONTAINS'), params.set('filter[title-filter][condition][value]', query)
    const data = await foiaFetch(`${API_BASE}/agency_components?${params}`, apiKey)
    return json({ ok: true, action: 'components', query, ...normalizeComponents(data) })
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, Number(error?.status) || 502) }
}

async function foiaFetch(url, apiKey) {
  const response = await fetch(url, { headers: { 'x-api-key': apiKey, accept: 'application/vnd.api+json, application/json' }, redirect: 'follow' })
  const text = await response.text()
  let payload
  try { payload = JSON.parse(text) } catch { payload = { raw: text.slice(0, 5000) } }
  if (!response.ok) { const error = new Error(`FOIA.gov API returned ${response.status}`); error.status = response.status; error.detail = payload; throw error }
  return payload
}

function normalizeComponents(payload = {}) {
  const included = new Map((payload.included || []).map((item) => [item.id, item]))
  const components = (payload.data || []).map((item) => {
    const agencyRef = item.relationships?.agency?.data
    const agency = agencyRef ? included.get(agencyRef.id) : null
    return {
      id: item.id,
      title: item.attributes?.title || '',
      abbreviation: item.attributes?.abbreviation || '',
      agencyName: agency?.attributes?.name || '',
      agencyAbbreviation: agency?.attributes?.abbreviation || '',
      attributes: item.attributes || {},
    }
  })
  return { components }
}
function cleanId(value) { return String(value || '').trim().replace(/[^a-zA-Z0-9-]/g, '').slice(0, 120) }
function json(value,status=200){ return new Response(JSON.stringify(value,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'}}) }
