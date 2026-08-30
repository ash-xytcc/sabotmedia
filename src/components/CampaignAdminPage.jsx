import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import { loadCampaigns, saveCampaign } from '../lib/campaignsApi'
import { blankCampaign, campaignSlug, CAMPAIGN_TIME_ZONES, deadlineInputValue, deadlineIsoValue } from '../lib/campaignDeadline'

const LIST_SECTIONS = [
  { key: 'updates', title: 'Live Updates', fields: [field('date', 'Date / time'), field('title', 'Title'), field('body', 'Update', 'textarea'), field('url', 'Source / more URL'), field('pinned', 'Pinned', 'checkbox')] },
  { key: 'resources', title: 'Letters + Resources', fields: [field('type', 'Type'), field('title', 'Title'), field('description', 'Description', 'textarea'), field('href', 'URL or internal path'), field('label', 'Button label'), field('imageUrl', 'Image URL')] },
  { key: 'social', title: 'Social Feed', fields: [field('platform', 'Platform'), field('date', 'Date'), field('account', 'Account / author'), field('language', 'Language label'), field('excerpt', 'Post text / excerpt', 'textarea'), field('url', 'Original post URL'), field('imageUrl', 'Optional image URL')] },
  { key: 'graphics', title: 'Campaign Graphics', fields: [field('title', 'Title'), field('imageUrl', 'Image URL'), field('alt', 'Alt text', 'textarea'), field('caption', 'Caption', 'textarea'), field('downloadUrl', 'Download URL (optional)')] },
  { key: 'coverage', title: 'Press + Coverage', fields: [field('date', 'Date'), field('outlet', 'Outlet'), field('language', 'Language'), field('title', 'Original title'), field('translatedTitle', 'English title'), field('url', 'URL'), field('summary', 'Summary', 'textarea')] },
  { key: 'signatories', title: 'Open Letter Signatories', fields: [field('name', 'Name / organization'), field('location', 'Location'), field('url', 'Website (optional)'), field('statement', 'Public statement (optional)', 'textarea')] },
  { key: 'sources', title: 'Primary Sources', fields: [field('title', 'Title'), field('publisher', 'Publisher / source'), field('url', 'URL'), field('note', 'Why it matters', 'textarea')] },
  { key: 'timeline', title: 'Campaign Timeline', fields: [field('date', 'Date'), field('title', 'Title'), field('body', 'Description', 'textarea')] },
  { key: 'faq', title: 'FAQ', fields: [field('question', 'Question'), field('answer', 'Answer', 'textarea')] },
  { key: 'translations', title: 'Translations', fields: [field('language', 'Language'), field('title', 'Title'), field('url', 'URL')] },
]

function field(key, label, type = 'text') { return { key, label, type } }
function rowId() { return `row-${Math.random().toString(36).slice(2, 10)}` }

