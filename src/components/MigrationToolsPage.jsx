import { useMemo, useState } from 'react'
import { archivePieceToNativeDraft } from '../lib/migrationTools'

export function MigrationToolsPage({ pieces }) {
  const [query, setQuery] = useState('')
  const [selectedSlug, setSelectedSlug] = useState('')
  const [copied, setCopied] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = Array.isArray(pieces) ? pieces : []
    if (!q) return list.slice(0, 80)

    return list.filter((piece) =>
      [
        piece?.title,
        piece?.subtitle,
        piece?.excerpt,
        piece?.primaryProject,
        piece?.slug,
        ...(piece?.tags || []),
      ].join(' ').toLowerCase().includes(q)
    ).slice(0, 80)
  }, [pieces, query])

  const selected = useMemo(
    () => (Array.isArray(pieces) ? pieces.find((piece) => piece.slug === selectedSlug) : null),
    [pieces, selectedSlug]
  )

  const draft = useMemo(() => selected ? archivePieceToNativeDraft(selected) : null, [selected])

  async function copyDraft() {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="page migration-tools-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">migration / import / modernization</div>
        <h1>Migration Tools</h1>
        <p className="project-hero__description">
          Turn archive pieces into native-content-ready drafts with source metadata preserved. This is the practical bridge, not a mystical one-click migration paradise.
        </p>
        <div className="project-hero__meta">
          <span>{visible.length} visible archive pieces</span>
          <span>{selected ? `selected: ${selected.slug}` : 'no selection'}</span>
        </div>
      </section>

      <section className="archive-controls">
        <label className="archive-control">
          <span>search archive</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="title, project, slug, tag..."
          />
        </label>
      </section>

      <section className="native-bridge-layout">
        <aside className="native-bridge-sidebar">
          <div className="native-bridge-list">
            {visible.map((piece) => (
              <button
                type="button"
                key={piece.slug}
                className={`native-entry-card${selectedSlug === piece.slug ? ' native-entry-card--active' : ''}`}
                onClick={() => setSelectedSlug(piece.slug)}
              >
                <span className="native-entry-card__meta">{piece.primaryProject || 'Unknown'} / {piece.type || 'unknown'}</span>
                <strong>{piece.title || piece.slug}</strong>
                <span className="native-entry-card__slug">{piece.slug}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="native-bridge-main">
          {draft ? (
            <>
              <section className="review-summary-card">
                <div className="review-summary-card__eyebrow">migration preview</div>
                <ul>
                  <li><span>title</span><strong>{draft.title || 'untitled'}</strong></li>
                  <li><span>slug</span><strong>{draft.slug || 'no-slug'}</strong></li>
                  <li><span>content type</span><strong>{draft.contentType}</strong></li>
                  <li><span>target</span><strong>{draft.target}</strong></li>
                  <li><span>source type</span><strong>{draft.sourceType}</strong></li>
                </ul>
                <div className="review-card__actions">
                  <button className="button button--primary" type="button" onClick={copyDraft}>
                    {copied ? 'copied' : 'copy native draft json'}
                  </button>
                </div>
              </section>

              <section className="review-summary-card">
                <div className="review-summary-card__eyebrow">generated draft</div>
                <pre className="review-card__snippet">{JSON.stringify(draft, null, 2)}</pre>
              </section>
            </>
          ) : (
            <section className="missing-state">
              <h2>No archive piece selected</h2>
              <p>Pick one from the left and it will generate a native draft scaffold.</p>
            </section>
          )}
        </section>
      </section>
    </main>
  )
}
