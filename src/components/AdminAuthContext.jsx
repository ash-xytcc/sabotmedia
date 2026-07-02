import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getEditorPermissionsSnapshot } from '../lib/editorPermissions'
import { getSavedAdminToken, setSavedAdminToken } from '../lib/publicConfigApi'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => getSavedAdminToken())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(Boolean(token))
  const [authError, setAuthError] = useState('')
  const [permissions, setPermissions] = useState(null)

  const validateSavedToken = useCallback(async () => {
    const currentToken = getSavedAdminToken()
    setToken(currentToken)

    if (!currentToken) {
      setIsAuthenticated(false)
      setPermissions(null)
      setAuthError('')
      setIsChecking(false)
      return false
    }

    try {
      setIsChecking(true)
      setAuthError('')
      const snapshot = await getEditorPermissionsSnapshot()
      const allowed = Boolean(snapshot?.canEditAnything)
      setPermissions(snapshot)
      setIsAuthenticated(allowed)
      if (!allowed) setAuthError(snapshot?.publicConfig?.error || snapshot?.nativeContent?.error || 'Valid admin token required.')
      return allowed
    } catch (error) {
      setPermissions(null)
      setIsAuthenticated(false)
      setAuthError(String(error?.message || error))
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    validateSavedToken()
  }, [validateSavedToken])

  const login = useCallback(async (nextToken) => {
    setSavedAdminToken(String(nextToken || '').trim())
    const ok = await validateSavedToken()
    if (!ok) {
      setSavedAdminToken('')
      setToken('')
    }
    return ok
  }, [validateSavedToken])

  const logout = useCallback(() => {
    setSavedAdminToken('')
    setToken('')
    setPermissions(null)
    setIsAuthenticated(false)
    setAuthError('')
    setIsChecking(false)
  }, [])

  const value = useMemo(() => ({
    token,
    isAuthenticated,
    isChecking,
    authError,
    permissions,
    login,
    logout,
    refreshAuth: validateSavedToken,
  }), [authError, isAuthenticated, isChecking, login, logout, permissions, token, validateSavedToken])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return ctx
}
