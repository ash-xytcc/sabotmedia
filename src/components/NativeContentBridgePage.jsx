import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { getEditorPermissionsSnapshot } from '../lib/editorPermissions'
import { RichNativeEditor } from './RichNativeEditor'
import { MediaAssetManagerCard } from './MediaAssetManagerCard'
import { NativeSourceBridgeCard } from './NativeSourceBridgeCard'
import { TranscriptBridgeCard } from './TranscriptBridgeCard'
import { NativeTaxonomyBridgeCard } from './NativeTaxonomyBridgeCard'
import { fetchNativeRevisions, restoreNativeRevision } from '../lib/nativePublicContentApi'
import { AdminFrame } from './AdminRail'

const CREATION_MODES = {
  article: {
    label: 'Article / Dispatch',
    description: 'Write a public article, dispatch, or written piece.',
    contentType: 'dispatch',
    target: 'general',
  },
  podcast: {
    label: 'Podcast',
    description: 'Create a podcast entry with summary, transcript notes, and episode metadata.',
    contentType: 'podcast',
    target: 'general',
  },
  print: {
    label: 'Print / Zine',
    description: 'Prepare a print-oriented piece, handout, or zine item.',
    contentType: 'print',
    target: 'general',
  },
  publicBlock: {
    label: 'Public Block',
    description: 'Create a homepage or public-surface block without forcing it through article structure.',
    contentType: 'publicBlock',
    target: 'home',
  },
}

function inferCreationKind(entry) {
  const type = String(entry?.contentType || '').toLowerCase()
  if (type === 'podcast') return 'podcast'
  if (type === 'print') return 'print'
  if (type === 'publicblock') return 'publicBlock'
  return 'article'
}

function createTypedEntry(kind) {
  const base = createEmptyNativeEntry()
  const mode = CREATION_MODES[kind] || CREATION_MODES.article

  return {
    ...base,
    contentType: mode.contentType,
    target: mode.target,
    workflowState: 'draft',
    status: 'draft',
    tags: [],
    excerpt: '',
    body: '',
    richBody: [],
    audioSummary: '',
    transcriptExcerpt: '',
    sourceNotes: '',
    heroImage: '',
    featuredImage: '',
    hasPrintAssets: kind === 'print',
  }
}

function applyModeToDraft(draft, kind) {
  const mode = CREATION_MODES[kind] || CREATION_MODES.article
  return {
    ...draft,
    contentType: mode.contentType,
    target: draft.target || mode.target,
    hasPrintAssets: kind === 'print' ? true : draft.hasPrintAssets,
    audioSummary: kind === 'podcast' ? (draft.audioSummary || '') : '',
    transcriptExcerpt: kind === 'podcast' ? (draft.transcriptExcerpt || '') : '',
    sourceNotes: kind === 'podcast' ? (draft.sourceNotes || '') : '',
    heroImage: draft.heroImage || '',
    featuredImage: draft.featuredImage || draft.heroImage || '',
  }
}

