import { PublicationPageSurface } from './PublicationPageSurface'

export function HalfFoldRenderer({
  previewRef,
  output,
  uploadedCanvasFonts,
}) {
  return (
    <article className="print-lab-preview print-lab-output print-lab-preview--half-fold-zine" ref={previewRef}>
      <div className="print-lab-half-fold-stack" aria-label="Half-fold print layout">
        {output.sheets.map((sheet) => (
          <div className="print-lab-half-fold-sheet" key={sheet.id}>
            <div className="print-lab-half-fold-sheet__label">
              <strong>{sheet.label}</strong>
              <span>{output.sheetSize.label}</span>
            </div>
            <div className="print-lab-half-fold-spread">
              {sheet.panels.map((panel) => (
                <section className={`print-lab-half-fold-panel print-lab-half-fold-panel--${panel.side}`} key={panel.id}>
                  <span className="print-lab-half-fold-panel__label">{panel.label}</span>
                  <PublicationPageSurface
                    blankLabel={panel.positionLabel}
                    className="print-lab-publication-surface--half-fold"
                    page={panel.page}
                    uploadedCanvasFonts={uploadedCanvasFonts}
                  />
                </section>
              ))}
              <span className="print-lab-half-fold-spread__fold" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
