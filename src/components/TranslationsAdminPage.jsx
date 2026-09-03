import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { MediaPickerModal } from './MediaLibraryPage'
import { loadNativeCollection } from '../lib/nativePublicContent'
import {
  deleteNativeTranslation,
  exportWeblateSource,
  loadNativeTranslations,
  saveNativeTranslation,
  unwrapWeblateBundle,
} from '../lib/nativeTranslationsApi'
import { adminRoutes } from '../routing/routes'

const STATUSES = ['draft', 'in_review', 'approved', 'published', 'archived']
const DEFAULT_WEBLATE_URL = 'https://hosted.weblate.org/projects/sabotpress/ai-server-called-paranoia/'
const KNOWN_AI_EXTERNAL_TRANSLATIONS = [
  {
    languageCode: 'es',
    languageLabel: 'Español',
    externalUrl: 'https://babelicosas.sutty.nl/2026/08/29/a-i-el-servidor-llamado-paranoia/',
    translatorCredit: 'Dazibao translation',
  },
  {
    languageCode: 'fr',
    languageLabel: 'Français',
    externalUrl: 'https://nantes.indymedia.org/posts/168508/autistici-inventati-designe-organisation-terroriste-internationale-par-les-etats-unis/',
    translatorCredit: 'Collective translation via Indymedia Nantes',
  },
  {
    languageCode: 'de',
    languageLabel: 'Deutsch',
    externalUrl: 'https://barrikade.info/article/7678',
    translatorCredit: 'German translation via Barrikade',
  },
]

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(href)
}

