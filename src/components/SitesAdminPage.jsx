import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { createSiteDraft, loadSites, saveSites, SITE_STATUS_OPTIONS } from '../lib/siteDomains'

const EMPTY_FORM = {
  name: '',
  domain: '',
  basePath: '/',
  status: '',
}

export function SitesAdminPage() {
  const [sites, setSites] = useState(() => loadSites())
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    saveSites(sites)
  }, [sites])

  const sortedSites = useMemo(() => [...sites].sort((a, b) => a.name.localeCompare(b.name)), [sites])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function addSite(event) {
    event.preventDefault()
    const name = form.name.trim()
    const domain = form.domain.trim()

    if (!name || !domain) return

    setSites((current) => [
      ...current,
      createSiteDraft({
        name,
        domain,
        basePath: form.basePath,
        status: form.status,
      }),
    ])

    setForm(EMPTY_FORM)
  }

  function updateSite(id, field, value) {
    setSites((current) => current.map((site) => (site.id === id ? { ...site, [field]: value } : site)))
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen wp-sites-screen">
        <div className="wp-screen-header">
          <h1>Sites & Domains</h1>
          <Link className="button" to="/settings">Back to Settings</Link>
        </div>

        <div className="notice notice-warning">
          <p><strong>Local  only:</strong> this manager stores site/domain entries in localStorage. DNS and Cloudflare wiring are not connected yet.</p>
        </div>

        <section className="wp-meta-box">
          <h2>Connect another domain</h2>
          <form className="wp-settings-form wp-sites-form" onSubmit={addSite}>
            <label>
              <span>Site name</span>
              <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Sabot Magazine" required />
            </label>
            <label>
              <span>Domain</span>
              <input value={form.domain} onChange={(e) => updateForm('domain', e.target.value)} placeholder="mag.sabotmedia.pages.dev" required />
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
            <p><button className="button button--primary" type="submit">Add site </button></p>
          </form>
        </section>

        <section className="wp-meta-box">
          <h2>Managed sites</h2>
          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Domain</th>
                <th>Base route</th>
                <th>Status</th>
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
                      onChange={(e) => updateSite(site.id, 'basePath', e.target.value)}
                      aria-label={`Base path for ${site.name}`}
                    />
                  </td>
                  <td>
                    <select value={site.status} onChange={(e) => updateSite(site.id, 'status', e.target.value)}>
                      {SITE_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}
