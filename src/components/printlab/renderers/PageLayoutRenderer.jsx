export function PageLayoutRenderer({
  previewRef,
  output,
  renderParagraphs,
}) {
  const hasImage = Boolean(output.imageUrl)
  return (
    <article
      className={`print-lab-preview print-lab-output print-lab-page-preview print-lab-page-preview--${output.orientation} print-lab-page-preview--image-${output.imagePosition}${output.hasContent ? '' : ' print-lab-page-preview--starter'}`}
      ref={previewRef}
    >
      {hasImage && output.imagePosition === 'background' ? (
        <div className="print-lab-page-background" style={{ backgroundImage: `url("${output.imageUrl}")` }} />
      ) : null}

      <div className="print-lab-page-content">
        {hasImage && output.imagePosition === 'top' ? (
          <figure className="print-lab-page-image">
            <img src={output.imageUrl} alt="" />
          </figure>
        ) : null}

        {!hasImage && output.imagePosition === 'top' ? <div className="print-lab-page-image-placeholder">Image area</div> : null}

        <div className="print-lab-page-main">
          <header className="print-lab-page-header">
            <span>{output.hasContent ? 'Page Layout' : 'Starter Layout'}</span>
            <h2>{output.titleText}</h2>
          </header>

          <div className="print-lab-page-body">
            {hasImage && output.imagePosition === 'side' ? (
              <figure className="print-lab-page-image print-lab-page-image--side">
                <img src={output.imageUrl} alt="" />
              </figure>
            ) : null}
            {!hasImage && output.imagePosition === 'side' ? <div className="print-lab-page-image-placeholder print-lab-page-image-placeholder--side">Image area</div> : null}
            {renderParagraphs(output.bodyContent)}
          </div>
        </div>
      </div>

      <footer className="print-lab-page-footer">{output.footerText}</footer>
    </article>
  )
}
