import { Link, useParams, useSearchParams } from 'react-router-dom'
import { splitDisplayTitle } from '../lib/content'
import { extractPodcastEmbeds, isPodcastPiece } from '../lib/podcast'
import { PodcastEmbedBlock } from './PodcastEmbedBlock'
import { getProjectTheme } from '../lib/projectTheme'
import { getAdjacentPieces, getRelatedPieces } from '../lib/pieces-nav'

function RelatedPieceCard({ piece }) {
  const display = splitDisplayTitle(piece)
  return (
    <article className="piece-card">
      <div className="piece-card__meta">
        <span>{piece.primaryProject}</span>
        <span>{piece.type}</span>
      </div>
      <h3>
        <Link to={`/piece/${piece.slug}`}>{display.title}</Link>
      </h3>
      {display.subtitle ? <p className="piece-card__subtitle">{display.subtitle}</p> : null}
    </article>
  )
}

function PieceMetaPanel({ piece }) {
  const tags = piece.tags || []
  const printLinks = piece.relatedPrintLinks || []

  return (
    <aside className="piece-meta-panel">
      <div className="piece-meta-panel__section">
        <div className="piece-meta-panel__label">project</div>
        <p>{piece.primaryProject}</p>
      </div>

      <div className="piece-meta-panel__section">
        <div className="piece-meta-panel__label">type</div>
        <p>{piece.type}</p>
      </div>

      <div className="piece-meta-panel__section">
        <div className="piece-meta-panel__label">published</div>
        <p>{piece.publishedDateLabel}</p>
      </div>

      {piece.sourceUrl ? (
        <div className="piece-meta-panel__section">
          <div className="piece-meta-panel__label">source</div>
          <p><a href={piece.sourceUrl} target="_blank" rel="noreferrer">original post</a></p>
        </div>
      ) : null}

      {printLinks.length ? (
        <div className="piece-meta-panel__section">
          <div className="piece-meta-panel__label">print assets</div>
          <ul className="piece-meta-panel__list">
            {printLinks.map((entry, index) => (
              <li key={`${entry.url}-${index}`}>
                <a href={entry.url} target="_blank" rel="noreferrer">{entry.title || 'print link'}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tags.length ? (
        <div className="piece-meta-panel__section">
          <div className="piece-meta-panel__label">tags</div>
          <div className="piece-tag-list">
            {tags.slice(0, 14).map((tag) => (
              <span className="piece-tag" key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  )
}

export function PiecePage({ pieces }) {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'experience' ? 'experience' : 'reading'

  const piece = pieces.find((entry) => entry.slug === slug)

  if (!piece) {
    return (
      <main className="page piece-page">
        <div className="missing-state">
          <h1>Piece not found</h1>
          <p>This archive entry has not been imported yet or the slug changed during migration.</p>
        </div>
      </main>
    )
  }

  const display = splitDisplayTitle(piece)
  const podcastEmbeds = extractPodcastEmbeds(piece)
  const podcastLike = isPodcastPiece(piece)
  const theme = getProjectTheme(piece.primaryProjectSlug || piece.primaryProject)
  const { previous, next } = getAdjacentPieces(pieces, piece.slug)
  const related = getRelatedPieces(pieces, piece)

  return (
    <main className={`page piece-page piece-page--${mode} ${theme.className}`}>
      <header
        className={`piece-header${piece.heroImage ? ' piece-header--image' : ''}`}
        style={piece.heroImage ? {
          backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.42), rgba(8,8,8,0.78)), url(${piece.heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <div className="piece-header__eyebrow">{theme.accent}</div>
        <h1>{display.title}</h1>
        {display.subtitle ? <p className="piece-header__subtitle">{display.subtitle}</p> : null}
        <div className="hero__meta">
          <span>{piece.primaryProject}</span>
          <span>{piece.type}</span>
          <span>{piece.publishedDateLabel}</span>
          <span>{piece.author}</span>
        </div>

        <nav className="mode-toggle">
          <Link to={`/piece/${piece.slug}`}>reading</Link>
          <Link to={`/piece/${piece.slug}?mode=experience`}>experience</Link>
          <Link to={`/piece/${piece.slug}/print`}>print</Link>
        </nav>
      </header>

      {podcastLike ? <PodcastEmbedBlock embeds={podcastEmbeds} piece={piece} /> : null}

      {mode === 'experience' ? (
        <section className="experience-banner">
          <div className="experience-banner__inner">
            <span>this is not a conclusion</span>
            <span>it is a beginning</span>
          </div>
        </section>
      ) : null}

      <section className={`piece-layout piece-layout--${mode} piece-layout--with-meta`}>
        <article
          className="piece-body-wrap"
          dangerouslySetInnerHTML={{ __html: piece.bodyHtml }}
        />
        <PieceMetaPanel piece={piece} />
      </section>

      {(previous || next) ? (
        <section className="piece-nav-grid">
          {previous ? (
            <Link className="piece-nav-card" to={`/piece/${previous.slug}`}>
              <span className="piece-nav-card__label">older</span>
              <strong>{splitDisplayTitle(previous).title}</strong>
            </Link>
          ) : <div />}

          {next ? (
            <Link className="piece-nav-card piece-nav-card--next" to={`/piece/${next.slug}`}>
              <span className="piece-nav-card__label">newer</span>
              <strong>{splitDisplayTitle(next).title}</strong>
            </Link>
          ) : <div />}
        </section>
      ) : null}

      {related.length ? (
        <>
          <section className="section-heading">
            <p>Keep going</p>
            <h2>Related pieces</h2>
          </section>
          <section className="piece-grid">
            {related.map((entry) => (
              <RelatedPieceCard key={entry.slug} piece={entry} />
            ))}
          </section>
        </>
      ) : null}
    </main>
  )
}
