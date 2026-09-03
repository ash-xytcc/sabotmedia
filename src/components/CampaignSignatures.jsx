import { useEffect, useMemo, useState } from 'react'
import { loadCampaignSignatures, loadManagedSignature, submitCampaignSignature, updateManagedSignature } from '../lib/campaignSignaturesApi'
import '../campaign-signatures.css'

export function CampaignSignatures({ campaign, title = 'Who has signed' }) {
  const slug = campaign?.slug || ''
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [signerType, setSignerType] = useState('individual')
  const [form, setForm] = useState(() => ({ displayName: '', affiliation: '', email: '', organizationName: '', contactName: '', role: '', website: '', company: '', formStartedAt: Date.now() }))
  const [submitState, setSubmitState] = useState('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const manageToken = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const match = String(window.location.hash || '').match(/^#manage-signature=(.+)$/)
    if (!match) return ''
    try { return decodeURIComponent(match[1]) } catch { return '' }
  }, [])
  const [managed, setManaged] = useState(null)
  const [manageState, setManageState] = useState('idle')

  async function refresh() {
    if (!slug) return
    try {
      setData(await loadCampaignSignatures(slug))
      setLoadError('')
    } catch (error) {
      setLoadError(String(error?.message || error))
    }
  }

  useEffect(() => { refresh() }, [slug])

  useEffect(() => {
    function scrollToSignatories({ smooth = false } = {}) {
      if (window.location.hash !== '#signatories') return
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          document.getElementById('signatories')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
        }, 0)
      })
    }

    function handleAnchorClick(event) {
      const anchor = event.target?.closest?.('a[href="#signatories"]')
      if (!anchor) return
      event.preventDefault()
      window.history.pushState(null, '', '#signatories')
      scrollToSignatories({ smooth: true })
    }

    scrollToSignatories()
    document.addEventListener('click', handleAnchorClick)
    window.addEventListener('hashchange', scrollToSignatories)
    return () => {
      document.removeEventListener('click', handleAnchorClick)
      window.removeEventListener('hashchange', scrollToSignatories)
    }
  }, [])

  useEffect(() => {
    if (!manageToken) return
    loadManagedSignature(manageToken).then((result) => { setManaged(result.item); window.requestAnimationFrame(() => document.getElementById('signatories')?.scrollIntoView({ block: 'start' })) }).catch(() => setManaged(null))
  }, [manageToken])

  function patch(key, value) { setForm((current) => ({ ...current, [key]: value })) }

  async function submit(event) {
    event.preventDefault()
    if (submitState === 'sending') return
    setSubmitState('sending')
    setSubmitMessage('')
    try {
      const result = await submitCampaignSignature(slug, { ...form, signerType })
      setSubmitState('sent')
      setSubmitMessage(result.message || 'Check your email for the verification link.')
      setForm({ displayName: '', affiliation: '', email: '', organizationName: '', contactName: '', role: '', website: '', company: '', formStartedAt: Date.now() })
    } catch (error) {
      setSubmitState('error')
      setSubmitMessage(String(error?.message || error))
    }
  }

  async function saveManaged(patchValue) {
    if (!manageToken || manageState === 'saving') return
    setManageState('saving')
    try {
      const result = await updateManagedSignature(manageToken, patchValue)
      setManaged(result.item)
      setManageState('saved')
      await refresh()
    } catch {
      setManageState('error')
    }
  }

  const counts = data?.counts || { individuals: 0, organizations: 0, total: 0 }
  const organizations = data?.organizations || []
  const individuals = data?.individuals || []
  const enabled = Boolean(data?.form?.enabled)

  return (
    <section className="campaign-section campaign-section--signatures" id="signatories">
      <div className="campaign-shell">
        <header className="campaign-section-heading">
          <p>OPEN LETTER</p>
          <h2>{title}</h2>
          <div className="campaign-signature-count" aria-live="polite"><strong>{counts.individuals} PEOPLE</strong><span>+</span><strong>{counts.organizations} ORGANIZATIONS</strong><span>HAVE SIGNED</span></div>
        </header>

        {manageToken && managed ? <aside className="campaign-signature-manage">
          <div><p>PRIVATE SIGNATURE MANAGEMENT</p><h3>Your signature</h3><small>Status: {statusLabel(managed.status)}</small></div>
          {managed.status !== 'revoked' ? <>
            <label><span>Display name</span><input value={managed.displayName || ''} onChange={(event) => setManaged((item) => ({ ...item, displayName: event.target.value }))} /></label>
            <label><span>Affiliation</span><input value={managed.affiliation || ''} onChange={(event) => setManaged((item) => ({ ...item, affiliation: event.target.value }))} /></label>
            <div className="campaign-signature-manage__actions"><button type="button" onClick={() => saveManaged({ displayName: managed.displayName, affiliation: managed.affiliation })}>Save public details</button><button className="is-danger" type="button" onClick={() => { if (window.confirm('Remove your signature from the open letter?')) saveManaged({ revoke: true }) }}>Remove my signature</button></div>
          </> : <p>Your signature has been removed and is no longer public.</p>}
          <small>{manageState === 'saved' ? 'Saved.' : manageState === 'error' ? 'Could not save that change.' : ''}</small>
        </aside> : null}

        <div className="campaign-signature-layout">
          {enabled ? <form className="campaign-signature-form" onSubmit={submit}>
            <div className="campaign-signature-form__intro"><h3>{data.form.title || 'Sign the open letter'}</h3><p>{data.form.intro}</p></div>
            <div className="campaign-signature-type" role="group" aria-label="Signer type"><button type="button" className={signerType === 'individual' ? 'is-active' : ''} onClick={() => setSignerType('individual')}>Individual</button><button type="button" className={signerType === 'organization' ? 'is-active' : ''} onClick={() => setSignerType('organization')}>Organization / collective</button></div>
            {signerType === 'individual' ? <>
              <Field label="Public display name" required value={form.displayName} onChange={(value) => patch('displayName', value)} />
              <Field label="Affiliation (optional)" value={form.affiliation} onChange={(value) => patch('affiliation', value)} />
            </> : <>
              <Field label="Organization / collective name" required value={form.organizationName} onChange={(value) => patch('organizationName', value)} />
              <Field label="Contact name" required value={form.contactName} onChange={(value) => patch('contactName', value)} />
              <Field label="Role / relationship to organization" required value={form.role} onChange={(value) => patch('role', value)} />
              <Field label="Organization website (optional)" type="url" value={form.website} onChange={(value) => patch('website', value)} />
            </>}
            <Field label="Email address" type="email" required value={form.email} onChange={(value) => patch('email', value)} />
            <label className="campaign-signature-honeypot" aria-hidden="true"><span>Company</span><input tabIndex="-1" autoComplete="off" value={form.company} onChange={(event) => patch('company', event.target.value)} /></label>
            <p className="campaign-signature-privacy">Your email and private contact information are used for verification and moderation only. They are never shown on the public signer list. Email verification does not publish a signature. A Sabot moderator must approve it.</p>
            <button className="campaign-button campaign-button--dark" type="submit" disabled={submitState === 'sending'}>{submitState === 'sending' ? 'Submitting…' : 'Submit signature'}</button>
            {submitMessage ? <p className={`campaign-signature-message is-${submitState}`} role="status">{submitMessage}</p> : null}
          </form> : null}

          <div className="campaign-signature-public-list">
            {loadError ? <p className="campaign-signature-message is-error">The signer list is temporarily unavailable.</p> : null}
            <SignerGroup title="Organizations / Collectives" items={organizations} />
            <SignerGroup title="Individuals" items={individuals} />
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return <label className="campaign-signature-field"><span>{label}</span><input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></label>
}

function SignerGroup({ title, items }) {
  return <section className="campaign-signature-group"><div className="campaign-signature-group__header"><h3>{title}</h3><span>{items.length}</span></div>{items.length ? <ol>{items.map((item) => <li key={item.id}><div><strong>{item.website ? <a href={item.website} target="_blank" rel="noreferrer">{publicName(item)}</a> : publicName(item)}</strong>{item.affiliation ? <small>{item.affiliation}</small> : null}{item.signerType === 'organization' && item.role ? <small>{item.role}</small> : null}</div></li>)}</ol> : <p className="campaign-signature-empty">No approved signers in this group yet.</p>}</section>
}
function publicName(item) { return item.signerType === 'organization' ? item.organizationName || item.displayName : item.displayName }
function statusLabel(status) { return ({ pending_email: 'Awaiting email verification', awaiting_moderation: 'Verified, awaiting moderation', approved: 'Published', rejected: 'Not published', spam: 'Not published', revoked: 'Removed' })[status] || status }
