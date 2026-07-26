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
    folder: String(fields?.folder ?? selected.folder ?? 'Unfiled'),
    tags: Array.isArray(fields?.tags)
      ? fields.tags
      : String(fields?.tags ?? (selected.tags || []).join(', '))
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
  }
  const updated = { ...selected, ...updates }
  setItems((current) => current.map((item) => (item.id === selected.id ? updated : item)))
  setSelected(updated)
  updateLocalMediaMetadata(selected, updates)
  if (selected.source === 'local-upload') updateLocalMediaItem(selected.id, updates)
}

async function replaceSelectedMediaFile(selected, file, setItems, setSelected) {
  if (!selected?.id || !file?.type?.startsWith('image/')) return null
  const dataUrl = await fileToDataUrl(file)
  const updates = {
    url: dataUrl,
    dataUrl,
    filename: file.name || selected.filename || '',
    mimeType: file.type || selected.mimeType || '',
    uploadedAt: new Date().toISOString(),
    source: selected.source || 'local-upload',
  }
  const updated = { ...selected, ...updates }
  setItems((current) => current.map((item) => (item.id === selected.id ? updated : item)))
  setSelected(updated)
  if (selected.source === 'local-upload') updateLocalMediaItem(selected.id, updates)
  return updated
}

export function loadMediaLibraryItems(nativeItems = null) {
  const importedMedia = collectMediaFromPieces(getPieces())
  const nativeMedia = collectMediaFromNative(nativeItems || [])
  const localMedia = loadLocalMediaItems()
  return dedupeMedia([...localMedia, ...nativeMedia, ...importedMedia]).map(applyLocalMediaMetadata)
}

async function makeMediaItemsFromFiles(files = []) {
  const created = []
  const rejected = []
  for (const file of files) {
    if (!file?.type?.startsWith('image/')) {
      if (file?.name) rejected.push(file.name)
      continue
    }
    const next = makeLocalMediaFromFile(file)
    next.url = await fileToDataUrl(file)
    next.dataUrl = next.url
    created.push(next)
    addLocalMediaItem(next)
  }
  return { created, rejected }
}

function mergeUploadedMedia(created, items, setItems, setSelected) {
  if (!created.length) return
  const merged = dedupeMedia([...created, ...items])
  setItems(merged)
  setSelected(created[0])
}

function sourceLabel(item = {}) {
  if (item.source === 'local-upload') return 'Uploaded here'
  if (item.source === 'native') return 'Used by post'
  if (item.source === 'imported') return 'Imported'
  return item.source || 'Media'
}

function MediaItemButton({ item, selected, setSelected }) {
  return (
    <button
      key={item.id}
      type="button"
      className={`wp-media-item${selected?.id === item.id ? ' is-selected' : ''}`}
      onClick={() => setSelected(item)}
    >
      <span className="wp-media-item__thumb-wrap">
        <img src={item.url} alt={item.alt || ''} loading="lazy" />
      </span>
      <span className="wp-media-item__meta">
        <strong>{item.title || item.filename || 'Untitled'}</strong>
        <small>{sourceLabel(item)}</small>
      </span>
    </button>
  )
}

