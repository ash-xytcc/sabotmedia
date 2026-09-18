export async function onRequest(context) {
  if (!context.env?.ASSETS?.fetch) return context.next()
  const url = new URL(context.request.url)
  const assetUrl = new URL('/investigations/autistici-inventati/index.html', url.origin)
  const response = await context.env.ASSETS.fetch(new Request(assetUrl, { method: context.request.method === 'HEAD' ? 'HEAD' : 'GET', headers: { accept: 'text/html' } }))
  if (!response.ok || context.request.method === 'HEAD') return response
  let html = await response.text()
  if (!html.includes('foia-desk.js')) html = html.replace('</body>', '  <script src="./foia-desk.js" defer></script>\n</body>')
  if (!html.includes('pdf-highlights.js')) html = html.replace('</body>', '  <script src="./pdf-highlights.js" defer></script>\n</body>')
  const headers = new Headers(response.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=60, s-maxage=180')
  headers.delete('content-length')
  return new Response(html, { status: 200, headers })
}
