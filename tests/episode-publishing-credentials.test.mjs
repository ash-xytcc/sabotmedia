import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const credentialsSource = fs.readFileSync(new URL('../functions/api/_lib/episodeCredentials.js', import.meta.url), 'utf8')
const publishingCredentialsSource = fs.readFileSync(new URL('../functions/api/episode-publishing-credentials.js', import.meta.url), 'utf8')
const youtubeStartSource = fs.readFileSync(new URL('../functions/api/episode-youtube-auth-start.js', import.meta.url), 'utf8')
const youtubeCallbackSource = fs.readFileSync(new URL('../functions/api/episode-youtube-auth-callback.js', import.meta.url), 'utf8')
const workerCredentialsSource = fs.readFileSync(new URL('../functions/api/episode-worker-credentials.js', import.meta.url), 'utf8')
const workerSource = fs.readFileSync(new URL('../services/media-worker/worker.mjs', import.meta.url), 'utf8')
const workerMediaSource = fs.readFileSync(new URL('../functions/api/episode-worker-media.js', import.meta.url), 'utf8')
const settingsPageSource = fs.readFileSync(new URL('../src/components/EpisodePublishingSettingsPage.jsx', import.meta.url), 'utf8')

test('saved publishing credentials are encrypted with AES-GCM', () => {
  assert.match(credentialsSource, /EPISODE_CREDENTIALS_KEY/)
  assert.match(credentialsSource, /AES-GCM/)
  assert.match(credentialsSource, /crypto\.subtle\.encrypt/)
  assert.match(credentialsSource, /crypto\.subtle\.decrypt/)
})

test('youtube settings use an OAuth authorization code flow with offline access', () => {
  assert.match(youtubeStartSource, /accounts\.google\.com\/o\/oauth2\/v2\/auth/)
  assert.match(youtubeStartSource, /youtube\.upload/)
  assert.match(youtubeStartSource, /youtube\.force-ssl/)
  assert.match(youtubeStartSource, /access_type', 'offline'/)
  assert.match(youtubeCallbackSource, /oauth2\.googleapis\.com\/token/)
  assert.match(youtubeCallbackSource, /storeYouTubeRefreshToken/)
})

test('peertube connection stores refreshable credentials without storing the password', () => {
  assert.match(publishingCredentialsSource, /oauth-clients\/local/)
  assert.match(publishingCredentialsSource, /grant_type: 'password'/)
  assert.match(publishingCredentialsSource, /storePeerTubeSession/)
  assert.match(credentialsSource, /peertubeRefreshToken/)
  assert.match(workerCredentialsSource, /grant_type: 'refresh_token'/)
  assert.match(workerCredentialsSource, /storePeerTubeSession/)
})

test('browser connection screen is write-only for platform secrets', () => {
  assert.match(settingsPageSource, /type="password"/)
  assert.match(settingsPageSource, /Connect YouTube/)
  assert.match(settingsPageSource, /Connect PeerTube/)
  assert.match(settingsPageSource, /password was not saved/)
  assert.doesNotMatch(settingsPageSource, /refreshToken/)
  assert.doesNotMatch(settingsPageSource, /accessToken\s*\}/)
})

test('worker retrieves site-managed platform credentials over the authenticated worker channel', () => {
  assert.match(workerCredentialsSource, /EPISODE_WORKER_TOKEN/)
  assert.match(workerCredentialsSource, /readYouTubeRefreshToken/)
  assert.match(workerCredentialsSource, /readPeerTubeSession/)
  assert.match(workerSource, /\/api\/episode-worker-credentials/)
})

test('generated video handoff supports streaming instead of mandatory multipart buffering', () => {
  assert.match(workerSource, /createReadStream\(outputPath\)/)
  assert.match(workerSource, /duplex: 'half'/)
  assert.match(workerMediaSource, /context\.request\.body/)
  assert.match(workerMediaSource, /x-episode-id/)
  assert.match(workerMediaSource, /storage\.bucket\.put\(storageKey, input\.body/)
})
