export function PosterSplitRenderer({
  previewRef,
  splitWide,
  splitTall,
  splitFit,
  splitShowNumbers,
  currentImageUrl,
  missingSourceMessage,
}) {
  const panels = Array.from({ length: splitWide * splitTall })
  const backgroundSize = splitFit === 'contain'
    ? `${splitWide * 100}% auto`
    : `${splitWide * 100}% ${splitTall * 100}%`

  return (
    <article
      className="print-lab-preview print-lab-output print-lab-preview--poster-split"
      ref={previewRef}
      style={{
        '--split-columns': splitWide,
      }}
    >
      {currentImageUrl ? (
        <div className="print-lab-split-grid">
          {panels.map((_, index) => {
            const column = index % splitWide
            const row = Math.floor(index / splitWide)
            const x = splitWide === 1 ? 50 : (column / (splitWide - 1)) * 100
            const y = splitTall === 1 ? 50 : (row / (splitTall - 1)) * 100
            const objectPosition = `${x}% ${y}%`
            return (
              <section
                className="print-lab-split-panel"
                key={`split-${index}`}
                style={{
                  backgroundImage: `url("${currentImageUrl}")`,
                  backgroundPosition: objectPosition,
                  backgroundSize,
                }}
              >
                <img
                  className="print-lab-split-panel__print-image"
                  src={currentImageUrl}
                  alt=""
                  style={{
                    objectFit: 'cover',
                    objectPosition,
                  }}
                />
                {splitShowNumbers ? <span>{index + 1}</span> : null}
              </section>
            )
          })}
        </div>
      ) : (
        <div className="print-lab-preview-empty print-lab-preview-empty--source">
          <strong>Image required for poster split</strong>
          <span>{`${splitWide}x${splitTall} printable panel preview`}</span>
          <p>{missingSourceMessage}</p>
        </div>
      )}
    </article>
  )
}
