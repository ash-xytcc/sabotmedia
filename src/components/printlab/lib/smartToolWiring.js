function dispatchSplit() {
  window.dispatchEvent(new CustomEvent('printlab:split-selected-image', { detail: { rows: 2, columns: 2 } }))
}

function selectedCanvasImage() {
  return document.querySelector('.print-lab-canvas-block.is-selected img') || Array.from(document.querySelectorAll('.print-lab-canvas-block img')).pop()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load the selected image.'))
    if (/^https?:/i.test(src)) image.crossOrigin = 'anonymous'
    image.src = src
  })
}

function colorDiff(data, index, sample) {
  const dr = data[index] - sample[0]
  const dg = data[index + 1] - sample[1]
  const db = data[index + 2] - sample[2]
  return Math.sqrt((dr * dr) + (dg * dg) + (db * db))
}

async function makeCutout(src) {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  const width = image.naturalWidth || image.width || 1
  const height = image.naturalHeight || image.height || 1
  const scale = Math.min(1, 1600 / Math.max(width, height))
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas processing is unavailable in this browser.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const frame = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = frame.data
  const last = ((canvas.width * canvas.height) - 1) * 4
  const sample = [
    (data[0] + data[last]) / 2,
    (data[1] + data[last + 1]) / 2,
    (data[2] + data[last + 2]) / 2,
  ]
  for (let index = 0; index < data.length; index += 4) {
    const diff = colorDiff(data, index, sample)
    if (diff < 54) data[index + 3] = 0
    else if (diff < 82) data[index + 3] = Math.min(data[index + 3], Math.round(((diff - 54) / 28) * 255))
  }
  context.putImageData(frame, 0, 0)
  return canvas.toDataURL('image/png')
}

async function dispatchCutout() {
  const image = selectedCanvasImage()
  if (!image?.src) {
    window.alert('Add or select an image on the canvas first.')
    return
  }
  try {
    const src = await makeCutout(image.src)
    window.dispatchEvent(new CustomEvent('printlab:apply-selected-image-src', {
      detail: { src, title: 'Background Removed' },
    }))
  } catch (err) {
    window.alert(`${err?.message || 'Background remover failed.'} Try saving the image to the Media Library first.`)
  }
}

function makeToolButton(label, className, onClick) {
  const button = document.createElement('button')
  button.className = className
  button.type = 'button'
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

function installCanvasButtons() {
  const tools = document.querySelector('.print-lab-canvas-tools')
  if (!tools || tools.querySelector('.print-lab-smart-tool-button')) return
  const splitButton = makeToolButton('Magic Split Selected Image', 'button button--primary print-lab-smart-tool-button', dispatchSplit)
  const cutoutButton = makeToolButton('BG Remover', 'button print-lab-smart-tool-button', dispatchCutout)
  tools.prepend(cutoutButton)
  tools.prepend(splitButton)
}

function wirePrintlabSmartTools() {
  if (typeof document === 'undefined' || window.__printlabSmartToolWiring) return
  window.__printlabSmartToolWiring = true
  installCanvasButtons()
  const observer = new MutationObserver(installCanvasButtons)
  observer.observe(document.body, { childList: true, subtree: true })
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button')
    if (!button || !/use in design/i.test(button.textContent || '')) return
    const card = button.closest('.print-lab-asset-card')
    const title = String(card?.querySelector('strong')?.textContent || card?.textContent || '').toLowerCase()
    if (!title.includes('magic splitter') && !title.includes('background remover')) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
    if (title.includes('magic splitter')) dispatchSplit()
    else dispatchCutout()
  }, true)
}

wirePrintlabSmartTools()
