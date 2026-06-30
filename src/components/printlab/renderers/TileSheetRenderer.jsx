export function TileSheetRenderer({
  previewRef,
  tileRows,
  tileColumns,
  tileGap,
  tileFit,
  tileCaption,
  currentImageUrl,
  missingSourceMessage,
}) {
  const count = tileRows * tileColumns
  return (
    <article
      className="print-lab-preview print-lab-output print-lab-preview--tile-sheet"
      ref={previewRef}
      style={{
        '--tile-columns': tileColumns,
        '--tile-gap': `${tileGap}px`,
      }}
    >
      {currentImageUrl ? (
        <div className="print-lab-tile-grid">
          {Array.from({ length: count }).map((_, index) => (
            <figure className="print-lab-tile" key={`tile-${index}`}>
              <img src={currentImageUrl} alt="" style={{ objectFit: tileFit }} />
              {tileCaption.trim() ? <figcaption>{tileCaption}</figcaption> : null}
            </figure>
          ))}
        </div>
      ) : (
        <div className="print-lab-preview-empty print-lab-preview-empty--source">
          <strong>Upload or select an image</strong>
          <span>{`${tileRows}x${tileColumns} tile sheet ready`}</span>
          <p>{missingSourceMessage}</p>
        </div>
      )}
    </article>
  )
}
