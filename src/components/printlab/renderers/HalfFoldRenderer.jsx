export function HalfFoldRenderer({
  previewRef,
  output,
  renderParagraphs,
}) {
  const spread = output.spreads[0]
  return (
    <article className="print-lab-preview print-lab-output print-lab-preview--half-fold-zine" ref={previewRef}>
      <div className={`print-lab-zine-spread${output.zineHasContent ? '' : ' print-lab-zine-spread--starter'}`}>
        <section className="print-lab-zine-panel print-lab-zine-panel--cover">
          <span>{spread?.leftLabel ? `Left panel / ${spread.leftLabel}` : 'Left panel / cover'}</span>
          <h2>{output.coverTitle || 'Half-Fold Zine Title'}</h2>
          <p>{output.footer.trim() || 'Colophon / footer'}</p>
        </section>
        <section className="print-lab-zine-panel print-lab-zine-panel--inside">
          <span>{spread?.rightLabel ? `Right panel / ${spread.rightLabel}` : 'Right panel / inside'}</span>
          {output.hasImage ? (
            <figure>
              <img src={output.imageUrl} alt="" />
            </figure>
          ) : (
            <div className="print-lab-zine-image-placeholder">Image area</div>
          )}
          <div className="print-lab-zine-copy">
            {renderParagraphs(output.body || 'Add short text for the inside panel. This half-fold preview stays visible so the left/right fold relationship is clear before content is finished.')}
          </div>
        </section>
      </div>
    </article>
  )
}
