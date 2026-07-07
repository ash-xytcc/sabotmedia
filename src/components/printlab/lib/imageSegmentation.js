function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getPixelIndex(width, x, y) {
  return ((y * width) + x) * 4
}

function colorDistance(data, index, color) {
  const dr = data[index] - color[0]
  const dg = data[index + 1] - color[1]
  const db = data[index + 2] - color[2]
  return Math.sqrt((dr * dr) + (dg * dg) + (db * db))
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function estimateBackgroundColor(data, width, height) {
  const samples = []
  const samplePoint = (x, y) => {
    const index = getPixelIndex(width, clampValue(Math.round(x), 0, width - 1), clampValue(Math.round(y), 0, height - 1))
    samples.push([data[index], data[index + 1], data[index + 2]])
  }
  const inset = Math.max(1, Math.round(Math.min(width, height) * 0.03))
  const step = Math.max(1, Math.floor(Math.max(width, height) / 36))
  for (let x = 0; x < width; x += step) {
    samplePoint(x, 0)
    samplePoint(x, height - 1)
    samplePoint(x, inset)
    samplePoint(x, height - inset - 1)
  }
  for (let y = 0; y < height; y += step) {
    samplePoint(0, y)
    samplePoint(width - 1, y)
    samplePoint(inset, y)
    samplePoint(width - inset - 1, y)
  }

  const clusters = []
  samples.forEach((sample) => {
    const cluster = clusters.find((item) => {
      const dr = sample[0] - item.color[0]
      const dg = sample[1] - item.color[1]
      const db = sample[2] - item.color[2]
      return Math.sqrt((dr * dr) + (dg * dg) + (db * db)) < 34
    })
    if (!cluster) {
      clusters.push({ color: sample.slice(), samples: [sample] })
      return
    }
    cluster.samples.push(sample)
    cluster.color = [
      median(cluster.samples.map((item) => item[0])),
      median(cluster.samples.map((item) => item[1])),
      median(cluster.samples.map((item) => item[2])),
    ]
  })

  const dominant = clusters.sort((a, b) => b.samples.length - a.samples.length)[0]
  return dominant?.color || [
    median(samples.map((sample) => sample[0])),
    median(samples.map((sample) => sample[1])),
    median(samples.map((sample) => sample[2])),
  ]
}

function buildBackgroundMask(frame, options = {}) {
  const { width, height, data } = frame
  const tolerance = Number(options.colorTolerance ?? options.edgeTolerance ?? 58)
  const looseTolerance = tolerance + 22
  const backgroundColor = estimateBackgroundColor(data, width, height)
  const total = width * height
  const backgroundMask = new Uint8Array(total)
  const visited = new Uint8Array(total)
  const queue = []

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const position = (y * width) + x
    if (visited[position]) return
    visited[position] = 1
    queue.push(position)
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0)
    enqueue(x, height - 1)
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y)
    enqueue(width - 1, y)
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const position = queue[cursor]
    const x = position % width
    const y = Math.floor(position / width)
    const index = position * 4
    const alpha = data[index + 3]
    const distance = colorDistance(data, index, backgroundColor)
    if (alpha < 12 || distance <= looseTolerance) {
      backgroundMask[position] = 1
      enqueue(x + 1, y)
      enqueue(x - 1, y)
      enqueue(x, y + 1)
      enqueue(x, y - 1)
    }
  }

  return { backgroundMask, backgroundColor, tolerance }
}

function makeForegroundMask(frame, backgroundMask, backgroundColor, tolerance) {
  const { width, height, data } = frame
  const foregroundMask = new Uint8Array(width * height)
  for (let position = 0; position < foregroundMask.length; position += 1) {
    const index = position * 4
    if (data[index + 3] < 24 || backgroundMask[position]) continue
    const distance = colorDistance(data, index, backgroundColor)
    if (distance > tolerance) foregroundMask[position] = 1
  }
  return foregroundMask
}

function getMaskBounds(mask, width, height) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let area = 0
  for (let position = 0; position < mask.length; position += 1) {
    if (!mask[position]) continue
    const x = position % width
    const y = Math.floor(position / width)
    area += 1
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  if (!area) return { x: 0, y: 0, width: 0, height: 0, area: 0 }
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    area,
  }
}

