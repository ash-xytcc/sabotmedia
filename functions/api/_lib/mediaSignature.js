export function detectMediaSignature(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || 0)
  if (starts(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'image/gif'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return 'audio/wav'
  if (ascii(bytes, 0, 4) === 'OggS') return 'application/ogg'
  if (starts(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'application/webm'
  if (ascii(bytes, 0, 3) === 'ID3' || (bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0)) return 'audio/mpeg'
  if (bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return 'audio/aac'
  if (ascii(bytes, 0, 5) === '%PDF-') return 'application/pdf'

  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4)
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic'
    if (['heif', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heif'
    if (brand === 'qt  ') return 'video/quicktime'
    if (/^M4A|^M4B/.test(brand)) return 'audio/mp4'
    return 'application/mp4'
  }

  return ''
}

export function mediaMimeMatchesSignature(type, signature) {
  const mime = String(type || '').toLowerCase()
  const detected = String(signature || '').toLowerCase()
  if (!mime || !detected) return false
  if (mime === detected) return true
  if (detected === 'application/ogg') return mime === 'audio/ogg' || mime === 'video/ogg'
  if (detected === 'application/webm') return mime === 'audio/webm' || mime === 'video/webm'
  if (detected === 'application/mp4') return mime === 'audio/mp4' || mime === 'audio/x-m4a' || mime === 'video/mp4'
  if (detected === 'audio/mp4') return mime === 'audio/mp4' || mime === 'audio/x-m4a'
  if (detected === 'audio/wav') return mime === 'audio/wav' || mime === 'audio/x-wav'
  return false
}

function starts(bytes, signature) {
  if (bytes.length < signature.length) return false
  return signature.every((value, index) => bytes[index] === value)
}
function ascii(bytes, offset, length) {
  if (bytes.length < offset + length) return ''
  return String.fromCharCode(...bytes.slice(offset, offset + length))
}
