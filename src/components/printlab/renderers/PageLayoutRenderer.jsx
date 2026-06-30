export function PageLayoutRenderer({
  previewRef,
  pageOrientation,
  pageImagePosition,
  pageHasContent,
  currentImageUrl,
  titleText,
  bodyContent,
  footerText,
  renderParagraphs,
}) {
  const hasImage = Boolean(currentImageUrl)
  return (
    <article
      className={`print-lab-preview print-lab-output print-lab-page-preview print-lab-page-preview--${pageOrientation} print-lab-page-preview--image-${pageImagePosition}${pageHasContent ? '' : ' print-lab-page-preview--starter'}`}
      ref={previewRef}
    >
      {hasImage && pageImagePosition === 'background' ? (
        <div className="print-lab-page-background" style={{ backgroundImage: `url("${currentImageUrl}")` }} />
      ) : null}

      <div className="print-lab-page-content">
        {hasImage && pageImagePosition === 'top' ? (
          <figure className="print-lab-page-image">
            <img src={currentImageUrl} alt="" />
          </figure>
        ) : null}

        {!hasImage && pageImagePosition === 'top' ? <div className="print-lab-page-image-placeholder">Image area</div> : null}

        <div className="print-lab-page-main">
          <header className="print-lab-page-header">
            <span>{pageHasContent ? 'Page Layout' : 'Starter Layout'}</span>
            <h2>{titleText}</h2>
          </header>

          <div className="print-lab-page-body">
            {hasImage && pageImagePosition === 'side' ? (
              <figure className="print-lab-page-image print-lab-page-image--side">
                <img src={currentImageUrl} alt="" />
              </figure>
            ) : null}
            {!hasImage && pageImagePosition === 'side' ? <div className="print-lab-page-image-placeholder print-lab-page-image-placeholder--side">Image area</div> : null}
            {renderParagraphs(bodyContent)}
          </div>
        </div>
      </div>

      <footer className="print-lab-page-footer">{footerText}</footer>
    </article>
  )
}