function featherAlpha(data, width, height, backgroundMask, featherPixels = 1) {
  if (!featherPixels) return
  const originalAlpha = new Uint8ClampedArray(width * height)
  for (let position = 0; position < originalAlpha.length; position += 1) {
    originalAlpha[position] = data[(position * 4) + 3]
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const position = (y * width) + x
      if (backgroundMask[position] || !originalAlpha[position]) continue
      let touchesBackground = false
      for (let dy = -featherPixels; dy <= featherPixels && !touchesBackground; dy += 1) {
        for (let dx = -featherPixels; dx <= featherPixels; dx += 1) {
          if (!dx && !dy) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || backgroundMask[(ny * width) + nx]) {
            touchesBackground = true
            break
          }
        }
      }
      if (touchesBackground) data[(position * 4) + 3] = Math.min(originalAlpha[position], 210)
    }
  }
}

function connectedComponents(mask, width, height, options = {}) {
  const visited = new Uint8Array(mask.length)
  const minArea = Math.max(12, Math.round(mask.length * Number(options.minAreaRatio ?? 0.003)))
  const components = []
  const queue = []

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue
    let area = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    queue.length = 0
    visited[start] = 1
    queue.push(start)

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const position = queue[cursor]
      const x = position % width
      const y = Math.floor(position / width)
      area += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      const neighbors = [position - 1, position + 1, position - width, position + width]
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
        const nx = next % width
        if ((next === position - 1 && nx !== x - 1) || (next === position + 1 && nx !== x + 1)) continue
        visited[next] = 1
        queue.push(next)
      }
    }

    if (area >= minArea) components.push({ area, minX, minY, maxX, maxY })
  }

  return components
}

function mergeNearbyComponents(components, mergeDistance = 10) {
  const merged = []
  components.forEach((component) => {
    const target = merged.find((item) => !(
      component.minX > item.maxX + mergeDistance ||
      component.maxX < item.minX - mergeDistance ||
      component.minY > item.maxY + mergeDistance ||
      component.maxY < item.minY - mergeDistance
    ))
    if (!target) {
      merged.push({ ...component })
      return
    }
    target.area += component.area
    target.minX = Math.min(target.minX, component.minX)
    target.minY = Math.min(target.minY, component.minY)
    target.maxX = Math.max(target.maxX, component.maxX)
    target.maxY = Math.max(target.maxY, component.maxY)
  })
  return merged
}

export function loadImageForCanvas(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('No image source was provided.'))
      return
    }
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load the selected image for canvas processing.'))
    if (/^https?:/i.test(src)) image.crossOrigin = 'anonymous'
    image.src = src
  })
}

export async function imageToCanvas(src, maxSide = 1600) {
  const image = await loadImageForCanvas(src)
  const sourceWidth = image.naturalWidth || image.width || 1
  const sourceHeight = image.naturalHeight || image.height || 1
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas image processing is unavailable in this browser.')
  context.drawImage(image, 0, 0, width, height)
  return { canvas, context, width, height, scale }
}

export async function removeBackgroundFromImage(src, options = {}) {
  const { canvas, context, width, height, scale } = await imageToCanvas(src, options.maxSide || 1600)
  const frame = context.getImageData(0, 0, width, height)
  const { backgroundMask, backgroundColor, tolerance } = buildBackgroundMask(frame, options)
  const foregroundMask = makeForegroundMask(frame, backgroundMask, backgroundColor, tolerance)
  const bounds = getMaskBounds(foregroundMask, width, height)
  const foregroundRatio = bounds.area / Math.max(1, width * height)
  const minForegroundRatio = Number(options.minForegroundRatio ?? 0.01)
  const maxForegroundRatio = Number(options.maxForegroundRatio ?? 0.92)
  if (foregroundRatio < minForegroundRatio) {
    throw new Error('Background removal could not find a clear foreground subject.')
  }
  if (foregroundRatio > maxForegroundRatio) {
    throw new Error('Background removal could not identify a separable background.')
  }
  const data = frame.data
  for (let position = 0; position < backgroundMask.length; position += 1) {
    const index = position * 4
    if (backgroundMask[position]) {
      data[index + 3] = 0
      continue
    }
    const distance = colorDistance(data, index, backgroundColor)
    if (distance < tolerance) {
      data[index + 3] = Math.min(data[index + 3], Math.round((distance / tolerance) * 255))
    }
  }
  featherAlpha(data, width, height, backgroundMask, Number(options.featherPixels ?? 1))
  context.putImageData(frame, 0, 0)
  return {
    src: canvas.toDataURL('image/png'),
    bounds: {
      x: bounds.x / scale,
      y: bounds.y / scale,
      width: bounds.width / scale,
      height: bounds.height / scale,
    },
    foregroundRatio,
  }
}

