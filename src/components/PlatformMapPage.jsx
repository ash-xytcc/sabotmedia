import { Navigate } from 'react-router-dom'
import { adminRoutes } from '../routing/routes'

export function PlatformMapPage() {
  return <Navigate to={adminRoutes.dashboard} replace />
}
