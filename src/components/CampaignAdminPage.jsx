import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import { loadCampaign, saveCampaign } from '../lib/campaignsApi'

const CAMPAIGN_SLUG = 'autistici-inventati'

const LIST_SECTIONS = [
  { key: 'updates', title: 'Live Updates', fields: [field('date', 'Date / time'), field('title', 'Title'), field('body', 'Update', 'textarea'), field('url', 'Source / more URL'), field('pinned', 'Pinned', 'checkbox')] },
  { key: 'resources', title: 'Letters + Resources', fields: [field('type', 'Type'), field('title', 'Title'), field('description', 'Description', 'textarea'), field('href', 'URL or internal path'), field('label', 'Button label'), field('imageUrl', 'Image URL')] },
  { key: 'social', title: 'Social Feed', fields: [field('platform', 'Platform'), field('date', 'Date'), field('account', 'Account / author'), field('excerpt', 'Post text / excerpt', 'textarea'), field('url', 'Original post URL'), field('imageUrl', 'Optional image URL')] },
  { key: 'graphics', title: 'Campaign Graphics', fields: [field('title', 'Title'), field('imageUrl', 'Image URL'), field('alt', 'Alt text', 'textarea'), field('caption', 'Caption', 'textarea'), field('downloadUrl', 'Download URL (optional)')] },
  { key: 'coverage', title: 'Press + Coverage', fields: [field('date', 'Date'), field('outlet', 'Outlet'), field('title', 'Title'), field('url', 'URL'), field('summary', 'Summary', 'textarea')] },
  { key: 'sources', title: 'Primary Sources', fields: [field('title', 'Title'), field('publisher', 'Publisher / source'), field('url', 'URL'), field('note', 'Why it matters', 'textarea')] },
  { key: 'timeline', title: 'Campaign Timeline', fields: [field('date', 'Date'), field('title', 'Title'), field('body', 'Description', 'textarea')] },
  { key: 'faq', title: 'FAQ', fields: [field('question', 'Question'), field('answer', 'Answer', 'textarea')] },
  { key: 'translations', title: 'Translations', fields: [field('language', 'Language'), field('title', 'Title'), field('url', 'URL')] },
]

function field(key, label, type = 'text') { return { key, label, type } }
function rowId() { return `row-${Math.random().toString(36).slice(2, 10)}` }

