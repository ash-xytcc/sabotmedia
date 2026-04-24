import { useMemo, useState } from 'react'
import { AdminFrame } from './AdminRail'
import { DEFAULT_MENU_ITEMS, loadMenuDraft, saveMenuDraft } from '../lib/wpAdminLocal'

export function MenusPage() {
  const [items, setItems] = useState(() => loadMenuDraft())
  const [status, setStatus] = useState('')
  const unsaved = useMemo(() => JSON.stringify(items) !== JSON.stringify(loadMenuDraft()), [items])

  function move(index, offset) {
    const target = index + offset
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setItems(next)
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Menus</h1>
        </div>

        <section className="wp-meta-box">
          <h2>Edit Menus</h2>
          <p>Primary Navigation (local draft)</p>
          <ul className="wp-menu-sort-list">
            {items.map((item, index) => (
              <li key={item.id} className="wp-menu-sort-item">
                <input value={item.label} onChange={(e) => setItems((current) => current.map((entry, i) => i === index ? { ...entry, label: e.target.value } : entry))} />
                <input value={item.to} onChange={(e) => setItems((current) => current.map((entry, i) => i === index ? { ...entry, to: e.target.value } : entry))} />
                <button type="button" className="button" onClick={() => move(index, -1)}>↑</button>
                <button type="button" className="button" onClick={() => move(index, 1)}>↓</button>
              </li>
            ))}
          </ul>
          <div className="wp-meta-actions">
            <button
              type="button"
              className="button"
              onClick={() => setItems(DEFAULT_MENU_ITEMS)}
            >Reset to default</button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                saveMenuDraft(items)
                setStatus('Saved local menu draft.')
              }}
            >Save Menu</button>
          </div>
          {status ? <p>{status}</p> : null}
          {unsaved ? <p><em>You have unsaved menu changes.</em></p> : null}
        </section>
      </main>
    </AdminFrame>
  )
}
