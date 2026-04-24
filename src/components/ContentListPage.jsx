import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadNativeCollection, slugify, upsertNativeEntry, saveNativeCollection } from '../lib/nativePublicContent'
import { AdminFrame } from './AdminRail'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'

function normalizeTermList(value) {
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getBucket(item) {
  if (item.status === 'trash') return 'trash'
  if (item.status === 'scheduled' || item.workflowState === 'scheduled' || item.scheduledFor) return 'scheduled'
  if (item.status === 'published' || item.workflowState === 'published') return 'published'
  return 'drafts'
}

const TABS = ['all', 'published', 'drafts', 'scheduled', 'trash']

export function ContentListPage() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [quickEditId, setQuickEditId] = useState('')
  const [bulkAction, setBulkAction] = useState('')
  const [quickEdit, setQuickEdit] = useState({ title: '', slug: '', status: 'draft', tags: '', categories: '' })
  const { pushNotice } = useAdminNotices()

  useEffect(() => {
    loadNativeCollection({ includeFuture: 1 }).then((loaded) => setItems(Array.isArray(loaded) ? loaded : []))
  }, [])

  const categories = useMemo(() => [...new Set(items.flatMap((item) => item.projects || item.categories || []))].filter(Boolean), [items])
  const [categoryFilter, setCategoryFilter] = useState('all')

  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return items.filter((item) => {
      const bucket = getBucket(item)
      if (tab !== 'all' && bucket !== tab) return false
      if (categoryFilter !== 'all' && !(item.projects || item.categories || []).includes(categoryFilter)) return false
      return !q || [item.title, item.slug, item.author, ...(item.tags || [])].join(' ').toLowerCase().includes(q)
    })
  }, [items, tab, query, categoryFilter])
  const trashCount = useMemo(() => items.filter((item) => item.status === 'trash').length, [items])

  async function saveQuickEdit(id) {
    const existing = items.find((item) => item.id === id)
    if (!existing) return
    const parsedCategories = normalizeTermList(quickEdit.categories)
    const nextItem = {
      ...existing,
      title: quickEdit.title,
      slug: slugify(quickEdit.slug || quickEdit.title),
      status: quickEdit.status,
      tags: normalizeTermList(quickEdit.tags),
      categories: parsedCategories,
      projects: parsedCategories,
    }
    const next = await upsertNativeEntry(items, nextItem, 'quick edit')
    setItems(next)
    setQuickEditId('')
    pushNotice('Post saved.', 'success')
  }

  async function applyBulkAction() {
    if (!bulkAction) return
    if (bulkAction !== 'empty-trash' && !selectedIds.length) return
    if (bulkAction === 'trash') {
      let next = items
      for (const id of selectedIds) {
        const row = next.find((item) => item.id === id)
        if (!row) continue
        next = await upsertNativeEntry(next, { ...row, status: 'trash', workflowState: 'draft' }, 'bulk trash')
      }
      setItems(next)
    }
    if (bulkAction === 'restore') {
      let next = items
      for (const id of selectedIds) {
        const row = next.find((item) => item.id === id)
        if (!row) continue
        next = await upsertNativeEntry(next, { ...row, status: 'draft', workflowState: 'draft' }, 'bulk restore')
      }
      setItems(next)
    }
    if (bulkAction === 'empty-trash') {
      const next = saveNativeCollection(items.filter((item) => item.status !== 'trash'))
      setItems(next)
      pushNotice('Post moved to Trash.', 'warning')
    }
    setSelectedIds([])
    setBulkAction('')
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Posts</h1>
          <Link className="button button--primary" to="/native-bridge?new=article">Add New</Link>
        </div>
        <WpAdminNotices />

        <section className="wp-meta-box">
          <div className="wp-list-filters">
            <div className="wp-view-tabs">
              {TABS.map((value) => (
                <button key={value} type="button" className={`wp-view-tab${tab === value ? ' is-active' : ''}`} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>
              ))}
            </div>
            <div className="wp-list-controls">
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                <option value="">Bulk actions</option>
                <option value="trash">Move to Trash</option>
                <option value="restore">Restore from Trash</option>
                <option value="empty-trash">Empty Trash</option>
              </select>
              <button type="button" className="button" onClick={applyBulkAction}>Apply</button>
              {tab === 'trash' ? (
                <button type="button" className="button" onClick={() => setItems(saveNativeCollection(items.filter((item) => item.status !== 'trash')))} disabled={trashCount === 0}>Empty Trash</button>
              ) : null}
              <select><option>All dates</option></select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Posts" />
            </div>
          </div>

          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selectedIds.length === visible.length && visible.length > 0} onChange={(e) => setSelectedIds(e.target.checked ? visible.map((item) => item.id) : [])} /></th>
                <th>Title</th>
                <th>Author</th>
                <th>Categories</th>
                <th>Tags</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <Fragment key={item.id}>
                  <tr key={item.id}>
                    <td><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => setSelectedIds((current) => e.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} /></td>
                    <td>
                      <strong className="content-table__title">{item.title || 'Untitled'}</strong>
                      <div className="wp-row-actions">
                        <Link to={`/native-bridge?edit=${item.id}`}>Edit</Link>
                        <button type="button" onClick={() => { setQuickEditId(item.id); setQuickEdit({ title: item.title || '', slug: item.slug || '', status: item.status || 'draft', tags: (item.tags || []).join(', '), categories: (item.categories || item.projects || []).join(', ') }) }}>Quick Edit</button>
                        {item.status !== 'trash' ? <button type="button" onClick={async () => { setItems(await upsertNativeEntry(items, { ...item, status: 'trash' }, 'trash')); pushNotice('Post moved to Trash.', 'warning') }}>Trash</button> : <button type="button" onClick={async () => setItems(await upsertNativeEntry(items, { ...item, status: 'draft' }, 'restore'))}>Restore</button>}
                        <Link to={item.status === 'published' ? `/updates/${item.slug}` : `/native-preview/${item.id}`}>View</Link>
                      </div>
                    </td>
                    <td>{item.author || 'sabotmedia'}</td>
                    <td>{(item.projects || item.categories || ['Uncategorized']).join(', ')}</td>
                    <td>{(item.tags || []).join(', ') || '—'}</td>
                    <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                  {quickEditId === item.id ? (
                    <tr className="wp-quick-edit-row" key={`${item.id}-qe`}>
                      <td colSpan={6}>
                        <div className="wp-quick-edit">
                          <input value={quickEdit.title} onChange={(e) => setQuickEdit((c) => ({ ...c, title: e.target.value }))} placeholder="Title" />
                          <input value={quickEdit.slug} onChange={(e) => setQuickEdit((c) => ({ ...c, slug: e.target.value }))} placeholder="Slug" />
                          <select value={quickEdit.status} onChange={(e) => setQuickEdit((c) => ({ ...c, status: e.target.value }))}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="trash">Trash</option></select>
                          <input value={quickEdit.tags} onChange={(e) => setQuickEdit((c) => ({ ...c, tags: e.target.value }))} placeholder="Tags: tag1, tag2" />
                          <input value={quickEdit.categories} onChange={(e) => setQuickEdit((c) => ({ ...c, categories: e.target.value }))} placeholder="Categories: cat1, cat2" />
                          <button type="button" className="button button--primary" onClick={() => saveQuickEdit(item.id)}>Update</button>
                          <button type="button" className="button" onClick={() => setQuickEditId('')}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}
