import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPieces } from '../lib/pieces'
import {
  createEmptyNativeEntry,
  loadNativeCollection,
  slugify,
  upsertNativeEntryLocal,
  upsertNativeEntry,
} from '../lib/nativePublicContent'
import { AdminFrame } from './AdminRail'
import { MediaPickerModal } from './MediaLibraryPage'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'

function normalizeTermList(value) {
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
  if (typeof value === 'string') return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
  return []
}

function createTypedEntry(kind = 'article') {
  const base = createEmptyNativeEntry()
  return {
    ...base,
    contentType: kind === 'podcast' ? 'podcast' : kind === 'print' ? 'print' : 'dispatch',
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    richBody: [],
    status: 'draft',
    workflowState: 'draft',
    tags: [],
    categories: [],
    featuredImage: '',
    heroImage: '',
    featuredImageTitle: '',
    featuredImageAlt: '',
    featuredImageCaption: '',
    podcastAudioUrl: '',
    podcastRssEnclosureUrl: '',
    podcastDuration: '',
    podcastEpisodeNumber: '',
    podcastSeason: '',
    podcastTranscript: '',
    podcastSummary: '',
    podcastCoverImage: '',
  }
}

function toLocalDateTime(value) {
  const d = new Date(String(value || ''))
  if (!Number.isFinite(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDateTime(value) {
  const d = new Date(String(value || ''))
  return Number.isFinite(d.getTime()) ? d.toISOString() : ''
}

function wrapSelected(textarea, opener, closer = opener) {
  if (!textarea) return null
  const start = textarea.selectionStart ?? 0
  const end = textarea.selectionEnd ?? 0
  const value = textarea.value || ''
  const selected = value.slice(start, end) || 'text'
  const next = `${value.slice(0, start)}${opener}${selected}${closer}${value.slice(end)}`
  const cursorStart = start + opener.length
  const cursorEnd = cursorStart + selected.length
  return { next, cursorStart, cursorEnd }
}

function prefixSelectedLines(textarea, prefix) {
  if (!textarea) return null
  const start = textarea.selectionStart ?? 0
  const end = textarea.selectionEnd ?? 0
  const value = textarea.value || ''
  const hasSelection = end > start
  if (!hasSelection) {
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const lineEndIndex = value.indexOf('\n', start)
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
    const line = value.slice(lineStart, lineEnd)
    const nextLine = `${prefix}${line}`
    const next = `${value.slice(0, lineStart)}${nextLine}${value.slice(lineEnd)}`
    return { next, cursorStart: lineStart, cursorEnd: lineStart + nextLine.length }
  }
  const segment = value.slice(start, end)
  const nextSegment = segment
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')
  const next = `${value.slice(0, start)}${nextSegment}${value.slice(end)}`
  return { next, cursorStart: start, cursorEnd: start + nextSegment.length }
}

function wrapSelectionWithHtmlBlock(textarea, style) {
  if (!textarea) return null
  const start = textarea.selectionStart ?? 0
  const end = textarea.selectionEnd ?? 0
  const value = textarea.value || ''
  const selected = value.slice(start, end) || 'text'
  const snippet = `<div style="${style}">${selected}</div>`
  const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`
  const cursorStart = start
  const cursorEnd = start + snippet.length
  return { next, cursorStart, cursorEnd }
}

const AUTOSAVE_DEBOUNCE_MS = 1200
const LOCAL_REVISIONS_KEY_PREFIX = 'sabot-native-local-revisions-v1'

function getLocalRevisionsStorageKey(id) {
  return `${LOCAL_REVISIONS_KEY_PREFIX}:${String(id || '')}`
}

function loadLocalRevisions(postId) {
  if (!postId) return []
  try {
    const raw = window.localStorage.getItem(getLocalRevisionsStorageKey(postId))
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(Boolean).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  } catch {
    return []
  }
}

function saveLocalRevision(postId, draft, note) {
  if (!postId) return { ok: false, revisions: [] }
  const snapshot = {
    id: `revision-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    note: String(note || 'manual save'),
    draft: {
      title: String(draft?.title || ''),
      slug: String(draft?.slug || ''),
      body: String(draft?.body || ''),
      excerpt: String(draft?.excerpt || ''),
      tags: Array.isArray(draft?.tags) ? draft.tags : [],
      categories: Array.isArray(draft?.categories) ? draft.categories : [],
      featuredImage: String(draft?.featuredImage || ''),
      heroImage: String(draft?.heroImage || ''),
      status: String(draft?.status || 'draft'),
      workflowState: String(draft?.workflowState || 'draft'),
      podcastAudioUrl: String(draft?.podcastAudioUrl || ''),
      podcastRssEnclosureUrl: String(draft?.podcastRssEnclosureUrl || ''),
      podcastDuration: String(draft?.podcastDuration || ''),
      podcastEpisodeNumber: String(draft?.podcastEpisodeNumber || ''),
      podcastSeason: String(draft?.podcastSeason || ''),
      podcastTranscript: String(draft?.podcastTranscript || ''),
      podcastSummary: String(draft?.podcastSummary || ''),
      podcastCoverImage: String(draft?.podcastCoverImage || ''),
    },
  }

  const nextRevisions = [snapshot, ...loadLocalRevisions(postId)].slice(0, 25)
  try {
    window.localStorage.setItem(getLocalRevisionsStorageKey(postId), JSON.stringify(nextRevisions))
    return { ok: true, revisions: nextRevisions }
  } catch {
    return { ok: false, revisions: loadLocalRevisions(postId) }
  }
}

function toAutosaveFingerprint(draft, allowComments) {
  return JSON.stringify({
    title: draft?.title || '',
    slug: draft?.slug || '',
    excerpt: draft?.excerpt || '',
    body: draft?.body || '',
    contentType: draft?.contentType || 'dispatch',
    status: draft?.status || 'draft',
    workflowState: draft?.workflowState || 'draft',
    scheduledFor: draft?.scheduledFor || '',
    tags: Array.isArray(draft?.tags) ? draft.tags : [],
    categories: Array.isArray(draft?.categories) ? draft.categories : [],
    featuredImage: draft?.featuredImage || '',
    heroImage: draft?.heroImage || '',
    podcastAudioUrl: draft?.podcastAudioUrl || '',
    podcastRssEnclosureUrl: draft?.podcastRssEnclosureUrl || '',
    podcastDuration: draft?.podcastDuration || '',
    podcastEpisodeNumber: draft?.podcastEpisodeNumber || '',
    podcastSeason: draft?.podcastSeason || '',
    podcastTranscript: draft?.podcastTranscript || '',
    podcastSummary: draft?.podcastSummary || '',
    podcastCoverImage: draft?.podcastCoverImage || '',
    allowComments: Boolean(allowComments),
  })
}

function formatAutosaveTime(value) {
  const d = new Date(String(value || ''))
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function NativeContentBridgePage() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState(createTypedEntry())
  const [editorTab, setEditorTab] = useState('visual')
  const [tagInput, setTagInput] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [categoryTab, setCategoryTab] = useState('all')
  const [openMediaFor, setOpenMediaFor] = useState('')
  const [allowComments, setAllowComments] = useState(true)
  const [isPermalinkEditing, setIsPermalinkEditing] = useState(false)
  const [permalinkDraft, setPermalinkDraft] = useState('')
  const textareaRef = useRef(null)
  const autosaveTimerRef = useRef(null)
  const suppressAutosaveRef = useRef(false)
  const lastAutosaveFingerprintRef = useRef('')
  const [revisions, setRevisions] = useState([])
  const [autosaveState, setAutosaveState] = useState({ status: 'idle', at: '' })
  const { pushNotice } = useAdminNotices()

  const categoryOptions = useMemo(() => [...new Set(getPieces().flatMap((piece) => piece.projects || [piece.primaryProject]).filter(Boolean))], [])
  const publicPieceSlugSet = useMemo(() => new Set(getPieces().map((piece) => piece.slug).filter(Boolean)), [])
  const mostUsedCategories = useMemo(() => {
    const counts = new Map()
    for (const item of items) {
      for (const category of (item.categories || item.projects || [])) {
        counts.set(category, (counts.get(category) || 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 10)
  }, [items])
  const mostUsedTags = useMemo(() => {
    const counts = new Map()
    for (const item of items) {
      for (const tag of (item.tags || [])) {
        counts.set(tag, (counts.get(tag) || 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [items])

  useEffect(() => {
    async function boot() {
      const loaded = await loadNativeCollection({ includeFuture: 1 })
      setItems(Array.isArray(loaded) ? loaded : [])
      const editId = searchParams.get('edit')
      const mode = searchParams.get('new') || 'article'
      const found = (loaded || []).find((item) => item.id === editId)
      if (found) {
        setActiveId(found.id)
        setDraft({ ...found, tags: found.tags || [], categories: found.categories || found.projects || [] })
        setPermalinkDraft(found.slug || '')
        setAllowComments(found.allowComments ?? true)
        setRevisions(loadLocalRevisions(found.id))
        lastAutosaveFingerprintRef.current = toAutosaveFingerprint(found, found.allowComments ?? true)
      } else {
        const fresh = createTypedEntry(mode)
        setActiveId(fresh.id)
        setDraft(fresh)
        setPermalinkDraft(fresh.slug || '')
        setAllowComments(true)
        setRevisions(loadLocalRevisions(fresh.id))
        lastAutosaveFingerprintRef.current = toAutosaveFingerprint(fresh, true)
      }
      setAutosaveState({ status: 'idle', at: '' })
    }
    boot()
  }, [searchParams])

  function restoreRevision(revision) {
    if (!revision?.draft) return
    const restored = {
      ...draft,
      ...revision.draft,
      tags: Array.isArray(revision.draft.tags) ? revision.draft.tags : [],
      categories: Array.isArray(revision.draft.categories) ? revision.draft.categories : [],
    }
    setDraft(restored)
    setPermalinkDraft(restored.slug || '')
    pushNotice('Post saved.', 'info')
  }

  useEffect(() => {
    if (!activeId) return
    const fingerprint = toAutosaveFingerprint(draft, allowComments)
    if (!fingerprint || fingerprint === lastAutosaveFingerprintRef.current || suppressAutosaveRef.current) return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        setAutosaveState({ status: 'saving', at: '' })
        await upsertNativeEntryLocal(items, {
          ...draft,
          slug: slugify(draft.slug || draft.title),
          categories: normalizeTermList(draft.categories || draft.projects),
          projects: normalizeTermList(draft.categories || draft.projects),
          allowComments,
        }, 'autosave')
        lastAutosaveFingerprintRef.current = fingerprint
        setAutosaveState({ status: 'saved', at: new Date().toISOString() })
      } catch {
        setAutosaveState({ status: 'error', at: '' })
        pushNotice('Autosave failed.', 'error')
      }
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [activeId, draft, allowComments, items, pushNotice])

  function addTagsFromInput(rawInput = tagInput) {
    const nextTags = normalizeTermList(rawInput)
    if (!nextTags.length) return
    setDraft((d) => ({ ...d, tags: [...new Set([...(d.tags || []), ...nextTags])] }))
    setTagInput('')
  }

  async function handleSave(note = 'save') {
    const normalizedCategories = normalizeTermList(draft.categories || draft.projects)
    const normalized = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      categories: normalizedCategories,
      projects: normalizedCategories,
      featuredImage: draft.featuredImage || draft.heroImage || '',
      heroImage: draft.heroImage || draft.featuredImage || '',
      featuredImageTitle: draft.featuredImageTitle || '',
      featuredImageAlt: draft.featuredImageAlt || '',
      featuredImageCaption: draft.featuredImageCaption || '',
      podcastCoverImage: draft.podcastCoverImage || draft.featuredImage || draft.heroImage || '',
      allowComments,
    }
    const next = await upsertNativeEntry(items, normalized, note)
    setItems(next)
    const saved = next.find((item) => item.id === normalized.id)
    if (saved) {
      setActiveId(saved.id)
      setDraft(saved)
      setPermalinkDraft(saved.slug || '')
      const snapshot = saveLocalRevision(saved.id, saved, note)
      setRevisions(snapshot.revisions)
      pushNotice('Post saved.', 'success')
    }
    return saved || null
  }

  async function handleMoveToTrash() {
    const normalizedCategories = normalizeTermList(draft.categories || draft.projects)
    const next = await upsertNativeEntry(items, {
      ...draft,
      status: 'trash',
      workflowState: 'draft',
      categories: normalizedCategories,
      projects: normalizedCategories,
      allowComments,
    }, 'trash')
    setItems(next)
    pushNotice('Post moved to Trash.', 'warning')
  }

  async function handlePreviewChanges() {
    const normalizedCategories = normalizeTermList(draft.categories || draft.projects)
    const normalized = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      categories: normalizedCategories,
      projects: normalizedCategories,
      featuredImage: draft.featuredImage || draft.heroImage || '',
      heroImage: draft.heroImage || draft.featuredImage || '',
      featuredImageTitle: draft.featuredImageTitle || '',
      featuredImageAlt: draft.featuredImageAlt || '',
      featuredImageCaption: draft.featuredImageCaption || '',
      podcastCoverImage: draft.podcastCoverImage || draft.featuredImage || draft.heroImage || '',
      allowComments,
    }
    const next = await upsertNativeEntry(items, normalized, 'preview')
    setItems(next)
    const saved = next.find((item) => item.id === normalized.id)
    if (!saved) return
    setActiveId(saved.id)
    setDraft(saved)
    setPermalinkDraft(saved.slug || '')
    const canResolvePublicRoute = saved.status === 'published' && Boolean(saved.slug) && publicPieceSlugSet.has(saved.slug)
    const previewPath = canResolvePublicRoute ? `/post/${saved.slug}` : `/native-preview/${saved.id}`
    window.open(previewPath, '_blank', 'noopener,noreferrer')
  }

  function applyEditorMutation(mutator) {
    const el = textareaRef.current
    const result = mutator(el)
    if (!result) return
    setDraft((d) => ({ ...d, body: result.next }))
    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      textareaRef.current.selectionStart = result.cursorStart
      textareaRef.current.selectionEnd = result.cursorEnd
    })
  }

  function insertAtCursor(snippet) {
    applyEditorMutation((textarea) => {
      if (!textarea) return null
      const start = textarea.selectionStart ?? 0
      const end = textarea.selectionEnd ?? 0
      const value = textarea.value || ''
      const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`
      const cursor = start + snippet.length
      return { next, cursorStart: cursor, cursorEnd: cursor }
    })
  }

  function handleTitleChange(nextTitle) {
    setDraft((current) => {
      const manuallyEditedSlug = current.slugManuallyEdited === true
      if (manuallyEditedSlug) return { ...current, title: nextTitle }
      const nextSlug = slugify(nextTitle)
      setPermalinkDraft(nextSlug)
      return { ...current, title: nextTitle, slug: nextSlug }
    })
  }

  function handlePermalinkConfirm() {
    const nextSlug = slugify(permalinkDraft)
    setDraft((current) => ({ ...current, slug: nextSlug, slugManuallyEdited: true }))
    setPermalinkDraft(nextSlug)
    setIsPermalinkEditing(false)
  }

  function handlePermalinkCancel() {
    setPermalinkDraft(draft.slug || '')
    setIsPermalinkEditing(false)
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen wp-edit-screen">
        <div className="wp-screen-header">
          <h1>{searchParams.get('edit') ? 'Edit Post' : 'Add New Post'}</h1>
          <Link className="button" to="/native-bridge?new=article">Add New</Link>
        </div>
        <WpAdminNotices />

        <section className="wp-edit-main">
          <div className="wp-edit-content">
            <input className="wp-title-input" value={draft.title || ''} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Add title" />
            <div className="wp-permalink-row">
              <span>Permalink: /post/{draft.slug || 'sample-post'}</span>
              {!isPermalinkEditing ? (
                <button type="button" className="button button-link" onClick={() => setIsPermalinkEditing(true)}>Edit</button>
              ) : (
                <span className="wp-permalink-edit-controls">
                  <input
                    type="text"
                    value={permalinkDraft}
                    onChange={(e) => setPermalinkDraft(e.target.value)}
                    aria-label="Edit permalink slug"
                  />
                  <button type="button" className="button button-small" onClick={handlePermalinkConfirm}>OK</button>
                  <button type="button" className="button button-small" onClick={handlePermalinkCancel}>Cancel</button>
                </span>
              )}
            </div>

            <div className="wp-editor-actions">
              <button type="button" className="button" onClick={() => setOpenMediaFor('body')}>Add Media</button>
              <div className="wp-editor-tabs">
                <button type="button" className={`button${editorTab === 'visual' ? ' button--primary' : ''}`} onClick={() => setEditorTab('visual')}>Visual</button>
                <button type="button" className={`button${editorTab === 'text' ? ' button--primary' : ''}`} onClick={() => setEditorTab('text')}>Text</button>
              </div>
            </div>

            <div className="wp-classic-toolbar" role="toolbar" aria-label="Classic formatting toolbar">
              <button type="button" className="wp-toolbar-btn" aria-label="Bold" title="Bold" onClick={() => applyEditorMutation((el) => wrapSelected(el, '**'))}><strong>B</strong></button>
              <button type="button" className="wp-toolbar-btn" aria-label="Italic" title="Italic" onClick={() => applyEditorMutation((el) => wrapSelected(el, '*'))}><em>I</em></button>
              <button type="button" className="wp-toolbar-btn" onClick={() => {
                const href = window.prompt('Enter URL for link', 'https://')
                if (!href) return
                applyEditorMutation((el) => wrapSelected(el, '[', `](${href})`))
              }} aria-label="Insert link" title="Insert/edit link">🔗</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Bulleted list" title="Bulleted list" onClick={() => applyEditorMutation((el) => prefixSelectedLines(el, '- '))}>•</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Numbered list" title="Numbered list" onClick={() => applyEditorMutation((el) => prefixSelectedLines(el, '1. '))}>1.</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Blockquote" title="Blockquote" onClick={() => applyEditorMutation((el) => prefixSelectedLines(el, '> '))}>❞</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Align left" title="Align left" onClick={() => applyEditorMutation((el) => wrapSelectionWithHtmlBlock(el, 'text-align:left;'))}>≡</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Align center" title="Align center" onClick={() => applyEditorMutation((el) => wrapSelectionWithHtmlBlock(el, 'text-align:center;'))}>≣</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Align right" title="Align right" onClick={() => applyEditorMutation((el) => wrapSelectionWithHtmlBlock(el, 'text-align:right;'))}>☰</button>
            </div>
            <textarea ref={textareaRef} className="wp-editor-textarea" value={draft.body || ''} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} placeholder="Start writing…" />

            <article className="wp-meta-box"><h2>Excerpt</h2><textarea value={draft.excerpt || ''} onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))} /></article>
            {(draft.contentType || 'dispatch') === 'podcast' ? (
              <article className="wp-meta-box">
                <h2>Podcast Episode Details</h2>
                <div className="wp-settings-form">
                  <label>
                    <span>Audio URL</span>
                    <input
                      type="url"
                      value={draft.podcastAudioUrl || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, podcastAudioUrl: e.target.value }))}
                      placeholder="https://cdn.example.com/audio/episode-1.mp3"
                    />
                  </label>
                  <label>
                    <span>RSS enclosure URL</span>
                    <input
                      type="url"
                      value={draft.podcastRssEnclosureUrl || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, podcastRssEnclosureUrl: e.target.value }))}
                      placeholder="https://feeds.example.com/enclosure.mp3"
                    />
                  </label>
                  <label>
                    <span>Duration</span>
                    <input
                      value={draft.podcastDuration || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, podcastDuration: e.target.value }))}
                      placeholder="00:42:30"
                    />
                  </label>
                  <label>
                    <span>Episode number</span>
                    <input
                      value={draft.podcastEpisodeNumber || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, podcastEpisodeNumber: e.target.value }))}
                      placeholder="12"
                    />
                  </label>
                  <label>
                    <span>Season</span>
                    <input
                      value={draft.podcastSeason || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, podcastSeason: e.target.value }))}
                      placeholder="2"
                    />
                  </label>
                  <label>
                    <span>Cover image</span>
                    <input
                      type="url"
                      value={draft.podcastCoverImage || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, podcastCoverImage: e.target.value }))}
                      placeholder="https://cdn.example.com/podcast-cover.jpg"
                    />
                  </label>
                  <label>
                    <span>Summary</span>
                    <textarea
                      value={draft.podcastSummary || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, podcastSummary: e.target.value }))}
                      placeholder="Episode summary for show notes."
                    />
                  </label>
                  <label>
                    <span>Transcript</span>
                    <textarea
                      value={draft.podcastTranscript || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, podcastTranscript: e.target.value }))}
                      placeholder="Full transcript text"
                    />
                  </label>
                </div>
              </article>
            ) : null}
            <article className="wp-meta-box"><h2>Discussion</h2><label><input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} /> Allow comments</label></article>
            <article className="wp-meta-box">
              <h2>Revisions</h2>
              {revisions.length ? (
                <ul className="wp-revisions-list">
                  {revisions.map((revision) => (
                    <li key={revision.id} className="wp-revisions-item">
                      <div>
                        <strong>{new Date(revision.createdAt).toLocaleString()}</strong>
                        <div className="wp-revisions-note">{revision.note}</div>
                      </div>
                      <button type="button" className="button" onClick={() => restoreRevision(revision)}>Restore</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No local revision snapshots yet. Save Draft or Publish/Update to create one.</p>
              )}
            </article>
            <article className="wp-meta-box"><h2>Custom Fields / Advanced</h2><p>Advanced bridge fields remain available in native storage.</p></article>
          </div>

          <aside className="wp-edit-sidebar">
            <article className="wp-meta-box">
              <h2>Publish</h2>
              <p>Status: <strong>{draft.status || 'draft'}</strong></p>
              <p>Autosave: <strong>{autosaveState.status === 'saved' && autosaveState.at ? `Saved at ${formatAutosaveTime(autosaveState.at)}` : autosaveState.status}</strong></p>
              <label>Visibility <select><option>Public</option><option>Private</option></select></label>
              <label>Publish <input type="datetime-local" value={toLocalDateTime(draft.scheduledFor)} onChange={(e) => setDraft((d) => ({ ...d, scheduledFor: fromLocalDateTime(e.target.value) }))} /></label>
              <div className="wp-meta-actions">
                <button type="button" className="button" onClick={handlePreviewChanges}>Preview Changes</button>
                <button type="button" className="button" onClick={() => handleSave('save draft')}>Save Draft</button>
                <button type="button" className="button button--primary" onClick={async () => {
                  const isScheduled = Boolean(draft.scheduledFor) && new Date(draft.scheduledFor).getTime() > Date.now()
                  const next = { ...draft, status: isScheduled ? 'scheduled' : 'published', workflowState: isScheduled ? 'scheduled' : 'published' }
                  setDraft(next)
                  const saved = await handleSave('publish')
                  if (saved) {
                    setDraft(saved)
                    pushNotice('Post published.', 'success')
                  }
                }}>Publish / Update</button>
                {draft?.id && ['published', 'scheduled'].includes(draft?.status) ? (
                  <Link
                    className="button"
                    to={draft.slug && publicPieceSlugSet.has(draft.slug) ? `/post/${draft.slug}` : `/native-preview/${draft.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Post
                  </Link>
                ) : null}
                <button type="button" className="button" onClick={handleMoveToTrash}>Move to Trash</button>
              </div>
            </article>

            <article className="wp-meta-box">
              <h2>Format</h2>
              {[
                { label: 'Standard', value: 'dispatch' },
                { label: 'Podcast', value: 'podcast' },
                { label: 'Print / Zine', value: 'print' },
              ].map((format) => (
                <label key={format.value}><input type="radio" checked={(draft.contentType || 'dispatch') === format.value} onChange={() => setDraft((d) => ({ ...d, contentType: format.value }))} /> {format.label}</label>
              ))}
            </article>

            <article className="wp-meta-box">
              <h2>Categories</h2>
              <div className="wp-taxonomy-tabs">
                <button type="button" className={`wp-taxonomy-tab${categoryTab === 'all' ? ' is-active' : ''}`} onClick={() => setCategoryTab('all')}>All Categories</button>
                <button type="button" className={`wp-taxonomy-tab${categoryTab === 'used' ? ' is-active' : ''}`} onClick={() => setCategoryTab('used')}>Most Used</button>
              </div>
              {(categoryTab === 'used' ? mostUsedCategories : categoryOptions).map((category) => (
                <label key={category}><input type="checkbox" checked={(draft.categories || []).includes(category)} onChange={(e) => setDraft((d) => ({ ...d, categories: e.target.checked ? [...new Set([...(d.categories || []), category])] : (d.categories || []).filter((item) => item !== category) }))} /> {category}</label>
              ))}
              <div className="wp-add-row"><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Add New Category" /><button type="button" className="button" onClick={() => { if (!newCategory.trim()) return; setDraft((d) => ({ ...d, categories: [...new Set([...(d.categories || []), newCategory.trim()])] })); setNewCategory('') }}>Add New Category</button></div>
            </article>

            <article className="wp-meta-box">
              <h2>Tags</h2>
              <div className="wp-add-row"><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagsFromInput() } }} placeholder="Add tags (comma separated)" /><button type="button" className="button" onClick={() => addTagsFromInput()}>Add</button></div>
              <div className="wp-tag-chips">{(draft.tags || []).map((tag) => <button key={tag} type="button" onClick={() => setDraft((d) => ({ ...d, tags: (d.tags || []).filter((item) => item !== tag) }))}>{tag} ×</button>)}</div>
              <button type="button" className="wp-view-tab" onClick={() => setDraft((d) => ({ ...d, tags: [...new Set([...(d.tags || []), ...mostUsedTags.slice(0, 8)])] }))}>Choose from the most used tags</button>
            </article>

            <article className="wp-meta-box">
              <h2>Featured Image</h2>
              {!draft.featuredImage ? (
                <button type="button" className="wp-link-button" onClick={() => setOpenMediaFor('featured')}>Set featured image</button>
              ) : (
                <>
                  <img className="wp-featured-preview" src={draft.featuredImage} alt={draft.featuredImageAlt || draft.featuredImageTitle || 'Featured image'} />
                  <div className="wp-featured-actions">
                    <button
                      type="button"
                      className="wp-link-button"
                      onClick={() => setDraft((d) => ({
                        ...d,
                        featuredImage: '',
                        heroImage: '',
                        featuredImageTitle: '',
                        featuredImageAlt: '',
                        featuredImageCaption: '',
                      }))}
                    >
                      Remove featured image
                    </button>
                    <button type="button" className="wp-link-button" onClick={() => setOpenMediaFor('featured')}>Replace featured image</button>
                  </div>
                </>
              )}
            </article>
          </aside>
        </section>

        <MediaPickerModal
          open={Boolean(openMediaFor)}
          onClose={() => setOpenMediaFor('')}
          onPick={(media) => {
            const selectedMedia = {
              url: String(media?.url || ''),
              title: String(media?.title || ''),
              alt: String(media?.alt || ''),
              caption: String(media?.caption || ''),
            }
            if (openMediaFor === 'featured') {
              setDraft((d) => ({
                ...d,
                featuredImage: selectedMedia.url,
                heroImage: selectedMedia.url,
                podcastCoverImage: (d.contentType || 'dispatch') === 'podcast' ? selectedMedia.url : d.podcastCoverImage || '',
                featuredImageTitle: selectedMedia.title,
                featuredImageAlt: selectedMedia.alt,
                featuredImageCaption: selectedMedia.caption,
              }))
            }
            if (openMediaFor === 'body') {
              insertAtCursor(`\n<img src="${selectedMedia.url}" alt="${selectedMedia.alt}" />\n`)
            }
            setOpenMediaFor('')
          }}
        />
      </main>
    </AdminFrame>
  )
}
