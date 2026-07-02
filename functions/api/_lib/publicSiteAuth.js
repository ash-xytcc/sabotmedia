export async function resolvePublicSitePermission(context) {
  const token = context?.env?.SABOT_ADMIN_TOKEN
  const trustAccessHeaders = String(context?.env?.SABOT_TRUST_CF_ACCESS || '').toLowerCase() === 'true'
  const accessEmail = getCloudflareAccessEmail(context?.request)

  const authHeader = context.request.headers.get('authorization') || ''
  const headerToken = context.request.headers.get('x-sabot-admin-token') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (trustAccessHeaders && accessEmail) {
    return {
      canEdit: true,
      mode: 'cloudflare-access',
      reason: 'Cloudflare Access identity present',
      actor: accessEmail,
    }
  }

  if (token) {
    const canEdit = bearerToken === token || headerToken === token
    return {
      canEdit,
      mode: 'token',
      reason: canEdit ? 'token matched' : 'valid admin token required',
      actor: canEdit ? 'admin-token' : 'anonymous',
    }
  }

  return {
    canEdit: false,
    mode: token ? 'token' : 'locked',
    reason: token ? 'valid admin token required' : 'editing locked; set SABOT_ADMIN_TOKEN',
    actor: 'anonymous',
  }
}

export function getCloudflareAccessEmail(request) {
  return String(request?.headers?.get('cf-access-authenticated-user-email') || '').trim()
}
