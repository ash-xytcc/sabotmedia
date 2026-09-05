import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { EditableText } from './EditableText'

const INVESTIGATION_URL = 'https://sabot.media/investigations'
const AI_INVESTIGATION_URL = '/investigations/autistici-inventati/'

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
              <a className="campaign-directory-card__art" href={AI_INVESTIGATION_URL} aria-label="Open the Autistici/Inventati investigation">
                <span>01</span>
                <strong aria-hidden="true">A/I</strong>
              </a>
              <div className="campaign-directory-card__body">
                <div className="campaign-directory-card__status">
                  <span className="campaign-directory-card__lifecycle is-active">Published</span>
                  <span>investigation</span>
                </div>
                <p className="campaign-directory-card__age">Published September 4, 2026 · source trail remains open</p>
                <h2><a href={AI_INVESTIGATION_URL}>How the A/I designation moved from advocacy into U.S. policy</a></h2>
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
                  <a className="campaign-button campaign-button--dark" href={AI_INVESTIGATION_URL}>Open investigation →</a>
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
