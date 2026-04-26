import { useEffect, useMemo, useRef, useState } from 'react'
import { getPieces } from '../lib/pieces'
import { loadNativeCollection } from '../lib/nativePublicContent'
import {
  applyLocalMediaMetadata,
  addLocalMediaItem,
  fileToDataUrl,
  loadLocalMediaItems,
  makeLocalMediaFromFile,
  updateLocalMediaMetadata,
  updateLocalMediaItem,
} from '../lib/localMediaLibrary'
import { AdminFrame } from './AdminRail'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'

function collectMediaFromPieces(pieces) {
  const list = []
  for (const piece of pieces || []) {
    const pushUrl = (url, extra = {}) => {
      const clean = String(url || '').trim()
      if (!clean) return
      list.push({
        id: `imported-${clean}`,
        url: clean,
        dataUrl: clean,
        filename: '',
        title: piece.title || extra.title || 'Imported media',
        alt: extra.alt || '',
        caption: extra.caption || '',
        description: '',
        uploadedAt: '',
        source: 'imported',
      })
    }

    pushUrl(piece.featuredImage, { title: piece.title })
    pushUrl(piece.heroImage, { title: piece.title })
    pushUrl(piece.imageUrl, { title: piece.title })

    for (const asset of piece.relatedAssets || []) {
      if (asset?.kind === 'image') pushUrl(asset?.url, { title: asset?.title || piece.title })
    }
  }
  return list
}

function collectMediaFromNative(items) {
  const list = []
  for (const entry of items || []) {
    const url = String(entry.featuredImage || entry.heroImage || '').trim()
    if (!url) continue
    list.push({
      id: `native-${entry.id}-${url}`,
      url,
      dataUrl: url,
      filename: '',
      title: entry.featuredImageTitle || entry.title || 'Native image',
      alt: entry.featuredImageAlt || '',
      caption: entry.featuredImageCaption || '',
      description: String(entry.excerpt || ''),
      uploadedAt: '',
      source: 'native',
    })
  }
  return list
}

function dedupeMedia(items) {
  const byUrl = new Map()
  for (const item of items) {
    const key = item.url
    if (!byUrl.has(key)) byUrl.set(key, item)
  }
  return [...byUrl.values()]
}

function persistSelectedMediaEdits(selected, fields, setItems, setSelected) {
  if (!selected?.id) return
  const updates = {
    title: String(fields?.title ?? selected.title ?? ''),
    alt: String(fields?.alt ?? selected.alt ?? ''),
    caption: String(fields?.caption ?? selected.caption ?? ''),
    description: String(fields?.description ?? selected.description ?? ''),
  }
  const updated = { ...selected, ...updates }
  setItems((current) => current.map((item) => (item.id === selected.id ? updated : item)))
  setSelected(updated)
  updateLocalMediaMetadata(selected, updates)
  if (selected.source === 'local-upload') updateLocalMediaItem(selected.id, updates)
}

export function loadMediaLibraryItems(nativeItems = null) {
  const importedMedia = collectMediaFromPieces(getPieces())
  const nativeMedia = collectMediaFromNative(nativeItems || [])
  const localMedia = loadLocalMediaItems()
  return dedupeMedia([...localMedia, ...nativeMedia, ...importedMedia]).map(applyLocalMediaMetadata)
}

function MediaLibrarySurface({ mode, setMode, query, setQuery, selected, setSelected, items, setItems, onUploadClick, onConfirm }) {
  const visible = items.filter((item) => [item.title, item.url, item.caption, item.alt].join(' ').toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <div className="wp-media-toolbar">
        <button type="button" className={`button${mode === 'grid' ? ' button--primary' : ''}`} onClick={() => setMode('grid')}>Grid</button>
        <button type="button" className={`button${mode === 'list' ? ' button--primary' : ''}`} onClick={() => setMode('list')}>List</button>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search media" />
        <button type="button" className="button" onClick={onUploadClick}>Upload</button>
      </div>
      <div className={`wp-media-modal__body wp-media-modal__body--${mode}`}>
        <div className="wp-media-modal__library">
          {visible.map((item) => (
            <button key={item.id} type="button" className={`wp-media-item${selected?.id === item.id ? ' is-selected' : ''}`} onClick={() => setSelected(item)}>
              <span className="wp-media-item__thumb-wrap">
                <img src={item.url} alt={item.alt || ''} loading="lazy" />
              </span>
              <span className="wp-media-item__meta">{item.title || 'Untitled'}</span>
            </button>
          ))}
        </div>
        <aside className="wp-media-modal__details">
          <h3>Attachment Details</h3>
          {selected ? (
            <>
              <img src={selected.url} alt={selected.alt || ''} />
              <p><strong>Source:</strong> {selected.source === 'local-upload' ? 'Local browser storage only' : (selected.source || 'unknown')}</p>
              {selected.filename ? <p><strong>File name:</strong> {selected.filename}</p> : null}
              {selected.uploadedAt ? <p><strong>Uploaded:</strong> {new Date(selected.uploadedAt).toLocaleString()}</p> : null}
              <p><strong>URL:</strong> {selected.url}</p>
              <label>
                Title
                <input value={selected.title || ''} onChange={(e) => persistSelectedMediaEdits(selected, { title: e.target.value }, setItems, setSelected)} />
              </label>
              <label>
                Alt text
                <input value={selected.alt || ''} onChange={(e) => persistSelectedMediaEdits(selected, { alt: e.target.value }, setItems, setSelected)} />
              </label>
              <label>
                Caption
                <textarea value={selected.caption || ''} onChange={(e) => persistSelectedMediaEdits(selected, { caption: e.target.value }, setItems, setSelected)} />
              </label>
              <label>
                Description
                <textarea value={selected.description || ''} onChange={(e) => persistSelectedMediaEdits(selected, { description: e.target.value }, setItems, setSelected)} />
              </label>
              {onConfirm ? <button type="button" className="button button--primary" onClick={() => onConfirm(selected)}>Select</button> : null}
            </>
          ) : <p>Select an item to see details.</p>}
        </aside>
      </div>
    </>
  )
}

