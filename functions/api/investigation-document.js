const ALLOWED_SOURCES = new Map([
  ['govinfo-transcript', 'https://www.govinfo.gov/content/pkg/DCPD-202500989/pdf/DCPD-202500989.pdf'],
  ['senate-shideler', 'https://www.judiciary.senate.gov/imo/media/doc/4a3850cc-9186-4271-fe98-9caebcd5b632/2025-10-28-PM_Testimony_Shideler.pdf'],
  ['ofac-notice', 'https://public-inspection.federalregister.gov/2026-17724.pdf'],
])

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const source = String(url.searchParams.get('source') || '').trim()
  const sourceUrl = ALLOWED_SOURCES.get(source)
  if (!sourceUrl) return text('unknown investigation document', 404)

  try {
    const range = context.request.headers.get('range') || ''
    const requestHeaders = {
      accept: 'application/pdf',
      'user-agent': 'Sabot Media investigation reader',
    }
    if (range) requestHeaders.range = range

    const upstream = await fetch(sourceUrl, {
      headers: requestHeaders,
      cf: range ? undefined : { cacheTtl: 3600, cacheEverything: true },
    })

    if (![200, 206].includes(upstream.status) || !upstream.body) return text('source document unavailable', 502)

    const headers = new Headers()
    headers.set('content-type', 'application/pdf')
    headers.set('content-disposition', `inline; filename="${filenameFor(source)}"`)
    headers.set('cache-control', 'public, max-age=3600, s-maxage=86400')
    headers.set('x-content-type-options', 'nosniff')
    headers.set('referrer-policy', 'no-referrer')

    for (const name of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
      const value = upstream.headers.get(name)
      if (value) headers.set(name, value)
    }
    if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes')

    return new Response(upstream.body, { status: upstream.status, headers })
  } catch (error) {
    return text(`source document unavailable: ${String(error?.message || error)}`, 502)
  }
}

export async function onRequestHead(context) {
  const url = new URL(context.request.url)
  const source = String(url.searchParams.get('source') || '').trim()
  const sourceUrl = ALLOWED_SOURCES.get(source)
  if (!sourceUrl) return text('unknown investigation document', 404)

  try {
    const upstream = await fetch(sourceUrl, { method: 'HEAD', headers: { accept: 'application/pdf' } })
    if (!upstream.ok) return text('source document unavailable', 502)
    const headers = new Headers({
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${filenameFor(source)}"`,
      'cache-control': 'public, max-age=3600, s-maxage=86400',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'accept-ranges': upstream.headers.get('accept-ranges') || 'bytes',
    })
    const length = upstream.headers.get('content-length')
    if (length) headers.set('content-length', length)
    return new Response(null, { status: 200, headers })
  } catch (error) {
    return text(`source document unavailable: ${String(error?.message || error)}`, 502)
  }
}

function filenameFor(source) {
  if (source === 'govinfo-transcript') return 'white-house-antifa-roundtable-transcript.pdf'
  if (source === 'senate-shideler') return 'shideler-senate-testimony.pdf'
  if (source === 'ofac-notice') return 'ofac-2026-17724.pdf'
  return 'investigation-document.pdf'
}

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
