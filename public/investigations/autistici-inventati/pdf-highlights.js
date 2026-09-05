(() => {
  const PDFJS_URL = '/vendor/pdfjs/pdf.min.mjs'
  const PDFJS_WORKER_URL = '/vendor/pdfjs/pdf.worker.min.mjs'

  const highlights = {
    'govinfo-transcript:7': {
      label: 'WHITE HOUSE PROPOSAL',
      targets: [
        'the State Department should designate antifa its international arm as a foreign terrorist organization FTO',
      ],
    },
    'govinfo-transcript:24': {
      label: 'TRUMP RESPONSE',
      targets: ['Let s get it done', 'take care of it', 'Foreign terrorist organization'],
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
    /* Keep the document gallery usable even if the auxiliary evidence stylesheet
       fails to load. These used to collapse back to near-default iframe sizing. */
    .evidence-gallery { padding: 70px 0 78px; background: #e8dfd0; }
    .evidence-gallery__grid { display: grid; grid-template-columns: 1fr; gap: 28px; width: 100%; }
    .evidence-doc { width: 100%; min-width: 0; border: 1px solid #a89d8b; background: #fffdf8; box-shadow: 8px 8px 0 rgba(21,19,16,.08); }
    .evidence-doc__meta { display: grid; gap: 5px; padding: 14px 15px; border-bottom: 1px solid #a89d8b; }
    .evidence-doc__meta span { color: #a51d20; font: 900 9px/1 Arial, Helvetica, sans-serif; letter-spacing: .1em; }
    .evidence-doc__meta strong { font: 900 20px/1 Arial, Helvetica, sans-serif; text-transform: uppercase; }
    .evidence-doc__viewer { position: relative; width: 100%; height: clamp(720px, 80vh, 1040px); min-height: 720px; overflow: auto; background: #d3cbbc; border-bottom: 1px solid #a89d8b; }
    .evidence-doc__viewer iframe { display: block; width: 100%; height: 100%; min-height: 720px; border: 0; background: #fff; }
    .evidence-doc > p { margin: 0; padding: 15px 16px 8px; font-size: 14px; line-height: 1.5; }
    .evidence-doc__actions { display: flex; gap: 12px; align-items: center; padding: 8px 16px 16px; }
    .evidence-doc__actions button, .evidence-doc__actions a { border: 0; background: transparent; color: #6e1115; padding: 0; cursor: pointer; font: 900 10px/1.2 Arial, Helvetica, sans-serif; text-transform: uppercase; text-decoration: underline; text-underline-offset: 3px; }

    .pdf-highlight-reader { position: relative; width: 100%; height: 100%; min-height: 720px; overflow: auto; background: #cbc2b3; scrollbar-color: #a51d20 transparent; isolation: isolate; }
    .pdf-highlight-reader[aria-busy='true']::before { content: 'LOADING HIGHLIGHTED SOURCE…'; position: absolute; z-index: 5; left: 12px; top: 12px; padding: 6px 8px; background: rgba(21,19,16,.88); color: #fffdf8; font: 900 9px/1 Arial, Helvetica, sans-serif; letter-spacing: .06em; }
    .pdf-highlight-page { position: relative; width: fit-content; margin: 0 auto; background: white; box-shadow: 0 0 0 1px rgba(21,19,16,.18), 0 8px 26px rgba(21,19,16,.12); }
    .pdf-highlight-page canvas { display: block; }
    .pdf-highlight-layer { position: absolute; inset: 0; pointer-events: none; }
    .pdf-highlight-mark { position: absolute; background: rgba(242,205,72,.46); border: 1px solid rgba(165,29,32,.5); box-shadow: 0 0 0 1px rgba(255,255,255,.22) inset; border-radius: 2px; mix-blend-mode: multiply; }
    .pdf-highlight-tag { position: absolute; z-index: 3; transform: translateY(-100%); padding: 4px 6px 3px; background: #a51d20; color: #fff; font: 900 8px/1 Arial, Helvetica, sans-serif; letter-spacing: .07em; white-space: nowrap; box-shadow: 2px 2px 0 rgba(21,19,16,.22); }
    .pdf-highlight-note { margin: 0 !important; padding: 9px 12px !important; border-top: 1px solid #a89d8b; background: #f2eadc; color: #514a42; font: 800 10px/1.35 Arial, Helvetica, sans-serif !important; letter-spacing: .02em; }
    .pdf-highlight-note strong { color: #a51d20; }
    .evidence-doc__viewer.pdf-highlight-host { overflow: auto; }
    .document-peek .pdf-highlight-reader { height: clamp(620px, 74vh, 900px); min-height: 620px; }
    .document-peek iframe[data-highlight-fallback], .evidence-doc__viewer iframe[data-highlight-fallback] { display: none; }

    .investigation-live-update { margin: 0; padding: 48px 0; border-top: 4px solid #a51d20; border-bottom: 1px solid #b7ad9c; background: #f3dfda; }
    .investigation-live-update__grid { display: grid; grid-template-columns: minmax(220px,.65fr) minmax(0,1.6fr); gap: 44px; align-items: start; }
    .investigation-live-update .eyebrow { color: #a51d20; }
    .investigation-live-update h2 { margin: 0; font: 900 clamp(31px,4vw,49px)/.98 Arial, Helvetica, sans-serif; letter-spacing: -.035em; text-transform: uppercase; }
    .investigation-live-update__copy { font-size: 17px; line-height: 1.6; }
    .investigation-live-update__copy p { margin: 0 0 15px; }
    .investigation-live-update__copy blockquote { margin: 18px 0; padding: 16px 0 16px 20px; border-left: 6px solid #a51d20; }
    .investigation-live-update__copy blockquote p { margin: 0; font: 900 21px/1.25 Arial, Helvetica, sans-serif; }
    .investigation-live-update__actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 18px; }
    .investigation-live-update__actions a { color: #6e1115; font: 900 10px/1.2 Arial, Helvetica, sans-serif; text-transform: uppercase; text-underline-offset: 3px; }
    .investigation-live-update__note { padding: 12px 14px; border: 1px solid #c99d91; background: rgba(255,255,255,.45); font-size: 13px; }
    .investigation-source-trail { display: grid; gap: 10px; margin: 20px 0 24px; }
    .investigation-source-trail article { padding: 14px 16px; border: 1px solid #c99d91; background: rgba(255,255,255,.58); }
    .investigation-source-trail time { display: block; margin-bottom: 5px; color: #a51d20; font: 900 9px/1 Arial, Helvetica, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
    .investigation-source-trail h3 { margin: 0 0 7px; font: 900 18px/1.05 Arial, Helvetica, sans-serif; text-transform: uppercase; }
    .investigation-source-trail p { margin: 0 0 8px; font-size: 14px; line-height: 1.5; }
    .investigation-source-trail a { color: #6e1115; font: 900 10px/1.2 Arial, Helvetica, sans-serif; text-transform: uppercase; text-underline-offset: 3px; }

    @media (max-width: 800px) {
      .evidence-doc__viewer, .evidence-doc__viewer iframe, .pdf-highlight-reader { height: 680px; min-height: 680px; }
      .document-peek .pdf-highlight-reader { height: 620px; min-height: 620px; }
      .investigation-live-update__grid { grid-template-columns: 1fr; gap: 20px; }
    }
    @media (max-width: 560px) {
      .evidence-doc__viewer, .evidence-doc__viewer iframe, .pdf-highlight-reader { height: 540px; min-height: 540px; }
      .document-peek .pdf-highlight-reader { height: 520px; min-height: 520px; }
      .pdf-highlight-tag { font-size: 7px; }
    }
    @media print {
      .pdf-highlight-reader { overflow: visible !important; height: auto !important; min-height: 0 !important; max-height: none !important; }
      .pdf-highlight-note { color: #111 !important; background: white !important; }
      .investigation-live-update { break-inside: avoid; }
    }
  `
  document.head.appendChild(style)

  function addSept5Update() {
    if (document.getElementById('update-2026-09-05-ngo-state')) return

    const quickRead = document.querySelector('.quick-read')
    if (!quickRead) return

    const update = document.createElement('section')
    update.className = 'investigation-live-update'
    update.id = 'update-2026-09-05-ngo-state'
    update.setAttribute('aria-labelledby', 'update-2026-09-05-title')
    update.innerHTML = `
      <div class="wrap investigation-live-update__grid">
        <div>
          <p class="eyebrow">POST-PUBLICATION TRAIL · AUG. 28–SEPT. 5, 2026</p>
          <h2 id="update-2026-09-05-title">They were already reading Sabot. Then they named it and tagged State.</h2>
        </div>
        <div class="investigation-live-update__copy">
          <p>The public trail now reaches back before the Sept. 5 posts. Kyle Shideler and Hudson Crozier were already using, quoting or linking Sabot’s A/I reporting before Shideler and Andy Ngo publicly characterized Sabot itself as part of an A/I support campaign.</p>
          <div class="investigation-source-trail" aria-label="Post-publication source trail involving Sabot Media">
            <article>
              <time>AUGUST 28 · KYLE SHIDELER / THE FEDERALIST</time>
              <h3>Shideler uses a Sabot campaign graphic without naming Sabot in the surrounding text.</h3>
              <p>The Federalist article embeds the “BUILT FOR / TARGETED NOW” Plan R* graphic matching Sabot’s campaign material and describes it only as a recent post circulating among “Antifa and anarchist accounts.” The article then paraphrases the same “world around it” analysis and reproduces the substance of Sabot’s sanctions-law caution list.</p>
              <p>The limited claim here is sourcing and sequence: the article visibly uses the graphic and corresponding material. It does not establish where Shideler first encountered it or why Sabot was not named.</p>
              <a href="https://thefederalist.com/2026/08/28/antifa-networks-panic-after-trump-administration-just-sanctioned-their-servers/" target="_blank" rel="noreferrer">Open Federalist article ↗</a>
            </article>
            <article>
              <time>AUGUST 30–SEPTEMBER 1 · HUDSON CROZIER</time>
              <h3>Crozier explicitly quotes and links Sabot, then links Sabot again on X.</h3>
              <p>In an Aug. 30 Washington Examiner investigation, Crozier identifies the NoBlogs website “Sabot Media,” links an archived copy of Sabot’s article and quotes its explanation of Plan R* and the sanctions regime. A Sept. 1 X post supplied to Sabot also links the site; X blocked automated retrieval of that post at preservation time, so the post text is not reconstructed here.</p>
              <p>This matters because Crozier is already part of the documented source lineage in this investigation: his October 2025 reporting quoted Shideler, and Shideler later cited Crozier’s report in Senate testimony naming A/I and NoBlogs.</p>
              <a href="https://www.washingtonexaminer.com/news/investigations/4702739/leftist-network-terrorists-plain-sight/" target="_blank" rel="noreferrer">Open Crozier article ↗</a>
              <span aria-hidden="true"> · </span><a href="https://x.com/Hudson_Crozier/status/2094825698288390355" target="_blank" rel="noreferrer">Open Sept. 1 X post ↗</a>
            </article>
            <article>
              <time>SEPTEMBER 5 · ANDY NGO / KYLE SHIDELER</time>
              <h3>Ngo turns the “support” allegation toward Sabot and tags State.</h3>
              <p>Andy Ngo publicly tagged the U.S. State Department and accused Sabot Media of “providing support” to Autistici/Inventati, calling Sabot A/I’s “U.S. propaganda wing.” The post quote-posted Shideler, who described Sabot as a Washington-based anarchist and Antifa collective “leading the media campaign in support of” A/I.</p>
              <blockquote><p>“.@StateDept, here is a U.S.-based group providing support to banned international terrorist entity A/I. Sabot media is functioning as A/I’s U.S. propaganda wing.”</p></blockquote>
              <a href="https://x.com/MrAndyNgo/status/2095928475731325130" target="_blank" rel="noreferrer">Open Ngo post on X ↗</a>
            </article>
          </div>
          <p>This sequence is relevant to the reporting trail because it documents a progression from consuming and reproducing Sabot’s reporting, to naming Sabot as an actor in the A/I controversy, to directing an allegation about Sabot toward an executive agency.</p>
          <p class="investigation-live-update__note"><strong>What this does not establish:</strong> none of these publications or posts proves coordination among the people involved, and Ngo tagging the State Department is not evidence that State, Treasury, DOJ or any other agency has opened an inquiry or taken action against Sabot Media.</p>
          <div class="investigation-live-update__actions">
            <a href="#source-library">Go to source library ↓</a>
          </div>
        </div>
      </div>`
    quickRead.insertAdjacentElement('beforebegin', update)

    const updated = document.querySelector('.intro .updated')
    if (updated) updated.textContent = 'Published as an open investigation · Last updated September 5, 2026'

    const nav = document.querySelector('.story-nav')
    if (nav && !nav.querySelector('a[href="#update-2026-09-05-ngo-state"]')) {
      const link = document.createElement('a')
      link.href = '#update-2026-09-05-ngo-state'
      link.textContent = 'NEW · Sabot enters the source trail'
      nav.insertBefore(link, nav.querySelector('a') || null)
    }

    const updates = document.querySelector('.updates ul, .updates ol, #updates ul, #updates ol')
    if (updates && !updates.querySelector('[data-update="2026-09-05-ngo-state"]')) {
      const item = document.createElement('li')
      item.dataset.update = '2026-09-05-ngo-state'
      item.innerHTML = '<strong>September 5, 2026:</strong> Added the Aug. 28–Sept. 5 source trail showing Shideler’s use of Sabot material, Crozier’s direct link and quotation of Sabot, and Ngo’s later allegation directed to the State Department.'
      updates.prepend(item)
    }
  }

  function parseDocumentTarget(iframe) {
    try {
      const url = new URL(iframe.getAttribute('src') || '', window.location.href)
      const sourceByFilename = {
        'white-house-antifa-roundtable-transcript.pdf': 'govinfo-transcript',
        'shideler-senate-testimony.pdf': 'senate-shideler',
        'ofac-2026-17724.pdf': 'ofac-notice',
      }
      const filename = url.pathname.split('/').pop() || ''
      const source = sourceByFilename[filename] || url.searchParams.get('source') || ''
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
      const page = Number(hash.get('page') || 1)
      if (!source || !Number.isFinite(page)) return null
      return { source, page, key: `${source}:${page}`, url: `${url.pathname}${url.search}` }
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
    return { left: tx[4], top: tx[5] - height, width, height }
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
      const task = pdfjsLib.getDocument({ url: target.url, disableAutoFetch: false, disableStream: false })
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
    addSept5Update()

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
