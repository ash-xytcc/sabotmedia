import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { createSiteDraft, deleteSite, loadSites, saveSite, SITE_STATUS_OPTIONS } from '../lib/siteDomains'
import { adminRoutes } from '../routing/routes'

const EMPTY_FORM = {
  name: '',
  domain: '',
  basePath: '/',
  status: 'planned',
  notes: '',
}

export function SitesAdminPage() {
  const [sites, setSites] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')

  async function reload() {
    try {
      setState('loading')
      setError('')
      const items = await loadSites()
      setSites(items)
      setState('loaded')
    } catch (err) {
      setSites([])
      setState('error')
      setError(String(err?.message || err))
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const sortedSites = useMemo(() => [...sites].sort((a, b) => a.name.localeCompare(b.name)), [sites])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function addSite(event) {
    event.preventDefault()
    const draft = createSiteDraft(form)
    if (!draft.name.trim() || !draft.domain.trim()) return

    try {
      setError('')
      setSavingId(draft.id)
      const saved = await saveSite(draft)
      setSites((current) => [...current.filter((site) => site.id !== saved.id), saved])
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setSavingId('')
    }
  }

  function updateSiteLocal(id, field, value) {
    setSites((current) => current.map((site) => (site.id === id ? { ...site, [field]: value } : site)))
  }

  async function persistSite(site) {
    try {
      setError('')
      setSavingId(site.id)
      const saved = await saveSite(site)
      setSites((current) => current.map((item) => (item.id === saved.id ? saved : item)))
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setSavingId('')
    }
  }

  async function removeSite(site) {
    try {
      setError('')
      setSavingId(site.id)
      await deleteSite(site.id)
      setSites((current) => current.filter((item) => item.id !== site.id))
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setSavingId('')
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen wp-sites-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Sites & Domains</h1>
            <p className="description">Persistent D1 registry for canonical and planned hostnames. DNS attachment remains an explicit Cloudflare deployment action because SabotPress does not hold Cloudflare account credentials.</p>
          </div>
          <Link className="button" to={adminRoutes.settings}>Back to Settings</Link>
        </div>

        {error ? <div className="notice notice-error" role="alert"><p><strong>Sites error:</strong> {error}</p></div> : null}
        {state === 'loading' ? <div className="notice notice-info" role="status"><p>Loading site registry…</p></div> : null}

        <section className="wp-meta-box">
          <h2>Connect another domain</h2>
          <form className="wp-settings-form wp-sites-form" onSubmit={addSite}>
            <label>
              <span>Site name</span>
              <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Sabot Magazine" required />
            </label>
            <label>
              <span>Domain</span>
              <input value={form.domain} onChange={(e) => updateForm('domain', e.target.value)} placeholder="mag.sabot.media" required />
            </label>
            <label>
              <span>Slug / base path</span>
              <input value={form.basePath} onChange={(e) => updateForm('basePath', e.target.value)} placeholder="/" />
            </label>
            <label>
              <span>Status</span>
              <select value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                {SITE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Notes</span>
              <textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="DNS owner, redirect purpose, launch note…" />
            </label>
            <p><button className="button button--primary" type="submit" disabled={Boolean(savingId)}>Add site</button></p>
          </form>
        </section>

        <section className="wp-meta-box">
          <h2>Managed sites</h2>
          {state === 'loaded' && sortedSites.length === 0 ? <p className="description">No domains are registered yet.</p> : null}
          {sortedSites.length ? (
            <table className="content-table wp-posts-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Domain</th>
                  <th>Base route</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSites.map((site) => (
                  <tr key={site.id}>
                    <td><strong>{site.name}</strong></td>
                    <td>{site.domain}</td>
                    <td>
                      <input
                        value={site.basePath}
                        onChange={(e) => updateSiteLocal(site.id, 'basePath', e.target.value)}
                        aria-label={`Base path for ${site.name}`}
                      />
                    </td>
                    <td>
                      <select value={site.status} onChange={(e) => updateSiteLocal(site.id, 'status', e.target.value)} aria-label={`Status for ${site.name}`}>
                        {SITE_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="wp-row-actions">
                        <button className="button" type="button" onClick={() => persistSite(site)} disabled={savingId === site.id}>Save</button>
                        <button className="button button-link-delete" type="button" onClick={() => removeSite(site)} disabled={savingId === site.id}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="wp-meta-box">
          <h2>Cloudflare attachment</h2>
          <p className="description">Registering a hostname here records SabotPress intent; it does not mutate Cloudflare DNS or Pages configuration. To attach a new production hostname: Cloudflare Dashboard → Workers &amp; Pages → <strong>sabotmedia</strong> → Custom domains → Set up a custom domain. Enter the exact hostname from this registry, complete the DNS record Cloudflare requests, then return here and set its status to <strong>connected</strong>.</p>
          <p className="description">The canonical hostname remains <code>sabot.media</code>. <code>www.sabot.media</code> is handled by edge middleware as a permanent 308 redirect with path and query preservation.</p>
        </section>
      </main>
    </AdminFrame>
  )
}
