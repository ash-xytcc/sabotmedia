import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { getConfiguredBlock, getConfiguredText } from '../lib/publicConfig'
import { splitDisplayTitle } from '../lib/content'
import { EditableText } from './EditableText'
import { AdminFrame } from './AdminRail'

function buildPodcastOverride(piece, form) {
  const out = {}

  if (form.audioSummary.trim()) out.audioSummary = form.audioSummary.trim()
  if (form.transcriptExcerpt.trim()) out.transcriptExcerpt = form.transcriptExcerpt.trim()
  if (form.sourceNotes.trim()) out.sourceNotes = form.sourceNotes.trim()
  if (form.heroImage.trim()) out.heroImage = form.heroImage.trim()

  return {
    [piece.slug]: out,
  }
}

function getPodcastStatus(piece) {
  const hasSummary = Boolean(piece.audioSummary && String(piece.audioSummary).trim())
  const hasTranscript = Boolean(piece.transcriptExcerpt && String(piece.transcriptExcerpt).trim())

  if (hasSummary && hasTranscript) return 'ready'
  if (hasSummary) return 'has-summary'
  if (hasTranscript) return 'has-transcript'
  return 'needs-work'
}

function PodcastOverrideBuilder({ piece, block, resolvedConfig }) {
  const audioSummaryLabel = getConfiguredText(resolvedConfig, block?.audioSummaryLabelField || 'podcastAdmin.audioSummaryLabel', 'audio summary')
  const audioSummaryPlaceholder = getConfiguredText(resolvedConfig, block?.audioSummaryPlaceholderField || 'podcastAdmin.audioSummaryPlaceholder', 'short summary for listing and detail view')
  const transcriptLabel = getConfiguredText(resolvedConfig, block?.transcriptLabelField || 'podcastAdmin.transcriptLabel', 'transcript excerpt')
  const transcriptPlaceholder = getConfiguredText(resolvedConfig, block?.transcriptPlaceholderField || 'podcastAdmin.transcriptPlaceholder', 'short transcript excerpt')
  const sourceNotesLabel = getConfiguredText(resolvedConfig, block?.sourceNotesLabelField || 'podcastAdmin.sourceNotesLabel', 'source notes')
  const sourceNotesPlaceholder = getConfiguredText(resolvedConfig, block?.sourceNotesPlaceholderField || 'podcastAdmin.sourceNotesPlaceholder', 'notes about source audio, transcript quality, or publish state')
  const heroImageLabel = getConfiguredText(resolvedConfig, block?.heroImageLabelField || 'podcastAdmin.heroImageLabel', 'hero image')
  const heroImagePlaceholder = getConfiguredText(resolvedConfig, block?.heroImagePlaceholderField || 'podcastAdmin.heroImagePlaceholder', 'hero image url')
  const generatedLabel = getConfiguredText(resolvedConfig, block?.generatedLabelField || 'podcastAdmin.generatedLabel', 'generated podcast override')

  const [form, setForm] = useState({
    audioSummary: piece.audioSummary || '',
    transcriptExcerpt: piece.transcriptExcerpt || '',
    sourceNotes: piece.sourceNotes || '',
    heroImage: piece.heroImage || '',
  })
  const [copied, setCopied] = useState('')

  const overrideObj = useMemo(() => buildPodcastOverride(piece, form), [piece, form])
  const overrideJson = JSON.stringify(overrideObj, null, 2)
  const overrideSnippet = `"${piece.slug}": ${JSON.stringify(overrideObj[piece.slug], null, 2)}`

  async function copy(text, mode) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(mode)
      window.setTimeout(() => setCopied(''), 1200)
    } catch {
      setCopied('')
    }
  }

  return (
    <div className="review-override-builder">
      <div className="review-override-builder__grid">
        <label className="archive-control">
          <span>{audioSummaryLabel}</span>
          <input
            type="text"
            value={form.audioSummary}
            onChange={(e) => setForm((prev) => ({ ...prev, audioSummary: e.target.value }))}
            placeholder={audioSummaryPlaceholder}
          />
        </label>

        <label className="archive-control">
          <span>{heroImageLabel}</span>
          <input
            type="text"
            value={form.heroImage}
            onChange={(e) => setForm((prev) => ({ ...prev, heroImage: e.target.value }))}
            placeholder={heroImagePlaceholder}
          />
        </label>
      </div>

      <label className="archive-control">
        <span>{transcriptLabel}</span>
        <textarea
          className="review-override-builder__textarea"
          value={form.transcriptExcerpt}
          onChange={(e) => setForm((prev) => ({ ...prev, transcriptExcerpt: e.target.value }))}
          placeholder={transcriptPlaceholder}
        />
      </label>

      <label className="archive-control">
        <span>{sourceNotesLabel}</span>
        <textarea
          className="review-override-builder__textarea"
          value={form.sourceNotes}
          onChange={(e) => setForm((prev) => ({ ...prev, sourceNotes: e.target.value }))}
          placeholder={sourceNotesPlaceholder}
        />
      </label>

      <div className="review-card__actions">
        <button className="button button--primary" type="button" onClick={() => copy(overrideSnippet, 'snippet')}>
          {copied === 'snippet' ? 'copied' : getConfiguredText(resolvedConfig, 'podcastAdmin.copySnippetAction', 'copy podcast override snippet')}
        </button>
        <button className="button button--primary" type="button" onClick={() => copy(overrideJson, 'json')}>
          {copied === 'json' ? 'copied' : getConfiguredText(resolvedConfig, 'podcastAdmin.copyJsonAction', 'copy podcast override json')}
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setForm({
            audioSummary: piece.audioSummary || '',
            transcriptExcerpt: piece.transcriptExcerpt || '',
            sourceNotes: piece.sourceNotes || '',
            heroImage: piece.heroImage || '',
          })}
        >
          {getConfiguredText(resolvedConfig, 'podcastAdmin.clearAction', 'clear builder')}
        </button>
      </div>

      <div className="review-override-builder__output">
        <div className="review-summary-card__eyebrow">{generatedLabel}</div>
        <pre className="review-card__snippet">{overrideJson}</pre>
      </div>
    </div>
  )
}

