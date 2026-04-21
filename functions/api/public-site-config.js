export async function onRequestGet(context) {
  return json({
    ok: true,
    mode: 'scaffold',
    config: {
      text: {},
      styles: {},
    },
  })
}

export async function onRequestPut(context) {
  try {
    const body = await context.request.json()

    return json({
      ok: true,
      mode: 'scaffold',
      saved: true,
      received: body,
      note: 'Backend save route scaffolded. Wire to D1 or your real public site config store next.',
    })
  } catch (error) {
    return json({
      ok: false,
      error: String(error?.message || error),
    }, 400)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