function AttachmentDetails({ selected, items, setItems, setSelected, onConfirm }) {
  const replaceInputRef = useRef(null)
  const usageCount = selected ? items.filter((item) => item.url === selected.url).length : 0

  if (!selected) {
    return (
      <aside className="wp-media-details wp-media-modal__details">
        <h2>Attachment details</h2>
        <p className="description">Select an image to edit its title, alt text, caption, folder, and tags.</p>
      </aside>
    )
  }

  return (
    <aside className="wp-media-details wp-media-modal__details">
      <h2>Attachment details</h2>
      <img className="wp-media-details__preview" src={selected.url} alt={selected.alt || ''} />
      <div className="wp-media-details__facts">
        <p><strong>Source:</strong> {sourceLabel(selected)}</p>
        <p><strong>Usage:</strong> {usageCount} reference{usageCount === 1 ? '' : 's'}</p>
        {selected.filename ? <p><strong>File:</strong> {selected.filename}</p> : null}
        {selected.uploadedAt ? <p><strong>Uploaded:</strong> {new Date(selected.uploadedAt).toLocaleString()}</p> : null}
      </div>
      <label>
        <span>Title</span>
        <input value={selected.title || ''} onChange={(e) => persistSelectedMediaEdits(selected, { title: e.target.value }, setItems, setSelected)} />
      </label>
      <label>
        <span>Alt text</span>
        <input value={selected.alt || ''} onChange={(e) => persistSelectedMediaEdits(selected, { alt: e.target.value }, setItems, setSelected)} />
      </label>
      <label>
        <span>Folder</span>
        <input value={selected.folder || 'Unfiled'} onChange={(e) => persistSelectedMediaEdits(selected, { folder: e.target.value }, setItems, setSelected)} />
      </label>
      <label>
        <span>Tags</span>
        <input value={(selected.tags || []).join(', ')} onChange={(e) => persistSelectedMediaEdits(selected, { tags: e.target.value }, setItems, setSelected)} />
      </label>
      <label>
        <span>Caption</span>
        <textarea value={selected.caption || ''} onChange={(e) => persistSelectedMediaEdits(selected, { caption: e.target.value }, setItems, setSelected)} />
      </label>
      <label>
        <span>Description</span>
        <textarea value={selected.description || ''} onChange={(e) => persistSelectedMediaEdits(selected, { description: e.target.value }, setItems, setSelected)} />
      </label>
      <p className="wp-media-details__url"><strong>URL:</strong> {selected.url}</p>
      <div className="review-card__actions wp-media-details__actions">
        <button className="button" type="button" onClick={() => replaceInputRef.current?.click()}>Replace media</button>
        {onConfirm ? <button type="button" className="button button--primary" onClick={() => onConfirm(selected)}>Select</button> : null}
      </div>
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (file) await replaceSelectedMediaFile(selected, file, setItems, setSelected)
          event.target.value = ''
        }}
      />
    </aside>
  )
}

function MediaLibrarySurface({ mode, setMode, query, setQuery, selected, setSelected, items, setItems, onUploadClick, onConfirm }) {
  const [folderFilter, setFolderFilter] = useState('all')
  const folders = [...new Set(items.map((item) => item.folder || 'Unfiled'))].sort((a, b) => a.localeCompare(b))
  const visible = items.filter((item) => {
    if (folderFilter !== 'all' && (item.folder || 'Unfiled') !== folderFilter) return false
    return [item.title, item.url, item.caption, item.alt, item.folder, ...(item.tags || [])].join(' ').toLowerCase().includes(query.toLowerCase())
  })

  return (
    <div className="wp-media-surface">
      <div className="wp-media-toolbar">
        <div className="wp-media-toolbar__views">
          <button type="button" className={`button${mode === 'grid' ? ' button--primary' : ''}`} onClick={() => setMode('grid')}>Grid</button>
          <button type="button" className={`button${mode === 'list' ? ' button--primary' : ''}`} onClick={() => setMode('list')}>List</button>
        </div>
        <select value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)} aria-label="Filter by folder">
          <option value="all">All folders</option>
          {folders.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search media" />
        <button type="button" className="button button--primary" onClick={onUploadClick}>Upload images</button>
      </div>
      <div className={`wp-media-modal__body wp-media-modal__body--${mode}`}>
        <div className="wp-media-modal__library">
          {visible.length ? visible.map((item) => (
            <MediaItemButton key={item.id} item={item} selected={selected} setSelected={setSelected} />
          )) : (
            <div className="wp-media-empty-state">
              <strong>No media found.</strong>
              <span>Upload images or clear the search/filter.</span>
            </div>
          )}
        </div>
        <AttachmentDetails selected={selected} items={items} setItems={setItems} setSelected={setSelected} onConfirm={onConfirm} />
      </div>
    </div>
  )
}

