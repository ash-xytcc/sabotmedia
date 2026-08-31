import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { loadCampaigns } from '../lib/campaignsApi'
import { EditableText } from './EditableText'
import { EditableLink } from './EditableLink'

export function CampaignsIndexPage() {
  const [campaigns, setCampaigns] = useState([])
  const [state, setState] = useState('loading')
  useEffect(() => {
    let cancelled = false
    loadCampaigns().then((items) => { if (!cancelled) { setCampaigns(items); setState('loaded') } }).catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [])
  return <main className="page campaign-page campaign-directory">
    <PublicationTopbar />
    <header className="campaign-directory__hero"><div className="campaign-shell">
      <EditableText as="p" className="campaign-kicker" field="campaigns.index.eyebrow">SABOT CAMPAIGNS</EditableText>
      <EditableText as="h1" field="campaigns.index.title">Campaign hubs</EditableText>
      <EditableText as="p" field="campaigns.index.description" multiline>Reporting, source records, public actions, live updates, and materials organized around urgent cases.</EditableText>
    </div></header>
    <section className="campaign-directory__body"><div className="campaign-shell">
      {state === 'loading' ? <EditableText as="p" className="campaign-reader-note" field="campaigns.index.loading">Loading active campaigns…</EditableText> : null}
      {state === 'error' ? <EditableText as="p" className="campaign-reader-note" field="campaigns.index.error">Campaign listings are temporarily unavailable.</EditableText> : null}
      {state === 'loaded' && !campaigns.length ? <EditableText as="p" className="campaign-reader-note" field="campaigns.index.empty">No public campaigns are active right now.</EditableText> : null}
      <div className="campaign-directory__grid">{campaigns.map((campaign) => <article key={campaign.id}>
        {campaign.heroImage ? <Link to={`/campaigns/${campaign.slug}`}><img src={campaign.heroImage} alt={campaign.heroAlt || ''} /></Link> : null}
        <div><span>{campaign.campaignStatus || 'campaign'}</span><h2><Link to={`/campaigns/${campaign.slug}`}>{campaign.title}</Link></h2><p>{campaign.deck || campaign.summary}</p><EditableLink className="campaign-button campaign-button--dark" labelField={`campaigns.index.${campaign.slug}.action.label`} hrefField={`campaigns.index.${campaign.slug}.action.href`} defaultLabel="Open campaign →" defaultHref={`/campaigns/${campaign.slug}`} /></div>
      </article>)}</div>
    </div></section>
    <PublicationFooter />
  </main>
}
