import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { testDb } from './course-db.mjs'
import { onRequest as course } from '../../functions/guides/become-the-thousand-servers/[[path]].js'
import { onRequest as api } from '../../functions/api/course-content.js'
import { onRequest as contributors } from '../../functions/api/course-contributors.js'
import { onRequest as recovery } from '../../functions/api/course-recovery.js'
const root = fileURLToPath(new URL('../../public/', import.meta.url))
export async function startCourseServer() {
  const env = { BF_DB: testDb(), SABOT_SESSION_SECRET: 'local-browser-test-secret-only' }
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const origin = `http://127.0.0.1:${server.address().port}`,
        url = origin + req.url,
        request = new Request(url, {
          method: req.method,
          headers: req.headers,
          ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}),
        })
      const path = new URL(url).pathname
      const next = async () => {
        const file = await readFile(root + path)
        return new Response(file, {
          headers: {
            'content-type': path.endsWith('.js')
              ? 'application/javascript'
              : path.endsWith('.css')
                ? 'text/css'
                : 'text/html',
          },
        })
      }
      const ctx = { env, request, next }
      const handler =
        path === '/api/course-content'
          ? api
          : path === '/api/course-contributors'
            ? contributors
            : path === '/api/course-recovery'
              ? recovery
              : course
      const r = await handler(ctx)
      res.writeHead(r.status, Object.fromEntries(r.headers))
      res.end(Buffer.from(await r.arrayBuffer()))
    } catch (e) {
      res.writeHead(500)
      res.end(String(e))
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { server, env, origin: `http://127.0.0.1:${server.address().port}` }
}
