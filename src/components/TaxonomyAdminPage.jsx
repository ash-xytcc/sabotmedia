import { useEffect, useMemo, useState } from 'react'
import { fetchTaxonomyTerms, saveTaxonomyTerm, removeTaxonomyTerm } from '../lib/taxonomyApi'

function emptyTerm() {
  return {
    id: '',
    label: '',
    slug: '',
    taxonomy: 'tag',
    description: '',
  }
}

export function TaxonomyAdminPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyTerm())
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [filterTaxonomy, setFilterTaxonomy] = useState('all')
  const [query, setQuery] = useState('')

  async function reload() {
    try {
      setState('loading')
      setError('')
      const data = await fetchTaxonomyTerms(filterTaxonomy === 'all' ? {} : { taxonomy: filterTaxonomy })
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
  }, [filterTaxonomy])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [item.label, item.slug, item.taxonomy, item.description].join(' ').toLowerCase().includes(q)
    )
  }, [items, query])

  async function handleSave() {
    try {
      setError('')
      await saveTaxonomyTerm(form)
      setForm(emptyTerm())
      await reload()
    } catch (err) {
      setError(String(err?.message || err))
    }
  }

  async function handleDelete(id) {
    try {
      setError('')
      await removeTaxonomyTerm(id)
      await reload()
    } catch (err) {
      setError(String(err?.message || err))
    }
  }

  return (
    <main className="page taxonomy-admin-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">taxonomy / structure / organization</div>
        <h1>Taxonomy</h1>
        <p className="project-hero__description">
          Define reusable tags, series, themes, and project-like organizational terms. Because chaos is apparently the default state of publishing systems.
        </p>
        <div className="project-hero__meta">
          <span>{visible.length} visible</span>
          <span>status: {state}</span>
        </div>
        {error ? <p className="review-card__excerpt">{error}</p> : null}
      </section>

      <section className="archive-controls">
        <label className="archive-control">
          <span>filter taxonomy</span>
          <select value={filterTaxonomy} onChange={(e) => setFilterTaxonomy(e.target.value)}>
            <option value="all">all</option>
            <option value="tag">tag</option>
            <option value="series">series</option>
            <option value="theme">theme</option>
            <option value="project">project</option>
          </select>
        </label>

        <label className="archive-control">
          <span>search terms</span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </section>

      <section className="review-summary-card">
        <div className="review-summary-card__eyebrow">edit term</div>

        <div className="native-content-editor__grid">
          <label className="archive-control">
            <span>label</span>
            <input type="text" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
          </label>

          <label className="archive-control">
            <span>slug</span>
            <input type="text" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
          </label>

          <label className="archive-control">
            <span>taxonomy</span>
            <select value={form.taxonomy} onChange={(e) => setForm((p) => ({ ...p, taxonomy: e.target.value }))}>
              <option value="tag">tag</option>
              <option value="series">series</option>
              <option value="theme">theme</option>
              <option value="project">project</option>
            </select>
          </label>
        </div>

        <label className="archive-control">
          <span>description</span>
          <textarea className="native-content-editor__textarea native-content-editor__textarea--sm" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </label>

        <div className="review-card__actions">
          <button className="button button--primary" type="button" onClick={handleSave}>save term</button>
          <button className="button" type="button" onClick={() => setForm(emptyTerm())}>clear</button>
          <button className="button" type="button" onClick={reload}>reload</button>
        </div>
      </section>

      <section className="review-queue">
        {visible.map((item) => (
          <article className="review-card" key={item.id}>
            <div className="review-card__meta">
              <span>{item.taxonomy}</span>
              <span>{item.slug}</span>
            </div>
            <h2>{item.label}</h2>
            {item.description ? <p className="review-card__excerpt">{item.description}</p> : null}
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
