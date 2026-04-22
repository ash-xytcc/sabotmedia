import { useEffect, useMemo, useState } from 'react'
import { fetchEditorRoles, saveEditorRole, removeEditorRole } from '../lib/editorRolesApi'

function emptyRole() {
  return {
    id: '',
    principal: '',
    role: 'viewer',
    notes: '',
  }
}

export function EditorRolesPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyRole())
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

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
    try {
      setError('')
      await saveEditorRole(form)
      setForm(emptyRole())
      await reload()
    } catch (err) {
      setError(String(err?.message || err))
    }
  }

  async function handleDelete(id) {
    try {
      setError('')
      await removeEditorRole(id)
      await reload()
    } catch (err) {
      setError(String(err?.message || err))
    }
  }

  return (
    <main className="page editor-roles-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">roles / collaboration / access</div>
        <h1>Editor Roles</h1>
        <p className="project-hero__description">
          Manage the first pragmatic collaboration layer for Sabot. It is not a full permission universe yet, but it stops “who can do what” from living entirely inside your skull.
        </p>
        <div className="project-hero__meta">
          <span>{visible.length} visible roles</span>
          <span>status: {state}</span>
        </div>
        {error ? <p className="review-card__excerpt">{error}</p> : null}
      </section>

      <section className="archive-controls">
        <label className="archive-control">
          <span>search</span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </section>

      <section className="review-summary-card">
        <div className="review-summary-card__eyebrow">edit role</div>

        <div className="native-content-editor__grid">
          <label className="archive-control">
            <span>principal</span>
            <input type="text" value={form.principal} onChange={(e) => setForm((p) => ({ ...p, principal: e.target.value }))} />
          </label>

          <label className="archive-control">
            <span>role</span>
            <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="admin">admin</option>
              <option value="editor">editor</option>
              <option value="contributor">contributor</option>
              <option value="reviewer">reviewer</option>
              <option value="viewer">viewer</option>
            </select>
          </label>
        </div>

        <label className="archive-control">
          <span>notes</span>
          <textarea className="native-content-editor__textarea native-content-editor__textarea--sm" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </label>

        <div className="review-card__actions">
          <button className="button button--primary" type="button" onClick={handleSave}>save role</button>
          <button className="button" type="button" onClick={() => setForm(emptyRole())}>clear</button>
          <button className="button" type="button" onClick={reload}>reload</button>
        </div>
      </section>

      <section className="review-queue">
        {visible.map((item) => (
          <article className="review-card" key={item.id}>
            <div className="review-card__meta">
              <span>{item.role}</span>
              <span>{item.principal}</span>
            </div>
            <h2>{item.principal}</h2>
            {item.notes ? <p className="review-card__excerpt">{item.notes}</p> : null}
            <div className="review-card__actions">
              <button className="button" type="button" onClick={() => setForm(item)}>edit</button>
              <button className="button" type="button" onClick={() => handleDelete(item.id)}>delete</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
