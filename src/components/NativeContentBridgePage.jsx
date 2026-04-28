import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPieces } from '../lib/pieces'
import {
  createEmptyNativeEntry,
  loadNativeCollection,
  slugify,
  upsertNativeEntryLocal,
  upsertNativeEntryWithMeta,
} from '../lib/nativePublicContent'
import { AdminFrame } from './AdminRail'
import { MediaPickerModal } from './MediaLibraryPage'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import { normalizeNativeDisplaySettings } from '../lib/publicDisplayModes'
import { classicEditorBodyToHtml } from '../lib/classicEditorBody'

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

function escapeHtmlAttribute(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeHtmlText(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function sanitizeVisualHtml(value = '') {
  const raw = String(value || '')
  if (!raw.trim()) return ''

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
      .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(raw, 'text/html')
  doc.querySelectorAll('script').forEach((node) => node.remove())

  for (const el of doc.querySelectorAll('*')) {
    for (const attr of Array.from(el.attributes || [])) {
      const name = String(attr.name || '').toLowerCase()
      const attrValue = String(attr.value || '')
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
        continue
      }
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(attrValue)) {
        el.setAttribute(attr.name, '#')
      }
    }
  }

  return doc.body.innerHTML
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
      contentType: String(draft?.contentType || 'dispatch'),
      body: String(draft?.body || ''),
      excerpt: String(draft?.excerpt || ''),
      tags: Array.isArray(draft?.tags) ? draft.tags : [],
      categories: Array.isArray(draft?.categories) ? draft.categories : [],
      featuredImage: String(draft?.featuredImage || ''),
      heroImage: String(draft?.heroImage || ''),
      enableReadMode: Boolean(draft?.enableReadMode ?? true),
      enableExperienceMode: Boolean(draft?.enableExperienceMode ?? true),
      enablePrintMode: Boolean(draft?.enablePrintMode ?? true),
      defaultMode: String(draft?.defaultMode || 'read'),
      heroStyle: String(draft?.heroStyle || 'default'),
      status: String(draft?.status || 'draft'),
      workflowState: String(draft?.workflowState || 'draft'),
      publishedAt: String(draft?.publishedAt || ''),
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
  const display = normalizeNativeDisplaySettings(draft)
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

function applyDisplayPatch(current, patch) {
  return {
    ...current,
    ...normalizeNativeDisplaySettings({
      ...current,
      ...patch,
    }),
  }
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
  const visualEditorRef = useRef(null)
  const autosaveTimerRef = useRef(null)
  const suppressAutosaveRef = useRef(false)
  const lastAutosaveFingerprintRef = useRef('')
  const visualSyncLockRef = useRef(false)
  const [visualEditorEmpty, setVisualEditorEmpty] = useState(true)
  const [revisions, setRevisions] = useState([])
  const [autosaveState, setAutosaveState] = useState({ status: 'idle', at: '' })
  const { pushNotice } = useAdminNotices()

  const categoryOptions = useMemo(() => [...new Set(getPieces().flatMap((piece) => piece.projects || [piece.primaryProject]).filter(Boolean))], [])
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
        setDraft({ ...found, tags: found.tags || [], categories: found.categories || found.projects || [], slugManuallyEdited: true })
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

  useEffect(() => {
    if (!visualSyncLockRef.current) return
    visualSyncLockRef.current = false
  }, [draft.body])

  useEffect(() => {
    if (editorTab !== 'visual') return
    if (visualSyncLockRef.current) return
    loadDraftBodyIntoVisualEditor()
  }, [editorTab, draft.body, activeId])

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

  const displaySettings = useMemo(() => normalizeNativeDisplaySettings(draft), [draft])

  function buildNormalizedDraft(baseDraft, patch = {}) {
    const merged = {
      ...baseDraft,
      ...patch,
    }
    const normalizedCategories = normalizeTermList(merged.categories || merged.projects)
    return {
      ...merged,
      slug: slugify(merged.slug || merged.title),
      tags: Array.isArray(merged.tags) ? merged.tags : [],
      categories: normalizedCategories,
      projects: normalizedCategories,
      featuredImage: merged.featuredImage || merged.heroImage || '',
      heroImage: merged.heroImage || merged.featuredImage || '',
      featuredImageTitle: merged.featuredImageTitle || '',
      featuredImageAlt: merged.featuredImageAlt || '',
      featuredImageCaption: merged.featuredImageCaption || '',
      podcastCoverImage: merged.podcastCoverImage || merged.featuredImage || merged.heroImage || '',
      allowComments,
    }
  }

  function isVisualEditorEmpty(html = '') {
    const value = String(html || '').replace(/&nbsp;/gi, ' ').trim()
    if (!value) return true
    const hasMedia = /<(img|video|audio|iframe|figure)\b/i.test(value)
    const textOnly = value.replace(/<[^>]+>/g, '').trim()
    return !hasMedia && !textOnly
  }

  function syncVisualBodyIntoDraft() {
    const editor = visualEditorRef.current
    if (!editor) return draft.body || ''
    const sanitized = sanitizeVisualHtml(editor.innerHTML || '')
    setVisualEditorEmpty(isVisualEditorEmpty(sanitized))
    if (sanitized !== (draft.body || '')) {
      visualSyncLockRef.current = true
      setDraft((current) => ({ ...current, body: sanitized }))
    }
    return sanitized
  }

  function loadDraftBodyIntoVisualEditor(force = false) {
    const editor = visualEditorRef.current
    if (!editor) return
    const visualHtml = classicEditorBodyToHtml(draft.body || '')
    const sanitized = sanitizeVisualHtml(visualHtml)
    if (!force && document.activeElement === editor) return
    if ((editor.innerHTML || '') !== sanitized) {
      editor.innerHTML = sanitized
    }
    setVisualEditorEmpty(isVisualEditorEmpty(sanitized))
  }

  function insertHtmlIntoVisualEditor(markup) {
    const editor = visualEditorRef.current
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    if (range && editor.contains(range.commonAncestorContainer)) {
      range.deleteContents()
      const fragment = range.createContextualFragment(markup)
      const lastNode = fragment.lastChild
      range.insertNode(fragment)
      if (lastNode) {
        const nextRange = document.createRange()
        nextRange.setStartAfter(lastNode)
        nextRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(nextRange)
      }
    } else {
      editor.insertAdjacentHTML('beforeend', markup)
    }
    syncVisualBodyIntoDraft()
  }

  async function handleSave(note = 'save', patch = {}, options = {}) {
    const liveBody = editorTab === 'visual' ? syncVisualBodyIntoDraft() : draft.body
    const normalized = buildNormalizedDraft(draft, { ...patch, body: liveBody })
    const result = await upsertNativeEntryWithMeta(items, normalized, note)
    setItems(result.items)
    const saved = result.items.find((item) => item.id === normalized.id)
    if (saved) {
      setActiveId(saved.id)
      setDraft({ ...saved, slugManuallyEdited: true })
      setPermalinkDraft(saved.slug || '')
      const snapshot = saveLocalRevision(saved.id, saved, note)
      setRevisions(snapshot.revisions)
      if (!result.synced) {
        pushNotice('Changes were saved locally, but syncing to the server failed.', 'warning')
      }
      if (options.successNotice !== false) {
        pushNotice(options.successNotice || 'Post saved.', 'success')
      }
    }
    if (!saved) {
      pushNotice(options.failureNotice || 'Save failed.', 'error')
    }
    return { saved: saved || null, synced: result.synced }
  }

  async function handleMoveToTrash() {
    const { saved } = await handleSave('trash', {
      status: 'trash',
      workflowState: 'trash',
    }, { successNotice: false, failureNotice: 'Move to Trash failed.' })
    if (saved) pushNotice('Post moved to Trash.', 'warning')
  }

  async function handlePreviewChanges() {
    const { saved } = await handleSave('preview', {}, { successNotice: false, failureNotice: 'Preview failed to save changes.' })
    if (!saved) return
    const canResolvePublicRoute = saved.status === 'published' && Boolean(saved.slug)
    const previewPath = canResolvePublicRoute ? `/post/${saved.slug}` : `/native-preview/${saved.id}`
    const nextWindow = window.open(previewPath, '_blank', 'noopener,noreferrer')
    if (!nextWindow) {
      pushNotice('Preview window was blocked by your browser.', 'error')
    }
  }

  function applyEditorMutation(mutator) {
    if (editorTab === 'visual') return
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

  function runVisualCommand(command, value = null) {
    const editor = visualEditorRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command, false, value)
    syncVisualBodyIntoDraft()
  }

  function handleToolbarAction(action) {
    if (editorTab === 'visual') {
      if (action === 'bold') return runVisualCommand('bold')
      if (action === 'italic') return runVisualCommand('italic')
      if (action === 'link') {
        const href = window.prompt('Enter URL for link', 'https://')
        if (!href) return
        return runVisualCommand('createLink', href)
      }
      if (action === 'ul') return runVisualCommand('insertUnorderedList')
      if (action === 'ol') return runVisualCommand('insertOrderedList')
      if (action === 'quote') return runVisualCommand('formatBlock', 'blockquote')
      if (action === 'left') return runVisualCommand('justifyLeft')
      if (action === 'center') return runVisualCommand('justifyCenter')
      if (action === 'right') return runVisualCommand('justifyRight')
      return
    }

    if (action === 'bold') return applyEditorMutation((el) => wrapSelected(el, '**'))
    if (action === 'italic') return applyEditorMutation((el) => wrapSelected(el, '*'))
    if (action === 'link') {
      const href = window.prompt('Enter URL for link', 'https://')
      if (!href) return
      return applyEditorMutation((el) => wrapSelected(el, '[', `](${href})`))
    }
    if (action === 'ul') return applyEditorMutation((el) => prefixSelectedLines(el, '- '))
    if (action === 'ol') return applyEditorMutation((el) => prefixSelectedLines(el, '1. '))
    if (action === 'quote') return applyEditorMutation((el) => prefixSelectedLines(el, '> '))
    if (action === 'left') return applyEditorMutation((el) => wrapSelectionWithHtmlBlock(el, 'text-align:left;'))
    if (action === 'center') return applyEditorMutation((el) => wrapSelectionWithHtmlBlock(el, 'text-align:center;'))
    if (action === 'right') return applyEditorMutation((el) => wrapSelectionWithHtmlBlock(el, 'text-align:right;'))
  }

  function handleEditorTabChange(nextTab) {
    if (nextTab === editorTab) return
    if (editorTab === 'visual' && nextTab === 'text') {
      syncVisualBodyIntoDraft()
    }
    setEditorTab(nextTab)
    if (nextTab === 'visual') {
      requestAnimationFrame(() => loadDraftBodyIntoVisualEditor(true))
    }
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
                <button type="button" className={`button${editorTab === 'visual' ? ' button--primary' : ''}`} onClick={() => handleEditorTabChange('visual')}>Visual</button>
                <button type="button" className={`button${editorTab === 'text' ? ' button--primary' : ''}`} onClick={() => handleEditorTabChange('text')}>Text</button>
              </div>
            </div>

            <div className="wp-classic-toolbar" role="toolbar" aria-label="Classic formatting toolbar">
              <button type="button" className="wp-toolbar-btn" aria-label="Bold" title="Bold" onClick={() => handleToolbarAction('bold')}><strong>B</strong></button>
              <button type="button" className="wp-toolbar-btn" aria-label="Italic" title="Italic" onClick={() => handleToolbarAction('italic')}><em>I</em></button>
              <button type="button" className="wp-toolbar-btn" onClick={() => handleToolbarAction('link')} aria-label="Insert link" title="Insert/edit link">🔗</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Bulleted list" title="Bulleted list" onClick={() => handleToolbarAction('ul')}>•</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Numbered list" title="Numbered list" onClick={() => handleToolbarAction('ol')}>1.</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Blockquote" title="Blockquote" onClick={() => handleToolbarAction('quote')}>❞</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Align left" title="Align left" onClick={() => handleToolbarAction('left')}>≡</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Align center" title="Align center" onClick={() => handleToolbarAction('center')}>≣</button>
              <button type="button" className="wp-toolbar-btn" aria-label="Align right" title="Align right" onClick={() => handleToolbarAction('right')}>☰</button>
            </div>
            <div className={`wp-editor-body${editorTab === 'visual' ? ' wp-editor-body--visual' : ''}`}>
              {editorTab === 'visual' ? (
                <div
                  ref={visualEditorRef}
                  className={`wp-visual-editor${visualEditorEmpty ? ' is-empty' : ''}`}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Start writing…"
                  onInput={() => syncVisualBodyIntoDraft()}
                  onBlur={() => syncVisualBodyIntoDraft()}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  className="wp-editor-textarea"
                  value={draft.body || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  placeholder="Start writing…"
                />
              )}
            </div>

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
            <article className="wp-meta-box">
              <h2>Public Display</h2>
              <label><input type="checkbox" checked={displaySettings.enableReadMode} onChange={(e) => setDraft((d) => applyDisplayPatch(d, { enableReadMode: e.target.checked }))} /> Enable read mode</label>
              <label><input type="checkbox" checked={displaySettings.enableExperienceMode} onChange={(e) => setDraft((d) => applyDisplayPatch(d, { enableExperienceMode: e.target.checked }))} /> Enable experience mode</label>
              <label><input type="checkbox" checked={displaySettings.enablePrintMode} onChange={(e) => setDraft((d) => applyDisplayPatch(d, { enablePrintMode: e.target.checked }))} /> Enable print mode</label>
              <label>
                Default mode
                <select value={displaySettings.defaultMode} onChange={(e) => setDraft((d) => applyDisplayPatch(d, { defaultMode: e.target.value }))}>
                  <option value="read">Read</option>
                  <option value="experience">Experience</option>
                  <option value="print">Print</option>
                </select>
              </label>
              <label>
                Hero style
                <select value={displaySettings.heroStyle} onChange={(e) => setDraft((d) => applyDisplayPatch(d, { heroStyle: e.target.value }))}>
                  <option value="default">Default</option>
                  <option value="immersive">Immersive</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>
            </article>
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
                  const { saved } = await handleSave('publish', {
                    status: isScheduled ? 'scheduled' : 'published',
                    workflowState: isScheduled ? 'scheduled' : 'published',
                  }, { successNotice: false, failureNotice: 'Publish failed.' })
                  if (saved) {
                    setDraft(saved)
                    pushNotice('Post published.', 'success')
                  }
                }}>Publish / Update</button>
                {draft?.id && ['published', 'scheduled'].includes(draft?.status) ? (
                  <Link
                    className="button"
                    to={draft.slug ? `/post/${draft.slug}` : `/native-preview/${draft.id}`}
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

            <article className="wp-meta-box">
              <h2>Social Autopost (Scaffold)</h2>
              <p className="description">No live posting yet. These fields prepare per-post social metadata only.</p>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(draft.socialAutopostOnPublish)}
                  onChange={(e) => setDraft((d) => ({ ...d, socialAutopostOnPublish: e.target.checked }))}
                />{' '}
                Autopost on publish
              </label>
              <label>
                Content warning
                <input
                  type="text"
                  value={draft.socialContentWarning || ''}
                  placeholder="Optional CW for social scaffold"
                  onChange={(e) => setDraft((d) => ({ ...d, socialContentWarning: e.target.value }))}
                />
              </label>
              <label>
                Social excerpt
                <textarea
                  value={draft.socialExcerpt || ''}
                  placeholder="Optional social-specific excerpt"
                  onChange={(e) => setDraft((d) => ({ ...d, socialExcerpt: e.target.value }))}
                />
              </label>
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
              const escapedUrl = escapeHtmlAttribute(selectedMedia.url)
              const escapedAlt = escapeHtmlAttribute(selectedMedia.alt)
              const escapedCaption = escapeHtmlText(selectedMedia.caption)
              const visualMarkup = escapedCaption
                ? `<figure><img src="${escapedUrl}" alt="${escapedAlt}" /><figcaption>${escapedCaption}</figcaption></figure><p><br /></p>`
                : `<img src="${escapedUrl}" alt="${escapedAlt}" /><p><br /></p>`
              const textMarkup = escapedCaption
                ? `<figure><img src="${escapedUrl}" alt="${escapedAlt}" /><figcaption>${escapedCaption}</figcaption></figure>`
                : `<img src="${escapedUrl}" alt="${escapedAlt}" />`
              if (editorTab === 'visual') {
                insertHtmlIntoVisualEditor(visualMarkup)
              } else {
                insertAtCursor(`\n${textMarkup}\n`)
              }
            }
            setOpenMediaFor('')
          }}
        />
      </main>
    </AdminFrame>
  )
}