export function MediaPickerModal({ open, onClose, onPick }) {
  const [mode, setMode] = useState('grid')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [items, setItems] = useState([])
  const fileInputRef = useRef(null)
  const { pushNotice } = useAdminNotices()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    loadNativeCollection({ includeFuture: 1 }).then((nativeItems) => {
      if (!cancelled) setItems(loadMediaLibraryItems(nativeItems))
    }).catch(() => {
      if (!cancelled) setItems(loadMediaLibraryItems([]))
    })
    return () => { cancelled = true }
  }, [open])

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const created = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const next = makeLocalMediaFromFile(file)
      next.url = await fileToDataUrl(file)
      next.dataUrl = next.url
      created.push(next)
      addLocalMediaItem(next)
    }
    if (created.length) {
      const merged = [...created, ...items]
      setItems(dedupeMedia(merged))
      setSelected(created[0])
      pushNotice('Media uploaded.', 'success')
    }
    event.target.value = ''
  }

  if (!open) return null

  return (
    <div className="wp-media-modal" role="dialog" aria-modal="true" aria-label="Media Picker">
      <div className="wp-media-modal__panel">
        <div className="wp-media-modal__header">
          <h2>Media Library</h2>
          <button type="button" className="button" onClick={onClose}>Close</button>
        </div>
        <p className="wp-media-local-note">Uploads are stored in this browser only using localStorage.</p>
        <MediaLibrarySurface
          mode={mode}
          setMode={setMode}
          query={query}
          setQuery={setQuery}
          selected={selected}
          setSelected={setSelected}
          items={items}
          setItems={setItems}
          onUploadClick={() => fileInputRef.current?.click()}
          onConfirm={onPick}
        />
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
      </div>
    </div>
  )
}

export function MediaLibraryPage() {
  const [mode, setMode] = useState('grid')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const fileInputRef = useRef(null)
  const { pushNotice } = useAdminNotices()

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        const nativeItems = await loadNativeCollection({ includeFuture: 1 })
        if (!cancelled) setItems(loadMediaLibraryItems(nativeItems))
      } catch {
        if (!cancelled) setItems(loadMediaLibraryItems([]))
      }
    }
    boot()
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => items.filter((item) => [item.title, item.url].join(' ').toLowerCase().includes(query.toLowerCase())), [items, query])

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const created = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const next = makeLocalMediaFromFile(file)
      next.url = await fileToDataUrl(file)
      next.dataUrl = next.url
      created.push(next)
      addLocalMediaItem(next)
    }
    if (created.length) {
      const merged = [...created, ...items]
      setItems(dedupeMedia(merged))
      setSelected(created[0])
      pushNotice('Media uploaded.', 'success')
    }
    event.target.value = ''
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Media Library</h1>
          <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>Add New</button>
        </div>
        <WpAdminNotices />
        <section className="wp-meta-box">
          <p className="wp-media-local-note">Add New / Upload stores images in this browser only using localStorage.</p>
          <div className="wp-media-toolbar">
            <button type="button" className={`button${mode === 'grid' ? ' button--primary' : ''}`} onClick={() => setMode('grid')}>Grid View</button>
            <button type="button" className={`button${mode === 'list' ? ' button--primary' : ''}`} onClick={() => setMode('list')}>List View</button>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search media items..." />
            <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>Upload</button>
          </div>
          <div className={`wp-media-layout wp-media-layout--${mode}`}>
            <div className="wp-media-grid">
              {visible.map((item) => (
                <button key={item.id} type="button" className={`wp-media-item${selected?.id === item.id ? ' is-selected' : ''}`} onClick={() => setSelected(item)}>
                  <span className="wp-media-item__thumb-wrap">
                    <img src={item.url} alt={item.alt || ''} loading="lazy" />
                  </span>
                  <span className="wp-media-item__meta">{item.title}</span>
                </button>
              ))}
            </div>
            <aside className="wp-media-details">
              <h2>Attachment details</h2>
              {selected ? (
                <>
                  <img src={selected.url} alt={selected.alt || ''} />
                  <p><strong>Source:</strong> {selected.source === 'local-upload' ? 'Local browser storage only' : (selected.source || 'unknown')}</p>
                  {selected.filename ? <p><strong>File name:</strong> {selected.filename}</p> : null}
                  {selected.uploadedAt ? <p><strong>Uploaded:</strong> {new Date(selected.uploadedAt).toLocaleString()}</p> : null}
                  <p><strong>URL:</strong> {selected.url}</p>
                  <label>
                    Title
                    <input value={selected.title || ''} onChange={(e) => persistSelectedMediaEdits(selected, { title: e.target.value }, setItems, setSelected)} />
                  </label>
                  <label>
                    Alt text
                    <input value={selected.alt || ''} onChange={(e) => persistSelectedMediaEdits(selected, { alt: e.target.value }, setItems, setSelected)} />
                  </label>
                  <label>
                    Caption
                    <textarea value={selected.caption || ''} onChange={(e) => persistSelectedMediaEdits(selected, { caption: e.target.value }, setItems, setSelected)} />
                  </label>
                  <label>
                    Description
                    <textarea value={selected.description || ''} onChange={(e) => persistSelectedMediaEdits(selected, { description: e.target.value }, setItems, setSelected)} />
                  </label>
                </>
              ) : <p>Select media to view details.</p>}
            </aside>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
        </section>
      </main>
    </AdminFrame>
  )
}
