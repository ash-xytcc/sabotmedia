import { useEffect, useMemo, useState } from 'react'
import { fetchEditorRoles, saveEditorRole, removeEditorRole } from '../lib/editorRolesApi'
import { AdminFrame } from './AdminRail'

function emptyRole() {
  return {
    id: '',
    principal: '',
    role: 'viewer',
    notes: '',
  }
}

function roleLabel(value) {
  return String(value || 'viewer').replace(/^./, (char) => char.toUpperCase())
}

export function EditorRolesPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyRole())
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  async function reload() {
    try {
      setState('loading')
      setError('')
      const data = await fetchEditorRoles()
      setItems(Array.isArray(data?.items) ? data.items : [])
      setState('loaded')
    } catch (err) {
      setError(String(err?.message || err))
      setItems([])
      setState('error')
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [item.principal, item.role, item.notes].join(' ').toLowerCase().includes(q)
    )
  }, [items, query])

  async function handleSave() {
    if (!String(form.principal || '').trim()) {
      setError('A principal is required before a role record can be saved.')
      return
    }
    try {
      setSaving(true)
      setError('')
      await saveEditorRole(form)
      setForm(emptyRole())
      await reload()
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      setDeletingId(id)
      setError('')
      await removeEditorRole(id)
      if (form.id === id) setForm(emptyRole())
      await reload()
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen editor-roles-page">
        <div className="wp-screen-header">
          <div>
            <h1>Editor Roles</h1>
            <p className="description">Maintain the D1-backed collaboration-role registry without pretending it is a complete account or authorization system.</p>
          </div>
          <button className="button" type="button" onClick={reload} disabled={state === 'loading'}>
            {state === 'loading' ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="notice notice-warning" role="status">
          <p><strong>Role records are advisory today.</strong> Authentication still uses the current server session model, and these records do not independently grant or revoke access. Server-enforced membership/RBAC remains a separate backend task.</p>
        </div>

        {error ? (
          <div className="notice notice-error" role="alert">
            <p><strong>Role operation failed:</strong> {error}</p>
          </div>
        ) : null}

        <section className="newsroom-grid">
          <article className="wp-meta-box newsroom-panel">
            <h2>{form.id ? 'Edit role record' : 'Add role record'}</h2>
            <p className="description">These records persist through the authenticated Editor Roles API and D1.</p>

            <div className="native-content-editor__grid">
              <label className="native-content-editor__field">
                <span>Principal</span>
                <input
                  type="text"
                  value={form.principal}
                  onChange={(event) => setForm((current) => ({ ...current, principal: event.target.value }))}
                  placeholder="name, email, handle, or identity label"
                />
              </label>

              <label className="native-content-editor__field">
                <span>Role</span>
                <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="contributor">Contributor</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
            </div>

            <label className="native-content-editor__field native-content-editor__field--plain">
              <span>Notes</span>
              <textarea
                rows="5"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Editorial responsibility, context, or intended permissions."
              />
            </label>

            <div className="review-card__actions">
              <button className="button button--primary" type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : form.id ? 'Update role record' : 'Add role record'}
              </button>
              <button className="button" type="button" onClick={() => setForm(emptyRole())} disabled={saving}>Clear</button>
            </div>
          </article>

          <article className="wp-meta-box newsroom-panel">
            <div className="wp-screen-header wp-screen-header--compact">
              <div>
                <h2>Role registry</h2>
                <p className="description">{visible.length} of {items.length} records shown</p>
              </div>
            </div>

            <label className="native-content-editor__field">
              <span>Search records</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search principal, role, or notes"
              />
            </label>

            <div className="content-table-wrap">
              <table className="content-table wp-posts-table">
                <thead>
                  <tr>
                    <th scope="col">Principal</th>
                    <th scope="col">Role</th>
                    <th scope="col">Notes</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.principal || 'Unnamed principal'}</strong></td>
                      <td>{roleLabel(item.role)}</td>
                      <td>{item.notes || <span className="description">No notes</span>}</td>
                      <td>
                        <div className="review-card__actions">
                          <button className="button" type="button" onClick={() => setForm(item)}>Edit</button>
                          <button
                            className="button button-link-delete"
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item.id)}
                          >
                            {deletingId === item.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!visible.length ? (
                    <tr>
                      <td colSpan="4">{state === 'loading' ? 'Loading role records…' : 'No role records match this view.'}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </main>
    </AdminFrame>
  )
}
