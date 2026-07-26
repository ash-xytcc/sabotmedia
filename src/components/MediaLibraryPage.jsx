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

const MEDIA_ACCEPT = [
  'image/*',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/epub+zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'text/plain',
  'text/markdown',
  'text/csv',
].join(',')

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
        filename: extra.filename || '',
        title: piece.title || extra.title || 'Imported media',
        alt: extra.alt || '',
        caption: extra.caption || '',
        description: extra.description || '',
        uploadedAt: '',
        source: 'imported',
        mediaType: extra.mediaType || 'image',
        mimeType: extra.mimeType || '',
      })
    }

    pushUrl(piece.featuredImage, { title: piece.title, mediaType: 'image' })
    pushUrl(piece.heroImage, { title: piece.title, mediaType: 'image' })
    pushUrl(piece.imageUrl, { title: piece.title, mediaType: 'image' })

    for (const asset of piece.relatedAssets || []) {
      if (asset?.kind === 'image') pushUrl(asset?.url, { title: asset?.title || piece.title, mediaType: 'image' })
      if (asset?.kind === 'download' || asset?.kind === 'pdf' || asset?.kind === 'file') {
        pushUrl(asset?.url || asset?.href, {
          title: asset?.title || piece.title,
          filename: asset?.filename || '',
          mediaType: asset?.kind === 'pdf' ? 'pdf' : 'file',
          mimeType: asset?.mimeType || '',
        })
      }
    }
  }
  return list
}

