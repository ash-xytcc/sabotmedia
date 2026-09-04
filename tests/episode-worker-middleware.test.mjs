import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const middleware = fs.readFileSync(new URL('../functions/_middleware.js', import.meta.url), 'utf8')
const worker = fs.readFileSync(new URL('../functions/api/episode-worker.js', import.meta.url), 'utf8')
const credentials = fs.readFileSync(new URL('../functions/api/episode-worker-credentials.js', import.meta.url), 'utf8')
const media = fs.readFileSync(new URL('../functions/api/episode-worker-media.js', import.meta.url), 'utf8')

test('worker-only API routes bypass editor-session middleware', () => {
  for (const path of [
    '/api/episode-worker',
    '/api/episode-worker-credentials',
    '/api/episode-worker-media',
  ]) {
    assert.match(middleware, new RegExp(path.replaceAll('/', '\\/')))
  }
})

test('worker-only API routes still enforce the worker bearer token themselves', () => {
  for (const source of [worker, credentials, media]) {
    assert.match(source, /EPISODE_WORKER_TOKEN/)
    assert.match(source, /authorization/)
    assert.match(source, /invalid episode worker token/)
  }
})
