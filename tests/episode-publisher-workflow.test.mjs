import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const jobSource = fs.readFileSync(new URL('../functions/api/_lib/episodePublishing.js', import.meta.url), 'utf8')
const publishSource = fs.readFileSync(new URL('../functions/api/episode-publishing.js', import.meta.url), 'utf8')
const workerSource = fs.readFileSync(new URL('../services/media-worker/worker.mjs', import.meta.url), 'utf8')
const workerApiSource = fs.readFileSync(new URL('../functions/api/episode-worker.js', import.meta.url), 'utf8')
const pageSource = fs.readFileSync(new URL('../src/components/PiecePage.jsx', import.meta.url), 'utf8')
const publisherSource = fs.readFileSync(new URL('../src/components/EpisodePublisherPage.jsx', import.meta.url), 'utf8')

test('external video publish jobs depend on one idempotent render job', () => {
  assert.match(publishSource, /jobType: 'render_video'/)
  assert.match(publishSource, /idempotencyKey: `\$\{episode\.id\}:video:render:v1`/)
  assert.match(publishSource, /jobType: 'upload_video'/)
  assert.match(publishSource, /dependsOnId: renderJob\.id/)
  assert.match(publishSource, /idempotencyKey: `\$\{episode\.id\}:\$\{destination\}:upload:v1`/)
})

test('explicit retry revives failed render dependencies and resets attempts', () => {
  assert.match(jobSource, /SELECT id, depends_on_id FROM episode_publish_jobs/)
  assert.match(jobSource, /\['failed', 'cancelled'\]\.includes/)
  assert.match(jobSource, /SET status = 'retrying', attempts = 0/)
  assert.match(jobSource, /requeueStaleEpisodeJobs/)
})

test('worker uses saved publishing defaults and streams resumable upload chunks', () => {
  assert.match(workerSource, /payload\.platform\?\.youtube/)
  assert.match(workerSource, /payload\.platform\?\.peertube/)
  assert.match(workerSource, /payload\.videoTemplate/)
  assert.match(workerSource, /const handle = await open\(filePath, 'r'\)/)
  assert.match(workerSource, /handle\.read\(chunk, 0, length, offset\)/)
})

test('worker publishes remote links back onto the canonical episode record', () => {
  assert.match(workerApiSource, /role: 'published-video'/)
  assert.match(workerApiSource, /status: 'published'/)
  assert.match(workerApiSource, /updatePublicVideoStatus/)
  assert.match(pageSource, /ACTIVE_VIDEO_STATUSES/)
  assert.match(pageSource, /Watch on \{label\}/)
  assert.match(pageSource, /window\.setInterval\(refresh, 8000\)/)
})

test('episode publisher rejects wrong media classes', () => {
  assert.match(publisherSource, /mediaKind\(audio\) !== 'audio'/)
  assert.match(publisherSource, /kind !== 'audio'/)
  assert.match(publisherSource, /kind !== 'image'/)
})
