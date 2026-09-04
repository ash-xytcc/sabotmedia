(() => {
  const PDFJS_URL = '/api/pdfjs?asset=main'
  const PDFJS_WORKER_URL = '/api/pdfjs?asset=worker'

  const highlights = {
    'govinfo-transcript:7': {
      label: 'WHITE HOUSE PROPOSAL',
      targets: [
        'the State Department should designate antifa its international arm as a foreign terrorist organization FTO',
      ],
    },
    'govinfo-transcript:24': {
      label: 'TRUMP RESPONSE',
      targets: [
        'Let s get it done',
        'take care of it',
        'Foreign terrorist organization',
      ],
    },
    'senate-shideler:5': {
      label: 'A/I NAMED',
      targets: [
        'hundreds of such websites hosted on Noblogs',
        'Autistici Inventati A I Collective',
        'provides websites emails digital encryption tools to Antifa and related left wing extremist groups while hiding personal data from law enforcement',
        'Crozier H 2025 October 16 Shadowy foreign tech group keeps police off Antifa s trail',
      ],
    },
    'ofac-notice:2': {
      label: 'OPERATIVE LEGAL HOOK',
      targets: [
        'AUTISTICI INVENTATI',
        'Organization Type Data processing hosting and related activities SDGT',
        'Designated pursuant to section 1 a iii C of E O 13224',
        'materially assisted sponsored or provided financial material or technological support for or goods or services to or in support of an act of terrorism',
      ],
    },
  }

  const style = document.createElement('style')
  style.textContent = `
    .pdf-highlight-reader {
      position: relative;
      min-height: 240px;
      overflow: auto;
      background: #cbc2b3;
      scrollbar-color: #a51d20 transparent;
      isolation: isolate;
    }
    .pdf-highlight-reader[aria-busy='true']::before {
      content: 'LOADING HIGHLIGHTED SOURCE…';
      position: absolute;
      z-index: 5;
      left: 12px;
      top: 12px;
      padding: 6px 8px;
      background: rgba(21,19,16,.88);
      color: #fffdf8;
      font: 900 9px/1 Arial, Helvetica, sans-serif;
      letter-spacing: .06em;
    }
    .pdf-highlight-page {
      position: relative;
      width: fit-content;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 0 1px rgba(21,19,16,.18), 0 8px 26px rgba(21,19,16,.12);
    }
    .pdf-highlight-page canvas { display: block; }
    .pdf-highlight-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .pdf-highlight-mark {
      position: absolute;
      background: rgba(242, 205, 72, .46);
      border: 1px solid rgba(165, 29, 32, .5);
      box-shadow: 0 0 0 1px rgba(255,255,255,.22) inset;
      border-radius: 2px;
      mix-blend-mode: multiply;
    }
    .pdf-highlight-tag {
      position: absolute;
      z-index: 3;
      transform: translateY(-100%);
      padding: 4px 6px 3px;
      background: #a51d20;
      color: #fff;
      font: 900 8px/1 Arial, Helvetica, sans-serif;
      letter-spacing: .07em;
      white-space: nowrap;
      box-shadow: 2px 2px 0 rgba(21,19,16,.22);
    }
    .pdf-highlight-note {
      margin: 0 !important;
      padding: 9px 12px !important;
      border-top: 1px solid #a89d8b;
      background: #f2eadc;
      color: #514a42;
      font: 800 10px/1.35 Arial, Helvetica, sans-serif !important;
      letter-spacing: .02em;
    }
    .pdf-highlight-note strong { color: #a51d20; }
    .evidence-doc__viewer.pdf-highlight-host { overflow: auto; }
    .document-peek .pdf-highlight-reader { height: clamp(540px, 66vh, 760px); }
    .document-peek iframe[data-highlight-fallback],
    .evidence-doc__viewer iframe[data-highlight-fallback] { display: none; }
    @media (max-width: 800px) {
      .document-peek .pdf-highlight-reader { height: 560px; }
    }
    @media (max-width: 560px) {
      .document-peek .pdf-highlight-reader { height: 480px; }
      .pdf-highlight-tag { font-size: 7px; }
    }
    @media print {
      .pdf-highlight-reader { overflow: visible !important; height: auto !important; max-height: none !important; }
      .pdf-highlight-note { color: #111 !important; background: white !important; }
    }
  `
  document.head.appendChild(style)

  function parseDocumentTarget(iframe) {
    try {
      const url = new URL(iframe.getAttribute('src') || '', window.location.href)
      if (!url.pathname.endsWith('/api/investigation-document')) return null
      const source = url.searchParams.get('source') || ''
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
      const page = Number(hash.get('page') || 1)
      if (!source || !Number.isFinite(page)) return null
      return { source, page, key: `${source}:${page}` }
    } catch {
      return null
    }
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  function buildSearchIndex(items) {
    let text = ''
    const itemAt = []
    let previousWasSpace = true

    items.forEach((item, itemIndex) => {
      const value = String(item?.str || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      for (const char of value) {
        if (/[a-z0-9]/.test(char)) {
          text += char
          itemAt.push(itemIndex)
          previousWasSpace = false
        } else if (!previousWasSpace) {
          text += ' '
          itemAt.push(itemIndex)
          previousWasSpace = true
        }
      }
      if (!previousWasSpace) {
        text += ' '
        itemAt.push(itemIndex)
        previousWasSpace = true
      }
    })

    return { text: text.trimEnd(), itemAt }
  }

  function matchedItemIndexes(items, targets) {
    const { text, itemAt } = buildSearchIndex(items)
    const indexes = new Set()

    targets.forEach((target) => {
      const needle = normalize(target)
      if (!needle) return
      let start = 0
      while (start < text.length) {
        const found = text.indexOf(needle, start)
        if (found === -1) break
        for (let pos = found; pos < found + needle.length; pos += 1) {
          const itemIndex = itemAt[pos]
          if (Number.isInteger(itemIndex)) indexes.add(itemIndex)
        }
        start = found + needle.length
      }
    })

    return indexes
  }

  function rectForItem(pdfjsLib, viewport, item) {
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
    const height = Math.max(3, Math.hypot(tx[2], tx[3]))
    const width = Math.max(3, Math.abs(Number(item.width || 0) * viewport.scale))
    return {
      left: tx[4],
      top: tx[5] - height,
      width,
      height,
    }
  }

  function mergeRects(rects) {
    const sorted = rects
      .filter((rect) => Number.isFinite(rect.left) && Number.isFinite(rect.top) && rect.width > 0 && rect.height > 0)
      .sort((a, b) => (Math.abs(a.top - b.top) < 3 ? a.left - b.left : a.top - b.top))

    const merged = []
    sorted.forEach((rect) => {
      const last = merged[merged.length - 1]
      if (!last) {
        merged.push({ ...rect })
        return
      }
      const sameLine = Math.abs(last.top - rect.top) <= Math.max(4, Math.min(last.height, rect.height) * .45)
      const gap = rect.left - (last.left + last.width)
      if (sameLine && gap <= Math.max(12, rect.height * .9) && gap > -Math.max(last.width, rect.width) * .35) {
        const right = Math.max(last.left + last.width, rect.left + rect.width)
        const top = Math.min(last.top, rect.top)
        const bottom = Math.max(last.top + last.height, rect.top + rect.height)
        last.left = Math.min(last.left, rect.left)
        last.top = top
        last.width = right - last.left
        last.height = bottom - top
      } else {
        merged.push({ ...rect })
      }
    })
    return merged
  }

  function addHighlights(pdfjsLib, viewport, textContent, layer, spec) {
    const indexes = matchedItemIndexes(textContent.items, spec.targets)
    const rects = mergeRects([...indexes].map((index) => rectForItem(pdfjsLib, viewport, textContent.items[index])))

    rects.forEach((rect) => {
      const mark = document.createElement('span')
      mark.className = 'pdf-highlight-mark'
      mark.style.left = `${Math.max(0, rect.left - 2)}px`
      mark.style.top = `${Math.max(0, rect.top - 1)}px`
      mark.style.width = `${rect.width + 4}px`
      mark.style.height = `${rect.height + 2}px`
      layer.appendChild(mark)
    })

    if (rects.length) {
      const first = rects[0]
      const tag = document.createElement('span')
      tag.className = 'pdf-highlight-tag'
      tag.textContent = `SABOT HIGHLIGHT · ${spec.label}`
      tag.style.left = `${Math.max(4, first.left)}px`
      tag.style.top = `${Math.max(18, first.top - 3)}px`
      layer.appendChild(tag)
    }

    return rects.length
  }

  async function renderHighlightedPage(pdfjsLib, iframe, target, spec) {
    const host = iframe.parentElement
    if (!host || host.querySelector('.pdf-highlight-reader')) return

    host.classList.add('pdf-highlight-host')
    const reader = document.createElement('div')
    reader.className = 'pdf-highlight-reader'
    reader.setAttribute('role', 'img')
    reader.setAttribute('aria-label', `${iframe.title || 'Source document'} with Sabot editorial highlights on page ${target.page}.`)
    reader.setAttribute('aria-busy', 'true')
    host.insertBefore(reader, iframe)

    try {
      const sourceUrl = `/api/investigation-document?source=${encodeURIComponent(target.source)}`
      const task = pdfjsLib.getDocument({ url: sourceUrl, disableAutoFetch: false, disableStream: false })
      const pdf = await task.promise
      const page = await pdf.getPage(target.page)
      const baseViewport = page.getViewport({ scale: 1 })
      const availableWidth = Math.max(280, host.clientWidth || iframe.clientWidth || 760)
      const cssScale = Math.min(1.75, Math.max(.75, (availableWidth - 4) / baseViewport.width))
      const viewport = page.getViewport({ scale: cssScale })
      const outputScale = Math.min(2, window.devicePixelRatio || 1)

      const pageEl = document.createElement('div')
      pageEl.className = 'pdf-highlight-page'
      pageEl.style.width = `${viewport.width}px`
      pageEl.style.height = `${viewport.height}px`

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      const overlay = document.createElement('div')
      overlay.className = 'pdf-highlight-layer'
      overlay.style.width = `${viewport.width}px`
      overlay.style.height = `${viewport.height}px`

      pageEl.append(canvas, overlay)
      reader.appendChild(pageEl)

      const context = canvas.getContext('2d', { alpha: false })
      const transform = outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0]
      await page.render({ canvasContext: context, transform, viewport }).promise

      const textContent = await page.getTextContent()
      const count = addHighlights(pdfjsLib, viewport, textContent, overlay, spec)

      const note = document.createElement('p')
      note.className = 'pdf-highlight-note'
      note.innerHTML = count
        ? '<strong>Editorial highlight:</strong> added by Sabot to point to the cited passage. The government source PDF is unchanged.'
        : '<strong>Highlight target not found:</strong> showing the correct source page without an overlay. The original PDF remains linked below.'
      reader.appendChild(note)

      iframe.dataset.highlightFallback = 'true'
      reader.setAttribute('aria-busy', 'false')
    } catch (error) {
      console.warn('Highlighted PDF reader failed; keeping browser PDF fallback.', target.key, error)
      reader.remove()
      host.classList.remove('pdf-highlight-host')
    }
  }

  async function init() {
    const frames = [...document.querySelectorAll('.evidence-doc__viewer iframe, .document-peek iframe')]
      .map((iframe) => ({ iframe, target: parseDocumentTarget(iframe) }))
      .filter(({ target }) => target && highlights[target.key])

    if (!frames.length) return

    try {
      const pdfjsLib = await import(PDFJS_URL)
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
      await Promise.all(frames.map(({ iframe, target }) => renderHighlightedPage(pdfjsLib, iframe, target, highlights[target.key])))
    } catch (error) {
      console.warn('PDF.js could not load; native PDF readers remain in place.', error)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
})()
