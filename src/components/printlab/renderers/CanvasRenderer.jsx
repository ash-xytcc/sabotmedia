import { useEffect } from 'react'
import { canvasResizeHandles, getCanvasFontFamily, getCanvasMediaFrame } from '../lib/canvasMath'

function numericStyle(node, property, fallback = 0) {
  const value = Number.parseFloat(node?.style?.[property] || '')
  if (Number.isFinite(value)) return value
  const computed = Number.parseFloat(window.getComputedStyle(node)?.[property] || '')
  return Number.isFinite(computed) ? computed : fallback
}

function makeDraggableDomPiece(piece) {
  piece.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const startLeft = numericStyle(piece, 'left')
    const startTop = numericStyle(piece, 'top')
    piece.classList.add('is-selected')
    piece.setPointerCapture?.(event.pointerId)
    const move = (moveEvent) => {
      piece.style.left = `${startLeft + (moveEvent.clientX - startX)}px`
      piece.style.top = `${startTop + (moveEvent.clientY - startY)}px`
    }
    const up = () => {
      piece.removeEventListener('pointermove', move)
      piece.removeEventListener('pointerup', up)
      piece.removeEventListener('pointercancel', up)
    }
    piece.addEventListener('pointermove', move)
    piece.addEventListener('pointerup', up)
    piece.addEventListener('pointercancel', up)
  })
}

function splitSelectedImageDom(canvasRef, rows = 2, columns = 2) {
  const stage = canvasRef.current
  if (!stage) return false
  const selected = stage.querySelector('.print-lab-canvas-block.is-selected img')?.closest('.print-lab-canvas-block')
  const fallback = Array.from(stage.querySelectorAll('.print-lab-canvas-block--image')).pop()
  const sourceBlock = selected || fallback
  const sourceImage = sourceBlock?.querySelector('img')
  if (!sourceBlock || !sourceImage?.src) return false

  const x = numericStyle(sourceBlock, 'left')
  const y = numericStyle(sourceBlock, 'top')
  const width = Math.max(1, numericStyle(sourceBlock, 'width', sourceBlock.offsetWidth || 1))
  const height = Math.max(1, numericStyle(sourceBlock, 'height', sourceBlock.offsetHeight || 1))
  const pieceWidth = width / columns
  const pieceHeight = height / rows
  const gap = 10
  const created = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const piece = document.createElement('div')
      piece.className = 'print-lab-canvas-block print-lab-canvas-block--image print-lab-canvas-block--split-piece'
      piece.style.position = 'absolute'
      piece.style.left = `${x + (column * (pieceWidth + gap))}px`
      piece.style.top = `${y + (row * (pieceHeight + gap))}px`
      piece.style.width = `${pieceWidth}px`
      piece.style.height = `${pieceHeight}px`
      piece.style.overflow = 'hidden'
      piece.style.opacity = sourceBlock.style.opacity || '1'
      piece.dataset.printlabSplitPiece = 'true'

      const image = document.createElement('img')
      image.src = sourceImage.src
      image.alt = ''
      image.draggable = false
      image.style.position = 'absolute'
      image.style.left = `${-(column * pieceWidth)}px`
      image.style.top = `${-(row * pieceHeight)}px`
      image.style.width = `${width}px`
      image.style.height = `${height}px`
      image.style.maxWidth = 'none'
      image.style.objectFit = 'fill'
      image.style.pointerEvents = 'none'
      piece.appendChild(image)

      const label = document.createElement('span')
      label.className = 'print-lab-canvas-block__label'
      label.textContent = `Split ${row + 1}.${column + 1}`
      piece.appendChild(label)
      makeDraggableDomPiece(piece)
      created.push(piece)
    }
  }

  sourceBlock.after(...created)
  sourceBlock.remove()
  return true
}

