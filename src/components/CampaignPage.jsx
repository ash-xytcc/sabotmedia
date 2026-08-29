import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { loadCampaign, loadCampaignMonitor } from '../lib/campaignsApi'
import { loadPublishedNativePieces } from '../lib/nativePublicFeed'

const CAMPAIGN_SLUG = 'autistici-inventati'

export function CampaignPage() {
  const [campaign, setCampaign] = useState(null)
  const [pieces, setPieces] = useState([])
  const [monitor, setMonitor] = useState({ state: 'loading', data: null })
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [copyState, setCopyState] = useState('')

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        const [loadedCampaign, loadedPieces] = await Promise.all([
          loadCampaign(CAMPAIGN_SLUG),
          loadPublishedNativePieces().catch(() => []),
        ])
        if (cancelled) return
        setCampaign(loadedCampaign)
        setPieces(Array.isArray(loadedPieces) ? loadedPieces : [])
      } catch (err) {
        if (!cancelled) setError(String(err?.message || err))
      }
    }
    boot()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function refresh() {
      try {
        const data = await loadCampaignMonitor()
        if (!cancelled) setMonitor({ state: data?.ok ? 'loaded' : 'unavailable', data })
      } catch (err) {
        if (!cancelled) setMonitor({ state: 'unavailable', data: { error: String(err?.message || err) } })
      }
    }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [])

  const campaignPieces = useMemo(() => findCampaignPieces(pieces, campaign), [pieces, campaign])
  const letterPieces = campaignPieces.filter((piece) => /letter/i.test(String(piece.title || '')))
  const reportingPieces = campaignPieces.filter((piece) => !letterPieces.includes(piece))
  const graphics = useMemo(() => mergeGraphics(campaign?.graphics || [], campaignPieces), [campaign, campaignPieces])
  const updates = useMemo(() => sortByDate(campaign?.updates || []), [campaign])
  const coverage = useMemo(() => sortByDate(campaign?.coverage || []), [campaign])
  const social = useMemo(() => sortByDate(campaign?.social || []), [campaign])
  const deadline = campaign?.deadline ? new Date(campaign.deadline).getTime() : NaN
  const countdown = Number.isFinite(deadline) ? formatCountdown(deadline - now) : null

  async function copyCampaignLink() {
    const url = window.location.href.split('#')[0]
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('Copied')
      window.setTimeout(() => setCopyState(''), 1800)
    } catch {
      setCopyState('Copy failed')
    }
  }

  async function shareCampaign() {
    const url = window.location.href.split('#')[0]
    if (navigator.share) {
      try {
        await navigator.share({ title: campaign?.title || 'Communications Infrastructure Is Not Terrorism', text: campaign?.shortTitle || 'Defend Autistici/Inventati', url })
        return
      } catch { /* user cancelled or sharing is unavailable */ }
    }
    copyCampaignLink()
  }

  if (error) {
    return (
      <main className="page campaign-page campaign-page--error">
        <PublicationTopbar />
        <section className="campaign-shell campaign-error"><p className="campaign-kicker">CAMPAIGN HUB</p><h1>Campaign data unavailable</h1><p>{error}</p></section>
        <PublicationFooter />
      </main>
    )
  }

  if (!campaign) {
    return (
      <main className="page campaign-page campaign-page--loading">
        <PublicationTopbar />
        <section className="campaign-shell campaign-loading"><p className="campaign-kicker">CAMPAIGN HUB</p><h1>Loading campaign...</h1></section>
        <PublicationFooter />
      </main>
    )
  }

  const pinnedUpdate = updates.find((item) => item.pinned) || updates[0]
  const isPastDeadline = Number.isFinite(deadline) && deadline <= now

  return (
    <main className="page campaign-page" data-campaign={campaign.slug}>
      <PublicationTopbar />

      <section className="campaign-hero" id="top">
        <div className="campaign-hero__noise" aria-hidden="true" />
        <div className="campaign-shell campaign-hero__inner">
          <div className="campaign-hero__copy">
            <div className="campaign-hero__flags">
              <span className="campaign-stamp">{campaign.kicker || 'CAMPAIGN'}</span>
              <span className={`campaign-status campaign-status--${campaign.campaignStatus}`}>{campaign.campaignStatus}</span>
            </div>
            <h1>{campaign.title}</h1>
            <p className="campaign-hero__short">{campaign.shortTitle}</p>
            <p className="campaign-hero__deck">{campaign.deck}</p>
            <div className="campaign-hero__actions">
              <a className="campaign-button campaign-button--light" href="#letters">Read the letters</a>
              <a className="campaign-button campaign-button--dark" href="#reporting">Read the reporting</a>
              <button className="campaign-button campaign-button--ghost" type="button" onClick={shareCampaign}>Share campaign</button>
            </div>
            <p className="campaign-hero__partners">Independent campaign by {campaign.partners.join(' × ')}</p>
          </div>

          <div className="campaign-hero__poster" aria-label={campaign.heroAlt || campaign.shortTitle}>
            {campaign.heroImage ? <img src={campaign.heroImage} alt={campaign.heroAlt || ''} /> : (
              <div className="campaign-hero__poster-fallback" aria-hidden="true">
                <span>BEFORE SEPT 25TH</span>
                <strong>COMMUNICATIONS<br />INFRASTRUCTURE<br />IS NOT<br />TERRORISM</strong>
                <small>DEFEND AUTISTICI/INVENTATI</small>
              </div>
            )}
          </div>
        </div>
      </section>

      <nav className="campaign-local-nav" aria-label="Campaign sections">
        <div className="campaign-shell">
          <a href="#status">Status</a>
          <a href="#act">Act</a>
          <a href="#reporting">Reporting</a>
          <a href="#letters">Letters</a>
          <a href="#updates">Updates</a>
          <a href="#graphics">Graphics</a>
          <a href="#social">Social</a>
          <a href="#sources">Sources</a>
        </div>
      </nav>

      {pinnedUpdate ? (
        <section className="campaign-latest">
          <div className="campaign-shell campaign-latest__inner">
            <span>LATEST</span>
            <time dateTime={pinnedUpdate.date}>{formatDateTime(pinnedUpdate.date)}</time>
            <strong>{pinnedUpdate.title}</strong>
            <p>{pinnedUpdate.body}</p>
            {pinnedUpdate.url ? <SmartLink href={pinnedUpdate.url}>Open update</SmartLink> : null}
          </div>
        </section>
      ) : null}

      <section className="campaign-section campaign-section--status" id="status">
        <div className="campaign-shell">
          <SectionHeading eyebrow="LIVE CAMPAIGN DASHBOARD" title="What is happening now" />
          <div className="campaign-status-grid">
            <article className="campaign-metric campaign-metric--deadline">
              <span className="campaign-metric__label">SEPT. 25</span>
              <strong>{isPastDeadline ? 'Deadline passed' : countdown?.primary || 'Tracking deadline'}</strong>
              <p>{isPastDeadline ? 'This page remains the permanent campaign record. Updates continue below.' : countdown?.secondary || 'Campaign deadline'}</p>
            </article>
            <MonitorCard monitor={monitor} sourceUrl={campaign.monitorUrl} label={campaign.monitorLabel} />
            <article className="campaign-metric">
              <span className="campaign-metric__label">CAMPAIGN FEED</span>
              <strong>Follow every update</strong>
              <p>Campaign updates have their own direct RSS feed, because an organizing campaign should not require an algorithm to remain visible.</p>
              <a href={`/feeds/campaigns/${campaign.slug}.xml`}>Subscribe to RSS ↗</a>
            </article>
          </div>
        </div>
      </section>

      <section className="campaign-section campaign-section--act" id="act">
        <div className="campaign-shell">
          <SectionHeading eyebrow="FIVE MINUTES IS ENOUGH TO START" title="Do something useful" />
          <div className="campaign-action-grid">
            {(campaign.actions || []).map((action, index) => (
              <article className="campaign-action-card" key={action.id || index}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{action.title}</h3>
                <p>{action.body}</p>
                <SmartLink href={action.href || '#'}>{action.label || 'Open'}</SmartLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="campaign-section" id="reporting">
        <div className="campaign-shell">
          <SectionHeading eyebrow="REPORTING + CONTEXT" title="Read before you repeat" description="The campaign is anchored in reporting, not vibes. These are the Sabot pieces currently connected to the A/I campaign." />
          <PieceGrid pieces={reportingPieces} empty="Campaign reporting will appear here as relevant published posts are detected." />
          <ResourceStrip resources={(campaign.resources || []).filter((item) => !/letter/i.test(item.type || item.title))} />
        </div>
      </section>

      <section className="campaign-section campaign-section--paper" id="letters">
        <div className="campaign-shell">
          <SectionHeading eyebrow="LETTERS" title="Read it. Sign it. Send it." description="Use the organizational letter or the individual template, then send it directly to the relevant institutions and decision-makers." />
          <PieceGrid pieces={letterPieces} empty="Letter downloads are temporarily unavailable. The reporting section remains available while they are restored." />
          <ResourceStrip resources={(campaign.resources || []).filter((item) => /letter|pdf|template/i.test(`${item.type} ${item.title}`))} />
        </div>
      </section>

      <section className="campaign-section campaign-section--updates" id="updates">
        <div className="campaign-shell">
          <SectionHeading eyebrow="LIVE UPDATES" title="Campaign log" description="Short, timestamped updates keep the page current without rewriting the investigation every time something changes." />
          <div className="campaign-update-list">
            {updates.length ? updates.map((item) => (
              <article className={`campaign-update${item.pinned ? ' is-pinned' : ''}`} key={item.id}>
                <div className="campaign-update__date"><time dateTime={item.date}>{formatDate(item.date)}</time>{item.pinned ? <span>PINNED</span> : null}</div>
                <div><h3>{item.title}</h3><p>{item.body}</p>{item.url ? <SmartLink href={item.url}>Source / more ↗</SmartLink> : null}</div>
              </article>
            )) : <EmptyState>Updates will appear here as the campaign develops.</EmptyState>}
          </div>
        </div>
      </section>

      <section className="campaign-section" id="graphics">
        <div className="campaign-shell">
          <SectionHeading eyebrow="CAMPAIGN KIT" title="Take the graphics" description="Download, repost, print and remix. Each card includes its full-resolution original, accessible alt text and a ready-to-use caption." />
          {graphics.length ? (
            <div className="campaign-graphics-grid">
              {graphics.map((graphic) => (
                <figure className="campaign-graphic" key={graphic.id || graphic.imageUrl}>
                  <a href={graphic.downloadUrl || graphic.imageUrl} target="_blank" rel="noreferrer"><img src={graphic.imageUrl} alt={graphic.alt || ''} loading="lazy" /></a>
                  <figcaption><strong>{graphic.title || 'Campaign graphic'}</strong>{graphic.caption ? <p>{graphic.caption}</p> : null}<div className="campaign-graphic__actions"><a href={graphic.downloadUrl || graphic.imageUrl} target="_blank" rel="noreferrer" download>Open / download ↗</a><CopyButton value={graphic.alt} label="Copy alt text" /><CopyButton value={graphic.caption} label="Copy caption" /></div></figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="campaign-section campaign-section--social" id="social">
        <div className="campaign-shell">
          <SectionHeading eyebrow="SOCIAL CIRCULATION" title="Follow the signal, not the algorithm" description="A curated wall of campaign posts and useful circulation. This stays intentionally source-linked instead of depending on a third-party embed script to keep functioning." />
          <div className="campaign-share-row">
            <a className="campaign-button campaign-button--light" href={`https://bsky.app/intent/compose?text=${encodeURIComponent(`${campaign.shortTitle}\n\n${window.location.href.split('#')[0]}`)}`} target="_blank" rel="noreferrer">Post to Bluesky ↗</a>
            <button className="campaign-button campaign-button--ghost" type="button" onClick={copyCampaignLink}>{copyState || 'Copy campaign link'}</button>
          </div>
          {social.length ? (
            <div className="campaign-social-feed">
              {social.map((item) => (
                <article className="campaign-social-post" key={item.id}>
                  <div className="campaign-social-post__meta"><span>{item.platform || 'SOCIAL'}</span><span>{item.account}</span><span>{item.handle}</span><time dateTime={item.date}>{formatDate(item.date)}</time></div>
                  {item.contentWarning ? <p className="campaign-social-post__warning">Content warning: {item.contentWarning}</p> : null}
                  {(item.images?.length ? item.images : item.imageUrl ? [{ url: item.imageUrl, alt: '' }] : []).map((image) => <img key={image.url} src={image.url} alt={image.alt || ''} loading="lazy" />)}
                  <p>{item.text || item.excerpt}</p>
                  {item.external?.url ? <a className="campaign-social-post__external" href={item.external.url} target="_blank" rel="noreferrer"><strong>{item.external.title || item.external.url}</strong>{item.external.description ? <span>{item.external.description}</span> : null}</a> : null}
                  {item.url ? <a href={item.url} target="_blank" rel="noreferrer">Open original post ↗</a> : null}
                </article>
              ))}
            </div>
          ) : <EmptyState>No matching public campaign posts are available from the live sources right now.</EmptyState>}
          {campaign.socialErrors?.length ? <p className="campaign-source-error">Some public social sources could not be reached. The rest of the campaign remains available.</p> : null}
        </div>
      </section>

      {campaign.timeline?.length ? (
        <section className="campaign-section campaign-section--timeline" id="timeline">
          <div className="campaign-shell">
            <SectionHeading eyebrow="TIMELINE" title="How we got here" />
            <div className="campaign-timeline">
              {sortByDate(campaign.timeline, false).map((item) => <article key={item.id}><time>{formatDate(item.date)}</time><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}
            </div>
          </div>
        </section>
      ) : null}

      <section className="campaign-section" id="coverage">
        <div className="campaign-shell">
          <SectionHeading eyebrow="PRESS + RESPONSE" title="Coverage and statements" />
          {coverage.length ? <LinkList items={coverage.map((item) => ({ id: item.id, eyebrow: [item.outlet, formatDate(item.date)].filter(Boolean).join(' / '), title: item.title, body: item.summary, url: item.url }))} /> : <EmptyState>Press coverage, statements, interviews, and external analysis can be added here as they appear.</EmptyState>}
        </div>
      </section>

      <section className="campaign-section campaign-section--sources" id="sources">
        <div className="campaign-shell">
          <SectionHeading eyebrow="PRIMARY SOURCES" title="Check the receipts" description="Government material, A/I statements, legal analysis, historical documents, and other primary sources belong here so readers and journalists can verify the campaign without reverse-engineering footnotes." />
          {campaign.sources?.length ? <LinkList items={campaign.sources.map((item) => ({ id: item.id, eyebrow: item.publisher, title: item.title, body: item.note, url: item.url }))} /> : <p className="campaign-reader-note">The reporting above retains its article-level citations and primary-source links.</p>}
        </div>
      </section>

      {campaign.faq?.length ? (
        <section className="campaign-section campaign-section--faq" id="faq">
          <div className="campaign-shell">
            <SectionHeading eyebrow="FAQ" title="The questions people keep asking" />
            <div className="campaign-faq">
              {campaign.faq.map((item) => <details key={item.id}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
            </div>
          </div>
        </section>
      ) : null}

      {campaign.translations?.length ? (
        <section className="campaign-section" id="translations">
          <div className="campaign-shell"><SectionHeading eyebrow="TRANSLATIONS" title="Circulate it further" /><LinkList items={campaign.translations.map((item) => ({ id: item.id, eyebrow: item.language, title: item.title, url: item.url }))} /></div>
        </section>
      ) : null}

      <section className="campaign-disclaimer">
        <div className="campaign-shell">
          <strong>INDEPENDENT CAMPAIGN</strong>
          <p>{campaign.disclaimer}</p>
          <div><a href="#top">Back to top ↑</a><a href={`/feeds/campaigns/${campaign.slug}.xml`}>Campaign RSS ↗</a>{campaign.monitorUrl ? <a href={campaign.monitorUrl} target="_blank" rel="noreferrer">Original A/I monitor ↗</a> : null}</div>
        </div>
      </section>

      <PublicationFooter />
    </main>
  )
}

function MonitorCard({ monitor, sourceUrl, label }) {
  const data = monitor.data
  const overall = String(data?.overall || (monitor.state === 'loading' ? 'loading' : 'unknown'))
  const monitors = Array.isArray(data?.monitors) ? data.monitors : []
  return (
    <article className={`campaign-metric campaign-monitor campaign-monitor--${overall}`} id="monitor">
      <span className="campaign-metric__label">LIVE / EXTERNAL</span>
      <div className="campaign-monitor__headline"><i aria-hidden="true" /><strong>{monitor.state === 'loading' ? 'Checking A/I monitor…' : statusText(overall)}</strong></div>
      <p>{label || 'A/I infrastructure monitor'}{data?.checkedAt ? ` · checked ${formatTime(data.checkedAt)}` : ''}</p>
      {monitors.length ? <div className="campaign-monitor__services">{monitors.slice(0, 8).map((item) => <span key={item.id}><i className={`is-${item.status}`} aria-hidden="true" />{item.name}{item.uptime24h != null ? <small>{(item.uptime24h * 100).toFixed(item.uptime24h >= 0.9995 ? 2 : 1)}%</small> : null}</span>)}</div> : null}
      {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer">Open original monitor ↗</a> : null}
      {monitor.state === 'unavailable' ? <small className="campaign-monitor__note">Sabot could not read the public Kuma data just now. This does not mean A/I is down; use the original monitor above.</small> : null}
    </article>
  )
}

function SectionHeading({ eyebrow, title, description = '' }) {
  return <header className="campaign-section-heading"><p>{eyebrow}</p><h2>{title}</h2>{description ? <div>{description}</div> : null}</header>
}

function PieceGrid({ pieces, empty }) {
  if (!pieces.length) return <EmptyState>{empty}</EmptyState>
  return (
    <div className="campaign-piece-grid">
      {pieces.slice(0, 12).map((piece) => (
        <article className="campaign-piece-card" key={piece.id || piece.slug}>
          {piece.featuredImage || piece.heroImage || piece.imageUrl ? <Link className="campaign-piece-card__image" to={`/post/${piece.slug}`}><img src={piece.featuredImage || piece.heroImage || piece.imageUrl} alt={piece.featuredImageAlt || ''} loading="lazy" /></Link> : null}
          <div className="campaign-piece-card__body"><p>{formatDate(piece.publishedAt || piece.updatedAt)} / {String(piece.contentType || piece.type || 'article').toUpperCase()}</p><h3><Link to={`/post/${piece.slug}`}>{piece.title}</Link></h3>{piece.excerpt ? <div>{stripHtml(piece.excerpt).slice(0, 220)}</div> : null}<Link to={`/post/${piece.slug}`}>Read ↗</Link></div>
        </article>
      ))}
    </div>
  )
}

function ResourceStrip({ resources = [] }) {
  if (!resources.length) return null
  return <div className="campaign-resource-strip">{resources.map((item) => <article key={item.id}><span>{item.type || 'RESOURCE'}</span><h3>{item.title}</h3>{item.description ? <p>{item.description}</p> : null}<SmartLink href={item.href}>{item.label || 'Open resource'} ↗</SmartLink></article>)}</div>
}

function LinkList({ items }) {
  return <div className="campaign-link-list">{items.map((item) => <article key={item.id}><p>{item.eyebrow}</p><h3>{item.url ? <SmartLink href={item.url}>{item.title}</SmartLink> : item.title}</h3>{item.body ? <div>{item.body}</div> : null}</article>)}</div>
}

function EmptyState({ children }) {
  return <div className="campaign-empty-state"><span>OPEN SLOT</span><p>{children}</p></div>
}

function SmartLink({ href = '#', children }) {
  const value = String(href || '#')
  if (value.startsWith('/')) return <Link to={value}>{children}</Link>
  if (value.startsWith('#')) return <a href={value}>{children}</a>
  return <a href={value} target="_blank" rel="noreferrer">{children}</a>
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600) } catch { setCopied(false) } }}>{copied ? 'Copied' : label}</button>
}

function findCampaignPieces(pieces, campaign) {
  if (!Array.isArray(pieces) || !campaign) return []
  const exactSlugs = new Set(['the-us-designated-a-25-year-old-volunteer-communications-collective-a-terrorist-organization', 'communications-infrastructure-is-not-terrorism', 'open-letter-defend-autistici-inventati', 'individual-letter-defend-autistici-inventati'])
  return pieces.filter((piece) => {
    const explicit = [...(piece.tags || []), ...(piece.collections || []), ...(piece.projects || []), piece.primaryProject]
      .map((item) => String(item || '').toLowerCase())
      .some((item) => item.includes('autistici') || item.includes('inventati') || item.includes('a/i campaign'))
    if (explicit || exactSlugs.has(String(piece.slug || '').toLowerCase())) return true
    const title = String(piece.title || '').toLowerCase()
    return /autistici(?:\s*\/\s*|\s+)?inventati/.test(title) || (/communications infrastructure/.test(title) && /terrorism|sanction|designation/.test(title))
  }).sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0))
}

function mergeGraphics(configured, pieces) {
  const output = []
  const seen = new Set()
  for (const item of configured || []) {
    const url = String(item.imageUrl || '').trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    output.push(item)
  }
  for (const piece of pieces || []) {
    const url = String(piece.featuredImage || piece.heroImage || piece.imageUrl || '').trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    output.push({ id: `piece-${piece.id || piece.slug}`, title: piece.title, imageUrl: url, alt: piece.featuredImageAlt || '', caption: piece.featuredImageCaption || '', downloadUrl: url })
  }
  return output
}

function sortByDate(items, descending = true) {
  return [...(items || [])].sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime() || 0
    const bTime = new Date(b.date || 0).getTime() || 0
    return descending ? bTime - aTime : aTime - bTime
  })
}

function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return { primary: 'Deadline passed', secondary: '' }
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return { primary: `${days} day${days === 1 ? '' : 's'} remaining`, secondary: `${hours} hours beyond the full days` }
  const minutes = Math.max(0, Math.floor((ms % 3600000) / 60000))
  return { primary: `${hours}h ${minutes}m remaining`, secondary: 'The deadline is close' }
}

function statusText(status) {
  if (status === 'operational') return 'A/I monitor: operational'
  if (status === 'major-outage') return 'A/I monitor: major outage'
  if (status === 'partial-outage') return 'A/I monitor: partial outage'
  if (status === 'maintenance') return 'A/I monitor: maintenance'
  return 'A/I monitor: monitor unavailable'
}

function formatDate(value) {
  const date = new Date(value || '')
  if (!Number.isFinite(date.getTime())) return String(value || '')
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function formatDateTime(value) {
  const date = new Date(value || '')
  if (!Number.isFinite(date.getTime())) return String(value || '')
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatTime(value) {
  const date = new Date(value || '')
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
