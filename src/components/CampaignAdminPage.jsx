import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { MediaPickerModal } from './MediaLibraryPage'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import { deleteCampaign as deleteCampaignApi, loadCampaignRevisions, loadCampaigns, restoreCampaignRevision, saveCampaign } from '../lib/campaignsApi'
import { blankCampaign, campaignSlug, CAMPAIGN_SECTION_KEYS, CAMPAIGN_SECTION_LABELS, CAMPAIGN_TIME_ZONES, deadlineInputValue, validateDeadlineWallTime } from '../lib/campaignDeadline'

const AI_CAMPAIGN_ID = 'campaign-autistici-inventati'

const LIST_SECTIONS = [
  { key: 'updates', title: 'Live Updates', fields: [field('date', 'Date / time'), field('title', 'Title'), field('body', 'Update', 'textarea'), field('url', 'Source / more URL'), field('pinned', 'Pinned', 'checkbox')] },
  { key: 'resources', title: 'Letters + Resources', fields: [field('type', 'Type'), field('title', 'Title'), field('description', 'Description', 'textarea'), field('href', 'URL, internal path, or file', 'media'), field('label', 'Button label'), field('imageUrl', 'Image URL', 'media')] },
  { key: 'social', title: 'Social Feed', fields: [field('platform', 'Platform'), field('date', 'Date'), field('account', 'Account / author'), field('language', 'Language label'), field('excerpt', 'Post text / excerpt', 'textarea'), field('url', 'Original post URL'), field('imageUrl', 'Optional image URL')] },
  { key: 'graphics', title: 'Campaign Graphics', fields: [field('title', 'Title'), field('imageUrl', 'Image URL', 'media'), field('alt', 'Alt text', 'textarea'), field('caption', 'Caption', 'textarea'), field('downloadUrl', 'Download URL (optional)', 'media')] },
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
  const [mediaTarget, setMediaTarget] = useState(null)
  const [revisions, setRevisions] = useState([])
  const [revisionState, setRevisionState] = useState('idle')
  const [restoringRevisionId, setRestoringRevisionId] = useState('')
  const [deadlineWallTime, setDeadlineWallTime] = useState('')
  const [deadlineError, setDeadlineError] = useState('')
  const savedFingerprintRef = useRef('')
  const { pushNotice } = useAdminNotices()
  const dirty = useMemo(() => Boolean(draft) && campaignFingerprint(draft) !== savedFingerprintRef.current, [draft])

  useEffect(() => {
    let cancelled = false
    loadCampaigns({ includeDrafts: true })
      .then((items) => {
        if (cancelled) return
        setCampaigns(items)
        const selected = items.find((item) => item.slug === 'autistici-inventati') || items[0] || null
        setDraft(selected)
        setDeadlineWallTime(deadlineInputValue(selected?.deadline, selected?.deadlineTimeZone))
        savedFingerprintRef.current = campaignFingerprint(selected)
        if (selected) reloadRevisions(selected.id)
      })
      .catch((error) => { if (!cancelled) pushNotice(`Campaigns failed to load: ${String(error?.message || error)}`, 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pushNotice])

  useEffect(() => {
    const warn = (event) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function reloadRevisions(campaignId) {
    if (!campaignId) { setRevisions([]); setRevisionState('idle'); return }
    try {
      setRevisionState('loading')
      setRevisions(await loadCampaignRevisions(campaignId))
      setRevisionState('loaded')
    } catch (error) {
      setRevisions([])
      setRevisionState('error')
      pushNotice(`Campaign revision history failed to load: ${String(error?.message || error)}`, 'error')
    }
  }

  function canDiscardChanges() {
    return !dirty || window.confirm('Discard the unsaved campaign changes?')
  }

  function selectCampaign(item) {
    if (!canDiscardChanges()) return
    setDraft(item)
    setDeadlineWallTime(deadlineInputValue(item.deadline, item.deadlineTimeZone))
    setDeadlineError('')
    savedFingerprintRef.current = campaignFingerprint(item)
    setIsNew(false)
    setSlugManuallyEdited(true)
    reloadRevisions(item.id)
  }

  function startCampaign() {
    if (!canDiscardChanges()) return
    const next = blankCampaign()
    setDraft(next)
    setDeadlineWallTime('')
    setDeadlineError('')
    savedFingerprintRef.current = campaignFingerprint(next)
    setIsNew(true)
    setSlugManuallyEdited(false)
    setRevisions([])
    setRevisionState('idle')
  }

  function patch(patchValue) { setDraft((current) => ({ ...current, ...patchValue })) }

  function patchTitle(title) {
    setDraft((current) => ({ ...current, title, ...(!slugManuallyEdited ? { slug: campaignSlug(title) } : {}) }))
  }

  function duplicateCampaign() {
    if (!draft || !canDiscardChanges()) return
    const identity = blankCampaign()
    const nextSlug = `${campaignSlug(draft.slug || draft.title)}-copy`
    const next = { ...draft, id: identity.id, title: `Copy of ${draft.title}`, shortTitle: `Copy of ${draft.shortTitle || draft.title}`, slug: nextSlug, status: 'draft', campaignStatus: 'active', createdAt: '', updatedAt: '' }
    setDraft(next)
    setDeadlineWallTime(deadlineInputValue(next.deadline, next.deadlineTimeZone))
    setDeadlineError('')
    setIsNew(true)
    setSlugManuallyEdited(true)
    setRevisions([])
    setRevisionState('idle')
  }

  async function archiveCampaign() {
    if (!draft || isNew || saving || !window.confirm(`Archive “${draft.title}”? Its public page will be removed from the campaign directory.`)) return
    try {
      setSaving(true)
      const saved = await saveCampaign({ ...draft, status: 'archived', campaignStatus: 'archived' }, 'archive')
      setDraft(saved); savedFingerprintRef.current = campaignFingerprint(saved)
      setCampaigns((items) => [saved, ...items.filter((item) => item.id !== saved.id)])
      pushNotice('Campaign archived.', 'success')
      reloadRevisions(saved.id)
    } catch (error) { pushNotice(`Campaign archive failed: ${String(error?.message || error)}`, 'error') } finally { setSaving(false) }
  }

  async function removeCampaign() {
    if (!draft || isNew || isProtectedAiCampaign(draft) || saving || !window.confirm(`Permanently delete “${draft.title}” and its revision history?`)) return
    try {
      setSaving(true)
      await deleteCampaignApi(draft.id)
      const remaining = campaigns.filter((item) => item.id !== draft.id)
      setCampaigns(remaining)
      const next = remaining[0] || null
      setDraft(next); savedFingerprintRef.current = campaignFingerprint(next)
      setDeadlineWallTime(deadlineInputValue(next?.deadline, next?.deadlineTimeZone))
      setRevisions([]); setRevisionState('idle')
      if (next) reloadRevisions(next.id)
      pushNotice('Campaign deleted from D1.', 'success')
    } catch (error) { pushNotice(`Campaign delete failed: ${String(error?.message || error)}`, 'error') } finally { setSaving(false) }
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

  function moveSection(index, direction) {
    setDraft((current) => {
      const order = normalizeSectionOrder(current?.sectionOrder)
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= order.length) return current
      const [section] = order.splice(index, 1)
      order.splice(nextIndex, 0, section)
      return { ...current, sectionOrder: order }
    })
  }

  function toggleSection(section, visible) {
    setDraft((current) => {
      const hidden = new Set(current?.hiddenSections || [])
      if (visible) hidden.delete(section)
      else hidden.add(section)
      return { ...current, hiddenSections: [...hidden] }
    })
  }

  async function save({ previewWindow = null } = {}) {
    if (!draft || saving) return
    if (!draft.title.trim() || !draft.slug.trim()) {
      pushNotice('Add a campaign title and URL slug before saving.', 'error')
      previewWindow?.close()
      return null
    }
    if (deadlineError) {
      pushNotice(deadlineError, 'error')
      previewWindow?.close()
      return null
    }
    setSaving(true)
    try {
      const saved = await saveCampaign({ ...draft, slug: campaignSlug(draft.slug), partners: normalizeCsv(draft.partners), campaignKeywords: normalizeCsv(draft.campaignKeywords), sectionOrder: normalizeSectionOrder(draft.sectionOrder), automation: normalizeAutomationDraft(draft.automation) }, previewWindow ? 'save-and-preview' : 'manual-save')
      setDraft(saved)
      setDeadlineWallTime(deadlineInputValue(saved.deadline, saved.deadlineTimeZone))
      savedFingerprintRef.current = campaignFingerprint(saved)
      setCampaigns((items) => [saved, ...items.filter((item) => item.id !== saved.id)].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
      setIsNew(false)
      setSlugManuallyEdited(true)
      pushNotice('Campaign saved to D1.', 'success')
      reloadRevisions(saved.id)
      if (previewWindow) previewWindow.location.href = `/campaigns/${saved.slug}?preview=1`
      return saved
    } catch (error) {
      previewWindow?.close()
      pushNotice(`Campaign failed to save: ${String(error?.message || error)}`, 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  function saveAndPreview() {
    if (!draft || saving) return
    const previewWindow = window.open('', '_blank')
    if (!previewWindow) {
      pushNotice('Allow pop-ups to open the campaign preview.', 'error')
      return
    }
    previewWindow.document.title = 'Preparing campaign preview…'
    previewWindow.document.body.textContent = 'Saving campaign preview…'
    save({ previewWindow })
  }

  async function restoreRevision(revision) {
    if (!revision?.id || restoringRevisionId) return
    if (dirty && !window.confirm('Restore this saved revision and replace the current unsaved changes?')) return
    try {
      setRestoringRevisionId(revision.id)
      const restored = await restoreCampaignRevision(revision.id)
      setDraft(restored)
      savedFingerprintRef.current = campaignFingerprint(restored)
      setCampaigns((items) => [restored, ...items.filter((item) => item.id !== restored.id)].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
      await reloadRevisions(restored.id)
      pushNotice('Campaign revision restored in D1.', 'success')
    } catch (error) {
      pushNotice(`Campaign revision failed to restore: ${String(error?.message || error)}`, 'error')
    } finally {
      setRestoringRevisionId('')
    }
  }

  function changeDeadlineTimeZone(nextZone) {
    const result = deadlineWallTime ? validateDeadlineWallTime(deadlineWallTime, nextZone) : { iso: '', error: '' }
    setDeadlineError(result.error)
    patch({ deadlineTimeZone: nextZone, ...(result.error ? {} : { deadline: result.iso }) })
  }

  function changeDeadline(value) {
    setDeadlineWallTime(value)
    const result = value ? validateDeadlineWallTime(value, draft?.deadlineTimeZone) : { iso: '', error: '' }
    setDeadlineError(result.error)
    if (!result.error) patch({ deadline: result.iso })
  }

  return <AdminFrame>
    <main className="page wp-admin-screen campaign-admin-page">
      <div className="wp-screen-header">
        <div><h1>Campaigns</h1><p className="description">Create and manage public campaign hubs, updates, actions, reporting links, resources, graphics, coverage, signatories, sources, timelines, and feeds.</p></div>
        <div className="wp-screen-header__actions">
          {draft ? <span className={`campaign-admin-save-state${dirty ? ' is-dirty' : ''}`} role="status">{dirty ? 'Unsaved changes' : 'All changes saved'}</span> : null}
          <button type="button" className="button" onClick={startCampaign}>Add New Campaign</button>
          {draft ? <button type="button" className="button" onClick={duplicateCampaign}>Duplicate</button> : null}
          {draft && !isNew ? <button type="button" className="button" onClick={archiveCampaign} disabled={saving || draft.status === 'archived'}>Archive</button> : null}
          {draft && !isNew && !isProtectedAiCampaign(draft) ? <button type="button" className="button button-link-delete" onClick={removeCampaign} disabled={saving}>Delete</button> : null}
          {draft?.status === 'published' && draft.slug ? <Link className="button" to={`/campaigns/${draft.slug}`} onClick={(event) => { if (!canDiscardChanges()) event.preventDefault() }}>View Campaign</Link> : null}
          {draft ? <button type="button" className="button" onClick={saveAndPreview} disabled={saving}>Save + Preview</button> : null}
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
                <TextField label="URL slug" value={draft.slug} disabled={isProtectedAiCampaign(draft)} onChange={(value) => { setSlugManuallyEdited(true); patch({ slug: campaignSlug(value) }) }} />
                <TextField label="Kicker" value={draft.kicker} onChange={(value) => patch({ kicker: value })} />
                <TextField label="Short title" value={draft.shortTitle} onChange={(value) => patch({ shortTitle: value })} />
                <SelectField label="Public state" value={draft.status} onChange={(value) => patch({ status: value })} options={['draft', 'published', 'archived']} />
                <SelectField label="Campaign status" value={draft.campaignStatus} onChange={(value) => patch({ campaignStatus: value })} options={['active', 'urgent', 'monitoring', 'completed', 'archived']} />
                <TextField label="Deadline" value={deadlineWallTime} type="datetime-local" onChange={changeDeadline} error={deadlineError} />
                <SelectField label="Deadline timezone" value={draft.deadlineTimeZone} onChange={changeDeadlineTimeZone} options={CAMPAIGN_TIME_ZONES} />
              </div>
              <p className="description campaign-admin-deadline-note">The deadline is saved as an exact UTC instant and displayed here in the selected campaign timezone.</p>
              <TextField label="Deck" value={draft.deck} textarea onChange={(value) => patch({ deck: value })} />
              <TextField label="Campaign summary" value={draft.summary} textarea onChange={(value) => patch({ summary: value })} />
              <TextField label="Partners (comma separated)" value={(draft.partners || []).join(', ')} onChange={(value) => patch({ partners: value })} />
              <TextField label="Discovery keywords (comma separated)" value={(draft.campaignKeywords || []).join(', ')} onChange={(value) => patch({ campaignKeywords: value })} />
              <div className="campaign-admin-media-field"><TextField label="Hero / campaign graphic URL" value={draft.heroImage} onChange={(value) => patch({ heroImage: value })} /><button className="button" type="button" onClick={() => setMediaTarget({ section: 'hero' })}>Choose from Media</button></div>
              <TextField label="Hero alt text" value={draft.heroAlt} textarea onChange={(value) => patch({ heroAlt: value })} />
              {draft.heroImage ? <div className="campaign-admin-preview"><img src={draft.heroImage} alt={draft.heroAlt || ''} /></div> : null}
              <TextField label="Infrastructure monitor URL (optional)" value={draft.monitorUrl} onChange={(value) => patch({ monitorUrl: value })} />
              <TextField label="Monitor label" value={draft.monitorLabel} onChange={(value) => patch({ monitorLabel: value })} />
              <TextField label="Independence / legal note" value={draft.disclaimer} textarea onChange={(value) => patch({ disclaimer: value })} />
            </section>
            <AutomationSettings value={draft.automation || {}} onChange={(automation) => patch({ automation })} />
            <SectionControls
              order={normalizeSectionOrder(draft.sectionOrder)}
              hidden={draft.hiddenSections || []}
              titles={draft.sectionTitles || {}}
              onMove={moveSection}
              onToggle={toggleSection}
              onTitle={(section, value) => patch({ sectionTitles: { ...(draft.sectionTitles || {}), [section]: value } })}
            />
            <ArrayEditor title="Action Center" rows={draft.actions || []} fields={[field('title', 'Title'), field('body', 'Description', 'textarea'), field('href', 'URL / anchor'), field('label', 'Button label')]} onAdd={(fields) => addRow('actions', fields)} onPatch={(index, key, value) => patchRow('actions', index, key, value)} onRemove={(index) => removeRow('actions', index)} onMove={(index, direction) => moveRow('actions', index, direction)} />
            {LIST_SECTIONS.map((section) => <ArrayEditor key={section.key} title={section.title} rows={draft[section.key] || []} fields={section.fields} onAdd={(fields) => addRow(section.key, fields)} onPatch={(index, key, value) => patchRow(section.key, index, key, value)} onRemove={(index) => removeRow(section.key, index)} onMove={(index, direction) => moveRow(section.key, index, direction)} onPickMedia={(index, key) => setMediaTarget({ section: section.key, index, key })} />)}
            {!isNew ? <RevisionHistory revisions={revisions} state={revisionState} restoringId={restoringRevisionId} onRestore={restoreRevision} /> : null}
          </> : null}
        </div>
      </div> : null}
      <MediaPickerModal
        open={Boolean(mediaTarget)}
        title="Choose Campaign Media"
        onClose={() => setMediaTarget(null)}
        onPick={(media) => {
          if (!mediaTarget) return
          const url = String(media?.url || '')
          if (mediaTarget.section === 'hero') patch({ heroImage: url, heroAlt: draft.heroAlt || media?.alt || media?.altText || '' })
          else {
            patchRow(mediaTarget.section, mediaTarget.index, mediaTarget.key, mediaTarget.key === 'downloadUrl' ? String(media?.downloadUrl || url) : url)
            if (mediaTarget.section === 'graphics' && mediaTarget.key === 'imageUrl') {
              if (!draft.graphics?.[mediaTarget.index]?.title) patchRow('graphics', mediaTarget.index, 'title', String(media?.title || ''))
              if (!draft.graphics?.[mediaTarget.index]?.alt) patchRow('graphics', mediaTarget.index, 'alt', String(media?.alt || media?.altText || ''))
              if (!draft.graphics?.[mediaTarget.index]?.caption) patchRow('graphics', mediaTarget.index, 'caption', String(media?.caption || ''))
              patchRow('graphics', mediaTarget.index, 'downloadUrl', String(media?.downloadUrl || url))
            }
          }
          setMediaTarget(null)
        }}
      />
    </main>
  </AdminFrame>
}

function ArrayEditor({ title, rows, fields, onAdd, onPatch, onRemove, onMove, onPickMedia }) {
  return <section className="wp-meta-box"><div className="campaign-admin-section-header"><h2>{title}</h2><button type="button" className="button" onClick={() => onAdd(fields)}>Add</button></div>{rows.length ? rows.map((row, index) => <div className="campaign-admin-row" key={row.id || index}><div className="campaign-admin-row__header"><strong>{title.replace(/s$/, '')} {index + 1}</strong><span className="description">{row.id}</span></div><div className="campaign-admin-grid">{fields.map((item) => <label className="native-content-editor__field" key={item.key}><span>{item.label}</span>{item.type === 'textarea' ? <textarea value={row[item.key] || ''} onChange={(event) => onPatch(index, item.key, event.target.value)} /> : item.type === 'checkbox' ? <input type="checkbox" checked={Boolean(row[item.key])} onChange={(event) => onPatch(index, item.key, event.target.checked)} /> : item.type === 'media' ? <span className="campaign-admin-media-input"><input value={row[item.key] || ''} onChange={(event) => onPatch(index, item.key, event.target.value)} /><button className="button" type="button" onClick={() => onPickMedia?.(index, item.key)}>Choose</button></span> : <input value={row[item.key] || ''} onChange={(event) => onPatch(index, item.key, event.target.value)} />}</label>)}</div><div className="campaign-admin-row__actions"><button type="button" className="button" onClick={() => onMove(index, -1)} disabled={index === 0}>Up</button><button type="button" className="button" onClick={() => onMove(index, 1)} disabled={index === rows.length - 1}>Down</button><button type="button" className="button button-link-delete" onClick={() => onRemove(index)}>Remove</button></div></div>) : <p className="description">Nothing here yet.</p>}</section>
}

function SectionControls({ order, hidden, titles, onMove, onToggle, onTitle }) {
  const hiddenSet = new Set(hidden || [])
  return <section className="wp-meta-box campaign-admin-sections"><div className="campaign-admin-section-header"><div><h2>Page Sections</h2><p className="description">Choose what appears, set reader-facing headings, and arrange the campaign page.</p></div></div><div className="campaign-admin-section-list">{order.map((section, index) => <div className="campaign-admin-section-row" key={section}><label className="campaign-admin-section-row__visibility"><input type="checkbox" checked={!hiddenSet.has(section)} onChange={(event) => onToggle(section, event.target.checked)} /><span>Show {CAMPAIGN_SECTION_LABELS[section]}</span></label><label className="native-content-editor__field"><span>Public heading (optional)</span><input value={titles?.[section] || ''} placeholder={defaultSectionTitle(section)} onChange={(event) => onTitle(section, event.target.value)} /></label><div className="campaign-admin-row__actions"><button className="button" type="button" onClick={() => onMove(index, -1)} disabled={index === 0}>Up</button><button className="button" type="button" onClick={() => onMove(index, 1)} disabled={index === order.length - 1}>Down</button></div></div>)}</div></section>
}

function RevisionHistory({ revisions, state, restoringId, onRestore }) {
  return <section className="wp-meta-box"><div className="campaign-admin-section-header"><h2>Revision History</h2><span className="description">{state === 'loading' ? 'Loading…' : `${revisions.length} saved`}</span></div>{state === 'error' ? <p className="notice notice-error">Revision history is unavailable. Campaign saving remains fail-closed.</p> : null}{revisions.length ? <div className="campaign-admin-revisions">{revisions.slice(0, 20).map((revision) => <article key={revision.id}><div><strong>{new Date(revision.createdAt).toLocaleString()}</strong><span>{revision.revisionNote}</span></div><button className="button" type="button" disabled={Boolean(restoringId)} onClick={() => onRestore(revision)}>{restoringId === revision.id ? 'Restoring…' : 'Restore'}</button></article>)}</div> : state === 'loaded' ? <p className="description">The first saved revision will appear after the next save.</p> : null}</section>
}

function AutomationSettings({ value, onChange }) {
  const patch = (next) => onChange({ ...value, ...next })
  return <section className="wp-meta-box"><div className="campaign-admin-section-header"><div><h2>Live Automation</h2><p className="description">Optional public sources are refreshed server-side. Exact campaign relationships still control Sabot articles.</p></div></div>
    <label className="native-content-editor__field"><span><input type="checkbox" checked={Boolean(value.enabled)} onChange={(event) => patch({ enabled: event.target.checked })} /> Enable configured live sources</span></label>
    <label className="native-content-editor__field"><span><input type="checkbox" checked={Boolean(value.discoverNews)} onChange={(event) => patch({ discoverNews: event.target.checked })} /> Discover exact-match news coverage automatically</span></label>
    <div className="campaign-admin-grid">
      <TextField label="Automation start (ISO date/time)" value={value.startAt || ''} onChange={(startAt) => patch({ startAt })} />
      <TextField label="Signatories JSON URL" value={value.signatoriesUrl || ''} onChange={(signatoriesUrl) => patch({ signatoriesUrl })} />
    </div>
    <TextField label="Bluesky handles (one per line)" value={(value.blueskyActors || []).join('\n')} textarea onChange={(text) => patch({ blueskyActors: normalizeLines(text) })} />
    <TextField label="Mastodon accounts (one @name@server per line)" value={(value.mastodonAccounts || []).join('\n')} textarea onChange={(text) => patch({ mastodonAccounts: normalizeLines(text) })} />
    <TextField label="Coverage RSS / Atom feeds (one HTTPS URL per line)" value={(value.coverageFeeds || []).join('\n')} textarea onChange={(text) => patch({ coverageFeeds: normalizeLines(text) })} />
  </section>
}

function TextField({ label, value = '', onChange, textarea = false, type = 'text', disabled = false, error = '' }) {
  return <label className="native-content-editor__field"><span>{label}</span>{textarea ? <textarea value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} /> : <input type={type} value={value || ''} disabled={disabled} aria-invalid={error ? 'true' : undefined} onChange={(event) => onChange(event.target.value)} />}{error ? <small className="campaign-admin-field-error" role="alert">{error}</small> : null}</label>
}

function SelectField({ label, value, onChange, options }) {
  const normalized = options.map((option) => typeof option === 'string' ? { value: option, label: option } : option)
  return <label className="native-content-editor__field"><span>{label}</span><select value={value || normalized[0].value} onChange={(event) => onChange(event.target.value)}>{normalized.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

function normalizeCsv(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

function normalizeLines(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

function normalizeAutomationDraft(value = {}) {
  return {
    enabled: Boolean(value.enabled),
    discoverNews: Boolean(value.discoverNews),
    startAt: String(value.startAt || '').trim(),
    blueskyActors: normalizeLines(value.blueskyActors),
    mastodonAccounts: normalizeLines(value.mastodonAccounts),
    coverageFeeds: normalizeLines(value.coverageFeeds),
    signatoriesUrl: String(value.signatoriesUrl || '').trim(),
  }
}

function campaignFingerprint(value) {
  if (!value) return ''
  const { updatedAt, ...stable } = value
  return JSON.stringify(stable)
}

function isProtectedAiCampaign(value) {
  return value?.id === AI_CAMPAIGN_ID || value?.slug === 'autistici-inventati'
}

function normalizeSectionOrder(value) {
  const requested = Array.isArray(value) ? value.filter((key) => CAMPAIGN_SECTION_KEYS.includes(key)) : []
  return [...new Set([...requested, ...CAMPAIGN_SECTION_KEYS])]
}

function defaultSectionTitle(section) {
  return {
    status: 'Campaign status', reporting: 'Reporting and context', letters: 'Letters and resources',
    act: 'Take action', graphics: 'Campaign media kit', updates: 'Campaign updates', timeline: 'Campaign timeline',
    coverage: 'Coverage and statements', sources: 'Primary sources', faq: 'Frequently asked questions',
    translations: 'Translations', signatories: 'Signatories', social: 'Social updates',
  }[section] || CAMPAIGN_SECTION_LABELS[section] || section
}
