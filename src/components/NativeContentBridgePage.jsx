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
  const [publishSuccess, setPublishSuccess] = useState(null)
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
      setPublishSuccess(null)
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
    setPublishSuccess(null)
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
      if (saved.status === 'published' || saved.status === 'scheduled') {
        setPublishSuccess({
          id: saved.id,
          slug: saved.slug || '',
          title: saved.title || 'Untitled post',
          status: saved.status,
        })
      } else {
        setPublishSuccess(null)
      }
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
    setPublishSuccess(null)
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
