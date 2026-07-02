import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { loadNativeCollection } from '../lib/nativePublicContent'
import { getPieces } from '../lib/pieces'
import { loadMediaLibraryItems } from './MediaLibraryPage'
import { buildMediaAuditSummary, buildLocalStorageInventory } from '../lib/localSiteBackup'
import { adminRoutes } from '../routing/routes'

function extractUrls(value = '') {
  return [...String(value || '').matchAll(/\b(?:https?:\/\/|\/)[^\s"'<>)]*/gi)].map((match) => match[0])
}

function linkStatus(url = '') {
  if (!url || url === '#') return 'empty'
  if (/^javascript:/i.test(url)) return 'unsafe'
  if (/^\/(wp-admin|login|logout|archive|post|print|about|contact|submit|support|security|updates|press|publications|reader|pgp\.asc)/.test(url)) return 'internal ok'
  if (/^https?:\/\//i.test(url)) return 'external queued'
  if (url.startsWith('/')) return 'review internal'
  return 'review'
}

function titleFor(item) {
  return item.title || item.slug || item.id || 'Untitled'
}

export function SiteHealthPage({ pieces = [] }) {
  const [nativeItems, setNativeItems] = useState([])
  const [state, setState] = useState('loading')

  useEffect(() => {
    let cancelled = false
    loadNativeCollection({ includeFuture: 1 })
      .then((items) => {
        if (!cancelled) setNativeItems(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (!cancelled) setNativeItems([])
      })
      .finally(() => {
        if (!cancelled) setState('ready')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const allItems = useMemo(() => [...nativeItems, ...(pieces.length ? pieces : getPieces())], [nativeItems, pieces])
  const mediaItems = useMemo(() => loadMediaLibraryItems(nativeItems), [nativeItems])
  const mediaAudit = useMemo(() => buildMediaAuditSummary({ nativeItems }), [nativeItems])
  const storage = useMemo(() => buildLocalStorageInventory(), [nativeItems])

  const missingFeatured = allItems.filter((item) => !String(item.featuredImage || item.heroImage || '').trim()).slice(0, 25)
  const missingAlt = mediaItems.filter((item) => !String(item.alt || '').trim()).slice(0, 25)
  const nativeJson = JSON.stringify(nativeItems)
  const orphanedMedia = mediaItems.filter((item) => item.url && !nativeJson.includes(item.url)).slice(0, 25)
  const linkRows = allItems.flatMap((item) => extractUrls(`${item.body || ''} ${item.bodyHtml || ''} ${item.excerpt || ''} ${item.featuredImage || ''}`).map((url) => ({
    id: `${item.id || item.slug}-${url}`,
    title: titleFor(item),
    url,
    status: linkStatus(url),
  }))).filter((row) => row.status !== 'internal ok').slice(0, 80)

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <h1>Site Health</h1>
            <p className="description">Editorial QA for links, media, search, RSS, storage, build, and deployment readiness.</p>
          </div>
          <Link className="button" to={adminRoutes.dashboard}>Back to newsroom</Link>
        </div>

        <section className="newsroom-stat-grid">
          <article className="review-summary-card"><div className="review-summary-card__eyebrow">broken link scan</div><strong>{linkRows.length}</strong><span>queued/review references</span></article>
          <article className="review-summary-card"><div className="review-summary-card__eyebrow">missing featured</div><strong>{missingFeatured.length}</strong><span>sampled content records</span></article>
          <article className="review-summary-card"><div className="review-summary-card__eyebrow">missing alt</div><strong>{missingAlt.length}</strong><span>media records</span></article>
          <article className="review-summary-card"><div className="review-summary-card__eyebrow">storage</div><strong>{Math.round(storage.totalBytes / 1024)} KB</strong><span>{storage.keyCount} local keys</span></article>
        </section>

        <section className="newsroom-grid">
          <article className="wp-meta-box newsroom-panel">
            <h2>Status</h2>
            <ul className="wp-checklist">
              <li>Search index: {allItems.length} searchable records</li>
              <li>RSS status: {allItems.filter((item) => item.publishedAt || item.status === 'published').length} feed-ready records</li>
              <li>Build status: run `npm run build` before deploy</li>
              <li>Last deployment: verify in Cloudflare Pages</li>
              <li>Media audit: {mediaAudit.totalMedia} media references</li>
              <li>Scan state: {state}</li>
            </ul>
          </article>

          <article className="wp-meta-box newsroom-panel">
            <h2>Link Checker</h2>
            <table className="content-table wp-posts-table">
              <thead><tr><th>Source</th><th>Reference</th><th>Status</th></tr></thead>
              <tbody>
                {linkRows.map((row) => <tr key={row.id}><td>{row.title}</td><td>{row.url}</td><td>{row.status}</td></tr>)}
                {!linkRows.length ? <tr><td colSpan={3}>No questionable links found in the sampled content.</td></tr> : null}
              </tbody>
            </table>
          </article>

          <article className="wp-meta-box newsroom-panel">
            <h2>Missing Featured Images</h2>
            <ul className="newsroom-list">{missingFeatured.map((item) => <li key={item.id || item.slug}><div><strong>{titleFor(item)}</strong><span>{item.status || 'imported'}</span></div></li>)}</ul>
          </article>

          <article className="wp-meta-box newsroom-panel">
            <h2>Missing Alt Text</h2>
            <ul className="newsroom-list">{missingAlt.map((item) => <li key={item.id}><div><strong>{item.title || item.filename || 'Media item'}</strong><span>{item.url}</span></div></li>)}</ul>
          </article>

          <article className="wp-meta-box newsroom-panel">
            <h2>Orphaned Media</h2>
            <ul className="newsroom-list">{orphanedMedia.map((item) => <li key={item.id}><div><strong>{item.title || item.filename || 'Media item'}</strong><span>{item.source || 'media'}</span></div></li>)}</ul>
          </article>
        </section>
      </main>
    </AdminFrame>
  )
}
