export async function onRequest(context) {
  if (String(context.request.method || '').toUpperCase() === 'POST') {
    return json({
      error: 'Segmentation model not configured',
      code: 'SEGMENTATION_NOT_CONFIGURED',
      note: 'Configure VITE_PRINTLAB_SEGMENTATION_ENDPOINT or replace this stub with a SAM/MobileSAM/SAM2 or ONNX-backed service that returns transparent PNGs or masks with bounding boxes.',
    }, 501)
  }

  return json({
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED',
  }, 405)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      allow: 'POST',
    },
  })
}
