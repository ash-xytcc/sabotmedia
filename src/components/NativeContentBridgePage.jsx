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
  const [categoryTab, setCategoryTab] = useState('all')
  const [openMediaFor, setOpenMediaFor] = useState('')
  const [allowComments, setAllowComments] = useState(true)
  const textareaRef = useRef(null)

  const importedPieces = useMemo(() => getPieces(), [])
  const categoryOptions = useMemo(() => (
    [...new Set([
      ...importedPieces.flatMap((piece) => piece.categories || piece.projects || [piece.primaryProject]).filter(Boolean),
      ...items.flatMap((item) => item.categories || item.projects || []).filter(Boolean),
      ...(draft.categories || []),
    ])]
  ), [draft.categories, importedPieces, items])
  const mostUsedCategories = useMemo(() => {
    const counts = new Map()
    for (const piece of importedPieces) {
      for (const category of (piece.categories || piece.projects || [piece.primaryProject])) {
        if (!category) continue
        counts.set(category, (counts.get(category) || 0) + 1)
      }
    }
    for (const item of items) {
      for (const category of (item.categories || item.projects || [])) {
        if (!category) continue
        counts.set(category, (counts.get(category) || 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 12)
  }, [importedPieces, items])
  const mostUsedTags = useMemo(() => {
    const counts = new Map()
    for (const piece of importedPieces) {
      for (const tag of (piece.tags || [])) {
        if (!tag) continue
        counts.set(tag, (counts.get(tag) || 0) + 1)
      }
    }
    for (const item of items) {
      for (const tag of (item.tags || [])) {
        if (!tag) continue
        counts.set(tag, (counts.get(tag) || 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 20)
  }, [importedPieces, items])

  useEffect(() => {
    async function boot() {
      const loaded = await loadNativeCollection({ includeFuture: 1 })
      setItems(Array.isArray(loaded) ? loaded : [])
      const editId = searchParams.get('edit')
      const mode = searchParams.get('new') || 'article'
      const found = (loaded || []).find((item) => item.id === editId)
      if (found) {
        setActiveId(found.id)
        setDraft({
          ...found,
          tags: normalizeTermList(found.tags),
          categories: normalizeTermList(found.categories || found.projects),
          projects: normalizeTermList(found.projects || found.categories),
        })
        setAllowComments(found.allowComments ?? true)
      } else {
        const fresh = createTypedEntry(mode)
        setActiveId(fresh.id)
        setDraft(fresh)
        setAllowComments(true)
      }
    }
    boot()
  }, [searchParams])

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
      allowComments,
    }
    const next = await upsertNativeEntry(items, normalized, note)
    setItems(next)
    const saved = next.find((item) => item.id === normalized.id)
    if (saved) {
      setActiveId(saved.id)
      setDraft(saved)
    }
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
