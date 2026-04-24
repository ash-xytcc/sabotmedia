import { useState } from 'react'
import { AdminFrame } from './AdminRail'
import { loadWpSettings, saveWpSettings } from '../lib/wpAdminLocal'

export function SettingsPage() {
  const [form, setForm] = useState(() => loadWpSettings())
  const [status, setStatus] = useState('')

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header"><h1>Settings</h1></div>

        <section className="wp-meta-box">
          <h2>General</h2>
          <label className="archive-control"><span>Site title</span><input value={form.siteTitle} onChange={(e) => setForm((c) => ({ ...c, siteTitle: e.target.value }))} /></label>
          <label className="archive-control"><span>Tagline</span><input value={form.tagline} onChange={(e) => setForm((c) => ({ ...c, tagline: e.target.value }))} /></label>
          <label className="archive-control"><span>Homepage source</span><select value={form.homepageSource} onChange={(e) => setForm((c) => ({ ...c, homepageSource: e.target.value }))}><option value="updates">Updates feed</option><option value="static">Static page</option></select></label>
          <label className="archive-control"><span>Posts per page</span><input type="number" min="1" max="100" value={form.postsPerPage} onChange={(e) => setForm((c) => ({ ...c, postsPerPage: Number(e.target.value) || 10 }))} /></label>
          <label className="archive-control"><span>Default post type</span><select value={form.defaultPostType} onChange={(e) => setForm((c) => ({ ...c, defaultPostType: e.target.value }))}><option value="dispatch">Dispatch</option><option value="podcast">Podcast</option><option value="print">Print</option></select></label>
          <label className="archive-control"><span>Media mode</span><select value={form.mediaMode} onChange={(e) => setForm((c) => ({ ...c, mediaMode: e.target.value }))}><option value="local-only">Local only</option><option value="future-cloud">Future cloud</option></select></label>
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              saveWpSettings(form)
              setStatus('Saved locally to browser storage.')
            }}
          >Save Settings</button>
          {status ? <p>{status}</p> : null}
        </section>
      </main>
    </AdminFrame>
  )
}
