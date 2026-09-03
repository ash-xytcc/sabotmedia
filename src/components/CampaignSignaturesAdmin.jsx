import { useEffect, useMemo, useState } from 'react'
import { bulkModerateCampaignSignatures, campaignSignatureExportUrl, loadSignatureQueue, moderateCampaignSignature, resendCampaignSignatureVerification } from '../lib/campaignSignaturesApi'
import '../campaign-signatures.css'

const FILTERS = [
  ['all', 'All'],
  ['pending_email', 'Awaiting email verification'],
  ['awaiting_moderation', 'Awaiting moderation'],
  ['approved', 'Approved / Published'],
  ['rejected', 'Rejected'],
  ['spam', 'Spam'],
  ['revoked', 'Revoked / Removed'],
]

export function CampaignSignaturesAdmin({ campaign, onNotice = () => {} }) {
  const slug = campaign?.slug || ''
  const [status, setStatus] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(new Set())

  async function refresh(nextStatus = status) {
    if (!slug) return
    setLoading(true)
    try {
      const result = await loadSignatureQueue(slug, nextStatus)
      setItems(result.items || [])
      setSelected(new Set())
    } catch (error) { onNotice(`Signatures failed to load: ${String(error?.message || error)}`, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh(status) }, [slug, status])

  const counts = useMemo(() => items.reduce((map, item) => ({ ...map, [item.status]: (map[item.status] || 0) + 1 }), {}), [items])

  function toggle(id) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function toggleAll() { setSelected((current) => current.size === items.length ? new Set() : new Set(items.map((item) => item.id))) }

  async function act(item, action, patch = {}) {
    try {
      await moderateCampaignSignature(slug, item.id, action, patch)
      onNotice(action === 'approve' ? 'Signature published.' : action === 'revoke' ? 'Signature removed.' : `Signature marked ${action}.`, 'success')
      await refresh()
    } catch (error) { onNotice(`Signature action failed: ${String(error?.message || error)}`, 'error') }
  }

  async function bulk(action) {
    const ids = [...selected]
    if (!ids.length) return
    if (!window.confirm(`${action} ${ids.length} selected signature${ids.length === 1 ? '' : 's'}?`)) return
    try {
      const result = await bulkModerateCampaignSignatures(slug, ids, action)
      const failed = (result.results || []).filter((item) => !item.ok)
      onNotice(failed.length ? `${ids.length - failed.length} updated; ${failed.length} failed.` : `${ids.length} signatures updated.`, failed.length ? 'warning' : 'success')
      await refresh()
    } catch (error) { onNotice(`Bulk action failed: ${String(error?.message || error)}`, 'error') }
  }

  if (!slug) return null
  return <section className="wp-meta-box campaign-signature-admin">
    <div className="campaign-admin-section-header"><div><h2>Open Letter / Signatures</h2><p className="description">Verification proves control of the submitted email only. Nothing is public until a moderator approves it.</p></div><div><a className="button" href={campaignSignatureExportUrl(slug)}>Export CSV</a><button className="button" type="button" onClick={() => refresh()}>Refresh</button></div></div>
    <div className="campaign-signature-admin__filters" role="tablist" aria-label="Signature queue filters">{FILTERS.map(([key, label]) => <button type="button" role="tab" aria-selected={status === key} className={status === key ? 'is-active' : ''} key={key} onClick={() => setStatus(key)}>{label}{status === 'all' && key !== 'all' && counts[key] ? ` (${counts[key]})` : ''}</button>)}</div>
    <div className="campaign-signature-admin__bulk"><label><input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleAll} /> Select all visible</label><span>{selected.size} selected</span><button className="button" type="button" disabled={!selected.size} onClick={() => bulk('approve')}>Bulk approve</button><button className="button" type="button" disabled={!selected.size} onClick={() => bulk('reject')}>Bulk reject</button><button className="button" type="button" disabled={!selected.size} onClick={() => bulk('spam')}>Bulk spam</button></div>
    {loading ? <p>Loading signatures…</p> : null}
    {!loading && !items.length ? <p className="description">No signatures in this queue.</p> : null}
    <div className="campaign-signature-admin__list">{items.map((item) => <SignatureModerationCard key={item.id} item={item} checked={selected.has(item.id)} onToggle={() => toggle(item.id)} onAct={(action, patch) => act(item, action, patch)} onResend={async () => { try { await resendCampaignSignatureVerification(slug, item.id); onNotice('Verification email resent.', 'success') } catch (error) { onNotice(`Could not resend verification: ${String(error?.message || error)}`, 'error') } }} />)}</div>
  </section>
}

