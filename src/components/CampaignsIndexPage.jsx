import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { loadCampaigns } from '../lib/campaignsApi'

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
    <header className="campaign-directory__hero"><div className="campaign-shell"><p className="campaign-kicker">SABOT CAMPAIGNS</p><h1>Campaign hubs</h1><p>Reporting, source records, public actions, live updates, and materials organized around urgent cases.</p></div></header>
    <section className="campaign-directory__body"><div className="campaign-shell">
      {state === 'loading' ? <p className="campaign-reader-note">Loading active campaigns…</p> : null}
      {state === 'error' ? <p className="campaign-reader-note">Campaign listings are temporarily unavailable.</p> : null}
      {state === 'loaded' && !campaigns.length ? <p className="campaign-reader-note">No public campaigns are active right now.</p> : null}
      <div className="campaign-directory__grid">{campaigns.map((campaign) => <article key={campaign.id}>
        {campaign.heroImage ? <Link to={`/campaigns/${campaign.slug}`}><img src={campaign.heroImage} alt={campaign.heroAlt || ''} /></Link> : null}
        <div><span>{campaign.campaignStatus || 'campaign'}</span><h2><Link to={`/campaigns/${campaign.slug}`}>{campaign.title}</Link></h2><p>{campaign.deck || campaign.summary}</p><Link className="campaign-button campaign-button--dark" to={`/campaigns/${campaign.slug}`}>Open campaign →</Link></div>
      </article>)}</div>
    </div></section>
    <PublicationFooter />
  </main>
}
