import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { loadQuickDrafts, saveQuickDraft } from '../lib/wpAdminLocal'
import { AdminFrame } from './AdminRail'
import { WpAnalyticsWidgets } from './WpAnalyticsWidgets'

export function AdminPage({ pieces = [] }) {
  const total = pieces.length
  const drafts = pieces.filter((piece) => !piece.publishedAt).length
  const published = pieces.filter((piece) => piece.publishedAt).length

  const [nativeDrafts, setNativeDrafts] = useState([])
  const [quickDrafts, setQuickDrafts] = useState(() => loadQuickDrafts())
  const [quickTitle, setQuickTitle] = useState('')
  const [quickBody, setQuickBody] = useState('')

  useEffect(() => {
    loadNativeCollection({ includeFuture: 1 }).then((items) => {
      setNativeDrafts((items || []).filter((item) => item.status === 'draft').slice(0, 5))
    })
  }, [])

  function handleQuickDraftSubmit(e) {
    e.preventDefault()
    const next = saveQuickDraft({ title: quickTitle, content: quickBody })
    setQuickDrafts(next)
    setQuickTitle('')
    setQuickBody('')
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Dashboard</h1>
        </div>

        <section className="wp-dashboard-section">
          <div className="wp-dashboard-section__header">
            <h2>Analytics Overview</h2>
          </div>
          <WpAnalyticsWidgets pieces={pieces} compact />
        </section>
      </main>
    </AdminFrame>
  )
}
