import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPieces } from '../lib/pieces'
import { createNativeEntryFromImportedPiece, loadNativeCollection, slugify, upsertNativeEntry, saveNativeCollection } from '../lib/nativePublicContent'
import { fetchEditorialComments, createEditorialComment } from '../lib/editorialCommentsApi'
import { AdminFrame } from './AdminRail'
import { useAdminAuth } from './AdminAuthContext'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import { adminRoutes } from '../routing/routes'

function normalizeTermList(value) {
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getBucket(item) {
  if (item.status === 'trash' || item.workflowState === 'trash') return 'trash'
  if (item.workflowState === 'declined') return 'declined'
  if (item.status === 'archived' || item.workflowState === 'archived') return 'archived'
  if (item.workflowState === 'needs_revision') return 'needs_revision'
  if (item.workflowState === 'ready') return 'ready'
  if (item.workflowState === 'review' || item.workflowState === 'in_review') return 'review'
  if (item.status === 'scheduled' || item.workflowState === 'scheduled' || item.scheduledFor) return 'scheduled'
  if (item.status === 'published' || item.workflowState === 'published') return 'published'
  return 'drafts'
}

const EDITOR_TABS = ['all', 'drafts', 'review', 'needs_revision', 'ready', 'scheduled', 'published', 'declined', 'archived', 'trash']
const CONTRIBUTOR_TABS = ['all', 'drafts', 'review', 'needs_revision', 'ready', 'published', 'declined']
const TAB_LABELS = {
  all: 'All',
  drafts: 'Drafts',
  review: 'Review Queue',
  needs_revision: 'Changes Requested',
  ready: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  declined: 'Declined',
  archived: 'Archived',
  trash: 'Trash',
}

function hasCapability(session, capability) {
  const capabilities = Array.isArray(session?.capabilities) ? session.capabilities : []
  return capabilities.includes('*') || capabilities.includes(capability)
}

export function ContentListPage() {
  const { session } = useAdminAuth()
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [quickEditId, setQuickEditId] = useState('')
  const [bulkAction, setBulkAction] = useState('')
  const [quickEdit, setQuickEdit] = useState({ title: '', slug: '', status: 'draft', tags: '', categories: '', collections: '' })
  const [discussionOpenId, setDiscussionOpenId] = useState('')
  const [commentsById, setCommentsById] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentBusyId, setCommentBusyId] = useState('')
  const [reviewBusyId, setReviewBusyId] = useState('')
  const { pushNotice } = useAdminNotices()

  const role = session?.role || ''
  const isContributor = role === 'contributor'
  const canPublish = hasCapability(session, 'publishing:write')
  const canReview = hasCapability(session, 'review:manage')
  const tabs = isContributor ? CONTRIBUTOR_TABS : EDITOR_TABS

  useEffect(() => {
    loadNativeCollection({ includeFuture: 1 })
      .then((loaded) => setItems(Array.isArray(loaded) ? loaded : []))
      .catch((error) => pushNotice(`Posts failed to load: ${String(error?.message || error)}`, 'error'))
  }, [pushNotice])

  const allRows = useMemo(() => {
    if (isContributor) return items
    const nativeSlugKeys = new Set(items.map((item) => String(item.slug || '').toLowerCase()).filter(Boolean))
    const nativeSourceKeys = new Set(items.map((item) => String(item.sourcePostId || item.sourceExternalId || '').toLowerCase()).filter(Boolean))
    const importedRows = getPieces()
      .filter((piece) => {
        const slugKey = String(piece.slug || '').toLowerCase()
        const sourceKey = String(piece.sourcePostId || piece.id || '').toLowerCase()
        return !nativeSlugKeys.has(slugKey) && !nativeSourceKeys.has(sourceKey)
      })
      .map((piece) => ({
        ...createNativeEntryFromImportedPiece(piece),
        isImportedArchive: true,
        importSlug: piece.slug,
      }))

    return [...items, ...importedRows]
  }, [items, isContributor])

  const categories = useMemo(() => [...new Set(allRows.flatMap((item) => item.projects || item.categories || []))].filter(Boolean), [allRows])
  const [categoryFilter, setCategoryFilter] = useState('all')

  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return allRows.filter((item) => {
      const bucket = getBucket(item)
      if (tab !== 'all' && bucket !== tab) return false
      if (categoryFilter !== 'all' && !(item.projects || item.categories || []).includes(categoryFilter)) return false
      return !q || [
        item.title,
        item.slug,
        item.author,
        item.createdByDisplayName,
        item.createdByEmail,
        item.excerpt,
        item.body,
        item.bodyHtml,
        item.contentType,
        item.type,
        item.format,
        item.collection,
        ...(item.collections || []),
        ...(item.projects || []),
        ...(item.categories || []),
        ...(item.tags || []),
      ].join(' ').toLowerCase().includes(q)
    })
  }, [allRows, tab, query, categoryFilter])

  const selectableVisible = useMemo(() => visible.filter((item) => !item.isImportedArchive), [visible])
  const trashCount = useMemo(() => items.filter((item) => item.status === 'trash').length, [items])
  const reviewCount = useMemo(() => items.filter((item) => getBucket(item) === 'review').length, [items])
  const changesCount = useMemo(() => items.filter((item) => getBucket(item) === 'needs_revision').length, [items])
  const readyCount = useMemo(() => items.filter((item) => getBucket(item) === 'ready').length, [items])

  async function saveQuickEdit(id) {
    if (!canReview) return
    const existing = items.find((item) => item.id === id)
    if (!existing) return
    const parsedCategories = normalizeTermList(quickEdit.categories)
    const nextItem = {
      ...existing,
      title: quickEdit.title,
      slug: slugify(quickEdit.slug || quickEdit.title),
      status: quickEdit.status,
      workflowState: quickEdit.status === 'published' ? 'published' : quickEdit.status === 'scheduled' ? 'scheduled' : existing.workflowState,
      tags: normalizeTermList(quickEdit.tags),
      collections: normalizeTermList(quickEdit.collections),
      categories: parsedCategories,
      projects: parsedCategories,
    }
    try {
      const next = await upsertNativeEntry(items, nextItem, 'quick edit')
      setItems(next)
      setQuickEditId('')
      pushNotice('Post saved.', 'success')
    } catch (error) {
      pushNotice(`Quick edit failed: ${String(error?.message || error)}`, 'error')
    }
  }

  async function applyBulkAction() {
    if (!canReview || !bulkAction) return
    if (bulkAction !== 'empty-trash' && !selectedIds.length) return
    try {
      if (bulkAction === 'trash') {
        let next = items
        for (const id of selectedIds) {
          const row = next.find((item) => item.id === id)
          if (!row) continue
          next = await upsertNativeEntry(next, { ...row, status: 'trash', workflowState: 'trash' }, 'bulk trash')
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
        pushNotice('Local recovery copy cleared for trashed rows. Server deletion still requires explicit item deletion.', 'warning')
      }
    } catch (error) {
      pushNotice(`Bulk action failed: ${String(error?.message || error)}`, 'error')
    }
    setSelectedIds([])
    setBulkAction('')
  }

  async function loadDiscussion(nativeId) {
    try {
      const data = await fetchEditorialComments(nativeId)
      setCommentsById((current) => ({ ...current, [nativeId]: Array.isArray(data.items) ? data.items : [] }))
    } catch (error) {
      pushNotice(`Editorial discussion failed to load: ${String(error?.message || error)}`, 'error')
    }
  }

  async function toggleDiscussion(nativeId) {
    const next = discussionOpenId === nativeId ? '' : nativeId
    setDiscussionOpenId(next)
    if (next && !commentsById[nativeId]) await loadDiscussion(nativeId)
  }

  async function postComment(item, kind = 'comment', fallbackBody = '') {
    const body = String(commentDrafts[item.id] || fallbackBody || '').trim()
    if (!body) return
    try {
      setCommentBusyId(item.id)
      await createEditorialComment({ nativeId: item.id, body, kind })
      setCommentDrafts((current) => ({ ...current, [item.id]: '' }))
      await loadDiscussion(item.id)
      pushNotice(kind === 'comment' ? 'Editorial comment added.' : 'Editorial decision added to the discussion.', 'success')
    } catch (error) {
      pushNotice(`Comment failed: ${String(error?.message || error)}`, 'error')
    } finally {
      setCommentBusyId('')
    }
  }

  async function setWorkflow(item, workflowState, status = 'draft', defaultComment = '') {
    try {
      setReviewBusyId(item.id)
      const next = await upsertNativeEntry(items, {
        ...item,
        status,
        workflowState,
        ...(workflowState === 'in_review' ? { submittedAt: new Date().toISOString() } : {}),
      }, `workflow:${workflowState}`)
      setItems(next)
      if (defaultComment || String(commentDrafts[item.id] || '').trim()) {
        await postComment(item, workflowState === 'needs_revision' ? 'change_request' : 'decision', defaultComment)
      }
      pushNotice(
        workflowState === 'in_review' ? 'Submitted for review.' :
          workflowState === 'needs_revision' ? 'Changes requested.' :
            workflowState === 'ready' ? 'Marked ready to publish.' :
              workflowState === 'declined' ? 'Submission declined.' :
                workflowState === 'published' ? 'Published.' : 'Workflow updated.',
        'success',
      )
    } catch (error) {
      pushNotice(`Workflow update failed: ${String(error?.message || error)}`, 'error')
    } finally {
      setReviewBusyId('')
    }
  }

  function canEditRow(item) {
    if (item.isImportedArchive) return true
    if (!isContributor) return true
    return !['published', 'scheduled', 'archived', 'trash'].includes(String(item.status || '')) &&
      !['published', 'scheduled', 'archived', 'trash'].includes(String(item.workflowState || ''))
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>{isContributor ? 'My Writing' : 'Posts & Review'}</h1>
            <p className="description">{isContributor ? 'Write, revise, and submit your work to Sabot Media editors.' : 'Drafts, submissions, editorial discussion, approvals, scheduling, and publishing.'}</p>
          </div>
          <Link className="button button--primary" to={adminRoutes.addNew}>Add New</Link>
        </div>
        <WpAdminNotices />

        <section className="newsroom-stat-grid" aria-label="Editorial workflow summary">
          <article className="review-summary-card"><div className="review-summary-card__eyebrow">in review</div><strong>{reviewCount}</strong><span>submitted pieces</span></article>
          <article className="review-summary-card"><div className="review-summary-card__eyebrow">changes</div><strong>{changesCount}</strong><span>revision requested</span></article>
          <article className="review-summary-card"><div className="review-summary-card__eyebrow">approved</div><strong>{readyCount}</strong><span>ready to publish</span></article>
          <article className="review-summary-card"><div className="review-summary-card__eyebrow">role</div><strong>{role || '—'}</strong><span>{canPublish ? 'publishing enabled' : 'submission only'}</span></article>
        </section>

        <section className="wp-meta-box">
          <div className="wp-list-filters">
            <div className="wp-view-tabs">
              {tabs.map((value) => (
                <button key={value} type="button" className={`wp-view-tab${tab === value ? ' is-active' : ''}`} onClick={() => setTab(value)}>{TAB_LABELS[value] || value}</button>
              ))}
            </div>
            <div className="wp-list-controls">
              {canReview ? (
                <>
                  <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                    <option value="">Bulk actions</option>
                    <option value="trash">Move to Trash</option>
                    <option value="restore">Restore from Trash</option>
                    <option value="empty-trash">Empty local Trash recovery</option>
                  </select>
                  <button type="button" className="button" onClick={applyBulkAction}>Apply</button>
                  {tab === 'trash' ? (
                    <button type="button" className="button" onClick={() => setItems(saveNativeCollection(items.filter((item) => item.status !== 'trash')))} disabled={trashCount === 0}>Clear local Trash recovery</button>
                  ) : null}
                </>
              ) : null}
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Posts" />
            </div>
          </div>

          <div className="content-table-wrap">
            <table className="content-table wp-posts-table">
              <thead>
                <tr>
                  {canReview ? <th><input type="checkbox" checked={selectedIds.length === selectableVisible.length && selectableVisible.length > 0} onChange={(e) => setSelectedIds(e.target.checked ? selectableVisible.map((item) => item.id) : [])} /></th> : null}
                  <th>Title</th>
                  <th>Workflow</th>
                  <th>Author</th>
                  <th>Categories</th>
                  <th>Tags</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const bucket = getBucket(item)
                  const comments = commentsById[item.id] || []
                  const colSpan = canReview ? 7 : 6
                  return (
                    <Fragment key={item.id}>
                      <tr>
                        {canReview ? <td>{item.isImportedArchive ? null : <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => setSelectedIds((current) => e.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} />}</td> : null}
                        <td>
                          <strong className="content-table__title">{item.title || 'Untitled'}</strong>
                          <div className="wp-row-actions">
                            {canEditRow(item) ? <Link to={item.isImportedArchive ? `${adminRoutes.nativeBridge}?import=${item.importSlug || item.slug}` : `${adminRoutes.nativeBridge}?edit=${item.id}`}>Edit</Link> : null}
                            {!item.isImportedArchive ? <button type="button" onClick={() => toggleDiscussion(item.id)}>{discussionOpenId === item.id ? 'Close Discussion' : 'Discussion'}</button> : null}
                            {canReview && !item.isImportedArchive ? <button type="button" onClick={() => { setQuickEditId(item.id); setQuickEdit({ title: item.title || '', slug: item.slug || '', status: item.status || 'draft', tags: (item.tags || []).join(', '), categories: (item.categories || item.projects || []).join(', '), collections: (item.collections || []).join(', ') }) }}>Quick Edit</button> : null}
                            {item.status === 'published' ? <Link to={`/post/${item.slug}`}>View</Link> : null}
                            {isContributor && bucket === 'drafts' ? <button type="button" disabled={reviewBusyId === item.id} onClick={() => setWorkflow(item, 'in_review', 'draft')}>Submit for Review</button> : null}
                            {isContributor && bucket === 'needs_revision' ? <button type="button" disabled={reviewBusyId === item.id} onClick={() => setWorkflow(item, 'in_review', 'draft')}>Resubmit</button> : null}
                          </div>
                        </td>
                        <td>{item.isImportedArchive ? 'published / imported' : TAB_LABELS[bucket] || item.workflowState || item.status || 'draft'}</td>
                        <td>{item.createdByDisplayName || item.author || item.createdByEmail || 'Sabot Media'}</td>
                        <td>{(item.projects || item.categories || ['Uncategorized']).join(', ')}</td>
                        <td>{(item.tags || []).join(', ') || '—'}</td>
                        <td>{(item.submittedAt || item.publishedAt || item.updatedAt) ? new Date(item.submittedAt || item.publishedAt || item.updatedAt).toLocaleDateString() : '—'}</td>
                      </tr>

                      {canReview && !item.isImportedArchive && ['review', 'needs_revision', 'ready', 'declined'].includes(bucket) ? (
                        <tr className="wp-quick-edit-row">
                          <td colSpan={colSpan}>
                            <div className="wp-quick-edit">
                              <strong>Editorial review</strong>
                              <Link className="button" to={`${adminRoutes.nativeBridge}?edit=${item.id}`}>Open editor & revisions</Link>
                              <button className="button" type="button" disabled={reviewBusyId === item.id} onClick={() => setWorkflow(item, 'needs_revision', 'draft', 'Changes requested by an editor.')}>Request changes</button>
                              <button className="button" type="button" disabled={reviewBusyId === item.id} onClick={() => setWorkflow(item, 'ready', 'draft', 'Approved and ready to publish.')}>Approve</button>
                              <button className="button" type="button" disabled={reviewBusyId === item.id} onClick={() => setWorkflow(item, 'declined', 'draft', 'Submission declined.')}>Decline</button>
                              {canPublish ? <button className="button button--primary" type="button" disabled={reviewBusyId === item.id} onClick={() => setWorkflow(item, 'published', 'published', 'Published by an editor.')}>Publish</button> : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}

                      {discussionOpenId === item.id && !item.isImportedArchive ? (
                        <tr className="wp-quick-edit-row">
                          <td colSpan={colSpan}>
                            <section className="wp-meta-box">
                              <h3>Editorial Discussion</h3>
                              {comments.length ? (
                                <div className="native-content-editor__revision-list">
                                  {comments.map((comment) => (
                                    <article className="native-content-editor__revision" key={comment.id}>
                                      <strong>{comment.authorDisplayName || comment.authorEmail || 'Sabot Media'} <small>({comment.authorRole || 'user'})</small></strong>
                                      <span>{comment.kind === 'change_request' ? 'Changes requested' : comment.kind === 'decision' ? 'Editorial decision' : 'Comment'} · {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</span>
                                      <p>{comment.body}</p>
                                    </article>
                                  ))}
                                </div>
                              ) : <p className="description">No editorial comments yet.</p>}
                              <label className="native-content-editor__field native-content-editor__field--plain">
                                <span>Add to discussion</span>
                                <textarea rows="4" value={commentDrafts[item.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={isContributor ? 'Reply to the editors or explain your revision…' : 'Feedback, requested changes, context, or a note for the writer…'} />
                              </label>
                              <button className="button button--primary" type="button" disabled={commentBusyId === item.id || !String(commentDrafts[item.id] || '').trim()} onClick={() => postComment(item)}>{commentBusyId === item.id ? 'Posting…' : 'Post Comment'}</button>
                            </section>
                          </td>
                        </tr>
                      ) : null}

                      {quickEditId === item.id && canReview ? (
                        <tr className="wp-quick-edit-row">
                          <td colSpan={colSpan}>
                            <div className="wp-quick-edit">
                              <input value={quickEdit.title} onChange={(e) => setQuickEdit((c) => ({ ...c, title: e.target.value }))} placeholder="Title" />
                              <input value={quickEdit.slug} onChange={(e) => setQuickEdit((c) => ({ ...c, slug: e.target.value }))} placeholder="Slug" />
                              <select value={quickEdit.status} onChange={(e) => setQuickEdit((c) => ({ ...c, status: e.target.value }))}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option><option value="trash">Trash</option></select>
                              <input value={quickEdit.tags} onChange={(e) => setQuickEdit((c) => ({ ...c, tags: e.target.value }))} placeholder="Tags: tag1, tag2" />
                              <input value={quickEdit.categories} onChange={(e) => setQuickEdit((c) => ({ ...c, categories: e.target.value }))} placeholder="Categories: cat1, cat2" />
                              <input value={quickEdit.collections} onChange={(e) => setQuickEdit((c) => ({ ...c, collections: e.target.value }))} placeholder="Collections: collection-one, collection-two" />
                              <button type="button" className="button button--primary" onClick={() => saveQuickEdit(item.id)}>Update</button>
                              <button type="button" className="button" onClick={() => setQuickEditId('')}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AdminFrame>
  )
}
