export async function resolvePublicSitePermission(context) {
  const token = context?.env?.SABOT_ADMIN_TOKEN

  const authHeader = context.request.headers.get('authorization') || ''
  const headerToken = context.request.headers.get('x-sabot-admin-token') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (token) {
    const canEdit = bearerToken === token || headerToken === token
    return {
      canEdit,
      mode: 'token',
      reason: canEdit ? 'token matched' : 'valid admin token required',
    }
  }

  return {
    canEdit: false,
    mode: token ? 'token' : 'locked',
    reason: token ? 'valid admin token required' : 'editing locked; set SABOT_ADMIN_TOKEN',
  }
}
