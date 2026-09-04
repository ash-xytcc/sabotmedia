const PDFJS_ASSETS = new Map([
  ['main', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs'],
  ['worker', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'],
])

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const asset = String(url.searchParams.get('asset') || '').trim()
  const sourceUrl = PDFJS_ASSETS.get(asset)
  if (!sourceUrl) return text('unknown pdf.js asset', 404)

  try {
    const upstream = await fetch(sourceUrl, {
      headers: {
        accept: 'text/javascript, application/javascript, */*;q=0.1',
        'user-agent': 'Sabot Media highlighted source reader',
      },
      cf: { cacheTtl: 86400, cacheEverything: true },
    })
    if (!upstream.ok || !upstream.body) return text('pdf.js asset unavailable', 502)

    const headers = new Headers({
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'public, max-age=86400, s-maxage=604800, immutable',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    })
    const etag = upstream.headers.get('etag')
    if (etag) headers.set('etag', etag)
    return new Response(upstream.body, { status: 200, headers })
  } catch (error) {
    return text(`pdf.js asset unavailable: ${String(error?.message || error)}`, 502)
  }
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
