import { useEffect, useMemo, useState } from 'react'
import { EditableText } from './EditableText'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { getConfiguredText } from '../lib/publicConfig'
import {
  createEmptyNativeEntry,
  deleteNativeEntry,
  exportNativeCollection,
  importNativeCollection,
  loadNativeCollection,
  upsertNativeEntry,
  slugify,
  getLatestPublishedNativeEntry,
} from '../lib/nativePublicContent'

function NativeEntryEditor({
  value,
  onChange,
  contentTypeLabel,
  statusLabel,
  targetLabel,
  tagsLabel,
}) {
  return (
    <section className="native-content-editor">
      <div className="native-content-editor__grid">
        <label className="archive-control">
          <span>title</span>
          <input
            type="text"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value, slug: slugify(value.slug || e.target.value) })}
            placeholder="title"
          />
        </label>

        <label className="archive-control">
          <span>slug</span>
          <input
            type="text"
            value={value.slug}
            onChange={(e) => onChange({ ...value, slug: slugify(e.target.value) })}
            placeholder="slug"
          />
        </label>

        <label className="archive-control">
          <span>{contentTypeLabel}</span>
          <select value={value.contentType} onChange={(e) => onChange({ ...value, contentType: e.target.value })}>
            <option value="note">note</option>
            <option value="publicBlock">publicBlock</option>
            <option value="dispatch">dispatch</option>
          </select>
        </label>

        <label className="archive-control">
          <span>{statusLabel}</span>
          <select value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>

        <label className="archive-control">
          <span>{targetLabel}</span>
          <select value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value })}>
            <option value="general">general</option>
            <option value="home">home</option>
            <option value="press">press</option>
            <option value="projects">projects</option>
          </select>
        </label>

        <label className="archive-control">
          <span>author</span>
          <input
            type="text"
            value={value.author}
            onChange={(e) => onChange({ ...value, author: e.target.value })}
            placeholder="author"
          />
        </label>
      </div>

      <label className="archive-control">
        <span>excerpt</span>
        <textarea
          className="native-content-editor__textarea native-content-editor__textarea--sm"
          value={value.excerpt}
          onChange={(e) => onChange({ ...value, excerpt: e.target.value })}
          placeholder="excerpt"
        />
      </label>

      <label className="archive-control">
        <span>{tagsLabel}</span>
        <input
          type="text"
          value={(value.tags || []).join(', ')}
          onChange={(e) => onChange({
            ...value,
            tags: e.target.value.split(',').map((item) => item.trim()).filter(Boolean),
          })}
          placeholder="tag1, tag2"
        />
      </label>

      <label className="archive-control">
        <span>body</span>
        <textarea
          className="native-content-editor__textarea"
          value={value.body}
          onChange={(e) => onChange({ ...value, body: e.target.value })}
          placeholder="body"
        />
      </label>
    </section>
  )
}

function NativeEntryCard({ entry, isActive, onSelect }) {
  return (
    <button
      type="button"
      className={`native-entry-card${isActive ? ' native-entry-card--active' : ''}`}
      onClick={onSelect}
    >
      <span className="native-entry-card__meta">{entry.contentType} / {entry.status} / {entry.target}</span>
      <strong>{entry.title || 'untitled'}</strong>
      <span className="native-entry-card__slug">{entry.slug || 'no-slug'}</span>
      <span className="native-entry-card__date">{entry.updatedAt}</span>
    </button>
  )
}

