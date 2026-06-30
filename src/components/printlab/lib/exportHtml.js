function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function buildExportHtml(previewHtml, title, { fontsHref = '' } = {}) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title || 'Printlab Output')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${fontsHref ? `<link rel="stylesheet" href="${escapeHtml(fontsHref)}">` : ''}
  <style>
    * { box-sizing: border-box; }
    body { margin: 24px; font-family: Arial, sans-serif; background: #e5e5e5; color: #111; }
    img { max-width: 100%; }
    .print-lab-preview { margin: 0 auto; background: #fffdf8; color: #111; border: 1px solid #ccc; padding: 24px; }
    .print-lab-tile-grid, .print-lab-split-grid, .print-lab-zine-spread { display: grid; gap: 10px; }
    .print-lab-page-preview { min-height: 720px; }
    .print-lab-split-panel { min-height: 280px; border: 1px solid #111; background-repeat: no-repeat; background-color: #fff; }
    .print-lab-split-panel__print-image { display: none; width: 100%; height: 100%; }
    .print-lab-zine-spread { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .print-lab-preview--canvas { width: 100%; max-width: none; padding: 0; background: #1f2937; overflow: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .print-lab-canvas-viewport { display: grid; place-items: center; min-height: 540px; padding: 20px; overflow: auto; background: #1f2937; }
    .print-lab-canvas-shell { position: relative; flex: 0 0 auto; margin: auto; }
    .print-lab-canvas-stage { position: relative; background-image: none !important; background-color: #fff; overflow: hidden; transform-origin: top left; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .print-lab-canvas-block { position: absolute; box-sizing: border-box; overflow: hidden; }
    .print-lab-canvas-block img { position: absolute; display: block; max-width: none; }
    .print-lab-canvas-text { width: 100%; height: 100%; overflow: hidden; white-space: pre-wrap; }
    .print-lab-canvas-block__label, .print-lab-canvas-resize { display: none; }
    @media print { body { margin: 0; background: #fff; } .print-lab-preview { border: 0; box-shadow: none; } .print-lab-preview--poster-split { padding: 0; } .print-lab-split-grid { display: block; } .print-lab-split-panel { width: 100%; height: 9.5in; break-after: page; background-image: none !important; } .print-lab-split-panel__print-image { display: block; object-fit: cover; } .print-lab-preview--canvas { background: #fff !important; overflow: visible !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; } .print-lab-canvas-viewport { display: block; min-height: 0; height: auto; padding: 0; overflow: visible; background: #fff !important; background-image: none !important; } .print-lab-canvas-shell { width: auto !important; height: auto !important; margin: 0 auto !important; } .print-lab-canvas-stage { margin: 0 auto; background-image: none !important; transform: none !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; } }
  </style>
</head>
<body>
${previewHtml}
</body>
</html>`
}
