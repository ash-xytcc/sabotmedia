import { Link, useParams, useSearchParams } from 'react-router-dom'
import { splitDisplayTitle } from '../lib/content'
import { extractPodcastEmbeds, isPodcastPiece } from '../lib/podcast'
import { PodcastEmbedBlock } from './PodcastEmbedBlock'
import { getProjectTheme } from '../lib/projectTheme'
import { getAdjacentPieces, getRelatedPieces } from '../lib/pieces-nav'
import { EditableText } from './EditableText'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { getConfiguredBlock, getConfiguredText } from '../lib/publicConfig'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'

function RelatedPieceCard({ piece }) {
  const display = splitDisplayTitle(piece)
  return (
    <article className="piece-card">
      <div className="piece-card__meta">
        <span>{piece.primaryProject}</span>
        <span>{piece.type}</span>
      </div>
      <h3>
        <Link to={`/post/${piece.slug}`}>{display.title}</Link>
      </h3>
      {display.subtitle ? <p className="piece-card__subtitle">{display.subtitle}</p> : null}
    </article>
  )
}

function PieceMetaPanel({
  piece,
  metaBlock,
  resolvedConfig,
}) {
  const tags = piece.tags || []
  const printLinks = piece.relatedPrintLinks || []

  const projectLabel = getConfiguredText(resolvedConfig, metaBlock?.projectLabelField || 'piecePage.meta.projectLabel', 'project')
  const typeLabel = getConfiguredText(resolvedConfig, metaBlock?.typeLabelField || 'piecePage.meta.typeLabel', 'type')
  const publishedLabel = getConfiguredText(resolvedConfig, metaBlock?.publishedLabelField || 'piecePage.meta.publishedLabel', 'published')
  const sourceLabel = getConfiguredText(resolvedConfig, metaBlock?.sourceLabelField || 'piecePage.meta.sourceLabel', 'source')
  const sourceLinkLabel = getConfiguredText(resolvedConfig, metaBlock?.sourceLinkLabelField || 'piecePage.meta.sourceLinkLabel', 'original post')
  const printAssetsLabel = getConfiguredText(resolvedConfig, metaBlock?.printAssetsLabelField || 'piecePage.meta.printAssetsLabel', 'print assets')
  const tagsLabel = getConfiguredText(resolvedConfig, metaBlock?.tagsLabelField || 'piecePage.meta.tagsLabel', 'tags')
  const audioSummaryLabel = getConfiguredText(resolvedConfig, metaBlock?.audioSummaryLabelField || 'piecePage.meta.audioSummaryLabel', 'audio summary')
  const transcriptExcerptLabel = getConfiguredText(resolvedConfig, metaBlock?.transcriptExcerptLabelField || 'piecePage.meta.transcriptExcerptLabel', 'transcript excerpt')
  const mediaStatusLabel = getConfiguredText(resolvedConfig, metaBlock?.mediaStatusLabelField || 'piecePage.meta.mediaStatusLabel', 'media status')

  const mediaStatus = !isPodcastPiece(piece)
    ? null
    : piece.audioSummary && piece.transcriptExcerpt
      ? 'ready'
      : 'needs enrichment'

  return (
    <aside className="piece-meta-panel">
      <div className="piece-meta-panel__section">
        <div className="piece-meta-panel__label">{projectLabel}</div>
        <p>{piece.primaryProject}</p>
      </div>

      <div className="piece-meta-panel__section">
        <div className="piece-meta-panel__label">{typeLabel}</div>
        <p>{piece.type}</p>
      </div>

      <div className="piece-meta-panel__section">
        <div className="piece-meta-panel__label">{publishedLabel}</div>
        <p>{piece.publishedDateLabel}</p>
      </div>

      {mediaStatus ? (
        <div className="piece-meta-panel__section">
          <div className="piece-meta-panel__label">{mediaStatusLabel}</div>
          <p>{mediaStatus}</p>
        </div>
      ) : null}

      {piece.audioSummary ? (
        <div className="piece-meta-panel__section">
          <div className="piece-meta-panel__label">{audioSummaryLabel}</div>
          <p>{piece.audioSummary}</p>
        </div>
      ) : null}

      {piece.transcriptExcerpt ? (
        <div className="piece-meta-panel__section">
          <div className="piece-meta-panel__label">{transcriptExcerptLabel}</div>
          <p>{piece.transcriptExcerpt}</p>
        </div>
      ) : null}

      {piece.sourceUrl ? (
        <div className="piece-meta-panel__section">
          <div className="piece-meta-panel__label">{sourceLabel}</div>
          <p><a href={piece.sourceUrl} target="_blank" rel="noreferrer">{sourceLinkLabel}</a></p>
        </div>
      ) : null}

      {printLinks.length ? (
        <div className="piece-meta-panel__section">
          <div className="piece-meta-panel__label">{printAssetsLabel}</div>
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
          <div className="piece-meta-panel__label">{tagsLabel}</div>
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
  const resolvedConfig = useResolvedConfig()

  const metaBlock = getConfiguredBlock(resolvedConfig, 'piecePage.meta')
  const actionsBlock = getConfiguredBlock(resolvedConfig, 'piecePage.actions')
  const experienceBlock = getConfiguredBlock(resolvedConfig, 'piecePage.experience')
  const navBlock = getConfiguredBlock(resolvedConfig, 'piecePage.nav')
  const relatedBlock = getConfiguredBlock(resolvedConfig, 'piecePage.related')
  const notFoundBlock = getConfiguredBlock(resolvedConfig, 'piecePage.notFound')

  const readingLabel = getConfiguredText(resolvedConfig, actionsBlock?.readingLabelField || 'piecePage.actions.readingLabel', 'reading')
  const experienceLabel = getConfiguredText(resolvedConfig, actionsBlock?.experienceLabelField || 'piecePage.actions.experienceLabel', 'experience')
  const printLabel = getConfiguredText(resolvedConfig, actionsBlock?.printLabelField || 'piecePage.actions.printLabel', 'print')
  const experienceLeft = getConfiguredText(resolvedConfig, experienceBlock?.leftField || 'piecePage.experience.left', 'this is not a conclusion')
  const experienceRight = getConfiguredText(resolvedConfig, experienceBlock?.rightField || 'piecePage.experience.right', 'it is a beginning')
  const olderLabel = getConfiguredText(resolvedConfig, navBlock?.olderLabelField || 'piecePage.nav.olderLabel', 'older')
  const newerLabel = getConfiguredText(resolvedConfig, navBlock?.newerLabelField || 'piecePage.nav.newerLabel', 'newer')
  const notFoundTitle = getConfiguredText(resolvedConfig, notFoundBlock?.titleField || 'piecePage.notFound.title', 'Piece not found')
  const notFoundBody = getConfiguredText(resolvedConfig, notFoundBlock?.bodyField || 'piecePage.notFound.body', 'This archive entry has not been imported yet or the slug changed during migration.')
  const bylinePrefix = getConfiguredText(resolvedConfig, metaBlock?.bylinePrefixField || 'piecePage.meta.bylinePrefix', 'by')

  const piece = pieces.find((entry) => entry.slug === slug)

  if (!piece) {
    return (
      <main className={`page piece-page${mode === 'experience' ? ' piece-page--experience' : ' piece-page--reading'}`}>
      <PublicationTopbar />
        <div className="missing-state">
          <h1>{notFoundTitle}</h1>
          <p>{notFoundBody}</p>
        </div>
        <PublicationFooter />
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
          backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.38), rgba(8,8,8,0.80)), url(${piece.heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <EditableText
          as="div"
          className="piece-header__eyebrow"
          field={metaBlock?.eyebrowField || 'piecePage.meta.eyebrow'}
        >
          {theme.accent}
        </EditableText>

        <h1>{display.title}</h1>

        {display.subtitle ? (
          <p className="piece-header__subtitle">{display.subtitle}</p>
        ) : null}

        <div className="piece-header__meta">
          <span>{piece.primaryProject}</span>
          <span>{piece.type}</span>
          <span>{piece.publishedDateLabel}</span>
          {piece.author ? <span>{bylinePrefix} {piece.author}</span> : null}
        </div>

        <nav className="mode-toggle">
          <Link to={`/post/${piece.slug}`}>{readingLabel}</Link>
          <Link to={`/post/${piece.slug}?mode=experience`}>{experienceLabel}</Link>
          <Link to={`/piece/${piece.slug}/print`}>{printLabel}</Link>
        </nav>
      </header>

      {podcastLike ? <PodcastEmbedBlock embeds={podcastEmbeds} piece={piece} /> : null}

      {mode === 'experience' ? (
        <section className="experience-banner">
          <div className="experience-banner__inner">
            <span>{experienceLeft}</span>
            <span>{experienceRight}</span>
          </div>
        </section>
      ) : null}

      <section className={`piece-layout piece-layout--${mode} piece-layout--with-meta`}>
        <article className="piece-body-wrap" dangerouslySetInnerHTML={{ __html: piece.bodyHtml }} />
        <PieceMetaPanel piece={piece} metaBlock={metaBlock} resolvedConfig={resolvedConfig} />
      </section>

      {(previous || next) ? (
        <section className="piece-nav-grid">
          {previous ? (
            <Link className="piece-nav-card publication-piece-nav-card" to={`/post/${previous.slug}`}>
              <span className="piece-nav-card__label">{olderLabel}</span>
              <strong>{splitDisplayTitle(previous).title}</strong>
            </Link>
          ) : <div />}

          {next ? (
            <Link className="piece-nav-card piece-nav-card--next publication-piece-nav-card" to={`/post/${next.slug}`}>
              <span className="piece-nav-card__label">{newerLabel}</span>
              <strong>{splitDisplayTitle(next).title}</strong>
            </Link>
          ) : <div />}
        </section>
      ) : null}

      {related.length ? (
        <>
          <section className="section-heading">
            <EditableText as="p" field={relatedBlock?.eyebrowField || 'piecePage.related.eyebrow'}>
              Keep going
            </EditableText>
            <EditableText as="h2" field={relatedBlock?.titleField || 'piecePage.related.title'}>
              Related pieces
            </EditableText>
          </section>
          <section className="piece-grid">
            {related.map((entry) => (
              <RelatedPieceCard key={entry.slug} piece={entry} />
            ))}
          </section>
        </>
      ) : null}
      <PublicationFooter />
    </main>
  )
}
