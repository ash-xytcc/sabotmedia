import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'

function getReturnTo(search = '') {
  const params = new URLSearchParams(search)
  const value = params.get('returnTo') || '/wp-admin'
  if (!value.startsWith('/') || value.startsWith('//')) return '/wp-admin'
  return value
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, isChecking, login, authError } = useAdminAuth()
  const [token, setToken] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const returnTo = useMemo(() => getReturnTo(location.search), [location.search])

  if (isAuthenticated) return <Navigate to={returnTo} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (!token.trim()) {
      setSubmitError('Enter the admin token.')
      return
    }

    setIsSubmitting(true)
    const ok = await login(token)
    setIsSubmitting(false)

    if (ok) {
      navigate(returnTo, { replace: true })
      return
    }

    setSubmitError('That token was not accepted.')
  }

  return (
    <main className="page admin-login-page">
      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <p className="admin-login-panel__eyebrow">Sabot Media</p>
        <h1 id="admin-login-title">Editor Login</h1>
        <p>Enter the admin token to access backstage tools and live editing.</p>
        <form onSubmit={handleSubmit}>
          <label>
            <span>Admin token</span>
            <input
              autoComplete="current-password"
              autoFocus
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          {submitError || authError ? <p className="admin-login-panel__error">{submitError || authError}</p> : null}
          <button className="button button--primary" type="submit" disabled={isSubmitting || isChecking}>
            {isSubmitting || isChecking ? 'Checking...' : 'Log in'}
          </button>
        </form>
      </section>
    </main>
  )
}
