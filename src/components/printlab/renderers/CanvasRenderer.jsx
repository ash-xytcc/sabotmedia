import { useEffect } from 'react'
import { canvasResizeHandles, getCanvasFontFamily, getCanvasMediaFrame } from '../lib/canvasMath'

function clampNumber(value, min, max) {
  const next = Number(value)
  if (!Number.isFinite(next)) return min
  return Math.min(max, Math.max(min, next))
}

function buildSplitPieces(block, rows = 2, columns = 2) {
  const rowCount = clampNumber(rows, 1, 8)
  const columnCount = clampNumber(columns, 1, 8)
  const sourceWidth = Math.max(1, Number(block.width || 1))
  const sourceHeight = Math.max(1, Number(block.height || 1))
  const pieceWidth = sourceWidth / columnCount
  const pieceHeight = sourceHeight / rowCount
  const gap = 10
  const pieces = []

  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      pieces.push({
        id: `${block.id}-split-${row}-${column}`,
        row,
        column,
        x: column * (pieceWidth + gap),
        y: row * (pieceHeight + gap),
        width: pieceWidth,
        height: pieceHeight,
        sourceX: column * pieceWidth,
        sourceY: row * pieceHeight,
        sourceWidth,
        sourceHeight,
      })
    }
  }

  return {
    pieces,
    rowCount,
    columnCount,
    gap,
    width: sourceWidth + ((columnCount - 1) * gap),
    height: sourceHeight + ((rowCount - 1) * gap),
  }
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
      const selectedBlock = canvasBlocks.find((block) => block.id === selectedCanvasBlockId && block.type === 'image')
      const fallbackBlock = [...canvasBlocks].reverse().find((block) => block.type === 'image')
      const block = selectedBlock || fallbackBlock
      if (!block?.src) {
        window.alert('Add or select an image on the canvas before using Magic Splitter.')
        return
      }
      const split = buildSplitPieces(block, event?.detail?.rows || 2, event?.detail?.columns || 2)
      updateCanvasBlock(block.id, {
        title: `${block.title || 'Image'} Split`,
        name: `${block.name || block.title || 'Image'} Split`,
        width: split.width,
        height: split.height,
        splitRows: split.rowCount,
        splitColumns: split.columnCount,
        splitGap: split.gap,
        splitPieces: split.pieces,
        fit: 'split',
      })
      setSelectedCanvasBlockId(block.id)
    }
    window.addEventListener('printlab:split-selected-image', handleSplitSelectedImage)
    return () => window.removeEventListener('printlab:split-selected-image', handleSplitSelectedImage)
  }, [canvasBlocks, selectedCanvasBlockId, setSelectedCanvasBlockId, updateCanvasBlock])

  useEffect(() => {
    function handleApplyImageSource(event) {
      const nextSrc = event?.detail?.src || ''
      if (!nextSrc) return
      const selectedBlock = canvasBlocks.find((block) => block.id === selectedCanvasBlockId && block.type === 'image')
      const fallbackBlock = [...canvasBlocks].reverse().find((block) => block.type === 'image')
      const block = selectedBlock || fallbackBlock
      if (!block?.id) {
        window.alert('Add or select an image on the canvas first.')
        return
      }
      updateCanvasBlock(block.id, {
        src: nextSrc,
        title: event?.detail?.title || `${block.title || 'Image'} Cutout`,
        name: event?.detail?.title || `${block.name || block.title || 'Image'} Cutout`,
        fit: block.fit === 'split' ? 'split' : 'contain',
      })
      setSelectedCanvasBlockId(block.id)
    }
    window.addEventListener('printlab:apply-selected-image-src', handleApplyImageSource)
    return () => window.removeEventListener('printlab:apply-selected-image-src', handleApplyImageSource)
  }, [canvasBlocks, selectedCanvasBlockId, setSelectedCanvasBlockId, updateCanvasBlock])

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
              const splitPieces = block.type === 'image' && Array.isArray(block.splitPieces) && block.splitPieces.length
                ? block.splitPieces
                : null
              const blockStyle = {
                left: `${Number(block.x || 0)}px`,
                top: `${Number(block.y || 0)}px`,
                width: `${blockWidth}px`,
                height: `${blockHeight}px`,
                opacity: block.opacity ?? 1,
                overflow: splitPieces ? 'visible' : undefined,
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
                  className={`print-lab-canvas-block print-lab-canvas-block--${block.type}${splitPieces ? ' print-lab-canvas-block--split-image' : ''}${selected ? ' is-selected' : ''}${editing ? ' is-editing' : ''}`}
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
                    splitPieces ? (
                      <div className="print-lab-canvas-split-pieces" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                        {splitPieces.map((piece) => (
                          <div
                            className="print-lab-canvas-split-piece"
                            key={piece.id}
                            style={{
                              position: 'absolute',
                              left: `${Number(piece.x || 0)}px`,
                              top: `${Number(piece.y || 0)}px`,
                              width: `${Math.max(1, Number(piece.width || 1))}px`,
                              height: `${Math.max(1, Number(piece.height || 1))}px`,
                              overflow: 'hidden',
                              background: '#fff',
                              boxShadow: selected ? '0 0 0 1px rgba(194, 43, 38, 0.42)' : undefined,
                            }}
                          >
                            <img
                              src={block.src}
                              alt=""
                              draggable={false}
                              style={{
                                position: 'absolute',
                                left: `${-Number(piece.sourceX || 0)}px`,
                                top: `${-Number(piece.sourceY || 0)}px`,
                                width: `${Math.max(1, Number(piece.sourceWidth || blockWidth))}px`,
                                height: `${Math.max(1, Number(piece.sourceHeight || blockHeight))}px`,
                                maxWidth: 'none',
                                objectFit: 'fill',
                                pointerEvents: 'none',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <img src={block.src} alt="" draggable={false} style={mediaStyle} />
                    )
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
