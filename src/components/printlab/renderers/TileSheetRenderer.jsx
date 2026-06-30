export function TileSheetRenderer({
  previewRef,
  output,
}) {
  const {
    columns,
    gap,
    fit,
    caption,
    imageUrl,
    missingSourceMessage,
    tiles,
  } = output
  return (
    <article
      className="print-lab-preview print-lab-output print-lab-preview--tile-sheet"
      ref={previewRef}
      style={{
        '--tile-columns': columns,
        '--tile-gap': `${gap}px`,
      }}
    >
      {imageUrl ? (
        <div className="print-lab-tile-grid">
          {tiles.map((tile) => (
            <figure className="print-lab-tile" key={tile.id}>
              <img src={tile.imageUrl} alt="" style={{ objectFit: fit }} />
              {caption.trim() ? <figcaption>{caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      ) : (
        <div className="print-lab-preview-empty print-lab-preview-empty--source">
          <strong>Upload or select an image</strong>
          <span>{output.label} ready</span>
          <p>{missingSourceMessage}</p>
        </div>
      )}
    </article>
  )
}
