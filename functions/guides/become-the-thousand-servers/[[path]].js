export async function onRequest(context) {
  const response = await context.next()
  const type = String(response.headers.get('content-type') || '')
  if (!response.ok || !type.includes('text/html') || context.request.method === 'HEAD') return response

  let html = await response.text()
  if (!html.includes('/guides/become-the-thousand-servers/course-backend.js')) {
    html = html.replace('</body>', '  <script src="/guides/become-the-thousand-servers/course-backend.js" defer></script>\n</body>')
  }
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('cache-control', 'no-store')
  return new Response(html, { status: response.status, headers })
}