function SignatureModerationCard({ item, checked, onToggle, onAct, onResend }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => ({ displayName: item.displayName || '', affiliation: item.affiliation || '', organizationName: item.organizationName || '', role: item.role || '', website: item.website || '' }))
  const publicName = item.signerType === 'organization' ? item.organizationName || item.displayName : item.displayName
  return <article className={`campaign-signature-admin__card is-${item.status}`}>
    <header><label><input type="checkbox" checked={checked} onChange={onToggle} /><span className="screen-reader-only">Select {publicName}</span></label><div><p>{item.signerType === 'organization' ? 'ORGANIZATION / COLLECTIVE' : 'INDIVIDUAL'}</p><h3>{publicName || '(no public name)'}</h3><small>{statusLabel(item.status)} · submitted {formatDate(item.createdAt)}</small></div></header>
    <dl>
      {item.organizationName ? <><dt>Organization</dt><dd>{item.organizationName}</dd></> : null}
      {item.contactName ? <><dt>Contact</dt><dd>{item.contactName}</dd></> : null}
      {item.role ? <><dt>Role</dt><dd>{item.role}</dd></> : null}
      {item.affiliation ? <><dt>Affiliation</dt><dd>{item.affiliation}</dd></> : null}
      <dt>Email</dt><dd>{item.email || 'manual import'}</dd>
      {item.website ? <><dt>Website</dt><dd><a href={item.website} target="_blank" rel="noreferrer">{item.website}</a></dd></> : null}
      <dt>Verification</dt><dd>{item.verificationMethod === 'verified_manual' ? 'Manual legacy import' : item.verifiedAt ? `Verified ${formatDate(item.verifiedAt)}` : 'Not verified'}</dd>
      {item.websiteDomainMatch != null ? <><dt>Email / website domain</dt><dd>{item.websiteDomainMatch ? 'Appears to match' : 'Does not appear to match'} <small>(signal only)</small></dd></> : null}
    </dl>
    {(item.duplicateFlags?.length || item.abuseFlags?.length || item.priorRejectedOrSpamMatch) ? <div className="campaign-signature-admin__signals"><strong>Moderation signals</strong>{item.duplicateFlags?.length ? <span>Duplicate/repeat email: {item.duplicateFlags.join(', ')}</span> : null}{item.abuseFlags?.length ? <span>Abuse signals: {item.abuseFlags.join(', ')}</span> : null}{item.priorRejectedOrSpamMatch ? <span>Matches a prior rejected/spam email.</span> : null}<small>Signals never approve or reject a signer automatically.</small></div> : null}
    {editing ? <div className="campaign-signature-admin__edit"><EditField label="Display name" value={draft.displayName} onChange={(displayName) => setDraft((current) => ({ ...current, displayName }))} /><EditField label="Affiliation" value={draft.affiliation} onChange={(affiliation) => setDraft((current) => ({ ...current, affiliation }))} /><EditField label="Organization" value={draft.organizationName} onChange={(organizationName) => setDraft((current) => ({ ...current, organizationName }))} /><EditField label="Role" value={draft.role} onChange={(role) => setDraft((current) => ({ ...current, role }))} /><EditField label="Website" value={draft.website} onChange={(website) => setDraft((current) => ({ ...current, website }))} /><div><button className="button button--primary" type="button" onClick={() => { onAct(item.status === 'approved' ? 'approve' : item.status === 'awaiting_moderation' ? 'approve' : 'reject', draft); setEditing(false) }}>Save + apply action</button><button className="button" type="button" onClick={() => setEditing(false)}>Cancel</button></div></div> : null}
    <footer>
      {item.status === 'pending_email' ? <button className="button" type="button" onClick={onResend}>Resend verification</button> : null}
      {item.status === 'awaiting_moderation' ? <button className="button button--primary" type="button" onClick={() => onAct('approve', draft)}>Approve + publish</button> : null}
      {!['rejected','spam','revoked'].includes(item.status) ? <button className="button" type="button" onClick={() => onAct('reject')}>Reject</button> : null}
      {item.status !== 'spam' ? <button className="button" type="button" onClick={() => onAct('spam')}>Spam</button> : null}
      {item.status === 'approved' ? <button className="button button-link-delete" type="button" onClick={() => onAct('revoke')}>Remove / revoke</button> : null}
      <button className="button" type="button" onClick={() => setEditing((value) => !value)}>Edit public info</button>
    </footer>
  </article>
}
function EditField({ label, value, onChange }) { return <label><span>{label}</span><input value={value || ''} onChange={(event) => onChange(event.target.value)} /></label> }
function statusLabel(status) { return ({ pending_email: 'Awaiting email verification', awaiting_moderation: 'Awaiting moderation', approved: 'Approved / Published', rejected: 'Rejected', spam: 'Spam', revoked: 'Revoked / Removed' })[status] || status }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleString() }
