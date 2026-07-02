import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'
import mastheadLogo from '../assets/sabot-masthead-logo.png'
import { editableContentRegistry } from '../lib/editableContentRegistry'
import { getConfiguredText } from '../lib/publicConfig'
import { useResolvedConfig } from '../lib/useResolvedConfig'

function getReturnTo(search = '') {
  const params = new URLSearchParams(search)
  const value = params.get('returnTo') || params.get('next') || '/wp-admin'
  if (!value.startsWith('/') || value.startsWith('//')) return '/wp-admin'
  return value
}

export function LoginPage() {
  const loginCopy = editableContentRegistry.login
  const resolvedConfig = useResolvedConfig()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, isChecking, login, authError } = useAdminAuth()
  const [token, setToken] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const returnTo = useMemo(() => getReturnTo(location.search), [location.search])
  const title = getConfiguredText(resolvedConfig, loginCopy.title.field, loginCopy.title.defaultText)
  const body = getConfiguredText(resolvedConfig, loginCopy.body.field, loginCopy.body.defaultText)
  const tokenLabel = getConfiguredText(resolvedConfig, loginCopy.tokenLabel.field, loginCopy.tokenLabel.defaultText)
  const emptyError = getConfiguredText(resolvedConfig, loginCopy.emptyError.field, loginCopy.emptyError.defaultText)
  const rejectedError = getConfiguredText(resolvedConfig, loginCopy.rejectedError.field, loginCopy.rejectedError.defaultText)
  const submitLabel = getConfiguredText(resolvedConfig, loginCopy.submitLabel.field, loginCopy.submitLabel.defaultText)
  const checkingLabel = getConfiguredText(resolvedConfig, loginCopy.checkingLabel.field, loginCopy.checkingLabel.defaultText)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (!token.trim()) {
      setSubmitError(emptyError)
      return
    }

    setIsSubmitting(true)
    const ok = await login(token)
    setIsSubmitting(false)

    if (ok) {
      navigate(returnTo, { replace: true })
      return
    }

    setSubmitError(rejectedError)
  }

  return (
    <main className="page admin-login-page">
      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <img className="admin-login-panel__logo" src={mastheadLogo} alt="Sabot Media" />
        {isAuthenticated ? (
          <>
            <h1 id="admin-login-title">You are logged in</h1>
            <p>Your editor session is active.</p>
            <div className="admin-login-panel__actions">
              <Link className="button button--primary" to={returnTo}>Continue</Link>
              <Link className="button" to="/wp-admin">Dashboard</Link>
              <Link className="button" to="/logout">Logout</Link>
            </div>
          </>
        ) : (
          <>
            <h1 id="admin-login-title">{title}</h1>
            <p>{body}</p>
            <form onSubmit={handleSubmit}>
              <label>
                <span>{tokenLabel}</span>
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
                {isSubmitting || isChecking ? checkingLabel : submitLabel}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