export function CanvasRenderer({
  previewRef,
  output,
  uploadedFontFaceCss,
  canvasViewportRef,
  canvasRef,
  canvasZoom,
  selectedCanvasBlockId,
  setSelectedCanvasBlockId,
  editingTextBlockId,
  setEditingTextBlockId,
  uploadedCanvasFonts,
  startCanvasDrag,
  startCanvasResize,
  updateCanvasBlock,
  openCanvasContextMenu,
}) {
  const canvasSize = output.canvasSize
  const canvasBackground = output.canvasBackground
  const canvasBlocks = output.canvasBlocks
  useEffect(() => {
    if (!editingTextBlockId) return
    const node = canvasRef.current?.querySelector(`[data-text-block-id="${editingTextBlockId}"]`)
    if (!node) return
    node.focus()
  }, [canvasRef, editingTextBlockId])

  useEffect(() => {
    function handleSplitSelectedImage(event) {
      const rows = Math.max(1, Math.min(8, Number(event?.detail?.rows || 2)))
      const columns = Math.max(1, Math.min(8, Number(event?.detail?.columns || 2)))
      const ok = splitSelectedImageDom(canvasRef, rows, columns)
      if (!ok) window.alert('Add or select an image on the canvas before using Magic Splitter.')
    }
    window.addEventListener('printlab:split-selected-image', handleSplitSelectedImage)
    return () => window.removeEventListener('printlab:split-selected-image', handleSplitSelectedImage)
  }, [canvasRef])

  return (
    <article className="print-lab-preview print-lab-output print-lab-preview--canvas" ref={previewRef}>
      {uploadedFontFaceCss ? <style>{uploadedFontFaceCss}</style> : null}
      <div
        className="print-lab-canvas-viewport"
        ref={canvasViewportRef}
      >
        <div
          className="print-lab-canvas-shell"
          style={{
            width: `${canvasSize.width * canvasZoom}px`,
            height: `${canvasSize.height * canvasZoom}px`,
          }}
        >
          <div
            className="print-lab-canvas-stage"
            ref={canvasRef}
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              transform: `scale(${canvasZoom})`,
              backgroundColor: canvasBackground,
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
            onPointerDown={() => setSelectedCanvasBlockId('')}
          >
            {canvasBlocks.map((block) => {
              const selected = block.id === selectedCanvasBlockId
              const blockWidth = Math.max(1, Number(block.width || 1))
              const blockHeight = Math.max(1, Number(block.height || 1))
              const mediaFrame = getCanvasMediaFrame(block)
              const fit = block.fit || 'cover'
              const editing = block.id === editingTextBlockId
              const blockStyle = {
                left: `${Number(block.x || 0)}px`,
                top: `${Number(block.y || 0)}px`,
                width: `${blockWidth}px`,
                height: `${blockHeight}px`,
                opacity: block.opacity ?? 1,
              }
              const mediaStyle = block.type === 'image' && mediaFrame ? (
                fit === 'stretch'
                  ? {
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                  }
                  : {
                    left: `${mediaFrame.mediaX - Number(block.x || 0)}px`,
                    top: `${mediaFrame.mediaY - Number(block.y || 0)}px`,
                    width: `${mediaFrame.mediaWidth}px`,
                    height: `${mediaFrame.mediaHeight}px`,
                    objectFit: fit,
                  }
              ) : null

              return (
                <div
                  className={`print-lab-canvas-block print-lab-canvas-block--${block.type}${selected ? ' is-selected' : ''}${editing ? ' is-editing' : ''}`}
                  key={block.id}
                  style={blockStyle}
                  onPointerDown={(event) => startCanvasDrag(event, block)}
                  onContextMenu={(event) => openCanvasContextMenu(event, block)}
                  onDoubleClick={(event) => {
                    if (block.type !== 'text') return
                    event.stopPropagation()
                    setEditingTextBlockId(block.id)
                  }}
                  title={block.type === 'text' ? 'Double-click to edit text' : undefined}
                >
                  {block.type === 'image' ? (
                    <img src={block.src} alt="" draggable={false} style={mediaStyle} />
                  ) : (
                    <div
                      className="print-lab-canvas-text"
                      contentEditable={editing}
                      data-text-block-id={block.id}
                      suppressContentEditableWarning
                      onPointerDown={(event) => {
                        if (editing) {
                          event.stopPropagation()
                          return
                        }
                        if (selected && event.detail > 1) {
                          event.stopPropagation()
                          return
                        }
                        startCanvasDrag(event, block)
                      }}
                      onBlur={(event) => {
                        updateCanvasBlock(block.id, { text: event.currentTarget.innerText })
                        setEditingTextBlockId('')
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Escape') return
                        event.preventDefault()
                        event.currentTarget.blur()
                        setEditingTextBlockId('')
                      }}
                      style={{
                        color: block.color,
                        fontFamily: getCanvasFontFamily(block.fontFamily, uploadedCanvasFonts),
                        fontSize: `${block.fontSize}px`,
                        fontWeight: block.fontWeight,
                        lineHeight: block.lineHeight,
                        textAlign: block.align || 'left',
                      }}
                    >
                      {block.text}
                    </div>
                  )}
                  {selected ? (
                    <>
                      <span className="print-lab-canvas-block__label">{block.title || block.type}</span>
                      {canvasResizeHandles.map((handle) => {
                        const actionLabel = block.type === 'image' && handle.id.length === 1 ? 'Crop image' : 'Resize block'
                        return (
                          <span
                            aria-label={`${actionLabel}: ${handle.id}`}
                            className={`print-lab-canvas-resize print-lab-canvas-resize--${handle.id}`}
                            key={handle.id}
                            role="button"
                            tabIndex="-1"
                            title={actionLabel}
                            style={{ cursor: handle.cursor }}
                            onPointerDown={(event) => startCanvasResize(event, block, handle.id)}
                          />
                        )
                      })}
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </article>
  )
}