export function PodcastAdminPage({ pieces }) {
  const resolvedConfig = useResolvedConfig()
  const heroBlock = getConfiguredBlock(resolvedConfig, 'podcastAdmin.hero')
  const filtersBlock = getConfiguredBlock(resolvedConfig, 'podcastAdmin.filters')
  const metaBlock = getConfiguredBlock(resolvedConfig, 'podcastAdmin.meta')
  const builderBlock = getConfiguredBlock(resolvedConfig, 'podcastAdmin.builder')
  const emptyBlock = getConfiguredBlock(resolvedConfig, 'podcastAdmin.empty')
  const cardBlock = getConfiguredBlock(resolvedConfig, 'podcastAdmin.card')

  const searchLabel = getConfiguredText(resolvedConfig, filtersBlock?.searchLabelField || 'podcastAdmin.searchLabel', 'search')
  const searchPlaceholder = getConfiguredText(resolvedConfig, filtersBlock?.searchPlaceholderField || 'podcastAdmin.searchPlaceholder', 'title, excerpt, project...')
  const statusLabel = getConfiguredText(resolvedConfig, filtersBlock?.statusLabelField || 'podcastAdmin.statusLabel', 'status')
  const statusAll = getConfiguredText(resolvedConfig, filtersBlock?.statusAllField || 'podcastAdmin.statusAll', 'all')
  const statusNeedsWork = getConfiguredText(resolvedConfig, filtersBlock?.statusNeedsWorkField || 'podcastAdmin.statusNeedsWork', 'needs work')
  const statusHasSummary = getConfiguredText(resolvedConfig, filtersBlock?.statusHasSummaryField || 'podcastAdmin.statusHasSummary', 'has summary')
  const statusHasTranscript = getConfiguredText(resolvedConfig, filtersBlock?.statusHasTranscriptField || 'podcastAdmin.statusHasTranscript', 'has transcript excerpt')
  const statusReady = getConfiguredText(resolvedConfig, filtersBlock?.statusReadyField || 'podcastAdmin.statusReady', 'ready')

  const visibleLabel = getConfiguredText(resolvedConfig, metaBlock?.visibleLabelField || 'podcastAdmin.visibleLabel', 'visible')
  const totalLabel = getConfiguredText(resolvedConfig, metaBlock?.totalLabelField || 'podcastAdmin.totalLabel', 'total podcasts')
  const missingSummaryLabel = getConfiguredText(resolvedConfig, metaBlock?.missingSummaryLabelField || 'podcastAdmin.missingSummaryLabel', 'missing summaries')
  const missingTranscriptLabel = getConfiguredText(resolvedConfig, metaBlock?.missingTranscriptLabelField || 'podcastAdmin.missingTranscriptLabel', 'missing transcript excerpts')

  const emptyTitle = getConfiguredText(resolvedConfig, emptyBlock?.titleField || 'podcastAdmin.emptyTitle', 'No podcast pieces found')
  const emptyBody = getConfiguredText(resolvedConfig, emptyBlock?.bodyField || 'podcastAdmin.emptyBody', 'There are currently no podcast-type pieces in the imported archive.')

  const cardStatusLabel = getConfiguredText(resolvedConfig, cardBlock?.statusLabelField || 'podcastAdmin.cardStatusLabel', 'status')
  const cardNeedsWork = getConfiguredText(resolvedConfig, cardBlock?.needsWorkField || 'podcastAdmin.cardNeedsWork', 'needs work')
  const cardReady = getConfiguredText(resolvedConfig, cardBlock?.readyField || 'podcastAdmin.cardReady', 'ready')
  const cardSummary = getConfiguredText(resolvedConfig, cardBlock?.summaryField || 'podcastAdmin.cardSummary', 'summary')
  const cardTranscript = getConfiguredText(resolvedConfig, cardBlock?.transcriptField || 'podcastAdmin.cardTranscript', 'transcript')
  const cardNotes = getConfiguredText(resolvedConfig, cardBlock?.notesField || 'podcastAdmin.cardNotes', 'notes')

  const podcasts = useMemo(
    () => (pieces || []).filter((piece) => piece.type === 'podcast'),
    [pieces]
  )

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return podcasts.filter((piece) => {
      const status = getPodcastStatus(piece)

      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (!q) return true

      const haystack = [
        piece.title,
        piece.subtitle,
        piece.excerpt,
        piece.primaryProject,
        piece.audioSummary,
        piece.transcriptExcerpt,
      ].join(' ').toLowerCase()

      return haystack.includes(q)
    })
  }, [podcasts, query, statusFilter])

  const missingSummaryCount = podcasts.filter((piece) => !piece.audioSummary || !String(piece.audioSummary).trim()).length
  const missingTranscriptCount = podcasts.filter((piece) => !piece.transcriptExcerpt || !String(piece.transcriptExcerpt).trim()).length

  if (!podcasts.length) {
    return (
      <main className="page podcast-admin-page">
        <section className="project-hero">
          <EditableText as="div" className="project-hero__eyebrow" field={heroBlock?.eyebrowField || 'podcastAdmin.eyebrow'}>
            podcast / transcript / bridge
          </EditableText>
          <EditableText as="h1" field={heroBlock?.titleField || 'podcastAdmin.title'}>
            Podcast Enrichment
          </EditableText>
          <EditableText as="p" className="project-hero__description" field={heroBlock?.descriptionField || 'podcastAdmin.description'}>
            Track which podcast pieces need summaries, transcript excerpts, or richer bridge metadata before native transcription lands.
          </EditableText>
        </section>

        <div className="review-card__actions podcast-admin-page__hero-actions">
          <Link className="button button--primary" to="/native-bridge?new=podcast">new podcast episode</Link>
        </div>
        <section className="missing-state">
          <h2>{emptyTitle}</h2>
          <p>{emptyBody}</p>
        </section>
      </main>
    )
  }

  return (
    <AdminFrame>
    <main className="page podcast-admin-page">
      <section className="project-hero">
        <EditableText as="div" className="project-hero__eyebrow" field={heroBlock?.eyebrowField || 'podcastAdmin.eyebrow'}>
          podcast / transcript / bridge
        </EditableText>
        <EditableText as="h1" field={heroBlock?.titleField || 'podcastAdmin.title'}>
          Podcast Enrichment
        </EditableText>
        <EditableText as="p" className="project-hero__description" field={heroBlock?.descriptionField || 'podcastAdmin.description'}>
          Track which podcast pieces need summaries, transcript excerpts, or richer bridge metadata before native transcription lands.
        </EditableText>
        <div className="review-card__actions podcast-admin-page__hero-actions">
          <Link className="button button--primary" to="/native-bridge?new=podcast">new podcast episode</Link>
          <Link className="button" to="/review">review queue</Link>
        </div>
        <div className="project-hero__meta">
          <span>{filtered.length} {visibleLabel}</span>
          <span>{podcasts.length} {totalLabel}</span>
          <span>{missingSummaryCount} {missingSummaryLabel}</span>
          <span>{missingTranscriptCount} {missingTranscriptLabel}</span>
        </div>
      </section>

      <section className="archive-controls">
        <label className="archive-control">
          <span>{searchLabel}</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>

        <label className="archive-control">
          <span>{statusLabel}</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{statusAll}</option>
            <option value="needs-work">{statusNeedsWork}</option>
            <option value="has-summary">{statusHasSummary}</option>
            <option value="has-transcript">{statusHasTranscript}</option>
            <option value="ready">{statusReady}</option>
          </select>
        </label>
      </section>

      <section className="review-queue">
        {filtered.map((piece) => {
          const display = splitDisplayTitle(piece)
          const status = getPodcastStatus(piece)

          return (
            <article className="review-card" key={piece.slug}>
              <div className="review-card__meta">
                <span>{piece.primaryProject || 'General'}</span>
                <span>{piece.type}</span>
                <span>{piece.publishedDateLabel}</span>
              </div>

              <h2>
                <Link to={`/post/${piece.slug}`}>{display.title}</Link>
              </h2>

              {display.subtitle ? <p className="review-card__subtitle">{display.subtitle}</p> : null}
              {piece.excerpt ? <p className="review-card__excerpt">{piece.excerpt}</p> : null}

              <div className="review-card__flags">
                <span className="review-flag review-flag--featured">{cardStatusLabel}: {status === 'ready' ? cardReady : cardNeedsWork}</span>
                <span className="review-flag">{cardSummary}: {piece.audioSummary ? 'yes' : 'no'}</span>
                <span className="review-flag">{cardTranscript}: {piece.transcriptExcerpt ? 'yes' : 'no'}</span>
                <span className="review-flag">{cardNotes}: {piece.sourceNotes ? 'yes' : 'no'}</span>
              </div>

              <PodcastOverrideBuilder piece={piece} block={builderBlock} resolvedConfig={resolvedConfig} />
            </article>
          )
        })}
      </section>
    </main>
    </AdminFrame>
  )
}
