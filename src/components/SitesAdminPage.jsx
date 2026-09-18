import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { createSiteDraft, deleteSite, loadSites, saveSite, SITE_STATUS_OPTIONS, DEFAULT_SITE } from '../lib/siteDomains'
import { adminRoutes } from '../routing/routes'

const EMPTY_FORM = {
  name: '',
  domain: '',
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
  const canonicalSite = sites.find((site) => site.domain === DEFAULT_SITE.domain)

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

  async function registerCanonicalSite() {
    try {
      setError('')
      setSavingId(DEFAULT_SITE.id)
      const saved = await saveSite(DEFAULT_SITE)
      setSites((current) => [...current.filter((site) => site.domain !== saved.domain && site.id !== saved.id), saved])
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
    if (site.domain === DEFAULT_SITE.domain) {
      setError('The canonical sabot.media registry record cannot be removed from this screen. Change hosting first, then update the canonical-domain model deliberately.')
      return
    }
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
            <h1>Domain Registry (Advanced)</h1>
            <p className="description">Record intended hostnames and operator notes. This registry does not configure or verify Cloudflare, DNS, TLS, redirects, or application routing.</p>
          </div>
          <Link className="button" to={adminRoutes.settings}>Back to Settings</Link>
        </div>

        {error ? <div className="notice notice-error" role="alert"><p><strong>Sites error:</strong> {error}</p></div> : null}
        {state === 'loading' ? <div className="notice notice-info" role="status"><p>Loading site registry…</p></div> : null}

        <div className="notice notice-info"><p><strong>Source of truth:</strong> Cloudflare Custom Domains and DNS. Status values below are planning notes entered by an administrator, not live probes. Use <Link to={adminRoutes.siteHealth}>Site Health</Link> for facts the application can verify itself.</p></div>

        {!canonicalSite && state === 'loaded' ? (
          <section className="wp-meta-box">
            <h2>Register the canonical site</h2>
            <p className="description">The live hostname is already <code>sabot.media</code>, but the D1 registry has no matching record. Registering it here records that truth without changing DNS.</p>
            <button className="button button--primary" type="button" onClick={registerCanonicalSite} disabled={Boolean(savingId)}>
              {savingId === DEFAULT_SITE.id ? 'Registering…' : 'Register sabot.media'}
            </button>
          </section>
        ) : null}

        <section className="wp-meta-box">
          <h2>Add another hostname</h2>
          <p className="description">Use this only for a hostname you actually intend to attach, such as <code>mag.sabot.media</code>. Start it as <strong>planned</strong> or <strong>needs DNS</strong>; mark it connected only after Cloudflare confirms the custom domain.</p>
          <form className="wp-settings-form wp-sites-form" onSubmit={addSite}>
            <label><span>Display name</span><input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Sabot Magazine" required /></label>
            <label><span>Hostname</span><input value={form.domain} onChange={(e) => updateForm('domain', e.target.value)} placeholder="mag.sabot.media" required /></label>
            <label><span>Operator status</span><select value={form.status} onChange={(e) => updateForm('status', e.target.value)}>{SITE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select><small>Manual planning state only; it is not a connectivity test.</small></label>
            <label><span>Notes</span><textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Why this hostname exists, who controls DNS, launch note…" /></label>
            <p><button className="button button--primary" type="submit" disabled={Boolean(savingId)}>Add hostname</button></p>
          </form>
        </section>

        <section className="wp-meta-box">
          <h2>Registered hostnames</h2>
          {state === 'loaded' && sortedSites.length === 0 ? <p className="description">No domains are registered in D1 yet.</p> : null}
          {sortedSites.length ? (
            <div className="content-table-wrap">
              <table className="content-table wp-posts-table">
                <thead><tr><th>Site</th><th>Hostname</th><th>Operator status</th><th>Notes</th><th>Actions</th></tr></thead>
                <tbody>
                  {sortedSites.map((site) => (
                    <tr key={site.id}>
                      <td><strong>{site.name}</strong>{site.domain === DEFAULT_SITE.domain ? <div className="description">canonical production site</div> : null}</td>
                      <td><code>{site.domain}</code></td>
                      <td><select value={site.status} onChange={(e) => updateSiteLocal(site.id, 'status', e.target.value)} aria-label={`Status for ${site.name}`}>{SITE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></td>
                      <td><textarea value={site.notes} onChange={(e) => updateSiteLocal(site.id, 'notes', e.target.value)} aria-label={`Notes for ${site.name}`} rows="2" /></td>
                      <td><div className="wp-row-actions"><button className="button" type="button" onClick={() => persistSite(site)} disabled={savingId === site.id}>{savingId === site.id ? 'Saving…' : 'Save'}</button>{site.domain !== DEFAULT_SITE.domain ? <button className="button button-link-delete" type="button" onClick={() => removeSite(site)} disabled={savingId === site.id}>Delete</button> : null}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="wp-meta-box">
          <h2>How a hostname becomes live</h2>
          <ol className="wp-checklist">
            <li>Add the hostname here and leave it <strong>planned</strong> or <strong>needs DNS</strong>.</li>
            <li>Open Cloudflare Dashboard → Workers &amp; Pages → <strong>sabotmedia</strong> → Custom domains → <strong>Set up a custom domain</strong>.</li>
            <li>Enter the exact hostname, complete any DNS change Cloudflare requests, and wait until Cloudflare reports it active.</li>
            <li>Verify the hostname directly, then optionally return here and record the result as an operator note.</li>
          </ol>
          <p className="description"><code>sabot.media</code> remains the application canonical hostname. Any <code>www</code> behavior must be verified at the edge; this registry does not assert a redirect response.</p>
        </section>
      </main>
    </AdminFrame>
  )
}
