function getStage() {
  return document.querySelector('.print-lab-canvas-stage')
}

function selectedCanvasBlock() {
  return document.querySelector('.print-lab-canvas-block.is-selected.print-lab-canvas-block--image')
    || document.querySelector('.print-lab-canvas-block.is-selected:has(img)')
    || Array.from(document.querySelectorAll('.print-lab-canvas-block--image, .print-lab-canvas-block:has(img)')).pop()
}

function selectedCanvasImage() {
  return selectedCanvasBlock()?.querySelector('img') || null
}

function numberStyle(node, property, fallback = 0) {
  const inline = Number.parseFloat(node?.style?.[property] || '')
  if (Number.isFinite(inline)) return inline
  const computed = Number.parseFloat(window.getComputedStyle(node)?.[property] || '')
  return Number.isFinite(computed) ? computed : fallback
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

function colorDistance(data, index, color) {
  const dr = data[index] - color[0]
  const dg = data[index + 1] - color[1]
  const db = data[index + 2] - color[2]
  return Math.sqrt((dr * dr) + (dg * dg) + (db * db))
}

async function imageToCanvas(src, maxSide = 1100) {
  const image = await loadImage(src)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(naturalHeight * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas processing is unavailable in this browser.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return { canvas, context, width: canvas.width, height: canvas.height, scale }
}

function sampleEdgeColor(data, width, height) {
  const acc = [0, 0, 0]
  let count = 0
  const sample = (x, y) => {
    const index = ((y * width) + x) * 4
    if (data[index + 3] < 8) return
    acc[0] += data[index]
    acc[1] += data[index + 1]
    acc[2] += data[index + 2]
    count += 1
  }
  const stepX = Math.max(1, Math.floor(width / 32))
  const stepY = Math.max(1, Math.floor(height / 32))
  for (let x = 0; x < width; x += stepX) {
    sample(x, 0)
    sample(x, height - 1)
  }
  for (let y = 0; y < height; y += stepY) {
    sample(0, y)
    sample(width - 1, y)
  }
  if (!count) return [255, 255, 255]
  return acc.map((value) => value / count)
}

function makeBackgroundMask(data, width, height, tolerance = 54) {
  const edgeColor = sampleEdgeColor(data, width, height)
  const visited = new Uint8Array(width * height)
  const background = new Uint8Array(width * height)
  const queue = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const offset = (y * width) + x
    if (visited[offset]) return
    visited[offset] = 1
    queue.push(offset)
  }
  for (let x = 0; x < width; x += 1) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y)
    push(width - 1, y)
  }
  let cursor = 0
  while (cursor < queue.length) {
    const offset = queue[cursor]
    cursor += 1
    const index = offset * 4
    if (data[index + 3] < 12 || colorDistance(data, index, edgeColor) <= tolerance) {
      background[offset] = 1
      const x = offset % width
      const y = Math.floor(offset / width)
      push(x + 1, y)
      push(x - 1, y)
      push(x, y + 1)
      push(x, y - 1)
    }
  }
  return background
}

function removeBackgroundFromFrame(frame, width, height) {
  const data = frame.data
  const background = makeBackgroundMask(data, width, height, 58)
  for (let offset = 0; offset < background.length; offset += 1) {
    if (!background[offset]) continue
    data[(offset * 4) + 3] = 0
  }
  return frame
}

async function makeCutout(src) {
  const { canvas, context, width, height } = await imageToCanvas(src, 1600)
  const frame = context.getImageData(0, 0, width, height)
  context.putImageData(removeBackgroundFromFrame(frame, width, height), 0, 0)
  return canvas.toDataURL('image/png')
}

function buildForegroundMask(data, width, height) {
  const background = makeBackgroundMask(data, width, height, 60)
  const mask = new Uint8Array(width * height)
  for (let offset = 0; offset < mask.length; offset += 1) {
    const alpha = data[(offset * 4) + 3]
    if (!background[offset] && alpha > 20) mask[offset] = 1
  }
  return mask
}

function findComponents(mask, width, height) {
  const visited = new Uint8Array(mask.length)
  const components = []
  const minArea = Math.max(180, Math.floor(mask.length * 0.0012))
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue
    const stack = [start]
    const pixels = []
    visited[start] = 1
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    while (stack.length) {
      const offset = stack.pop()
      pixels.push(offset)
      const x = offset % width
      const y = Math.floor(offset / width)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      const neighbors = [offset - 1, offset + 1, offset - width, offset + width]
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
        const nx = next % width
        if ((next === offset - 1 && nx === width - 1) || (next === offset + 1 && nx === 0)) continue
        visited[next] = 1
        stack.push(next)
      }
    }
    if (pixels.length >= minArea) {
      components.push({ pixels, x: minX, y: minY, width: (maxX - minX) + 1, height: (maxY - minY) + 1, area: pixels.length })
    }
  }
  return components
    .filter((component) => component.width > 8 && component.height > 8)
    .sort((a, b) => b.area - a.area)
    .slice(0, 18)
}

