export function HalfFoldRenderer({
  previewRef,
  zineHasContent,
  coverTitle,
  zineFooter,
  hasImage,
  currentImageUrl,
  zineBody,
  renderParagraphs,
}) {
  return (
    <article className="print-lab-preview print-lab-output print-lab-preview--half-fold-zine" ref={previewRef}>
      <div className={`print-lab-zine-spread${zineHasContent ? '' : ' print-lab-zine-spread--starter'}`}>
        <section className="print-lab-zine-panel print-lab-zine-panel--cover">
          <span>Left panel / cover</span>
          <h2>{coverTitle || 'Half-Fold Zine Title'}</h2>
          <p>{zineFooter.trim() || 'Colophon / footer'}</p>
        </section>
        <section className="print-lab-zine-panel print-lab-zine-panel--inside">
          <span>Right panel / inside</span>
          {hasImage ? (
            <figure>
              <img src={currentImageUrl} alt="" />
            </figure>
          ) : (
            <div className="print-lab-zine-image-placeholder">Image area</div>
          )}
          <div className="print-lab-zine-copy">
            {renderParagraphs(zineBody || 'Add short text for the inside panel. This half-fold preview stays visible so the left/right fold relationship is clear before content is finished.')}
          </div>
        </section>
      </div>
    </article>
  )
}
