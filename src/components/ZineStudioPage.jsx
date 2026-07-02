import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import {
  PAGE_KINDS,
  PAGE_SIZES,
  buildPrinterOrder,
  createPage,
  createPublication,
  createTextBlock,
  duplicatePage,
  loadPublications,
  savePublication,
  updatePublicationPages,
} from '../lib/publications'
import '../zineStudio.css'

function PageManager({ activePageId, onAdd, onDelete, onDuplicate, onMove, onSelect, pages }) {
  return (
    <aside className="zine-page-manager" aria-label="Publication pages">
      <div className="zine-panel-heading">
        <h2>Pages</h2>
        <span>{pages.length}</span>
      </div>
      <div className="zine-page-actions">
        {PAGE_KINDS.map((kind) => (
          <button key={kind.value} type="button" onClick={() => onAdd(kind.value)}>
            {kind.label}
          </button>
        ))}
      </div>
      <div className="zine-thumbnail-list" role="list">
        {pages.map((page, index) => (
          <article
            key={page.id}
            className={`zine-thumbnail${page.id === activePageId ? ' is-active' : ''}`}
            role="listitem"
            onClick={() => onSelect(page.id)}
          >
            <button className="zine-thumbnail__preview" type="button">
              <span>{index + 1}</span>
              <strong>{page.title}</strong>
            </button>
            <div className="zine-thumbnail__meta">
              <span>{PAGE_KINDS.find((kind) => kind.value === page.kind)?.label || page.kind}</span>
              <span>{PAGE_SIZES[page.orientation]?.label || page.orientation}</span>
            </div>
            <div className="zine-thumbnail__tools">
              <button type="button" onClick={(event) => { event.stopPropagation(); onMove(page.id, -1) }} disabled={index === 0}>Up</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onMove(page.id, 1) }} disabled={index === pages.length - 1}>Down</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicate(page.id) }}>Duplicate</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(page.id) }} disabled={pages.length <= 1}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  )
}