function componentToPng(component, sourceData, sourceWidth) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, component.width)
  canvas.height = Math.max(1, component.height)
  const context = canvas.getContext('2d')
  const frame = context.createImageData(canvas.width, canvas.height)
  for (const offset of component.pixels) {
    const x = offset % sourceWidth
    const y = Math.floor(offset / sourceWidth)
    const target = (((y - component.y) * canvas.width) + (x - component.x)) * 4
    const source = offset * 4
    frame.data[target] = sourceData[source]
    frame.data[target + 1] = sourceData[source + 1]
    frame.data[target + 2] = sourceData[source + 2]
    frame.data[target + 3] = sourceData[source + 3]
  }
  context.putImageData(frame, 0, 0)
  return canvas.toDataURL('image/png')
}

async function extractObjects(src) {
  const { context, width, height } = await imageToCanvas(src, 1000)
  const frame = context.getImageData(0, 0, width, height)
  const sourceData = frame.data
  const mask = buildForegroundMask(sourceData, width, height)
  return findComponents(mask, width, height).map((component, index) => ({
    id: `object-${Date.now()}-${index}`,
    src: componentToPng(component, sourceData, width),
    x: component.x,
    y: component.y,
    width: component.width,
    height: component.height,
    sourceWidth: width,
    sourceHeight: height,
    area: component.area,
  }))
}

function makeMovableBlock({ src, left, top, width, height, label }) {
  const stage = getStage()
  const block = document.createElement('div')
  block.className = 'print-lab-canvas-block print-lab-canvas-block--image print-lab-canvas-block--magic-layer is-selected'
  block.style.position = 'absolute'
  block.style.left = `${left}px`
  block.style.top = `${top}px`
  block.style.width = `${width}px`
  block.style.height = `${height}px`
  block.style.overflow = 'hidden'
  block.style.opacity = '1'
  block.style.zIndex = '10'
  const image = document.createElement('img')
  image.src = src
  image.alt = ''
  image.draggable = false
  image.style.width = '100%'
  image.style.height = '100%'
  image.style.objectFit = 'contain'
  image.style.pointerEvents = 'none'
  const tag = document.createElement('span')
  tag.className = 'print-lab-canvas-block__label'
  tag.textContent = label
  block.appendChild(image)
  block.appendChild(tag)
  block.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    document.querySelectorAll('.print-lab-canvas-block.is-selected').forEach((node) => node.classList.remove('is-selected'))
    block.classList.add('is-selected')
    const startX = event.clientX
    const startY = event.clientY
    const startLeft = numberStyle(block, 'left')
    const startTop = numberStyle(block, 'top')
    block.setPointerCapture?.(event.pointerId)
    const move = (moveEvent) => {
      block.style.left = `${startLeft + (moveEvent.clientX - startX)}px`
      block.style.top = `${startTop + (moveEvent.clientY - startY)}px`
    }
    const stop = () => {
      block.removeEventListener('pointermove', move)
      block.removeEventListener('pointerup', stop)
      block.removeEventListener('pointercancel', stop)
    }
    block.addEventListener('pointermove', move)
    block.addEventListener('pointerup', stop)
    block.addEventListener('pointercancel', stop)
  })
  stage?.appendChild(block)
  return block
}

async function runMagicSplit() {
  const block = selectedCanvasBlock()
  const image = block?.querySelector('img')
  if (!block || !image?.src) {
    window.alert('Add or select an image on the canvas first.')
    return
  }
  const objects = await extractObjects(image.src)
  if (objects.length < 2) {
    window.alert('Magic Split could not find separate objects. Try an image with clearer separation from the background.')
    return
  }
  const left = numberStyle(block, 'left')
  const top = numberStyle(block, 'top')
  const width = Math.max(1, numberStyle(block, 'width', block.offsetWidth || 1))
  const height = Math.max(1, numberStyle(block, 'height', block.offsetHeight || 1))
  block.style.opacity = '0.18'
  block.classList.remove('is-selected')
  objects.forEach((object, index) => {
    makeMovableBlock({
      src: object.src,
      left: left + ((object.x / object.sourceWidth) * width),
      top: top + ((object.y / object.sourceHeight) * height),
      width: Math.max(24, (object.width / object.sourceWidth) * width),
      height: Math.max(24, (object.height / object.sourceHeight) * height),
      label: `Layer ${index + 1}`,
    })
  })
  window.alert(`Magic Split created ${objects.length} movable layer${objects.length === 1 ? '' : 's'}.`)
}

async function runBgRemove() {
  const image = selectedCanvasImage()
  if (!image?.src) {
    window.alert('Add or select an image on the canvas first.')
    return
  }
  try {
    const src = await makeCutout(image.src)
    window.dispatchEvent(new CustomEvent('printlab:apply-selected-image-src', { detail: { src, title: 'Background Removed' } }))
    image.src = src
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
  tools.prepend(makeToolButton('BG Remove', 'button print-lab-smart-tool-button', runBgRemove))
  tools.prepend(makeToolButton('Magic Split Objects', 'button button--primary print-lab-smart-tool-button', runMagicSplit))
}

function wirePrintlabSmartTools() {
  if (typeof document === 'undefined' || window.__printlabSmartToolWiring) return
  window.__printlabSmartToolWiring = true
  installCanvasButtons()
  const observer = new MutationObserver(installCanvasButtons)
  observer.observe(document.body, { childList: true, subtree: true })
}

wirePrintlabSmartTools()