export function CampaignAdminPage() {
  const [campaigns, setCampaigns] = useState([])
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const { pushNotice } = useAdminNotices()

  useEffect(() => {
    let cancelled = false
    loadCampaigns({ includeDrafts: true })
      .then((items) => {
        if (cancelled) return
        setCampaigns(items)
        setDraft(items.find((item) => item.slug === 'autistici-inventati') || items[0] || null)
      })
      .catch((error) => { if (!cancelled) pushNotice(`Campaigns failed to load: ${String(error?.message || error)}`, 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pushNotice])

  function selectCampaign(item) {
    setDraft(item)
    setIsNew(false)
    setSlugManuallyEdited(true)
  }

  function startCampaign() {
    setDraft(blankCampaign())
    setIsNew(true)
    setSlugManuallyEdited(false)
  }

  function patch(patchValue) { setDraft((current) => ({ ...current, ...patchValue })) }

  function patchTitle(title) {
    setDraft((current) => ({ ...current, title, ...(!slugManuallyEdited ? { slug: campaignSlug(title) } : {}) }))
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
    if (!draft.title.trim() || !draft.slug.trim()) {
      pushNotice('Add a campaign title and URL slug before saving.', 'error')
      return
    }
    setSaving(true)
    try {
      const saved = await saveCampaign({ ...draft, slug: campaignSlug(draft.slug), partners: normalizeCsv(draft.partners), campaignKeywords: normalizeCsv(draft.campaignKeywords) })
      setDraft(saved)
      setCampaigns((items) => [saved, ...items.filter((item) => item.id !== saved.id)].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
      setIsNew(false)
      setSlugManuallyEdited(true)
      pushNotice('Campaign saved to D1.', 'success')
    } catch (error) {
      pushNotice(`Campaign failed to save: ${String(error?.message || error)}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  function changeDeadlineTimeZone(nextZone) {
    const wallTime = deadlineInputValue(draft?.deadline, draft?.deadlineTimeZone)
    patch({ deadlineTimeZone: nextZone, deadline: wallTime ? deadlineIsoValue(wallTime, nextZone) : '' })
  }

  return <AdminFrame>
    <main className="page wp-admin-screen campaign-admin-page">
      <div className="wp-screen-header">
        <div><h1>Campaigns</h1><p className="description">Create and manage public campaign hubs, updates, actions, reporting links, resources, graphics, coverage, signatories, sources, timelines, and feeds.</p></div>
        <div className="wp-screen-header__actions">
          <button type="button" className="button" onClick={startCampaign}>Add New Campaign</button>
          {draft?.status === 'published' && draft.slug ? <Link className="button" to={`/campaigns/${draft.slug}`}>View Campaign</Link> : null}
          <button type="button" className="button button--primary" onClick={save} disabled={!draft || saving}>{saving ? 'Saving…' : isNew ? 'Create Campaign' : 'Save Campaign'}</button>
        </div>
      </div>
      <WpAdminNotices />
      {loading ? <section className="wp-meta-box"><p>Loading campaigns from D1…</p></section> : null}
      {!loading ? <div className="campaign-admin-workspace">
        <aside className="wp-meta-box campaign-admin-index" aria-label="Campaign list">
          <div className="campaign-admin-section-header"><h2>All Campaigns</h2><span className="description">{campaigns.length}</span></div>
          {campaigns.length ? campaigns.map((item) => <button type="button" className={`campaign-admin-index__item${draft?.id === item.id && !isNew ? ' is-active' : ''}`} key={item.id} onClick={() => selectCampaign(item)}><strong>{item.shortTitle || item.title}</strong><span>/{item.slug}</span><small>{item.status} · {item.campaignStatus}</small></button>) : <p className="description">No campaigns yet. Start with Add New Campaign.</p>}
        </aside>
        <div className="campaign-admin-layout">
          {!draft ? <section className="wp-meta-box campaign-admin-welcome"><h2>Start a campaign</h2><p>Create a D1-backed campaign hub and publish it when it is ready.</p><button type="button" className="button button--primary" onClick={startCampaign}>Add New Campaign</button></section> : null}
          {draft ? <>
            <section className="wp-meta-box">
              <div className="campaign-admin-section-header"><h2>{isNew ? 'New Campaign' : 'Campaign Identity'}</h2><span className="description">{draft.slug ? `/campaigns/${draft.slug}` : 'Draft URL not set'}</span></div>
              <div className="campaign-admin-grid">
                <TextField label="Title" value={draft.title} onChange={patchTitle} />
                <TextField label="URL slug" value={draft.slug} onChange={(value) => { setSlugManuallyEdited(true); patch({ slug: campaignSlug(value) }) }} />
                <TextField label="Kicker" value={draft.kicker} onChange={(value) => patch({ kicker: value })} />
                <TextField label="Short title" value={draft.shortTitle} onChange={(value) => patch({ shortTitle: value })} />
                <SelectField label="Public state" value={draft.status} onChange={(value) => patch({ status: value })} options={['draft', 'published', 'archived']} />
                <SelectField label="Campaign status" value={draft.campaignStatus} onChange={(value) => patch({ campaignStatus: value })} options={['active', 'urgent', 'monitoring', 'archived']} />
                <TextField label="Deadline" value={deadlineInputValue(draft.deadline, draft.deadlineTimeZone)} type="datetime-local" onChange={(value) => patch({ deadline: deadlineIsoValue(value, draft.deadlineTimeZone) })} />
                <SelectField label="Deadline timezone" value={draft.deadlineTimeZone} onChange={changeDeadlineTimeZone} options={CAMPAIGN_TIME_ZONES} />
              </div>
              <p className="description campaign-admin-deadline-note">The deadline is saved as an exact UTC instant and displayed here in the selected campaign timezone.</p>
              <TextField label="Deck" value={draft.deck} textarea onChange={(value) => patch({ deck: value })} />
              <TextField label="Campaign summary" value={draft.summary} textarea onChange={(value) => patch({ summary: value })} />
              <TextField label="Partners (comma separated)" value={(draft.partners || []).join(', ')} onChange={(value) => patch({ partners: value })} />
              <TextField label="Discovery keywords (comma separated)" value={(draft.campaignKeywords || []).join(', ')} onChange={(value) => patch({ campaignKeywords: value })} />
              <TextField label="Hero / campaign graphic URL" value={draft.heroImage} onChange={(value) => patch({ heroImage: value })} />
              <TextField label="Hero alt text" value={draft.heroAlt} textarea onChange={(value) => patch({ heroAlt: value })} />
              {draft.heroImage ? <div className="campaign-admin-preview"><img src={draft.heroImage} alt={draft.heroAlt || ''} /></div> : null}
              <TextField label="Infrastructure monitor URL (optional)" value={draft.monitorUrl} onChange={(value) => patch({ monitorUrl: value })} />
              <TextField label="Monitor label" value={draft.monitorLabel} onChange={(value) => patch({ monitorLabel: value })} />
              <TextField label="Independence / legal note" value={draft.disclaimer} textarea onChange={(value) => patch({ disclaimer: value })} />
            </section>
            <ArrayEditor title="Action Center" rows={draft.actions || []} fields={[field('title', 'Title'), field('body', 'Description', 'textarea'), field('href', 'URL / anchor'), field('label', 'Button label')]} onAdd={(fields) => addRow('actions', fields)} onPatch={(index, key, value) => patchRow('actions', index, key, value)} onRemove={(index) => removeRow('actions', index)} onMove={(index, direction) => moveRow('actions', index, direction)} />
            {LIST_SECTIONS.map((section) => <ArrayEditor key={section.key} title={section.title} rows={draft[section.key] || []} fields={section.fields} onAdd={(fields) => addRow(section.key, fields)} onPatch={(index, key, value) => patchRow(section.key, index, key, value)} onRemove={(index) => removeRow(section.key, index)} onMove={(index, direction) => moveRow(section.key, index, direction)} />)}
            <section className="wp-meta-box"><h2>Campaign Endpoints</h2><p><strong>Public hub:</strong> <code>/campaigns/{draft.slug || 'campaign-slug'}</code></p><p><strong>Campaign RSS:</strong> <code>/feeds/campaigns/{draft.slug || 'campaign-slug'}.xml</code></p><p className="description">Connect Sabot articles through the Campaign field in the post editor. Use Resources and Primary Sources for external material and exact ordering.</p></section>
          </> : null}
        </div>
      </div> : null}
    </main>
  </AdminFrame>
}

function ArrayEditor({ title, rows, fields, onAdd, onPatch, onRemove, onMove }) {
  return <section className="wp-meta-box"><div className="campaign-admin-section-header"><h2>{title}</h2><button type="button" className="button" onClick={() => onAdd(fields)}>Add</button></div>{rows.length ? rows.map((row, index) => <div className="campaign-admin-row" key={row.id || index}><div className="campaign-admin-row__header"><strong>{title.replace(/s$/, '')} {index + 1}</strong><span className="description">{row.id}</span></div><div className="campaign-admin-grid">{fields.map((item) => <label className="native-content-editor__field" key={item.key}><span>{item.label}</span>{item.type === 'textarea' ? <textarea value={row[item.key] || ''} onChange={(event) => onPatch(index, item.key, event.target.value)} /> : item.type === 'checkbox' ? <input type="checkbox" checked={Boolean(row[item.key])} onChange={(event) => onPatch(index, item.key, event.target.checked)} /> : <input value={row[item.key] || ''} onChange={(event) => onPatch(index, item.key, event.target.value)} />}</label>)}</div><div className="campaign-admin-row__actions"><button type="button" className="button" onClick={() => onMove(index, -1)} disabled={index === 0}>Up</button><button type="button" className="button" onClick={() => onMove(index, 1)} disabled={index === rows.length - 1}>Down</button><button type="button" className="button button-link-delete" onClick={() => onRemove(index)}>Remove</button></div></div>) : <p className="description">Nothing here yet.</p>}</section>
}

function TextField({ label, value = '', onChange, textarea = false, type = 'text' }) {
  return <label className="native-content-editor__field"><span>{label}</span>{textarea ? <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} /> : <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} />}</label>
}

function SelectField({ label, value, onChange, options }) {
  const normalized = options.map((option) => typeof option === 'string' ? { value: option, label: option } : option)
  return <label className="native-content-editor__field"><span>{label}</span><select value={value || normalized[0].value} onChange={(event) => onChange(event.target.value)}>{normalized.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

function normalizeCsv(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}
