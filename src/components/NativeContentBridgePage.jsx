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
  const [openMediaFor, setOpenMediaFor] = useState('')
  const [allowComments, setAllowComments] = useState(true)
  const [autosaveState, setAutosaveState] = useState({ status: 'idle', at: '' })
  const [revisions, setRevisions] = useState([])
  const textareaRef = useRef(null)
  const autosaveTimerRef = useRef(null)
  const suppressAutosaveRef = useRef(false)
  const lastAutosaveFingerprintRef = useRef('')

  const categoryOptions = useMemo(() => [...new Set(getPieces().flatMap((piece) => piece.projects || [piece.primaryProject]).filter(Boolean))], [])

  useEffect(() => {
    async function boot() {
      const loaded = await loadNativeCollection({ includeFuture: 1 })
      setItems(Array.isArray(loaded) ? loaded : [])
      const editId = searchParams.get('edit')
      const mode = searchParams.get('new') || 'article'
      const found = (loaded || []).find((item) => item.id === editId)
      if (found) {
        setActiveId(found.id)
        const nextDraft = { ...found, tags: found.tags || [], categories: found.categories || found.projects || [] }
        setDraft(nextDraft)
        setAllowComments(found.allowComments ?? true)
        setRevisions(loadLocalRevisions(found.id))
        lastAutosaveFingerprintRef.current = toAutosaveFingerprint(nextDraft, found.allowComments ?? true)
      } else {
        const fresh = createTypedEntry(mode)
        setActiveId(fresh.id)
        setDraft(fresh)
        setAllowComments(true)
        setRevisions(loadLocalRevisions(fresh.id))
        lastAutosaveFingerprintRef.current = toAutosaveFingerprint(fresh, true)
      }
      setAutosaveState({ status: 'idle', at: '' })
    }
    boot()
  }, [searchParams])

  async function handleSave(note = 'save') {
    const normalized = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      featuredImage: draft.featuredImage || draft.heroImage || '',
      heroImage: draft.heroImage || draft.featuredImage || '',
      allowComments,
    }
    const next = await upsertNativeEntry(items, normalized, note)
    setItems(next)
    const saved = next.find((item) => item.id === normalized.id)
    if (saved) {
      setActiveId(saved.id)
      setDraft(saved)
      lastAutosaveFingerprintRef.current = toAutosaveFingerprint(saved, allowComments)
      if (note === 'save draft' || note === 'publish') {
        const revisionResult = saveLocalRevision(saved.id, saved, note)
        setRevisions(revisionResult.revisions)
      }
    }
  }

  async function handleMoveToTrash() {
    const next = await upsertNativeEntry(items, { ...draft, status: 'trash', workflowState: 'draft', allowComments }, 'trash')
    setItems(next)
  }

  async function handlePreviewChanges() {
    const normalized = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      featuredImage: draft.featuredImage || draft.heroImage || '',
      heroImage: draft.heroImage || draft.featuredImage || '',
      allowComments,
    }
    const next = await upsertNativeEntry(items, normalized, 'preview')
    setItems(next)
    const saved = next.find((item) => item.id === normalized.id)
    if (!saved) return
    setActiveId(saved.id)
    setDraft(saved)
    window.open(`/native-preview/${saved.id}`, '_blank', 'noopener,noreferrer')
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

  function restoreRevision(revision) {
    if (!revision?.draft) return
    suppressAutosaveRef.current = true
    setDraft((current) => ({
      ...current,
      ...revision.draft,
      tags: Array.isArray(revision.draft.tags) ? revision.draft.tags : [],
      categories: Array.isArray(revision.draft.categories) ? revision.draft.categories : [],
    }))
    requestAnimationFrame(() => {
      suppressAutosaveRef.current = false
    })
    setAutosaveState({ status: 'idle', at: autosaveState.at || '' })
  }

  useEffect(() => {
    if (!draft?.id || suppressAutosaveRef.current) return
    const fingerprint = toAutosaveFingerprint(draft, allowComments)
    if (fingerprint === lastAutosaveFingerprintRef.current) return

    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      async function runAutosave() {
        try {
          setAutosaveState({ status: 'saving', at: autosaveState.at || '' })
          const normalized = {
            ...draft,
            slug: slugify(draft.slug || draft.title),
            tags: Array.isArray(draft.tags) ? draft.tags : [],
            featuredImage: draft.featuredImage || draft.heroImage || '',
            heroImage: draft.heroImage || draft.featuredImage || '',
            allowComments,
          }
          const result = upsertNativeEntryLocal(items, normalized)
          setItems(result.items)
          lastAutosaveFingerprintRef.current = toAutosaveFingerprint(normalized, allowComments)
          if (result.ok) {
            setAutosaveState({ status: 'saved', at: new Date().toISOString() })
          } else {
            setAutosaveState({ status: 'failed', at: '' })
          }
        } catch {
          setAutosaveState({ status: 'failed', at: '' })
        }
      }
      runAutosave()
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [allowComments, draft, items, autosaveState.at])

  return (
    <AdminFrame>
      <main className="page wp-admin-screen wp-edit-screen">
        <div className="wp-screen-header">
          <h1>{searchParams.get('edit') ? 'Edit Post' : 'Add New Post'}</h1>
          <Link className="button" to="/native-bridge?new=article">Add New</Link>
        </div>

        <section className="wp-edit-main">
          <div className="wp-edit-content">
            <input className="wp-title-input" value={draft.title || ''} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value, slug: slugify(d.slug || e.target.value) }))} placeholder="Add title" />
            <div className="wp-permalink-row">Permalink: /post/{draft.slug || 'sample-post'}</div>
            <div className="wp-autosave-status" role="status" aria-live="polite">
              {autosaveState.status === 'saving' ? 'Saving…' : null}
              {autosaveState.status === 'saved' ? `Autosaved at ${formatAutosaveTime(autosaveState.at)}` : null}
              {autosaveState.status === 'failed' ? 'Save failed' : null}
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
              <label>Visibility <select><option>Public</option><option>Private</option></select></label>
              <label>Publish <input type="datetime-local" value={toLocalDateTime(draft.scheduledFor)} onChange={(e) => setDraft((d) => ({ ...d, scheduledFor: fromLocalDateTime(e.target.value) }))} /></label>
              <div className="wp-meta-actions">
                <button type="button" className="button" onClick={handlePreviewChanges}>Preview Changes</button>
                <button type="button" className="button" onClick={() => handleSave('save draft')}>Save Draft</button>
                <button type="button" className="button button--primary" onClick={async () => { const next = { ...draft, status: 'published', workflowState: draft.scheduledFor ? 'scheduled' : 'published' }; setDraft(next); await handleSave('publish') }}>Publish / Update</button>
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
              {categoryOptions.map((category) => (
                <label key={category}><input type="checkbox" checked={(draft.categories || []).includes(category)} onChange={(e) => setDraft((d) => ({ ...d, categories: e.target.checked ? [...new Set([...(d.categories || []), category])] : (d.categories || []).filter((item) => item !== category) }))} /> {category}</label>
              ))}
              <div className="wp-add-row"><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Add New Category" /><button type="button" className="button" onClick={() => { if (!newCategory.trim()) return; setDraft((d) => ({ ...d, categories: [...new Set([...(d.categories || []), newCategory.trim()])] })); setNewCategory('') }}>Add</button></div>
            </article>

            <article className="wp-meta-box">
              <h2>Tags</h2>
              <div className="wp-add-row"><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tags" /><button type="button" className="button" onClick={() => { if (!tagInput.trim()) return; setDraft((d) => ({ ...d, tags: [...new Set([...(d.tags || []), tagInput.trim()])] })); setTagInput('') }}>Add</button></div>
              <div className="wp-tag-chips">{(draft.tags || []).map((tag) => <button key={tag} type="button" onClick={() => setDraft((d) => ({ ...d, tags: (d.tags || []).filter((item) => item !== tag) }))}>{tag} ×</button>)}</div>
            </article>

            <article className="wp-meta-box">
              <h2>Featured Image</h2>
              <button type="button" className="button" onClick={() => setOpenMediaFor('featured')}>{draft.featuredImage ? 'Replace featured image' : 'Set featured image'}</button>
              {draft.featuredImage ? <img className="wp-featured-preview" src={draft.featuredImage} alt="Featured" /> : null}
              {draft.featuredImage ? <button type="button" className="button" onClick={() => setDraft((d) => ({ ...d, featuredImage: '', heroImage: '' }))}>Remove featured image</button> : null}
            </article>
          </aside>
        </section>

        <MediaPickerModal
          open={Boolean(openMediaFor)}
          onClose={() => setOpenMediaFor('')}
          onPick={(media) => {
            if (openMediaFor === 'featured') {
              setDraft((d) => ({ ...d, featuredImage: media.url, heroImage: media.url }))
            }
            if (openMediaFor === 'body') {
              insertAtCursor(`\n<img src="${media.url}" alt="${media.alt || ''}" />\n`)
            }
            setOpenMediaFor('')
          }}
        />
      </main>
    </AdminFrame>
  )
}