function labelForLanguage(code = '') {
  const known = { es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português', ar: 'العربية' }
  return known[String(code).toLowerCase()] || String(code || '').toUpperCase()
}

function editableDraftFrom(item = {}) {
  const translated = item.translation && typeof item.translation === 'object' ? item.translation : {}
  return {
    languageCode: String(item.code || '').trim().toLowerCase(),
    languageLabel: String(item.label || labelForLanguage(item.code)),
    status: String(item.status || 'draft'),
    provider: String(item.provider || 'manual'),
    translatorCredit: String(item.credit || ''),
    reviewerCredit: String(item.reviewerCredit || ''),
    weblateUrl: String(item.weblateUrl || ''),
    title: String(translated.title || ''),
    excerpt: String(translated.excerpt || ''),
    bodyHtml: String(translated.bodyHtml || translated.body || ''),
    seoTitle: String(translated.seoTitle || ''),
    seoDescription: String(translated.seoDescription || ''),
    heroImage: String(translated.heroImage || ''),
    heroImageAlt: String(translated.heroImageAlt || ''),
    socialImage: String(translated.socialImage || ''),
  }
}

export function TranslationsAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [content, setContent] = useState([])
  const [activeSlug, setActiveSlug] = useState(searchParams.get('slug') || 'the-server-called-paranoia')
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importMeta, setImportMeta] = useState({ languageCode: 'it', languageLabel: 'Italiano', translatorCredit: '', reviewerCredit: '', weblateUrl: DEFAULT_WEBLATE_URL })
  const [external, setExternal] = useState({ languageCode: '', languageLabel: '', externalUrl: '', translatorCredit: '', status: 'published' })
  const [editingCode, setEditingCode] = useState('')
  const [editDraft, setEditDraft] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [openMediaFor, setOpenMediaFor] = useState('')

  const activeContent = useMemo(() => content.find((item) => item.slug === activeSlug) || null, [content, activeSlug])
  const translations = Array.isArray(data?.translations) ? data.translations : []

  useEffect(() => {
    let cancelled = false
    loadNativeCollection({ includeFuture: 1 }).then((items) => {
      if (cancelled) return
      setContent(Array.isArray(items) ? items.filter((item) => item?.slug) : [])
    }).catch(() => { if (!cancelled) setContent([]) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!activeSlug) return
    let cancelled = false
    setState('loading')
    setError('')
    setEditingCode('')
    setEditDraft(null)
    loadNativeTranslations({ slug: activeSlug, includeUnpublished: true })
      .then((next) => { if (!cancelled) { setData(next); setState('loaded') } })
      .catch((err) => { if (!cancelled) { setError(String(err?.message || err)); setState('error') } })
    return () => { cancelled = true }
  }, [activeSlug])

  function selectSlug(slug) {
    setActiveSlug(slug)
    setSearchParams(slug ? { slug } : {})
    setNotice('')
  }

  async function refresh() {
    if (!activeSlug) return
    const next = await loadNativeTranslations({ slug: activeSlug, includeUnpublished: true })
    setData(next)
    return next
  }

  function beginEdit(item) {
    if (item.provider === 'external') return
    setError('')
    setNotice('')
    setEditingCode(item.code)
    setEditDraft(editableDraftFrom(item))
    window.requestAnimationFrame(() => document.getElementById('translation-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function patchEdit(key, value) {
    setEditDraft((current) => current ? { ...current, [key]: value } : current)
  }

  async function saveEdit(event) {
    event?.preventDefault?.()
    if (!editDraft || savingEdit) return
    try {
      setSavingEdit(true)
      setError('')
      setNotice('')
      await saveNativeTranslation({
        translation: {
          slug: activeSlug,
          languageCode: editDraft.languageCode,
          languageLabel: editDraft.languageLabel || labelForLanguage(editDraft.languageCode),
          status: editDraft.status,
          provider: editDraft.provider || 'manual',
          translatorCredit: editDraft.translatorCredit,
          reviewerCredit: editDraft.reviewerCredit,
          weblateUrl: editDraft.weblateUrl,
          translation: {
            title: editDraft.title,
            excerpt: editDraft.excerpt,
            bodyHtml: editDraft.bodyHtml,
            seoTitle: editDraft.seoTitle,
            seoDescription: editDraft.seoDescription,
            heroImage: editDraft.heroImage,
            heroImageAlt: editDraft.heroImageAlt,
            socialImage: editDraft.socialImage,
          },
        },
      })
      const next = await refresh()
      const saved = (next?.translations || []).find((item) => item.code === editDraft.languageCode)
      if (saved) setEditDraft(editableDraftFrom(saved))
      setNotice(`${editDraft.languageLabel || editDraft.languageCode} translation saved. The English article was not changed.`)
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSourceExport() {
    try {
      setError('')
      const bundle = await exportWeblateSource({ slug: activeSlug })
      downloadJson(`${activeSlug || 'article'}-en.json`, bundle)
      setNotice('Downloaded the current English Weblate source bundle from D1.')
    } catch (err) { setError(String(err?.message || err)) }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setError('')
      setNotice('')
      const parsed = JSON.parse(await file.text())
      const bundle = unwrapWeblateBundle(parsed)
      const languageCode = String(importMeta.languageCode || '').trim().toLowerCase()
      if (!languageCode || languageCode === 'en') throw new Error('Choose the translated language code before importing')
      await saveNativeTranslation({
        translation: {
          slug: activeSlug,
          languageCode,
          languageLabel: importMeta.languageLabel || labelForLanguage(languageCode),
          status: 'in_review',
          provider: 'weblate',
          translatorCredit: importMeta.translatorCredit,
          reviewerCredit: importMeta.reviewerCredit,
          weblateUrl: importMeta.weblateUrl,
        },
        weblateBundle: bundle,
      })
      await refresh()
      setNotice(`${file.name} imported as ${languageCode} and placed in editorial review. It is not public yet.`)
    } catch (err) { setError(String(err?.message || err)) }
  }

  async function handleExternalSubmit(event) {
    event.preventDefault()
    try {
      setError('')
      const languageCode = String(external.languageCode || '').trim().toLowerCase()
      if (!languageCode || !external.externalUrl) throw new Error('Language code and external translation URL are required')
      await saveNativeTranslation({
        slug: activeSlug,
        languageCode,
        languageLabel: external.languageLabel || labelForLanguage(languageCode),
        status: external.status,
        provider: 'external',
        translatorCredit: external.translatorCredit,
        externalUrl: external.externalUrl,
      })
      await refresh()
      setExternal({ languageCode: '', languageLabel: '', externalUrl: '', translatorCredit: '', status: 'published' })
      setNotice('External translation registered. Attribution and original hosting are preserved.')
    } catch (err) { setError(String(err?.message || err)) }
  }

  async function registerKnownAiTranslations() {
    if (activeSlug !== 'the-server-called-paranoia') return
    try {
      setError('')
      for (const item of KNOWN_AI_EXTERNAL_TRANSLATIONS) {
        await saveNativeTranslation({
          slug: activeSlug,
          ...item,
          status: 'published',
          provider: 'external',
        })
      }
      await refresh()
      setNotice('Registered the existing Spanish, French, and German community translations in D1 with their original hosting and credits preserved.')
    } catch (err) { setError(String(err?.message || err)) }
  }

  async function updateStatus(item, status) {
    try {
      setError('')
      await saveNativeTranslation({
        translation: {
          slug: activeSlug,
          languageCode: item.code,
          languageLabel: item.label,
          status,
          provider: item.provider,
          translatorCredit: item.credit,
          reviewerCredit: item.reviewerCredit,
          weblateUrl: item.weblateUrl,
          externalUrl: item.provider === 'external' ? item.href : '',
          translation: item.translation,
        },
      })
      const next = await refresh()
      if (editingCode === item.code) {
        const updated = (next?.translations || []).find((translation) => translation.code === item.code)
        if (updated) setEditDraft(editableDraftFrom(updated))
      }
      setNotice(`${item.label || item.code} moved to ${status.replace('_', ' ')}.`)
    } catch (err) { setError(String(err?.message || err)) }
  }

  async function remove(item) {
    if (!data?.content?.id || String(data.content.id).startsWith('bundled:') || !window.confirm(`Delete the ${item.label || item.code} translation record?`)) return
    try {
      await deleteNativeTranslation({ contentId: data.content.id, languageCode: item.code })
      await refresh()
      if (editingCode === item.code) { setEditingCode(''); setEditDraft(null) }
      setNotice(`${item.label || item.code} translation record deleted.`)
    } catch (err) { setError(String(err?.message || err)) }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen translations-admin-page">
        <div className="wp-screen-header">
          <div>
            <h1>Translations</h1>
            <p className="description">Weblate is the collaboration workspace. Sabot remains the publication authority: import finished language files here, review them, edit native translations, and explicitly publish them to the article language selector.</p>
          </div>
          <div className="review-card__actions">
            {activeSlug ? <a className="button" href={`/post/${encodeURIComponent(activeSlug)}`} target="_blank" rel="noreferrer">Open Article</a> : null}
            <a className="button" href={importMeta.weblateUrl || DEFAULT_WEBLATE_URL} target="_blank" rel="noreferrer">Open Weblate</a>
          </div>
        </div>

        {error ? <div className="notice notice-error" role="alert"><p><strong>Translation error:</strong> {error}</p></div> : null}
        {notice ? <div className="notice notice-success" role="status"><p>{notice}</p></div> : null}

        <section className="wp-meta-box">
          <h2>Article</h2>
          <label className="admin-field"><span>Manage translations for</span>
            <select value={activeSlug} onChange={(event) => selectSlug(event.target.value)}>
              {content.map((item) => <option key={item.id || item.slug} value={item.slug}>{item.title || item.slug}</option>)}
            </select>
          </label>
          {activeContent ? <p className="description"><code>/post/{activeContent.slug}</code> · {activeContent.status || 'unknown status'}</p> : null}
        </section>

        <section className="wp-meta-box">
          <div className="wp-screen-header">
            <div><h2>Weblate workflow</h2><p className="description">Export English when the source changes. When a translator finishes a language in Weblate, download that language JSON and import it below. Imports always begin in review, never directly on the public site.</p></div>
            <button className="button" type="button" onClick={handleSourceExport} disabled={!activeSlug}>Download current English source</button>
          </div>
          <div className="form-grid form-grid--two">
            <label className="admin-field"><span>Language code</span><input value={importMeta.languageCode} onChange={(e) => setImportMeta((v) => ({ ...v, languageCode: e.target.value }))} placeholder="it" /></label>
            <label className="admin-field"><span>Language label</span><input value={importMeta.languageLabel} onChange={(e) => setImportMeta((v) => ({ ...v, languageLabel: e.target.value }))} placeholder="Italiano" /></label>
            <label className="admin-field"><span>Translator credit</span><input value={importMeta.translatorCredit} onChange={(e) => setImportMeta((v) => ({ ...v, translatorCredit: e.target.value }))} placeholder="Name, collective, or community translation" /></label>
            <label className="admin-field"><span>Reviewer credit</span><input value={importMeta.reviewerCredit} onChange={(e) => setImportMeta((v) => ({ ...v, reviewerCredit: e.target.value }))} placeholder="Optional" /></label>
          </div>
          <label className="admin-field"><span>Weblate component URL</span><input value={importMeta.weblateUrl} onChange={(e) => setImportMeta((v) => ({ ...v, weblateUrl: e.target.value }))} /></label>
          <label className="button button--primary" style={{ display: 'inline-block', cursor: 'pointer' }}>Import translated JSON<input type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: 'none' }} /></label>
        </section>

        <section className="wp-meta-box">
          <div className="wp-screen-header">
            <div><h2>Existing translations hosted elsewhere</h2><p className="description">Keep community translations on the translator's original site unless they explicitly want their work moved into Weblate under this project's translation license. Sabot can register the original URL and credit without republishing the text.</p></div>
            {activeSlug === 'the-server-called-paranoia' ? <button className="button" type="button" onClick={registerKnownAiTranslations}>Register known ES / FR / DE translations</button> : null}
          </div>
          <form onSubmit={handleExternalSubmit}>
            <div className="form-grid form-grid--two">
              <label className="admin-field"><span>Language code</span><input value={external.languageCode} onChange={(e) => setExternal((v) => ({ ...v, languageCode: e.target.value }))} placeholder="es" /></label>
              <label className="admin-field"><span>Language label</span><input value={external.languageLabel} onChange={(e) => setExternal((v) => ({ ...v, languageLabel: e.target.value }))} placeholder="Español" /></label>
              <label className="admin-field"><span>Translation URL</span><input value={external.externalUrl} onChange={(e) => setExternal((v) => ({ ...v, externalUrl: e.target.value }))} placeholder="https://…" /></label>
              <label className="admin-field"><span>Credit</span><input value={external.translatorCredit} onChange={(e) => setExternal((v) => ({ ...v, translatorCredit: e.target.value }))} placeholder="Translator or host" /></label>
            </div>
            <button className="button" type="submit">Register external translation</button>
          </form>
        </section>

        <section className="wp-meta-box">
          <div className="wp-screen-header"><div><h2>Editorial translation records</h2><p className="description">Published native translations appear at <code>?lang=xx</code>. Native translations can be edited here without changing the English article. External translations keep linking to their original host.</p></div><button className="button" type="button" onClick={refresh} disabled={state === 'loading'}>Refresh</button></div>
          {state === 'loading' ? <p>Loading translations…</p> : null}
          <div className="wp-list-table-wrap">
            <table className="content-table wp-posts-table">
              <thead><tr><th>Language</th><th>Provider</th><th>Status</th><th>Credit</th><th>Destination</th><th>Actions</th></tr></thead>
              <tbody>
                {translations.length ? translations.map((item) => (
                  <tr key={item.code}>
                    <td><strong>{item.label || item.code}</strong><div className="description"><code>{item.code}</code></div></td>
                    <td>{item.provider || 'manual'}</td>
                    <td><span className={`status-badge status-badge--${String(item.status || 'draft').replace('_', '-')}`}>{String(item.status || 'draft').replace('_', ' ')}</span></td>
                    <td>{item.credit || '—'}</td>
                    <td>{item.href ? <a href={item.href} target="_blank" rel="noreferrer">Open translation</a> : item.weblateUrl ? <a href={item.weblateUrl} target="_blank" rel="noreferrer">Open Weblate</a> : '—'}</td>
                    <td><div className="review-card__actions">
                      {item.provider !== 'external' ? <button className="button button--primary" type="button" onClick={() => beginEdit(item)}>{editingCode === item.code ? 'Editing' : 'Edit translation'}</button> : null}
                      {STATUSES.filter((status) => status !== item.status).map((status) => <button key={status} className={status === 'published' ? 'button button--primary' : 'button'} type="button" onClick={() => updateStatus(item, status)}>{status === 'published' ? 'Publish' : status.replace('_', ' ')}</button>)}
                      {!String(data?.content?.id || '').startsWith('bundled:') ? <button className="button" type="button" onClick={() => remove(item)}>Delete</button> : null}
                    </div></td>
                  </tr>
                )) : <tr><td colSpan={6}>No D1 translation records yet. The A/I article still has its legacy external language links on the public page until they are registered here.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {editDraft ? <section className="wp-meta-box translation-native-editor" id="translation-editor">
          <div className="wp-screen-header">
            <div>
              <h2>Edit {editDraft.languageLabel || editDraft.languageCode}</h2>
              <p className="description">This edits only the <strong>{editDraft.languageLabel || editDraft.languageCode}</strong> version attached to <code>/post/{activeSlug}</code>. English metadata, archive identity, date and analytics remain shared.</p>
            </div>
            <div className="review-card__actions">
              <a className="button" href={`/post/${encodeURIComponent(activeSlug)}?lang=${encodeURIComponent(editDraft.languageCode)}`} target="_blank" rel="noreferrer">Preview translation</a>
              <button className="button" type="button" onClick={() => { setEditingCode(''); setEditDraft(null) }}>Close editor</button>
            </div>
          </div>

          <form onSubmit={saveEdit}>
            <div className="form-grid form-grid--two">
              <label className="admin-field"><span>Language</span><input value={editDraft.languageLabel} onChange={(e) => patchEdit('languageLabel', e.target.value)} /></label>
              <label className="admin-field"><span>Status</span><select value={editDraft.status} onChange={(e) => patchEdit('status', e.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label>
              <label className="admin-field"><span>Translator credit</span><input value={editDraft.translatorCredit} onChange={(e) => patchEdit('translatorCredit', e.target.value)} /></label>
              <label className="admin-field"><span>Reviewer credit</span><input value={editDraft.reviewerCredit} onChange={(e) => patchEdit('reviewerCredit', e.target.value)} /></label>
            </div>

            <label className="admin-field"><span>Translated title</span><input value={editDraft.title} onChange={(e) => patchEdit('title', e.target.value)} /></label>
            <label className="admin-field"><span>Excerpt / dek</span><textarea rows={4} value={editDraft.excerpt} onChange={(e) => patchEdit('excerpt', e.target.value)} /></label>

            <label className="admin-field"><span>Translated article body</span><textarea className="translation-body-editor" rows={30} value={editDraft.bodyHtml} onChange={(e) => patchEdit('bodyHtml', e.target.value)} spellCheck="true" /></label>
            <p className="description">The body is stored as HTML so headings, links, emphasis and the numbered interview structure stay intact. Editing the words here changes only this language version.</p>

            <div className="form-grid form-grid--two">
              <label className="admin-field"><span>SEO title</span><input value={editDraft.seoTitle} onChange={(e) => patchEdit('seoTitle', e.target.value)} /></label>
              <label className="admin-field"><span>SEO description</span><textarea rows={3} value={editDraft.seoDescription} onChange={(e) => patchEdit('seoDescription', e.target.value)} /></label>
            </div>

            <div className="translation-image-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div className="wp-meta-box" style={{ margin: 0 }}>
                <h3>Featured / hero image</h3>
                {editDraft.heroImage ? <img src={editDraft.heroImage} alt={editDraft.heroImageAlt || ''} style={{ display: 'block', width: '100%', maxHeight: '280px', objectFit: 'contain', background: '#f0f0f1', marginBottom: '.75rem' }} /> : <p className="description">No language-specific featured image selected. The public page may fall back to the original article image.</p>}
                <label className="admin-field"><span>Image URL</span><input value={editDraft.heroImage} onChange={(e) => patchEdit('heroImage', e.target.value)} /></label>
                <label className="admin-field"><span>Alt text</span><textarea rows={3} value={editDraft.heroImageAlt} onChange={(e) => patchEdit('heroImageAlt', e.target.value)} /></label>
                <div className="review-card__actions">
                  <button className="button button--primary" type="button" onClick={() => setOpenMediaFor('heroImage')}>Choose / upload image</button>
                  {editDraft.heroImage ? <button className="button" type="button" onClick={() => patchEdit('heroImage', '')}>Clear</button> : null}
                </div>
              </div>

              <div className="wp-meta-box" style={{ margin: 0 }}>
                <h3>Social image</h3>
                {editDraft.socialImage ? <img src={editDraft.socialImage} alt="" style={{ display: 'block', width: '100%', maxHeight: '280px', objectFit: 'contain', background: '#f0f0f1', marginBottom: '.75rem' }} /> : <p className="description">Optional. If blank, the translated featured image is used for social metadata.</p>}
                <label className="admin-field"><span>Social image URL</span><input value={editDraft.socialImage} onChange={(e) => patchEdit('socialImage', e.target.value)} /></label>
                <div className="review-card__actions">
                  <button className="button" type="button" onClick={() => setOpenMediaFor('socialImage')}>Choose / upload image</button>
                  {editDraft.heroImage ? <button className="button" type="button" onClick={() => patchEdit('socialImage', editDraft.heroImage)}>Use featured image</button> : null}
                  {editDraft.socialImage ? <button className="button" type="button" onClick={() => patchEdit('socialImage', '')}>Clear</button> : null}
                </div>
              </div>
            </div>

            <div className="review-card__actions" style={{ marginTop: '1rem' }}>
              <button className="button button--primary" type="submit" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save translation'}</button>
              <a className="button" href={`/post/${encodeURIComponent(activeSlug)}?lang=${encodeURIComponent(editDraft.languageCode)}`} target="_blank" rel="noreferrer">Open current public version</a>
            </div>
          </form>
        </section> : null}

        <section className="wp-meta-box"><h2>Where this fits</h2><p className="description">Write/edit the English source in <Link to={`${adminRoutes.nativeBridge}?edit=${encodeURIComponent(data?.content?.id || '')}`}>Posts</Link>. Translate collaboratively in Weblate or edit a native language record directly here. Publishing a translation makes it available through the public language selector without creating a duplicate post.</p></section>

        <MediaPickerModal
          open={Boolean(openMediaFor)}
          title={openMediaFor === 'socialImage' ? 'Choose translated social image' : 'Choose translated featured image'}
          onClose={() => setOpenMediaFor('')}
          onPick={(item) => {
            const field = openMediaFor
            if (!field || !item?.url) return
            patchEdit(field, item.url)
            if (field === 'heroImage' && !editDraft?.heroImageAlt && (item.alt || item.altText)) patchEdit('heroImageAlt', item.alt || item.altText)
            setOpenMediaFor('')
          }}
        />
      </main>
    </AdminFrame>
  )
}