function PageCanvas({ onChangePage, page }) {
  const size = PAGE_SIZES[page.orientation] || PAGE_SIZES.portrait

  const updateBlock = (blockId, patch) => {
    onChangePage({
      ...page,
      blocks: page.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    })
  }

  const addTextBlock = () => {
    onChangePage({
      ...page,
      blocks: [...page.blocks, createTextBlock({ x: 120, y: 160, text: 'Text block' })],
    })
  }

  return (
    <section className="zine-canvas-wrap" aria-label="Page canvas editor">
      <div className="zine-canvas-toolbar">
        <input
          aria-label="Page name"
          value={page.title}
          onChange={(event) => onChangePage({ ...page, title: event.target.value })}
        />
        <select
          aria-label="Page orientation"
          value={page.orientation}
          onChange={(event) => onChangePage({ ...page, orientation: event.target.value })}
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
        <select
          aria-label="Page kind"
          value={page.kind}
          onChange={(event) => onChangePage({ ...page, kind: event.target.value })}
        >
          {PAGE_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
        </select>
        <button type="button" onClick={addTextBlock}>Add Text</button>
      </div>
      <div className="zine-canvas-stage">
        <div
          className={`zine-page-canvas zine-page-canvas--${page.orientation}`}
          style={{ '--page-width': `${size.width}px`, '--page-height': `${size.height}px` }}
        >
          {(page.blocks || []).map((block) => (
            <label
              className="zine-block zine-block--text"
              key={block.id}
              style={{
                left: `${block.x}px`,
                top: `${block.y}px`,
                width: `${block.width}px`,
                minHeight: `${block.height}px`,
                fontSize: `${block.fontSize || 24}px`,
              }}
            >
              <textarea
                value={block.text || ''}
                onChange={(event) => updateBlock(block.id, { text: event.target.value })}
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

function EditionPanel({ publication, onChange }) {
  const printEdition = publication.printEditions?.[0] || {}
  const digitalEdition = publication.digitalEditions?.[0] || {}
  const printerOrder = buildPrinterOrder(publication.pages || [])
  const pageTitleById = new Map((publication.pages || []).map((page) => [page.id, page.title]))

  const updateAssets = (patch) => ({
    ...publication,
    assets: { ...(publication.assets || {}), ...patch },
  })

  const updatePrintEdition = (patch) => onChange({
    ...publication,
    printEditions: [{ ...printEdition, ...patch, printerOrder }],
  })

  const updateDigitalEdition = (patch) => onChange({
    ...publication,
    digitalEditions: [{ ...digitalEdition, ...patch }],
  })

  return (
    <aside className="zine-edition-panel" aria-label="Publication editions and assets">
      <div className="zine-panel-heading">
        <h2>Editions</h2>
      </div>
      <section>
        <h3>Digital Edition</h3>
        <input
          aria-label="Reader PDF"
          placeholder="Reader PDF URL"
          value={publication.assets?.readerPdf || ''}
          onChange={(event) => onChange({
            ...updateAssets({ readerPdf: event.target.value }),
            digitalEditions: [{
              ...digitalEdition,
              readerPdf: event.target.value,
              status: event.target.value ? 'prepared' : 'draft',
            }],
          })}
        />
        <div className="zine-edition-status">{digitalEdition.status || 'draft'}</div>
      </section>
      <section>
        <h3>Print Edition</h3>
        <input
          aria-label="Print PDF"
          placeholder="Print PDF URL"
          value={publication.assets?.printPdf || ''}
          onChange={(event) => onChange({
            ...updateAssets({ printPdf: event.target.value }),
            printEditions: [{
              ...printEdition,
              printPdf: event.target.value,
              printerOrder,
              status: event.target.value ? 'prepared' : 'draft',
            }],
          })}
        />
        <input
          aria-label="Imposed PDF"
          placeholder="Imposed PDF URL"
          value={publication.assets?.imposedPdf || ''}
          onChange={(event) => onChange({
            ...updateAssets({ imposedPdf: event.target.value }),
            printEditions: [{
              ...printEdition,
              imposedPdf: event.target.value,
              printerOrder,
            }],
          })}
        />
        <div className="zine-edition-status">{printEdition.status || 'draft'}</div>
      </section>
      <section>
        <h3>Printer order</h3>
        <ol className="zine-order-list">
          {printerOrder.map((pageId) => <li key={pageId}>{pageTitleById.get(pageId) || pageId}</li>)}
        </ol>
      </section>
      <section>
        <h3>Assets</h3>
        <input
          aria-label="Canva link"
          placeholder="Canva link"
          value={publication.assets?.canvaLink || ''}
          onChange={(event) => onChange(updateAssets({ canvaLink: event.target.value }))}
        />
      </section>
    </aside>
  )
}

export function ZineStudioPage() {
  const { id = '' } = useParams()
  const [publications, setPublications] = useState(() => loadPublications())
  const [selectedPublicationId, setSelectedPublicationId] = useState(id)
  const selectedPublication = useMemo(() => {
    return publications.find((item) => item.id === selectedPublicationId || item.slug === selectedPublicationId) || publications[0] || null
  }, [publications, selectedPublicationId])
  const [activePageId, setActivePageId] = useState('')

  useEffect(() => {
    if (id) setSelectedPublicationId(id)
  }, [id])

  useEffect(() => {
    if (!selectedPublication) return
    if (!selectedPublication.pages.some((page) => page.id === activePageId)) {
      setActivePageId(selectedPublication.pages[0]?.id || '')
    }
  }, [activePageId, selectedPublication])

  const persistPublication = (publication) => {
    const saved = savePublication(publication)
    setPublications(loadPublications())
    setSelectedPublicationId(saved.id)
  }

  const createNewPublication = () => {
    persistPublication(createPublication({ title: `Zine ${publications.length + 1}` }))
  }

  const updatePages = (pages) => persistPublication(updatePublicationPages(selectedPublication, pages))

  const addPage = (kind) => {
    const page = createPage(kind, selectedPublication.pages.length)
    updatePages([...selectedPublication.pages, page])
    setActivePageId(page.id)
  }

  const movePage = (pageId, direction) => {
    const pages = [...selectedPublication.pages]
    const index = pages.findIndex((page) => page.id === pageId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= pages.length) return
    const [page] = pages.splice(index, 1)
    pages.splice(nextIndex, 0, page)
    updatePages(pages)
  }

  const deletePage = (pageId) => {
    updatePages(selectedPublication.pages.filter((page) => page.id !== pageId))
  }

  const clonePage = (pageId) => {
    const index = selectedPublication.pages.findIndex((page) => page.id === pageId)
    if (index < 0) return
    const pages = [...selectedPublication.pages]
    const copy = duplicatePage(pages[index], index + 1)
    pages.splice(index + 1, 0, copy)
    updatePages(pages)
    setActivePageId(copy.id)
  }

  const changePage = (nextPage) => {
    updatePages(selectedPublication.pages.map((page) => (page.id === nextPage.id ? nextPage : page)))
  }

  if (!selectedPublication) {
    return (
      <AdminFrame>
        <main className="page wp-admin-screen zine-studio-page">
          <div className="wp-screen-header">
            <h1>Zine Studio</h1>
            <button className="button button--primary" type="button" onClick={createNewPublication}>New Publication</button>
          </div>
          <section className="wp-meta-box">
            <p className="description">Create a publication to begin managing pages, editions, and reader assets.</p>
          </section>
        </main>
      </AdminFrame>
    )
  }

  const activePage = selectedPublication.pages.find((page) => page.id === activePageId) || selectedPublication.pages[0]

  return (
    <AdminFrame>
      <main className="page wp-admin-screen zine-studio-page">
        <div className="wp-screen-header zine-studio-header">
          <div>
            <h1>Zine Studio</h1>
            <input
              className="zine-title-input"
              aria-label="Publication title"
              value={selectedPublication.title}
              onChange={(event) => persistPublication({ ...selectedPublication, title: event.target.value })}
            />
          </div>
          <div className="zine-studio-header__actions">
            <select
              aria-label="Publication"
              value={selectedPublication.id}
              onChange={(event) => setSelectedPublicationId(event.target.value)}
            >
              {publications.map((publication) => (
                <option key={publication.id} value={publication.id}>{publication.title}</option>
              ))}
            </select>
            <button className="button" type="button" onClick={createNewPublication}>New Publication</button>
            <Link className="button" to={`/publications/${selectedPublication.slug}`}>Public View</Link>
            <Link className="button button--primary" to={`/reader/${selectedPublication.slug}`}>Reader</Link>
          </div>
        </div>

        <section className="zine-studio-shell">
          <PageManager
            activePageId={activePage?.id}
            onAdd={addPage}
            onDelete={deletePage}
            onDuplicate={clonePage}
            onMove={movePage}
            onSelect={setActivePageId}
            pages={selectedPublication.pages}
          />
          {activePage ? <PageCanvas onChangePage={changePage} page={activePage} /> : null}
          <EditionPanel publication={selectedPublication} onChange={persistPublication} />
        </section>
      </main>
    </AdminFrame>
  )
}
