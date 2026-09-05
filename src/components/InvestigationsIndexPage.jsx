import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { EditableText } from './EditableText'

const INVESTIGATION_URL = 'https://sabot.media/investigations'

export function InvestigationsIndexPage() {
  async function shareHub() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sabot Media Investigations',
          text: 'Document-heavy reporting, source trails, timelines, and the finished reporting they support.',
          url: INVESTIGATION_URL,
        })
        return
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard?.writeText(INVESTIGATION_URL)
  }

  return (
    <main className="page campaign-page campaign-directory investigation-directory">
      <PublicationTopbar />
      <header className="campaign-directory__hero">
        <div className="campaign-shell campaign-directory__hero-grid">
          <div>
            <EditableText as="p" className="campaign-kicker" field="investigations.index.eyebrow">
              SABOT MEDIA · INVESTIGATIONS
            </EditableText>
            <EditableText as="h1" field="investigations.index.title">Investigations</EditableText>
          </div>
          <div className="campaign-directory__intro">
            <EditableText as="p" field="investigations.index.description" multiline>
              The working record behind major Sabot investigations: source trails, timelines, archived evidence, reporting notes, and the finished stories they support.
            </EditableText>
            <div className="campaign-directory__share">
              <button type="button" onClick={shareHub}>Share this hub</button>
            </div>
          </div>
        </div>
      </header>

      <section className="campaign-directory__body">
        <div className="campaign-shell">
          <div className="campaign-directory__summary">
            <div><strong>1</strong><span>Open investigation</span></div>
            <div><strong>1</strong><span>Published longform</span></div>
            <p>Investigation pages preserve the reporting trail. Finished articles remain separate, readable stories, with links running both directions instead of leaving readers to perform URL archaeology.</p>
          </div>

          <div className="campaign-directory__grid">
            <article className="campaign-directory-card campaign-directory-card--active" data-investigation="autistici-inventati">
              <Link className="campaign-directory-card__art" to="/investigations/autistici-inventati" aria-label="Open the Autistici/Inventati investigation">
                <span>01</span>
                <strong aria-hidden="true">A/I</strong>
              </Link>
              <div className="campaign-directory-card__body">
                <div className="campaign-directory-card__status">
                  <span className="campaign-directory-card__lifecycle is-active">Published</span>
                  <span>investigation</span>
                </div>
                <p className="campaign-directory-card__age">Published September 4, 2026 · source trail remains open</p>
                <h2><Link to="/investigations/autistici-inventati">How the A/I designation moved from advocacy into U.S. policy</Link></h2>
                <p>Follow the decision tree from the post-assassination push against “Antifa” through outside advocates, the White House, Congress, and counterterrorism policy before Autistici/Inventati was designated.</p>
                <div className="campaign-directory-card__inside">
                  <strong>Inside this investigation</strong>
                  <ul>
                    <li>Chronology and decision tree</li>
                    <li>Archived posts, statements, and government records</li>
                    <li>People and institutions involved</li>
                    <li>Direct link to the finished longform article</li>
                  </ul>
                </div>
                <div className="campaign-directory-card__actions">
                  <Link className="campaign-button campaign-button--dark" to="/investigations/autistici-inventati">Open investigation →</Link>
                  <Link to="/post/kirk-to-ai">Read the article →</Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
      <PublicationFooter />
    </main>
  )
}

export function AutisticiInventatiInvestigationPage() {
  return (
    <main className="page campaign-page campaign-directory investigation-directory">
      <PublicationTopbar />
      <header className="campaign-directory__hero">
        <div className="campaign-shell campaign-directory__hero-grid">
          <div>
            <p className="campaign-kicker">SABOT MEDIA · INVESTIGATION</p>
            <h1>From Kirk to A/I</h1>
          </div>
          <div className="campaign-directory__intro">
            <p>This page is the reporting map behind Sabot’s investigation of how a post-assassination campaign against “Antifa” moved through outside advocates, the White House, Congress, and U.S. counterterrorism policy before the August 26, 2026 designation of Autistici/Inventati.</p>
            <div className="campaign-directory__share">
              <Link className="campaign-button campaign-button--dark" to="/post/kirk-to-ai">Read the full investigation →</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="campaign-directory__body">
        <div className="campaign-shell">
          <div className="campaign-directory__summary">
            <div><strong>Aug. 26</strong><span>A/I designated</span></div>
            <div><strong>25 years</strong><span>A/I infrastructure history</span></div>
            <p>The finished article is the narrative. This page is the map: the sequence of public claims, policy steps, actors, records, and archived material used to understand how the designation happened.</p>
          </div>

          <div className="campaign-directory__grid">
            <article className="campaign-directory-card campaign-directory-card--active">
              <div className="campaign-directory-card__body">
                <div className="campaign-directory-card__status"><span>Start here</span><span>longform</span></div>
                <h2><Link to="/post/kirk-to-ai">Read: From Kirk to A/I</Link></h2>
                <p>The complete reported story, including the chronology, sourcing, institutional handoffs, and what the available record can and cannot establish.</p>
                <div className="campaign-directory-card__actions">
                  <Link className="campaign-button campaign-button--dark" to="/post/kirk-to-ai">Read the article →</Link>
                </div>
              </div>
            </article>

            <article className="campaign-directory-card campaign-directory-card--active">
              <div className="campaign-directory-card__body">
                <div className="campaign-directory-card__status"><span>Related</span><span>campaign</span></div>
                <h2><Link to="/campaigns/autistici-inventati">A/I campaign hub</Link></h2>
                <p>Open letters, interviews, updates, source material, infrastructure information, and public-action resources connected to the designation.</p>
                <div className="campaign-directory-card__actions">
                  <Link to="/campaigns/autistici-inventati">Open campaign →</Link>
                  <Link to="/campaigns/autistici-inventati/coverage">Coverage archive →</Link>
                </div>
              </div>
            </article>
          </div>

          <p className="campaign-reader-note"><Link to="/investigations">← All investigations</Link></p>
        </div>
      </section>
      <PublicationFooter />
    </main>
  )
}