function collectMediaFromNative(items) {
  const list = []
  for (const entry of items || []) {
    const imageUrl = String(entry.featuredImage || entry.heroImage || '').trim()
    if (imageUrl) {
      list.push({
        id: `native-${entry.id}-${imageUrl}`,
        url: imageUrl,
        dataUrl: imageUrl,
        filename: '',
        title: entry.featuredImageTitle || entry.title || 'Native image',
        alt: entry.featuredImageAlt || '',
        caption: entry.featuredImageCaption || '',
        description: String(entry.excerpt || ''),
        uploadedAt: '',
        source: 'native',
        mediaType: 'image',
      })
    }

    const body = String(entry.body || entry.bodyHtml || '')
    const linkMatches = body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)
    for (const match of linkMatches) {
      const url = String(match[1] || '').trim()
      if (!url) continue
      const text = String(match[2] || '').replace(/<[^>]+>/g, '').trim()
      const looksLikeFile = /\.(pdf|zip|epub|docx?|odt|rtf|txt|md|csv)(?:[?#].*)?$/i.test(url) || url.includes('/api/media/files')
      if (!looksLikeFile) continue
      const extension = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase() || ''
      list.push({
        id: `native-file-${entry.id}-${url}`,
        url,
        dataUrl: url,
        downloadUrl: url,
        filename: '',
        title: text || entry.title || 'Native file',
        description: String(entry.excerpt || ''),
        uploadedAt: '',
        source: 'native',
        mediaType: extension === 'pdf' ? 'pdf' : 'file',
        extension,
      })
    }
  }
  return list
}

function dedupeMedia(items) {
  const byUrl = new Map()
  for (const item of items) {
    const key = item.url || item.downloadUrl
    if (!byUrl.has(key)) byUrl.set(key, item)
  }
  return [...byUrl.values()]
}

function isImageMedia(item = {}) {
  const type = String(item.mediaType || '').toLowerCase()
  const mime = String(item.mimeType || '').toLowerCase()
  return type === 'image' || type === 'svg' || mime.startsWith('image/')
}

function isPdfMedia(item = {}) {
  return String(item.mediaType || '').toLowerCase() === 'pdf' || String(item.mimeType || '').toLowerCase() === 'application/pdf'
}

function mediaKindLabel(item = {}) {
  if (isPdfMedia(item)) return 'PDF'
  if (isImageMedia(item)) return String(item.mediaTypeLabel || 'IMAGE').toUpperCase()
  return String(item.mediaTypeLabel || item.extension || item.mediaType || 'FILE').toUpperCase()
}

function formatBytes(value = 0) {
  const bytes = Number(value || 0)
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
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
  if (selected.source === 'local-upload' || selected.source === 'server-upload') updateLocalMediaItem(selected.id, updates)
}

async function replaceSelectedMediaFile(selected, file, setItems, setSelected) {
  if (!selected?.id || !file) return null
  const uploaded = await makeMediaItemFromFile(file)
  const updates = {
    ...uploaded,
    id: selected.id,
    title: uploaded.title || selected.title || '',
  }
  const updated = { ...selected, ...updates }
  setItems((current) => current.map((item) => (item.id === selected.id ? updated : item)))
  setSelected(updated)
  updateLocalMediaItem(selected.id, updated)
  return updated
}

export function loadMediaLibraryItems(nativeItems = null) {
  const importedMedia = collectMediaFromPieces(getPieces())
  const nativeMedia = collectMediaFromNative(nativeItems || [])
  const localMedia = loadLocalMediaItems()
  return dedupeMedia([...localMedia, ...nativeMedia, ...importedMedia]).map(applyLocalMediaMetadata)
}

async function uploadMediaFileToServer(file) {
  const form = new FormData()
  form.append('file', file, file.name || 'upload')
  form.append('filename', file.name || 'upload')
  form.append('mimeType', file.type || '')
  form.append('title', String(file.name || 'upload').replace(/\.[^.]+$/, ''))
  const response = await fetch('/api/media/files', { method: 'POST', body: form })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : { ok: false, error: await response.text() }
  if (!response.ok || !payload?.ok || !payload?.media) {
    throw new Error(payload?.error || `Upload failed with status ${response.status}`)
  }
  const media = payload.media
  return {
    id: media.id || media.mediaId || `server-${Date.now()}`,
    url: media.publicUrl || media.url || media.downloadUrl || '',
    dataUrl: media.publicUrl || media.url || media.downloadUrl || '',
    downloadUrl: media.downloadUrl || media.publicUrl || media.url || '',
    filename: media.filename || file.name || '',
    title: media.title || String(file.name || 'upload').replace(/\.[^.]+$/, ''),
    alt: '',
    caption: '',
    description: '',
    mimeType: media.mimeType || file.type || '',
    extension: media.extension || file.name?.split('.').pop()?.toLowerCase() || '',
    source: 'server-upload',
    uploadedAt: media.createdAt || new Date().toISOString(),
    mediaType: media.mediaType || '',
    size: media.size || file.size || 0,
  }
}

async function makeMediaItemFromFile(file) {
  try {
    const serverItem = await uploadMediaFileToServer(file)
    addLocalMediaItem(serverItem)
    return serverItem
  } catch {
    const next = makeLocalMediaFromFile(file)
    next.url = await fileToDataUrl(file)
    next.dataUrl = next.url
    next.downloadUrl = next.url
    addLocalMediaItem(next)
    return next
  }
}

async function makeMediaItemsFromFiles(files = []) {
  const created = []
  const rejected = []
  for (const file of files) {
    try {
      const next = await makeMediaItemFromFile(file)
      created.push(next)
    } catch {
      if (file?.name) rejected.push(file.name)
    }
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
  if (item.source === 'server-upload') return 'Uploaded to site'
  if (item.source === 'local-upload') return 'Uploaded here'
  if (item.source === 'native') return 'Used by post'
  if (item.source === 'imported') return 'Imported'
  return item.source || 'Media'
}

function MediaItemButton({ item, selected, setSelected }) {
  const isImage = isImageMedia(item)
  return (
    <button
      key={item.id}
      type="button"
      className={`wp-media-item${selected?.id === item.id ? ' is-selected' : ''}${isImage ? '' : ' wp-media-item--file'}`}
      data-media-url={item.downloadUrl || item.url || ''}
      data-media-title={item.title || item.filename || 'Download file'}
      data-media-type={item.mediaType || ''}
      data-media-mime={item.mimeType || ''}
      onClick={() => setSelected(item)}
    >
      <span className={`wp-media-item__thumb-wrap${isImage ? '' : ' wp-media-item__thumb-wrap--file'}`}>
        {isImage ? <img src={item.thumbnailUrl || item.url} alt={item.alt || ''} loading="lazy" /> : <span className="wp-media-file-icon">{mediaKindLabel(item)}</span>}
      </span>
      <span className="wp-media-item__meta">
        <strong>{item.title || item.filename || 'Untitled'}</strong>
        <small>{mediaKindLabel(item)} · {sourceLabel(item)}</small>
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
        <p className="description">Select an image, PDF, zine file, or download to edit its title, caption, folder, and tags.</p>
      </aside>
    )
  }

  const isImage = isImageMedia(selected)
  const downloadUrl = selected.downloadUrl || selected.url || ''

  return (
    <aside className="wp-media-details wp-media-modal__details">
      <h2>Attachment details</h2>
      {isImage ? (
        <img className="wp-media-details__preview" src={selected.url} alt={selected.alt || ''} />
      ) : (
        <div className="wp-media-details__file-preview">
          <span>{mediaKindLabel(selected)}</span>
          <strong>{selected.title || selected.filename || 'Download file'}</strong>
        </div>
      )}
      <div className="wp-media-details__facts">
        <p><strong>Source:</strong> {sourceLabel(selected)}</p>
        <p><strong>Type:</strong> {mediaKindLabel(selected)}{selected.mimeType ? ` · ${selected.mimeType}` : ''}</p>
        <p><strong>Usage:</strong> {usageCount} reference{usageCount === 1 ? '' : 's'}</p>
        {selected.filename ? <p><strong>File:</strong> {selected.filename}</p> : null}
        {selected.size ? <p><strong>Size:</strong> {formatBytes(selected.size)}</p> : null}
        {selected.uploadedAt ? <p><strong>Uploaded:</strong> {new Date(selected.uploadedAt).toLocaleString()}</p> : null}
      </div>
      <label>
        <span>Title</span>
        <input value={selected.title || ''} onChange={(e) => persistSelectedMediaEdits(selected, { title: e.target.value }, setItems, setSelected)} />
      </label>
      {isImage ? (
        <label>
          <span>Alt text</span>
          <input value={selected.alt || ''} onChange={(e) => persistSelectedMediaEdits(selected, { alt: e.target.value }, setItems, setSelected)} />
        </label>
      ) : null}
      <label>
        <span>Folder</span>
        <input value={selected.folder || 'Unfiled'} onChange={(e) => persistSelectedMediaEdits(selected, { folder: e.target.value }, setItems, setSelected)} />
      </label>
      <label>
        <span>Tags</span>
        <input value={(selected.tags || []).join(', ')} onChange={(e) => persistSelectedMediaEdits(selected, { tags: e.target.value }, setItems, setSelected)} />
      </label>
      <label>
        <span>Caption / link text</span>
        <textarea value={selected.caption || ''} onChange={(e) => persistSelectedMediaEdits(selected, { caption: e.target.value }, setItems, setSelected)} />
      </label>
      <label>
        <span>Description</span>
        <textarea value={selected.description || ''} onChange={(e) => persistSelectedMediaEdits(selected, { description: e.target.value }, setItems, setSelected)} />
      </label>
      <p className="wp-media-details__url"><strong>URL:</strong> {downloadUrl}</p>
      <div className="review-card__actions wp-media-details__actions">
        {downloadUrl ? <a className="button" href={downloadUrl} target="_blank" rel="noreferrer">Open file</a> : null}
        <button className="button" type="button" onClick={() => replaceInputRef.current?.click()}>Replace file</button>
        {onConfirm ? <button type="button" className="button button--primary" onClick={() => onConfirm(selected)}>Select</button> : null}
      </div>
      <input
        ref={replaceInputRef}
        type="file"
        accept={MEDIA_ACCEPT}
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
    return [item.title, item.url, item.downloadUrl, item.caption, item.alt, item.folder, item.filename, item.mediaType, ...(item.tags || [])].join(' ').toLowerCase().includes(query.toLowerCase())
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
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search media and files" />
        <button type="button" className="button button--primary" onClick={onUploadClick}>Upload files</button>
      </div>
      <div className={`wp-media-modal__body wp-media-modal__body--${mode}`}>
        <div className="wp-media-modal__library">
          {visible.length ? visible.map((item) => (
            <MediaItemButton key={item.id} item={item} selected={selected} setSelected={setSelected} />
          )) : (
            <div className="wp-media-empty-state">
              <strong>No media found.</strong>
              <span>Upload images, PDFs, zines, or clear the search/filter.</span>
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
      setUploadStatus(`Uploaded ${created.length} file${created.length === 1 ? '' : 's'}.`)
      pushNotice('Media uploaded.', 'success')
    } else {
      setUploadStatus(rejected.length ? 'No supported files were selected.' : '')
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
            <p>Upload, search, select, and describe images, PDFs, zines, and download files.</p>
          </div>
          <button type="button" className="button" onClick={onClose}>Close</button>
        </div>
        <div className="wp-media-upload-strip">
          <strong>Upload media files</strong>
          <span>Images, PDFs, zines, text files, EPUBs, and ZIPs can be used in posts as media or download links.</span>
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
        <input ref={fileInputRef} type="file" accept={MEDIA_ACCEPT} multiple hidden onChange={handleUpload} />
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

  const visible = useMemo(() => items.filter((item) => [item.title, item.url, item.downloadUrl, item.caption, item.alt, item.filename, item.mediaType].join(' ').toLowerCase().includes(query.toLowerCase())), [items, query])

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploadStatus('Processing upload…')
    const { created, rejected } = await makeMediaItemsFromFiles(files)
    mergeUploadedMedia(created, items, setItems, setSelected)
    if (created.length) {
      setUploadStatus(`Uploaded ${created.length} file${created.length === 1 ? '' : 's'}.`)
      pushNotice('Media uploaded.', 'success')
    } else {
      setUploadStatus(rejected.length ? 'No supported files were selected.' : '')
      if (rejected.length) pushNotice('No supported files were selected.', 'warning')
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
            <p className="description">Manage images, PDFs, zines, download files, featured art, and article body media.</p>
          </div>
          <button type="button" className="button button--primary" onClick={() => fileInputRef.current?.click()}>Add New</button>
        </div>
        <WpAdminNotices />
        <section className="wp-media-upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <div>
            <strong>Drop images, PDFs, zines, or files here</strong>
            <span>Files upload to site media storage when configured, with browser-local fallback for drafts.</span>
          </div>
          <button type="button" className="button button--primary" onClick={() => fileInputRef.current?.click()}>Upload files</button>
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
          <input ref={fileInputRef} type="file" accept={MEDIA_ACCEPT} multiple hidden onChange={handleUpload} />
        </section>
      </main>
    </AdminFrame>
  )
}
