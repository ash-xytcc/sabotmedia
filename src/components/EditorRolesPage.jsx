import { Navigate } from 'react-router-dom'
import { adminRoutes } from '../routing/routes'

export function EditorRolesPage() {
  return <Navigate to={adminRoutes.users} replace />
}
