import { useMemo, useState } from 'react'
import { AdminFrame } from './AdminRail'
import { loadPublicConfigPayload } from '../lib/publicConfigApi'
import { fetchNativeEntries } from '../lib/nativePublicContentApi'

const CORE_ROUTES = [
  ['Home', '/'],
  ['Archive', '/archive'],
  ['Projects', '/projects'],
  ['About', '/about'],
  ['Contact', '/contact'],
  ['Submit', '/submit'],
  ['Support', '/support'],
  ['Security', '/security'],
  ['Missing page', '/qa-missing-route'],
  ['Admin dashboard', '/wp-admin'],
  ['Posts admin', '/wp-admin/posts'],
  ['Media admin', '/wp-admin/media'],
  ['Printlab admin', '/wp-admin/printlab'],
]

const MANUAL_STEPS = [
  'Open the site in a fresh incognito window and confirm no admin toolbar appears.',
  'Visit /wp-admin while logged out and confirm it redirects to /login.',
  'Log in, reload, and confirm the editor session survives refresh.',
  'Open /archive, click a post, and confirm the page starts at the top.',
  'Open /piece/{known-slug} and confirm it redirects to /post/{known-slug}.',
  'Open a missing /post/{bad-slug} and confirm the friendly not-found page appears.',
  'Open a missing /project/{bad-slug} and confirm the friendly not-found page appears.',
  'Run a keyboard pass: Tab reaches skip link, nav, cards, buttons, and forms with visible focus.',
  'Print a public article and confirm controls are hidden in browser print preview.',
  'Save an editable public page change, reload, and confirm it persists.',
  'Log out and confirm write actions reject missing session.',
]

export function AdminQaPage() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const routeRows = useMemo(() => CORE_ROUTES, [])

  async function exportSiteConfig() {
    try {
      setStatus('exporting site config')
      setError('')
      const payload = await loadPublicConfigPayload()
      downloadJson('sabot-site-config-export.json', payload)
      setStatus('site config exported')
    } catch (err) {
      setError(String(err?.message || err))
      setStatus('error')
    }
  }

  async function exportNativeContent() {
    try {
      setStatus('exporting native content')
      setError('')
      const payload = await fetchNativeEntries({ includeFuture: 1 })
      downloadJson('sabot-native-content-export.json', payload)
      setStatus('native content exported')
    } catch (err) {
      setError(String(err?.message || err))
      setStatus('error')
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen admin-qa-page">
        <div className="wp-screen-header">
          <h1>QA Checklist</h1>
          <span className="description">Status: {status}</span>
        </div>

        {error ? <div className="wp-notice wp-notice--error"><p>{error}</p></div> : null}

        <section className="wp-meta-box admin-qa-card">
          <h2>Core Routes</h2>
          <div className="admin-qa-route-grid">
            {routeRows.map(([label, path]) => (
              <a key={path} href={path} target="_blank" rel="noreferrer">
                <span>{label}</span>
                <code>{path}</code>
              </a>
            ))}
          </div>
        </section>

        <section className="wp-meta-box admin-qa-card">
          <h2>Manual Test Steps</h2>
          <ol className="admin-qa-steps">
            {MANUAL_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="wp-meta-box admin-qa-card">
          <h2>Safe Exports</h2>
          <p>
            Download current editable public config and native content JSON for QA comparison before and after manual edits.
          </p>
          <div className="wp-meta-actions">
            <button className="button button--primary" type="button" onClick={exportSiteConfig}>
              Download site config
            </button>
            <button className="button" type="button" onClick={exportNativeContent}>
              Download native content
            </button>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
