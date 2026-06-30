import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import {
  PagesAdminPage,
  SettingsAdminPage,
  UsersAdminPage,
} from './WpAdminScaffoldPages'
import { loadCustomizerSettings, saveCustomizerSettings } from '../lib/customizerLocal'
import { exportLocalSiteBackupJson } from '../lib/localSiteBackup'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { loadWpSettings, saveWpSettings } from '../lib/wpAdminLocal'

export { PagesAdminPage, SettingsAdminPage, UsersAdminPage }

export function CustomizeAdminPage() {
  const [customizer, setCustomizer] = useState(() => loadCustomizerSettings())
  const [saved, setSaved] = useState('')

  function updateSection(section, field, value) {
    setCustomizer((current) => ({
      ...current,
      [section]: {
        ...(current[section] || {}),
        [field]: value,
      },
    }))
  }

  function saveCustomize() {
    const next = saveCustomizerSettings(customizer)
    const wpSettings = loadWpSettings()
    saveWpSettings({
      ...wpSettings,
      siteTitle: next.siteIdentity.siteTitle,
      tagline: next.siteIdentity.tagline,
      postsPerPage: Number(next.homepage.postsPerPage) || wpSettings.postsPerPage,
      homepageSource: next.homepage.homepageSource || wpSettings.homepageSource,
    })
    setCustomizer(next)
    setSaved('Customizer saved.')
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Customize</h1>
          <div>
            <Link className="button" to="/draft">Edit Live</Link>{' '}
            <button className="button button--primary" type="button" onClick={saveCustomize}>Save Changes</button>
          </div>
        </div>

        <section className="wp-meta-box">
          <h2>Site Identity</h2>
          <div className="wp-settings-form">
            <label>
              <span>Site title</span>
              <input value={customizer.siteIdentity.siteTitle} onChange={(event) => updateSection('siteIdentity', 'siteTitle', event.target.value)} />
            </label>
            <label>
              <span>Tagline</span>
              <input value={customizer.siteIdentity.tagline} onChange={(event) => updateSection('siteIdentity', 'tagline', event.target.value)} />
            </label>
            <label>
              <span>Logo URL</span>
              <input value={customizer.siteIdentity.logoUrl || customizer.masthead.logoUrl || ''} onChange={(event) => {
                updateSection('siteIdentity', 'logoUrl', event.target.value)
                updateSection('masthead', 'logoUrl', event.target.value)
              }} />
            </label>
          </div>
        </section>

        <section className="wp-meta-box">
          <h2>Colors and Masthead</h2>
          <div className="wp-settings-form">
            <label>
              <span>Accent color</span>
              <input type="color" value={customizer.colors.accentColor} onChange={(event) => updateSection('colors', 'accentColor', event.target.value)} />
            </label>
            <label>
              <span>Background color</span>
              <input type="color" value={customizer.colors.backgroundColor} onChange={(event) => updateSection('colors', 'backgroundColor', event.target.value)} />
            </label>
            <label>
              <span>Text color</span>
              <input type="color" value={customizer.colors.textColor} onChange={(event) => updateSection('colors', 'textColor', event.target.value)} />
            </label>
            <label>
              <span>Masthead size</span>
              <select value={customizer.masthead.mastheadSize} onChange={(event) => updateSection('masthead', 'mastheadSize', event.target.value)}>
                <option value="compact">Compact</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>
          {saved ? <p className="description" role="status">{saved}</p> : null}
        </section>
      </main>
    </AdminFrame>
  )
}

export function SiteEditorAdminPage() {
  return (
    <main className="wp-admin-page">
      <header className="wp-admin-page__header">
        <div>
          <p className="wp-admin-page__eyebrow">Live Site</p>
          <h1>Site Editor</h1>
          <p>Edit the public site layout and homepage presentation.</p>
        </div>
      </header>
    </main>
  )
}

export function ToolsAdminPage() {
  const [status, setStatus] = useState('')

  function collectPrintlabRecords() {
    const records = {}
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !/print[-_ ]?lab/i.test(key)) continue
      try {
        records[key] = JSON.parse(window.localStorage.getItem(key) || 'null')
      } catch {
        records[key] = window.localStorage.getItem(key)
      }
    }
    return records
  }

  async function exportBackup() {
    try {
      const nativeItems = await loadNativeCollection({ includeFuture: 1 })
      const backup = JSON.parse(exportLocalSiteBackupJson({ nativeItems }))
      backup.printlabProjects = collectPrintlabRecords()

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sabot-media-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setStatus('Backup JSON exported.')
    } catch {
      setStatus('Backup export failed.')
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Tools</h1>
        </div>

        <section className="wp-meta-box">
          <h2>Backup Export</h2>
          <p className="description">Downloads posts, media, settings, customizer data, users, local storage inventory, and any saved Printlab project records.</p>
          <button type="button" className="button button--primary" onClick={exportBackup}>
            Export Backup JSON
          </button>
          {status ? <p className="description" role="status">{status}</p> : null}
        </section>
      </main>
    </AdminFrame>
  )
}