export function NativeContentBridgePage() {
  const resolvedConfig = useResolvedConfig()

  const eyebrow = getConfiguredText(resolvedConfig, 'nativeBridge.eyebrow', 'native / publish / bridge')
  const title = getConfiguredText(resolvedConfig, 'nativeBridge.title', 'Native Publishing Bridge')
  const description = getConfiguredText(
    resolvedConfig,
    'nativeBridge.description',
    'Define the first native public content objects inside Sabot so publishing can move from imported archive toward a real internal system.'
  )
  const contentTypeLabel = getConfiguredText(resolvedConfig, 'nativeBridge.contentTypeLabel', 'content type')
  const statusLabel = getConfiguredText(resolvedConfig, 'nativeBridge.statusLabel', 'status')
  const targetLabel = getConfiguredText(resolvedConfig, 'nativeBridge.targetLabel', 'target')
  const tagsLabel = getConfiguredText(resolvedConfig, 'nativeBridge.tagsLabel', 'tags')
  const newEntryLabel = getConfiguredText(resolvedConfig, 'nativeBridge.newEntryAction', 'new entry')
  const saveEntryLabel = getConfiguredText(resolvedConfig, 'nativeBridge.saveEntryAction', 'save entry')
  const deleteEntryLabel = getConfiguredText(resolvedConfig, 'nativeBridge.deleteEntryAction', 'delete entry')
  const duplicateEntryLabel = getConfiguredText(resolvedConfig, 'nativeBridge.duplicateEntryAction', 'duplicate entry')
  const exportLabel = getConfiguredText(resolvedConfig, 'nativeBridge.exportAction', 'copy export json')
  const importLabel = getConfiguredText(resolvedConfig, 'nativeBridge.importAction', 'import json')
  const latestHomeLabel = getConfiguredText(resolvedConfig, 'nativeBridge.latestHomeLabel', 'latest published home item')
  const latestGeneralLabel = getConfiguredText(resolvedConfig, 'nativeBridge.latestGeneralLabel', 'latest published general item')
  const collectionLabel = getConfiguredText(resolvedConfig, 'nativeBridge.collectionLabel', 'collection')
  const previewLabel = getConfiguredText(resolvedConfig, 'nativeBridge.previewLabel', 'preview')
  const emptyLabel = getConfiguredText(resolvedConfig, 'nativeBridge.emptyLabel', 'No native entries yet. Start with a note, dispatch, or publicBlock.')

  const [items, setItems] = useState([])
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState(createEmptyNativeEntry())
  const [importText, setImportText] = useState('')
  const [copied, setCopied] = useState(false)
  const [importStatus, setImportStatus] = useState('')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const loaded = await loadNativeCollection()
      if (cancelled) return
      setItems(loaded)
      if (loaded.length) {
        setActiveId(loaded[0].id)
        setDraft(loaded[0])
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const latestHome = useMemo(() => getLatestPublishedNativeEntry(items, 'home'), [items])
  const latestGeneral = useMemo(() => getLatestPublishedNativeEntry(items, 'general'), [items])

  function selectEntry(entry) {
    setActiveId(entry.id)
    setDraft(entry)
  }

  function handleNew() {
    const fresh = createEmptyNativeEntry()
    setActiveId(fresh.id)
    setDraft(fresh)
  }

  async function handleSave() {
    const next = await upsertNativeEntry(items, draft)
    setItems(next)
    const saved = next.find((item) => item.id === draft.id) || next[0]
    if (saved) {
      setActiveId(saved.id)
      setDraft(saved)
    }
  }

  async function handleDelete() {
    if (!activeId) return
    const next = await deleteNativeEntry(items, activeId)
    setItems(next)
    if (next.length) {
      setActiveId(next[0].id)
      setDraft(next[0])
    } else {
      const fresh = createEmptyNativeEntry()
      setActiveId(fresh.id)
      setDraft(fresh)
    }
  }

  function handleDuplicate() {
    const copy = {
      ...draft,
      id: createEmptyNativeEntry().id,
      title: draft.title ? `${draft.title} copy` : '',
      slug: slugify(draft.title ? `${draft.title} copy` : ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: '',
      status: 'draft',
    }
    setActiveId(copy.id)
    setDraft(copy)
  }

  async function handleExport() {
    try {
      await navigator.clipboard.writeText(exportNativeCollection(items))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(importText)
      const next = importNativeCollection(parsed)
      setItems(next)
      if (next.length) {
        setActiveId(next[0].id)
        setDraft(next[0])
      }
      setImportStatus('imported')
    } catch {
      setImportStatus('invalid json')
    }
  }

  return (
    <main className="page native-bridge-page">
      <section className="project-hero">
        <EditableText as="div" className="project-hero__eyebrow" field="nativeBridge.eyebrow">
          {eyebrow}
        </EditableText>
        <EditableText as="h1" field="nativeBridge.title">
          {title}
        </EditableText>
        <EditableText as="p" className="project-hero__description" field="nativeBridge.description">
          {description}
        </EditableText>
        <div className="project-hero__meta">
          <span>{items.length} {collectionLabel}</span>
          <span>{latestHome ? `${latestHomeLabel}: ${latestHome.title || latestHome.slug}` : `${latestHomeLabel}: none`}</span>
          <span>{latestGeneral ? `${latestGeneralLabel}: ${latestGeneral.title || latestGeneral.slug}` : `${latestGeneralLabel}: none`}</span>
        </div>
      </section>

      <section className="native-bridge-layout">
        <aside className="native-bridge-sidebar">
          <div className="review-card__actions">
            <button className="button button--primary" type="button" onClick={handleNew}>{newEntryLabel}</button>
            <button className="button" type="button" onClick={handleExport}>{copied ? 'copied' : exportLabel}</button>
          </div>

          {items.length ? (
            <div className="native-bridge-list">
              {items.map((entry) => (
                <NativeEntryCard
                  key={entry.id}
                  entry={entry}
                  isActive={entry.id === activeId}
                  onSelect={() => selectEntry(entry)}
                />
              ))}
            </div>
          ) : (
            <div className="missing-state">
              <p>{emptyLabel}</p>
            </div>
          )}

          <label className="archive-control">
            <span>{importLabel}</span>
            <textarea
              className="native-content-editor__textarea native-content-editor__textarea--sm"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="paste exported native content json here"
            />
          </label>

          <div className="review-card__actions">
            <button className="button" type="button" onClick={handleImport}>{importLabel}</button>
          </div>
          {importStatus ? <p className="review-card__excerpt">{importStatus}</p> : null}
        </aside>

        <section className="native-bridge-main">
          <div className="review-card__actions">
            <button className="button button--primary" type="button" onClick={handleSave}>{saveEntryLabel}</button>
            <button className="button" type="button" onClick={handleDuplicate}>{duplicateEntryLabel}</button>
            <button className="button" type="button" onClick={handleDelete}>{deleteEntryLabel}</button>
          </div>

          <NativeEntryEditor
            value={draft}
            onChange={setDraft}
            contentTypeLabel={contentTypeLabel}
            statusLabel={statusLabel}
            targetLabel={targetLabel}
            tagsLabel={tagsLabel}
          />

          <section className="review-summary-grid">
            <article className="review-summary-card">
              <div className="review-summary-card__eyebrow">{previewLabel}</div>
              <ul>
                <li><span>title</span><strong>{draft.title || 'untitled'}</strong></li>
                <li><span>slug</span><strong>{draft.slug || 'no-slug'}</strong></li>
                <li><span>type</span><strong>{draft.contentType}</strong></li>
                <li><span>status</span><strong>{draft.status}</strong></li>
                <li><span>target</span><strong>{draft.target}</strong></li>
              </ul>
            </article>

            <article className="review-summary-card">
              <div className="review-summary-card__eyebrow">shape</div>
              <pre className="review-card__snippet">{JSON.stringify(draft, null, 2)}</pre>
            </article>
          </section>
        </section>
      </section>
    </main>
  )
}
