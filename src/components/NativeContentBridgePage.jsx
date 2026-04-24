import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPieces } from '../lib/pieces'
import {
  createEmptyNativeEntry,
  loadNativeCollection,
  slugify,
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
  const [isPermalinkEditing, setIsPermalinkEditing] = useState(false)
  const [permalinkDraft, setPermalinkDraft] = useState('')
  const textareaRef = useRef(null)

  const categoryOptions = useMemo(() => [...new Set(getPieces().flatMap((piece) => piece.projects || [piece.primaryProject]).filter(Boolean))], [])
  const publicPieceSlugSet = useMemo(() => new Set(getPieces().map((piece) => piece.slug).filter(Boolean)), [])

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
      } else {
        const fresh = createTypedEntry(mode)
        setActiveId(fresh.id)
        setDraft(fresh)
        setPermalinkDraft(fresh.slug || '')
        setAllowComments(true)
      }
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
      setPermalinkDraft(saved.slug || '')
    }
    return saved || null
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
            <article className="wp-meta-box"><h2>Discussion</h2><label><input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} /> Allow comments</label></article>
            <article className="wp-meta-box"><h2>Revisions</h2><p>Revision history placeholder. Saved notes: save draft, publish, trash, quick edit.</p></article>
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
                <button type="button" className="button button--primary" onClick={async () => {
                  const next = { ...draft, status: 'published', workflowState: draft.scheduledFor ? 'scheduled' : 'published' }
                  setDraft(next)
                  const saved = await handleSave('publish')
                  if (saved) setDraft(saved)
                }}>Publish / Update</button>
                {draft?.id && draft?.status === 'published' ? (
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
