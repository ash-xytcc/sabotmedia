export async function resolvePublicSitePermission(context) {
  const token = context?.env?.SABOT_ADMIN_TOKEN
  const openEdit = String(context?.env?.PUBLIC_CONFIG_OPEN_EDIT || '').toLowerCase() === 'true'

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

  if (openEdit) {
    return {
      canEdit: true,
      mode: 'open',
      reason: 'PUBLIC_CONFIG_OPEN_EDIT=true',
    }
  }

  return {
    canEdit: false,
    mode: 'locked',
    reason: 'editing locked; set SABOT_ADMIN_TOKEN or PUBLIC_CONFIG_OPEN_EDIT=true',
  }
}