function TypeSwitch({ creationKind, onPick }) {
  return (
    <div className="native-type-switch" role="tablist" aria-label="content type chooser">
      {Object.entries(CREATION_MODES).map(([key, mode]) => (
        <button
          key={key}
          type="button"
          className={`native-type-switch__button${creationKind === key ? ' is-active' : ''}`}
          onClick={() => onPick(key)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}

function NativeEntryEditor({
  value,
  onChange,
  creationKind,
  onPickCreationKind,
  tagsLabel,
}) {
  const isPodcast = creationKind === 'podcast'
  const isPublicBlock = creationKind === 'publicBlock'
  const isPrint = creationKind === 'print'

  return (
    <section className="native-content-editor">
      <div className="native-content-editor__type-header">
        <div>
          <div className="native-content-editor__eyebrow">entry type</div>
          <h2>{CREATION_MODES[creationKind]?.label || 'Article / Dispatch'}</h2>
          <p>{CREATION_MODES[creationKind]?.description || ''}</p>
        </div>
        <TypeSwitch creationKind={creationKind} onPick={onPickCreationKind} />
      </div>

      <div className="native-content-editor__grid native-content-editor__grid--simple">
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
          <span>status</span>
          <select value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>

        <label className="archive-control">
          <span>workflow state</span>
          <select value={value.workflowState || 'draft'} onChange={(e) => onChange({ ...value, workflowState: e.target.value })}>
            <option value="draft">draft</option>
            <option value="in_review">in_review</option>
            <option value="needs_revision">needs_revision</option>
            <option value="ready">ready</option>
            <option value="scheduled">scheduled</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>

        <label className="archive-control">
          <span>target</span>
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

        {!isPublicBlock ? (
          <label className="archive-control">
            <span>scheduled for</span>
            <input
              type="datetime-local"
              value={toLocalDateTime(value.scheduledFor)}
              onChange={(e) => onChange({ ...value, scheduledFor: fromLocalDateTime(e.target.value) })}
            />
          </label>
        ) : null}

        <label className="archive-control">
          <span>{isPodcast ? 'content type' : 'entry mode'}</span>
          <input type="text" value={CREATION_MODES[creationKind]?.label || ''} readOnly />
        </label>
      </div>

      <label className="archive-control">
        <span>{isPodcast ? 'listing summary' : 'excerpt'}</span>
        <textarea
          className="native-content-editor__textarea native-content-editor__textarea--sm"
          value={value.excerpt}
          onChange={(e) => onChange({ ...value, excerpt: e.target.value })}
          placeholder={isPodcast ? 'short episode summary for cards and listing views' : 'excerpt'}
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

      {isPodcast ? (
        <section className="native-content-editor__podcast">
          <div className="native-content-editor__grid">
            <label className="archive-control">
              <span>audio summary</span>
              <input
                type="text"
                value={value.audioSummary || ''}
                onChange={(e) => onChange({ ...value, audioSummary: e.target.value })}
                placeholder="short audio summary"
              />
            </label>

            <label className="archive-control">
              <span>hero image url</span>
              <input
                type="text"
                value={value.heroImage || ''}
                onChange={(e) => onChange({ ...value, heroImage: e.target.value })}
                placeholder="hero image url"
              />
            </label>
          </div>

          <label className="archive-control">
            <span>transcript excerpt</span>
            <textarea
              className="native-content-editor__textarea native-content-editor__textarea--sm"
              value={value.transcriptExcerpt || ''}
              onChange={(e) => onChange({ ...value, transcriptExcerpt: e.target.value })}
              placeholder="transcript excerpt"
            />
          </label>

          <label className="archive-control">
            <span>source notes</span>
            <textarea
              className="native-content-editor__textarea native-content-editor__textarea--sm"
              value={value.sourceNotes || ''}
              onChange={(e) => onChange({ ...value, sourceNotes: e.target.value })}
              placeholder="notes about source audio, transcript quality, or publish state"
            />
          </label>
        </section>
      ) : null}

      {!isPublicBlock ? (
        <label className="archive-control">
          <span>{isPrint ? 'print notes / fallback body' : 'body summary'}</span>
          <textarea
            className="native-content-editor__textarea native-content-editor__textarea--sm"
            value={value.body}
            onChange={(e) => onChange({ ...value, body: e.target.value })}
            placeholder={isPrint ? 'plain text print notes or fallback body' : 'plain text fallback body'}
          />
        </label>
      ) : (
        <label className="archive-control">
          <span>public block summary</span>
          <textarea
            className="native-content-editor__textarea native-content-editor__textarea--sm"
            value={value.body}
            onChange={(e) => onChange({ ...value, body: e.target.value })}
            placeholder="plain text summary of the block"
          />
        </label>
      )}

      <RichNativeEditor
        value={value.richBody || []}
        onChange={(next) => onChange({ ...value, richBody: next })}
        mediaAssetsSlot={({ onPick }) => <MediaAssetManagerCard onPick={onPick} />}
      />
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
      <span className="native-entry-card__meta">
        {entry.contentType} / {entry.status} / {entry.workflowState} / {entry.target}
      </span>
      <strong>{entry.title || 'untitled'}</strong>
      <span className="native-entry-card__slug">{entry.slug || 'no-slug'}</span>
      <span className="native-entry-card__date">{entry.updatedAt}</span>
    </button>
  )
}

function RevisionList({ revisions, onRestore, state }) {
  return (
    <section className="review-summary-card">
      <div className="review-summary-card__eyebrow">revisions</div>
      <p className="review-card__excerpt">status: {state}</p>
      <div className="native-revision-list">
        {revisions.map((rev) => (
          <article className="native-revision-item" key={rev.id}>
            <div className="native-revision-item__meta">
              <strong>{rev.revisionNote}</strong>
              <span>{rev.createdAt}</span>
            </div>
            <div className="review-card__actions">
              <button className="button button--primary" type="button" onClick={() => onRestore(rev.id)}>
                restore
              </button>
            </div>
          </article>
        ))}
        {!revisions.length ? <p className="review-card__excerpt">No revisions yet.</p> : null}
      </div>
    </section>
  )
}

export function NativeContentBridgePage() {
  const resolvedConfig = useResolvedConfig()
  const [searchParams, setSearchParams] = useSearchParams()

  const eyebrow = getConfiguredText(resolvedConfig, 'nativeBridge.eyebrow', 'native / publish / bridge')
  const title = getConfiguredText(resolvedConfig, 'nativeBridge.title', 'Native Publishing Bridge')
  const description = getConfiguredText(
    resolvedConfig,
    'nativeBridge.description',
    'Choose what you are making first, then work inside a type-specific creation flow instead of a generic backend form.'
  )

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
  const emptyLabel = getConfiguredText(resolvedConfig, 'nativeBridge.emptyLabel', 'No native entries yet. Start with a content type instead of opening a raw empty object.')

  const [items, setItems] = useState([])
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState(createTypedEntry('article'))
  const [creationKind, setCreationKind] = useState('article')
  const [importText, setImportText] = useState('')
  const [copied, setCopied] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const [permissionState, setPermissionState] = useState('loading')
  const [canEdit, setCanEdit] = useState(false)
  const [revisionState, setRevisionState] = useState('idle')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [revisions, setRevisions] = useState([])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const perms = await getEditorPermissionsSnapshot()
        if (cancelled) return
        setCanEdit(Boolean(perms?.nativeContent?.canEdit))
        setPermissionState('loaded')
      } catch {
        if (!cancelled) {
          setCanEdit(false)
          setPermissionState('error')
        }
      }

      const loaded = await loadNativeCollection({ includeFuture: 1 })
      if (cancelled) return
      setItems(loaded)

      const requestedEditId = searchParams.get('edit')
      if (requestedEditId) {
        const found = loaded.find((item) => item.id === requestedEditId)
        if (found) {
          setActiveId(found.id)
          setDraft(found)
          setCreationKind(inferCreationKind(found))
          return
        }
      }

      const requestedKind = searchParams.get('new')
      if (requestedKind && CREATION_MODES[requestedKind]) {
        const fresh = createTypedEntry(requestedKind)
        setActiveId(fresh.id)
        setDraft(fresh)
        setCreationKind(requestedKind)
        return
      }

      if (loaded.length) {
        setActiveId(loaded[0].id)
        setDraft(loaded[0])
        setCreationKind(inferCreationKind(loaded[0]))
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    async function loadRevisions() {
      if (!draft?.id || !canEdit) {
        setRevisions([])
        return
      }

      try {
        setRevisionState('loading')
        const data = await fetchNativeRevisions({ nativeId: draft.id })
        if (cancelled) return
        setRevisions(Array.isArray(data?.items) ? data.items : [])
        setRevisionState('loaded')
      } catch {
        if (cancelled) return
        setRevisions([])
        setRevisionState('error')
      }
    }

    loadRevisions()
    return () => {
      cancelled = true
    }
  }, [draft?.id, canEdit])

  const latestHome = useMemo(() => getLatestPublishedNativeEntry(items, 'home'), [items])
  const latestGeneral = useMemo(() => getLatestPublishedNativeEntry(items, 'general'), [items])

  function selectEntry(entry) {
    setActiveId(entry.id)
    setDraft(entry)
    setCreationKind(inferCreationKind(entry))
    if (searchParams.get('new')) {
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }

  function handleNew(kind = creationKind) {
    const fresh = createTypedEntry(kind)
    setActiveId(fresh.id)
    setDraft(fresh)
    setCreationKind(kind)
    const next = new URLSearchParams(searchParams)
    next.set('new', kind)
    setSearchParams(next, { replace: true })
  }

  async function handleSave(note = 'save') {
    const next = await upsertNativeEntry(items, draft, note)
    setItems(next)
    const saved = next.find((item) => item.id === draft.id) || next[0]
    if (saved) {
      setActiveId(saved.id)
      setDraft(saved)
      setCreationKind(inferCreationKind(saved))
    }
  }

  async function handleDelete() {
    if (!activeId) return
    const next = await deleteNativeEntry(items, activeId)
    setItems(next)
    if (next.length) {
      setActiveId(next[0].id)
      setDraft(next[0])
      setCreationKind(inferCreationKind(next[0]))
    } else {
      const fresh = createTypedEntry(creationKind)
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
      scheduledFor: '',
      status: 'draft',
      workflowState: 'draft',
    }
    setActiveId(copy.id)
    setDraft(copy)
    setCreationKind(inferCreationKind(copy))
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
        setCreationKind(inferCreationKind(next[0]))
      }
      setImportStatus('imported')
    } catch {
      setImportStatus('invalid json')
    }
  }

  async function handleRestoreRevision(revisionId) {
    try {
      const data = await restoreNativeRevision(revisionId)
      const restored = data?.item
      if (!restored) return
      const refreshed = await loadNativeCollection({ includeFuture: 1 })
      setItems(refreshed)
      setActiveId(restored.id)
      setDraft(restored)
      setCreationKind(inferCreationKind(restored))
    } catch {
      // ignore visible error path for now
    }
  }

  function pickCreationKind(kind) {
    setCreationKind(kind)
    setDraft((current) => applyModeToDraft(current, kind))
    const next = new URLSearchParams(searchParams)
    next.set('new', kind)
    setSearchParams(next, { replace: true })
  }

  return (
    <AdminFrame>
    <main className="page native-content-bridge-page native-bridge-page">
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
          <span>permission: {permissionState === 'loaded' ? (canEdit ? 'can edit' : 'read only') : permissionState}</span>
        </div>
      </section>

      <section className="native-bridge-wizard">
        <div className="native-bridge-wizard__header">
          <div>
            <div className="native-bridge-wizard__eyebrow">step 1</div>
            <h2>Choose what you are making</h2>
            <p>Pick a content type first. The form below changes shape around that choice.</p>
          </div>
          <button className="button button--primary" type="button" onClick={() => handleNew(creationKind)}>
            {newEntryLabel}: {CREATION_MODES[creationKind]?.label || 'Article / Dispatch'}
          </button>
        </div>

        <div className="native-bridge-wizard__grid">
          {Object.entries(CREATION_MODES).map(([key, mode]) => (
            <button
              key={key}
              type="button"
              className={`native-bridge-wizard__card${creationKind === key ? ' is-active' : ''}`}
              onClick={() => pickCreationKind(key)}
            >
              <strong>{mode.label}</strong>
              <span>{mode.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={`native-bridge-layout${showAdvanced ? " native-bridge-layout--advanced" : ""}`}>
        <aside className={`native-bridge-sidebar${showAdvanced ? " native-bridge-sidebar--open" : ""}`}>
          <div className="review-card__actions">
            <button className="button button--primary" type="button" onClick={() => handleNew(creationKind)}>
              {newEntryLabel}
            </button>
            <button className="button" type="button" onClick={handleExport}>
              {copied ? 'copied' : exportLabel}
            </button>
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
            <button className="button" type="button" onClick={handleImport} disabled={!canEdit}>
              {importLabel}
            </button>
          </div>
          {importStatus ? <p className="review-card__excerpt">{importStatus}</p> : null}

          {showAdvanced && revisions.length ? <RevisionList revisions={revisions} onRestore={handleRestoreRevision} state={revisionState} /> : null}
        </aside>

        <section className="native-bridge-main">
          <div className="review-card__actions native-editor-primary-actions">
            <Link className="button" to="/content">Back to posts</Link>
            <button className="button" type="button" onClick={() => setShowAdvanced((value) => !value)}>
              {showAdvanced ? 'Hide advanced' : 'Show advanced'}
            </button>
          </div>

          <section className="native-publish-shell">
            <div className="native-publish-shell__editor">
              <NativeEntryEditor
                value={draft}
                onChange={setDraft}
                creationKind={creationKind}
                onPickCreationKind={pickCreationKind}
                tagsLabel={tagsLabel}
              />
            </div>

            <aside className="native-publish-panel" aria-label="Publish settings">
              <div className="native-publish-panel__header">
                <div className="native-publish-panel__eyebrow">publish</div>
                <h2>Publish settings</h2>
              </div>

              <label className="archive-control">
                <span>status</span>
                <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </label>

              <label className="archive-control">
                <span>workflow</span>
                <select value={draft.workflowState || 'draft'} onChange={(e) => setDraft((d) => ({ ...d, workflowState: e.target.value }))}>
                  <option value="draft">draft</option>
                  <option value="in_review">in_review</option>
                  <option value="needs_revision">needs_revision</option>
                  <option value="ready">ready</option>
                  <option value="scheduled">scheduled</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </label>

              <label className="archive-control">
                <span>slug</span>
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))}
                  placeholder="slug"
                />
              </label>

              <label className="archive-control">
                <span>target</span>
                <select value={draft.target} onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}>
                  <option value="general">general</option>
                  <option value="home">home</option>
                  <option value="press">press</option>
                  <option value="projects">projects</option>
                </select>
              </label>

              <label className="archive-control">
                <span>scheduled for</span>
                <input
                  type="datetime-local"
                  value={toLocalDateTime(draft.scheduledFor)}
                  onChange={(e) => setDraft((d) => ({ ...d, scheduledFor: fromLocalDateTime(e.target.value) }))}
                />
              </label>

              <label className="archive-control">
                <span>featured image</span>
                <input
                  type="text"
                  value={draft.featuredImage || draft.heroImage || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, featuredImage: e.target.value, heroImage: e.target.value }))}
                  placeholder="featured image url"
                />
              </label>

              {(draft.featuredImage || draft.heroImage) ? (
                <img className="native-publish-panel__image" src={draft.featuredImage || draft.heroImage} alt="" />
              ) : null}

              <div className="native-publish-panel__actions">
                <button className="button button--primary" type="button" onClick={() => handleSave(`save ${creationKind}`)} disabled={!canEdit}>
                  Save draft
                </button>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, status: 'published', workflowState: d.scheduledFor ? 'scheduled' : 'published' }))}
                >
                  Publish / mark ready
                </button>
                {draft.slug ? (
                  <Link className="button" to={draft.status === 'published' ? `/updates/${draft.slug}` : `/native-bridge?edit=${draft.id}`}>
                    Preview
                  </Link>
                ) : null}
              </div>
            </aside>
          </section>

          {showAdvanced ? (
            <section className="native-editor-advanced">
              <div className="native-editor-advanced__header">
                <div>
                  <div className="review-summary-card__eyebrow">advanced</div>
                  <h2>Workflow, bridges, and raw shape</h2>
                </div>
                <div className="review-card__actions">
                  <button className="button" type="button" onClick={handleDuplicate}>
                    {duplicateEntryLabel}
                  </button>
                  <button className="button" type="button" onClick={handleDelete} disabled={!canEdit}>
                    {deleteEntryLabel}
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, status: 'archived', workflowState: 'archived' }))}
                  >
                    archive draft
                  </button>
                </div>
              </div>

              {creationKind === 'podcast' ? <TranscriptBridgeCard draft={draft} setDraft={setDraft} /> : null}

              <NativeSourceBridgeCard nativeContentId={draft?.id || ''} />
              <NativeTaxonomyBridgeCard nativeContentId={draft?.id || ''} />

              <section className="review-summary-grid">
                <article className="review-summary-card">
                  <div className="review-summary-card__eyebrow">{previewLabel}</div>
                  <ul>
                    <li><span>title</span><strong>{draft.title || 'untitled'}</strong></li>
                    <li><span>slug</span><strong>{draft.slug || 'no-slug'}</strong></li>
                    <li><span>type</span><strong>{draft.contentType}</strong></li>
                    <li><span>status</span><strong>{draft.status}</strong></li>
                    <li><span>workflow</span><strong>{draft.workflowState || 'draft'}</strong></li>
                    <li><span>target</span><strong>{draft.target}</strong></li>
                    <li><span>scheduled</span><strong>{draft.scheduledFor || 'none'}</strong></li>
                  </ul>
                </article>

                <article className="review-summary-card">
                  <div className="review-summary-card__eyebrow">raw shape</div>
                  <pre className="review-card__snippet">{JSON.stringify(draft, null, 2)}</pre>
                </article>
              </section>
            </section>
          ) : null}
        </section>
      </section>
    </main>
    </AdminFrame>
  )
}

function toLocalDateTime(value) {
  const str = String(value || '').trim()
  if (!str) return ''
  const d = new Date(str)
  if (!Number.isFinite(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDateTime(value) {
  const str = String(value || '').trim()
  if (!str) return ''
  const d = new Date(str)
  return Number.isFinite(d.getTime()) ? d.toISOString() : ''
}
