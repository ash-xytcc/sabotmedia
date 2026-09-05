export function onRequest(context) {
  console.log('Sabot Pages Functions canary invoked', {
    url: context.request.url,
    method: context.request.method,
  })

  return new Response('sabot-pages-functions-ok\n', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