export function MediaPickerModal({ open, onClose, onPick }) {
  const [mode, setMode] = useState('grid')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [items, setItems] = useState([])
  const [uploadStatus, setUploadStatus] = useState('')
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
    setUploadStatus('Processing upload…')
    const { created, rejected } = await makeMediaItemsFromFiles(files)
    mergeUploadedMedia(created, items, setItems, setSelected)
    if (created.length) {
      setUploadStatus(`Uploaded ${created.length} image${created.length === 1 ? '' : 's'}.`)
      pushNotice('Media uploaded.', 'success')
    } else {
      setUploadStatus(rejected.length ? 'No supported image files were selected.' : '')
    }
    event.target.value = ''
  }

  if (!open) return null

  return (
    <div className="wp-media-modal" role="dialog" aria-modal="true" aria-label="Media Picker">
      <div className="wp-media-modal__panel">
        <div className="wp-media-modal__header">
          <div>
            <h2>Media Library</h2>
            <p>Upload, search, select, and describe images.</p>
          </div>
          <button type="button" className="button" onClick={onClose}>Close</button>
        </div>
        <div className="wp-media-upload-strip">
          <strong>Upload images</strong>
          <span>Images are resized for browser storage before being used in posts.</span>
          <button type="button" className="button button--primary" onClick={() => fileInputRef.current?.click()}>Choose files</button>
        </div>
        {uploadStatus ? <p className="wp-media-upload-status" role="status">{uploadStatus}</p> : null}
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
  const [uploadStatus, setUploadStatus] = useState('')
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

  const visible = useMemo(() => items.filter((item) => [item.title, item.url, item.caption, item.alt].join(' ').toLowerCase().includes(query.toLowerCase())), [items, query])

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploadStatus('Processing upload…')
    const { created, rejected } = await makeMediaItemsFromFiles(files)
    mergeUploadedMedia(created, items, setItems, setSelected)
    if (created.length) {
      setUploadStatus(`Uploaded ${created.length} image${created.length === 1 ? '' : 's'}.`)
      pushNotice('Media uploaded.', 'success')
    } else {
      setUploadStatus(rejected.length ? 'No supported image files were selected.' : '')
      if (rejected.length) pushNotice('No supported image files were selected.', 'warning')
    }
    event.target.value = ''
  }

  async function handleDrop(event) {
    event.preventDefault()
    const files = Array.from(event.dataTransfer?.files || [])
    if (!files.length) return
    await handleUpload({ target: { files, value: '' } })
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen wp-media-library-page">
        <div className="wp-screen-header wp-media-screen-header">
          <div>
            <h1>Media Library</h1>
            <p className="description">Manage images for featured art, article bodies, posters, and zines.</p>
          </div>
          <button type="button" className="button button--primary" onClick={() => fileInputRef.current?.click()}>Add New</button>
        </div>
        <WpAdminNotices />
        <section className="wp-media-upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <div>
            <strong>Drop images here or choose files</strong>
            <span>Uploads are resized and stored in this browser for use in posts.</span>
          </div>
          <button type="button" className="button button--primary" onClick={() => fileInputRef.current?.click()}>Upload images</button>
        </section>
        {uploadStatus ? <p className="wp-media-upload-status" role="status">{uploadStatus}</p> : null}
        <section className="wp-meta-box wp-media-library-card">
          <MediaLibrarySurface
            mode={mode}
            setMode={setMode}
            query={query}
            setQuery={setQuery}
            selected={selected}
            setSelected={setSelected}
            items={visible}
            setItems={setItems}
            onUploadClick={() => fileInputRef.current?.click()}
          />
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
        </section>
      </main>
    </AdminFrame>
  )
}
