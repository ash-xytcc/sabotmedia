export function PosterSplitRenderer({
  previewRef,
  output,
}) {
  return (
    <article
      className="print-lab-preview print-lab-output print-lab-preview--poster-split"
      ref={previewRef}
      style={{
        '--split-columns': output.wide,
      }}
    >
      {output.imageUrl ? (
        <div className="print-lab-split-grid">
          {output.panels.map((panel) => (
            <section
              className="print-lab-split-panel"
              key={panel.id}
              style={{
                backgroundImage: `url("${output.imageUrl}")`,
                backgroundPosition: panel.objectPosition,
                backgroundSize: output.backgroundSize,
              }}
            >
              <img
                className="print-lab-split-panel__print-image"
                src={output.imageUrl}
                alt=""
                style={{
                  objectFit: 'cover',
                  objectPosition: panel.objectPosition,
                }}
              />
              {output.showNumbers ? <span>{panel.number}</span> : null}
            </section>
          ))}
        </div>
      ) : (
        <div className="print-lab-preview-empty print-lab-preview-empty--source">
          <strong>Image required for poster split</strong>
          <span>{output.label} printable panel preview</span>
          <p>{output.missingSourceMessage}</p>
        </div>
      )}
    </article>
  )
}
