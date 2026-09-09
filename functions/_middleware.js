import {
  ADMIN_PREFIXES,
  isAdminRoutePath,
  isPublicCampaignPath,
  isPublicSpaPath,
  onRequest as coreOnRequest,
} from './_middleware-core.js'

export { ADMIN_PREFIXES, isAdminRoutePath, isPublicCampaignPath, isPublicSpaPath }

const STATIC_NOSCRIPT = /<noscript\b[^>]*\bdata-sabot-static-noscript(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*>[\s\S]*?<\/noscript>/gi

export async function onRequest(context) {
  const response = await coreOnRequest(context)
  if (!response || String(context?.request?.method || 'GET').toUpperCase() === 'HEAD') return response

  const contentType = String(response.headers?.get('content-type') || '')
  if (!contentType.includes('text/html')) return response

  const html = await response.text()
  if (!html.includes('data-sabot-static-noscript') || !html.includes('data-sabot-plain-html')) {
    return cloneHtmlResponse(response, html)
  }

  // Dynamic plain-HTML responses are authoritative. The generated SPA shell may
  // still contain a route snapshot, and rendering both <noscript> blocks makes
  // browsers show the wrong page first (most visibly, the homepage on /post/*).
  const normalized = html.replace(STATIC_NOSCRIPT, '')
  return cloneHtmlResponse(response, normalized)
}

function cloneHtmlResponse(response, html) {
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