export function CampaignAdminPage() {
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { pushNotice } = useAdminNotices()

  useEffect(() => {
    let cancelled = false
    loadCampaign(CAMPAIGN_SLUG, { includeDrafts: true })
      .then((item) => { if (!cancelled) setDraft(item) })
      .catch((error) => { if (!cancelled) pushNotice(`Campaign failed to load: ${String(error?.message || error)}`, 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pushNotice])

  function patch(patchValue) {
    setDraft((current) => ({ ...current, ...patchValue }))
  }

  function patchRow(section, index, key, value) {
    setDraft((current) => {
      const rows = [...(current?.[section] || [])]
      rows[index] = { ...rows[index], [key]: value }
      return { ...current, [section]: rows }
    })
  }

  function addRow(section, fields) {
    const next = { id: rowId() }
    for (const item of fields) next[item.key] = item.type === 'checkbox' ? false : ''
    setDraft((current) => ({ ...current, [section]: [...(current?.[section] || []), next] }))
  }

  function removeRow(section, index) {
    setDraft((current) => ({ ...current, [section]: (current?.[section] || []).filter((_, rowIndex) => rowIndex !== index) }))
  }

  function moveRow(section, index, direction) {
    setDraft((current) => {
      const rows = [...(current?.[section] || [])]
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= rows.length) return current
      const [row] = rows.splice(index, 1)
      rows.splice(nextIndex, 0, row)
      return { ...current, [section]: rows }
    })
  }

  async function save() {
    if (!draft || saving) return
    setSaving(true)
    try {
      const saved = await saveCampaign({
        ...draft,
        partners: normalizeCsv(draft.partners),
        campaignKeywords: normalizeCsv(draft.campaignKeywords),
      })
      setDraft(saved)
      pushNotice('Campaign hub saved to D1.', 'success')
    } catch (error) {
      pushNotice(`Campaign failed to save: ${String(error?.message || error)}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen campaign-admin-page">
        <div className="wp-screen-header">
          <div>
            <h1>A/I Campaign Hub</h1>
            <p className="description">Manage the live campaign page, updates, social circulation, graphics, sources, coverage, and resource links. This is D1-backed published data, not browser-local content.</p>
          </div>
          <div className="wp-screen-header__actions">
            <Link className="button" to={`/campaigns/${CAMPAIGN_SLUG}`}>View Campaign</Link>
            <button type="button" className="button button--primary" onClick={save} disabled={!draft || saving}>{saving ? 'Saving…' : 'Save Campaign'}</button>
          </div>
        </div>
        <WpAdminNotices />

        {loading ? <section className="wp-meta-box"><p>Loading campaign from D1…</p></section> : null}
        {!loading && !draft ? <section className="wp-meta-box"><p>Campaign data is unavailable. Nothing has been saved locally.</p></section> : null}

        {draft ? (
          <div className="campaign-admin-layout">
            <section className="wp-meta-box">
              <div className="campaign-admin-section-header"><h2>Campaign Identity</h2><span className="description">/{draft.slug}</span></div>
              <div className="campaign-admin-grid">
                <TextField label="Kicker" value={draft.kicker} onChange={(value) => patch({ kicker: value })} />
                <TextField label="Short title" value={draft.shortTitle} onChange={(value) => patch({ shortTitle: value })} />
                <TextField label="Title" value={draft.title} onChange={(value) => patch({ title: value })} />
                <SelectField label="Public state" value={draft.status} onChange={(value) => patch({ status: value })} options={['published', 'draft', 'archived']} />
                <SelectField label="Campaign status" value={draft.campaignStatus} onChange={(value) => patch({ campaignStatus: value })} options={['active', 'urgent', 'monitoring', 'archived']} />
                <TextField label="Deadline" value={dateTimeLocalValue(draft.deadline)} type="datetime-local" onChange={(value) => patch({ deadline: value ? new Date(value).toISOString() : '' })} />
              </div>
              <TextField label="Deck" value={draft.deck} textarea onChange={(value) => patch({ deck: value })} />
              <TextField label="Campaign summary" value={draft.summary} textarea onChange={(value) => patch({ summary: value })} />
              <TextField label="Partners (comma separated)" value={(draft.partners || []).join(', ')} onChange={(value) => patch({ partners: value })} />
              <TextField label="Discovery keywords (comma separated)" value={(draft.campaignKeywords || []).join(', ')} onChange={(value) => patch({ campaignKeywords: value })} />
              <TextField label="Hero / campaign graphic URL" value={draft.heroImage} onChange={(value) => patch({ heroImage: value })} />
              <TextField label="Hero alt text" value={draft.heroAlt} textarea onChange={(value) => patch({ heroAlt: value })} />
              {draft.heroImage ? <div className="campaign-admin-preview"><img src={draft.heroImage} alt={draft.heroAlt || ''} /></div> : null}
              <TextField label="A/I monitor URL" value={draft.monitorUrl} onChange={(value) => patch({ monitorUrl: value })} />
              <TextField label="Monitor label" value={draft.monitorLabel} onChange={(value) => patch({ monitorLabel: value })} />
              <TextField label="Independence / legal note" value={draft.disclaimer} textarea onChange={(value) => patch({ disclaimer: value })} />
            </section>

            <ArrayEditor
              title="Action Center"
              rows={draft.actions || []}
              fields={[field('title', 'Title'), field('body', 'Description', 'textarea'), field('href', 'URL / anchor'), field('label', 'Button label')]}
              onAdd={(fields) => addRow('actions', fields)}
              onPatch={(index, key, value) => patchRow('actions', index, key, value)}
              onRemove={(index) => removeRow('actions', index)}
              onMove={(index, direction) => moveRow('actions', index, direction)}
            />

            {LIST_SECTIONS.map((section) => (
              <ArrayEditor
                key={section.key}
                title={section.title}
                rows={draft[section.key] || []}
                fields={section.fields}
                onAdd={(fields) => addRow(section.key, fields)}
                onPatch={(index, key, value) => patchRow(section.key, index, key, value)}
                onRemove={(index) => removeRow(section.key, index)}
                onMove={(index, direction) => moveRow(section.key, index, direction)}
              />
            ))}

            <section className="wp-meta-box">
              <h2>Campaign Endpoints</h2>
              <p><strong>Public hub:</strong> <code>/campaigns/{draft.slug}</code></p>
              <p><strong>Campaign RSS:</strong> <code>/feeds/campaigns/{draft.slug}.xml</code></p>
              <p><strong>Live monitor proxy:</strong> <code>/api/campaign-monitor</code></p>
              <p className="description">Published Sabot posts that mention A/I, Autistici/Inventati, Noblogs, or the campaign's discovery keywords are automatically pulled into the reporting/letters and graphics sections. Use Resources when you need exact ordering, external files, PDFs, or non-post links.</p>
            </section>
          </div>
        ) : null}
      </main>
    </AdminFrame>
  )
}

function ArrayEditor({ title, rows, fields, onAdd, onPatch, onRemove, onMove }) {
  return (
    <section className="wp-meta-box">
      <div className="campaign-admin-section-header"><h2>{title}</h2><button type="button" className="button" onClick={() => onAdd(fields)}>Add</button></div>
      {rows.length ? rows.map((row, index) => (
        <div className="campaign-admin-row" key={row.id || index}>
          <div className="campaign-admin-row__header"><strong>{title.replace(/s$/, '')} {index + 1}</strong><span className="description">{row.id}</span></div>
          <div className="campaign-admin-grid">
            {fields.map((item) => (
              <label className="native-content-editor__field" key={item.key}>
                <span>{item.label}</span>
                {item.type === 'textarea' ? <textarea value={row[item.key] || ''} onChange={(event) => onPatch(index, item.key, event.target.value)} /> : item.type === 'checkbox' ? <input type="checkbox" checked={Boolean(row[item.key])} onChange={(event) => onPatch(index, item.key, event.target.checked)} /> : <input value={row[item.key] || ''} onChange={(event) => onPatch(index, item.key, event.target.value)} />}
              </label>
            ))}
          </div>
          <div className="campaign-admin-row__actions">
            <button type="button" className="button" onClick={() => onMove(index, -1)} disabled={index === 0}>Up</button>
            <button type="button" className="button" onClick={() => onMove(index, 1)} disabled={index === rows.length - 1}>Down</button>
            <button type="button" className="button button-link-delete" onClick={() => onRemove(index)}>Remove</button>
          </div>
        </div>
      )) : <p className="description">Nothing here yet.</p>}
    </section>
  )
}

function TextField({ label, value = '', onChange, textarea = false, type = 'text' }) {
  return <label className="native-content-editor__field"><span>{label}</span>{textarea ? <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} /> : <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} />}</label>
}

function SelectField({ label, value, onChange, options }) {
  return <label className="native-content-editor__field"><span>{label}</span><select value={value || options[0]} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}

function normalizeCsv(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

function dateTimeLocalValue(value) {
  const date = new Date(value || '')
  if (!Number.isFinite(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