export async function extractImageObjects(src, options = {}) {
  const { canvas, context, width, height, scale } = await imageToCanvas(src, options.maxSide || 1600)
  const frame = context.getImageData(0, 0, width, height)
  const { backgroundMask, backgroundColor, tolerance } = buildBackgroundMask(frame, options)
  const foregroundMask = makeForegroundMask(frame, backgroundMask, backgroundColor, tolerance)
  const components = mergeNearbyComponents(
    connectedComponents(foregroundMask, width, height, options),
    Number(options.mergeDistance ?? Math.round(Math.min(width, height) * 0.015)),
  )
    .sort((a, b) => b.area - a.area)
    .slice(0, Number(options.maxObjects ?? 24))

  // TODO: This boundary is intentionally clean so a later SAM/ONNX/server-side
  // segmentation backend can replace only the mask/component phase while preserving
  // Printlab's normal top-level canvas block integration.
  const objects = components.map((component, index) => {
    const padding = Math.max(2, Math.round(Math.min(width, height) * 0.006))
    const minX = clampValue(component.minX - padding, 0, width - 1)
    const minY = clampValue(component.minY - padding, 0, height - 1)
    const maxX = clampValue(component.maxX + padding, 0, width - 1)
    const maxY = clampValue(component.maxY + padding, 0, height - 1)
    const cropWidth = Math.max(1, maxX - minX + 1)
    const cropHeight = Math.max(1, maxY - minY + 1)
    const objectCanvas = document.createElement('canvas')
    objectCanvas.width = cropWidth
    objectCanvas.height = cropHeight
    const objectContext = objectCanvas.getContext('2d', { willReadFrequently: true })
    if (!objectContext) throw new Error('Canvas image processing is unavailable in this browser.')
    const objectFrame = objectContext.createImageData(cropWidth, cropHeight)

    for (let y = 0; y < cropHeight; y += 1) {
      for (let x = 0; x < cropWidth; x += 1) {
        const sourceX = minX + x
        const sourceY = minY + y
        const sourcePosition = (sourceY * width) + sourceX
        if (!foregroundMask[sourcePosition]) continue
        const sourceIndex = sourcePosition * 4
        const targetIndex = ((y * cropWidth) + x) * 4
        objectFrame.data[targetIndex] = frame.data[sourceIndex]
        objectFrame.data[targetIndex + 1] = frame.data[sourceIndex + 1]
        objectFrame.data[targetIndex + 2] = frame.data[sourceIndex + 2]
        objectFrame.data[targetIndex + 3] = frame.data[sourceIndex + 3]
      }
    }

    objectContext.putImageData(objectFrame, 0, 0)
    return {
      id: `object-${Date.now()}-${index}`,
      src: objectCanvas.toDataURL('image/png'),
      x: minX / scale,
      y: minY / scale,
      width: cropWidth / scale,
      height: cropHeight / scale,
      score: component.area / (width * height),
      area: component.area / (scale * scale),
      bounds: {
        x: minX / scale,
        y: minY / scale,
        width: cropWidth / scale,
        height: cropHeight / scale,
      },
      sourceWidth: canvas.width / scale,
      sourceHeight: canvas.height / scale,
    }
  })

  return {
    sourceWidth: canvas.width / scale,
    sourceHeight: canvas.height / scale,
    objects,
  }
}
