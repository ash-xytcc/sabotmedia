import { spawn } from 'node:child_process'
import { mkdtemp, open, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

const siteUrl = requiredEnv('SABOT_SITE_URL').replace(/\/$/, '')
const workerToken = requiredEnv('EPISODE_WORKER_TOKEN')
const once = process.argv.includes('--once')
const pollMs = Math.max(5_000, Number(process.env.WORKER_POLL_MS || 15_000))
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'

async function main() {
  do {
    const job = await claimJob()
    if (!job) {
      if (once) return
      await sleep(pollMs)
      continue
    }

    let result
    try {
      result = await processJob(job)
    } catch (error) {
      result = { ok: false, error: String(error?.stack || error?.message || error) }
    }
    await completeJob(job.id, result)
    if (once) return
  } while (true)
}

async function processJob(job) {
  if (job.jobType === 'render_video') return renderVideoJob(job)
  if (job.jobType === 'upload_video' && job.destination === 'youtube') return uploadYouTubeJob(job)
  if (job.jobType === 'upload_video' && job.destination === 'peertube') return uploadPeerTubeJob(job)
  if (job.jobType === 'sync_metadata' && job.destination === 'youtube') return syncYouTubeMetadata(job)
  if (job.jobType === 'sync_metadata' && job.destination === 'peertube') return syncPeerTubeMetadata(job)
  throw new Error(`unsupported job ${job.jobType}/${job.destination}`)
}

async function renderVideoJob(job) {
  const payload = job.payload || {}
  if (!payload.audio?.url) throw new Error('render job has no canonical audio URL')
  const dir = await mkdtemp(join(tmpdir(), 'sabot-episode-'))
  try {
    const audioPath = join(dir, `audio${extensionFromUrl(payload.audio.url, '.mp3')}`)
    const artPath = join(dir, `art${extensionFromUrl(payload.artwork?.url, '.jpg')}`)
    const outputPath = join(dir, 'episode.mp4')
    await downloadFile(payload.audio.url, audioPath)
    let hasArtwork = false
    if (payload.artwork?.url) {
      await downloadFile(payload.artwork.url, artPath)
      hasArtwork = true
    }
    const template = resolveTemplate(payload)
    await renderWithFfmpeg({ audioPath, artPath, hasArtwork, outputPath, template })
    const media = await uploadRenderedMedia(job, outputPath)
    return {
      ok: true,
      renderedVideoUrl: media.url || media.publicUrl,
      renderedMediaId: media.id,
      renderedStorageKey: media.storageKey,
      mimeType: media.mimeType || 'video/mp4',
      size: Number(media.size || 0),
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function renderWithFfmpeg({ audioPath, artPath, hasArtwork, outputPath, template }) {
  const width = clampNumber(template.width, 640, 3840, 1920)
  const height = clampNumber(template.height, 360, 2160, 1080)
  const frameRate = clampNumber(template.frameRate, 20, 60, 30)
  const mode = template.waveform === false ? 'static' : 'waveform'
  const args = ['-hide_banner', '-loglevel', 'warning', '-y', '-i', audioPath]
  if (hasArtwork) args.push('-loop', '1', '-framerate', String(frameRate), '-i', artPath)
  else args.push('-f', 'lavfi', '-i', `color=c=0x111111:s=${width}x${height}:r=${frameRate}`)

  const background = `[1:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[bg]`
  let filters = background
  let outputLabel = 'bg'
  if (mode === 'waveform') {
    const waveWidth = Math.round(width * 0.78)
    const waveHeight = Math.max(120, Math.round(height * 0.18))
    filters += `;[0:a]showwaves=s=${waveWidth}x${waveHeight}:mode=line:rate=${frameRate}:colors=white,format=rgba[w];[bg][w]overlay=(W-w)/2:H-h-${Math.round(height * 0.07)}[wave]`
    outputLabel = 'wave'
  }

  if (template.brandingText && template.fontFile) {
    const text = escapeDrawText(template.brandingText)
    const fontFile = escapeDrawText(template.fontFile)
    filters += `;[${outputLabel}]drawtext=fontfile='${fontFile}':text='${text}':x=w-tw-48:y=48:fontsize=30:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=12[brand]`
    outputLabel = 'brand'
  }

  args.push(
    '-filter_complex', filters,
    '-map', `[${outputLabel}]`,
    '-map', '0:a:0',
    '-c:v', 'libx264',
    '-preset', String(template.preset || 'medium'),
    '-crf', String(clampNumber(template.crf, 16, 30, 20)),
    '-pix_fmt', 'yuv420p',
    '-r', String(frameRate),
    '-c:a', 'aac',
    '-b:a', String(template.audioBitrate || '192k'),
    '-movflags', '+faststart',
    '-shortest',
    outputPath,
  )
  await runProcess(ffmpeg, args)
}

async function uploadRenderedMedia(job, outputPath) {
  const bytes = await readFile(outputPath)
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'video/mp4' }), `${job.episodeId}.mp4`)
  form.append('episodeId', job.episodeId)
  form.append('jobId', job.id)
  form.append('mimeType', 'video/mp4')
  const response = await fetch(`${siteUrl}/api/episode-worker-media`, {
    method: 'POST',
    headers: workerHeaders(false),
    body: form,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || !data.media?.url) throw new Error(data?.error || `render media upload failed: ${response.status}`)
  return data.media
}

async function uploadYouTubeJob(job) {
  const videoUrl = job.dependencyResult?.renderedVideoUrl
  if (!videoUrl) throw new Error('YouTube upload is waiting for a rendered video URL')
  const dir = await mkdtemp(join(tmpdir(), 'sabot-youtube-'))
  try {
    const videoPath = join(dir, 'episode.mp4')
    await downloadFile(videoUrl, videoPath)
    const fileStat = await stat(videoPath)
    const accessToken = await googleAccessToken()
    const payload = job.payload || {}
    const platform = payload.platform?.youtube || {}
    const categoryId = String(payload.override?.categoryId || platform.categoryId || process.env.YOUTUBE_CATEGORY_ID || '22')
    const privacyStatus = normalizeYouTubePrivacy(payload.override?.privacy || platform.privacy || process.env.YOUTUBE_PRIVACY || 'public')
    const metadata = {
      snippet: {
        title: truncate(payload.title || 'Untitled episode', 100),
        description: truncate(payload.description || '', 5000),
        tags: normalizeYouTubeTags(payload.tags),
        categoryId,
      },
      status: { privacyStatus, selfDeclaredMadeForKids: false },
    }
    const session = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-length': String(fileStat.size),
        'x-upload-content-type': 'video/mp4',
      },
      body: JSON.stringify(metadata),
    })
    if (!session.ok) throw new Error(`YouTube session failed: ${session.status} ${await session.text()}`)
    const uploadUrl = session.headers.get('location')
    if (!uploadUrl) throw new Error('YouTube did not return a resumable upload URL')
    const uploaded = await uploadFileInChunks({
      url: uploadUrl,
      filePath: videoPath,
      size: fileStat.size,
      contentType: 'video/mp4',
      headers: { authorization: `Bearer ${accessToken}` },
      finalStatuses: new Set([200, 201]),
      retryStatus: 308,
    })
    const video = uploaded.json || {}
    const remoteId = String(video.id || '')
    if (!remoteId) throw new Error('YouTube upload completed without a video id')
    return { ok: true, remoteId, remoteUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(remoteId)}` }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function uploadPeerTubeJob(job) {
  const videoUrl = job.dependencyResult?.renderedVideoUrl
  if (!videoUrl) throw new Error('PeerTube upload is waiting for a rendered video URL')
  const payload = job.payload || {}
  const platform = payload.platform?.peertube || {}
  const base = requiredValue(platform.baseUrl || process.env.PEERTUBE_BASE_URL, 'PeerTube base URL').replace(/\/$/, '')
  const token = await peerTubeAccessToken()
  const channelId = Number(payload.override?.channelId || platform.channelId || process.env.PEERTUBE_CHANNEL_ID || 0)
  if (!channelId) throw new Error('PeerTube channel id is required in Publishing Connections or PEERTUBE_CHANNEL_ID')
  const dir = await mkdtemp(join(tmpdir(), 'sabot-peertube-'))
  try {
    const videoPath = join(dir, 'episode.mp4')
    await downloadFile(videoUrl, videoPath)
    const fileStat = await stat(videoPath)
    const initBody = {
      channelId,
      filename: `${slug(payload.title || job.episodeId)}.mp4`,
      name: truncate(payload.title || 'Untitled episode', 120),
      description: truncate(payload.description || '', 10000),
      privacy: normalizePeerTubePrivacy(payload.override?.privacy || platform.privacy || process.env.PEERTUBE_PRIVACY || 'public'),
      tags: normalizePeerTubeTags(payload.tags),
      waitTranscoding: false,
      originallyPublishedAt: payload.publishAt || undefined,
    }
    const init = await fetch(`${base}/api/v1/videos/upload-resumable`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-upload-content-length': String(fileStat.size),
        'x-upload-content-type': 'video/mp4',
      },
      body: JSON.stringify(initBody),
    })
    if (![200, 201].includes(init.status)) throw new Error(`PeerTube upload init failed: ${init.status} ${await init.text()}`)
    const location = init.headers.get('location')
    if (!location) throw new Error('PeerTube did not return a resumable upload location')
    const uploadUrl = new URL(location, base).toString()
    const uploaded = await uploadFileInChunks({
      url: uploadUrl,
      filePath: videoPath,
      size: fileStat.size,
      contentType: 'application/octet-stream',
      headers: { authorization: `Bearer ${token}` },
      finalStatuses: new Set([200, 201]),
      retryStatus: 308,
    })
    const video = uploaded.json?.video || uploaded.json || {}
    const remoteId = String(video.uuid || video.id || video.shortUUID || '')
    if (!remoteId) throw new Error('PeerTube upload completed without a video id')
    const watchId = String(video.shortUUID || video.uuid || video.id)
    return { ok: true, remoteId, remoteUrl: `${base}/w/${encodeURIComponent(watchId)}` }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function syncYouTubeMetadata(job) {
  const payload = job.payload || {}
  const remoteId = String(payload.remoteId || '')
  if (!remoteId) throw new Error('YouTube metadata sync has no remote video id')
  const accessToken = await googleAccessToken()
  const currentResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${encodeURIComponent(remoteId)}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const currentData = await currentResponse.json().catch(() => null)
  const current = currentData?.items?.[0]
  if (!currentResponse.ok || !current) throw new Error(`Could not read YouTube video ${remoteId}`)
  const platform = payload.platform?.youtube || {}
  const body = {
    id: remoteId,
    snippet: {
      ...current.snippet,
      title: truncate(payload.title || current.snippet.title, 100),
      description: truncate(payload.description || current.snippet.description || '', 5000),
      tags: normalizeYouTubeTags(payload.tags?.length ? payload.tags : current.snippet.tags || []),
      categoryId: String(payload.override?.categoryId || platform.categoryId || current.snippet.categoryId || process.env.YOUTUBE_CATEGORY_ID || '22'),
    },
    status: {
      ...current.status,
      privacyStatus: normalizeYouTubePrivacy(payload.override?.privacy || platform.privacy || current.status?.privacyStatus || 'public'),
    },
  }
  const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,status', {
    method: 'PUT',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`YouTube metadata sync failed: ${response.status} ${await response.text()}`)
  return { ok: true, remoteId, remoteUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(remoteId)}` }
}

async function syncPeerTubeMetadata(job) {
  const payload = job.payload || {}
  const remoteId = String(payload.remoteId || '')
  if (!remoteId) throw new Error('PeerTube metadata sync has no remote video id')
  const platform = payload.platform?.peertube || {}
  const base = requiredValue(platform.baseUrl || process.env.PEERTUBE_BASE_URL, 'PeerTube base URL').replace(/\/$/, '')
  const token = await peerTubeAccessToken()
  const form = new FormData()
  form.append('name', truncate(payload.title || 'Untitled episode', 120))
  form.append('description', truncate(payload.description || '', 10000))
  form.append('privacy', String(normalizePeerTubePrivacy(payload.override?.privacy || platform.privacy || process.env.PEERTUBE_PRIVACY || 'public')))
  for (const tag of normalizePeerTubeTags(payload.tags)) form.append('tags', tag)
  const response = await fetch(`${base}/api/v1/videos/${encodeURIComponent(remoteId)}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  })
  if (!response.ok) throw new Error(`PeerTube metadata sync failed: ${response.status} ${await response.text()}`)
  return { ok: true, remoteId, remoteUrl: payload.remoteUrl || `${base}/w/${encodeURIComponent(remoteId)}` }
}

async function uploadFileInChunks({ url, filePath, size, contentType, headers = {}, finalStatuses, retryStatus }) {
  const chunkSize = Math.max(256 * 1024, Number(process.env.UPLOAD_CHUNK_BYTES || 8 * 1024 * 1024))
  const handle = await open(filePath, 'r')
  let offset = 0
  let lastJson = null
  try {
    while (offset < size) {
      const length = Math.min(chunkSize, size - offset)
      const chunk = Buffer.allocUnsafe(length)
      const { bytesRead } = await handle.read(chunk, 0, length, offset)
      if (!bytesRead) throw new Error(`resumable upload could not read file at byte ${offset}`)
      const body = bytesRead === chunk.length ? chunk : chunk.subarray(0, bytesRead)
      const endExclusive = offset + bytesRead
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...headers,
          'content-type': contentType,
          'content-length': String(bytesRead),
          'content-range': `bytes ${offset}-${endExclusive - 1}/${size}`,
        },
        body,
      })
      if (finalStatuses.has(response.status)) {
        lastJson = await response.json().catch(() => ({}))
        offset = size
        break
      }
      if (response.status !== retryStatus) throw new Error(`resumable upload failed: ${response.status} ${await response.text()}`)
      const range = response.headers.get('range') || ''
      const match = range.match(/bytes=\d+-(\d+)/i)
      offset = match ? Number(match[1]) + 1 : endExclusive
    }
  } finally {
    await handle.close()
  }
  return { json: lastJson || {} }
}

async function googleAccessToken() {
  try {
    const connected = await siteRequest('/api/episode-worker-credentials', { destination: 'youtube' })
    if (connected.accessToken) return connected.accessToken
  } catch (siteError) {
    const localReady = String(process.env.YOUTUBE_REFRESH_TOKEN || '').trim()
      && String(process.env.YOUTUBE_CLIENT_ID || '').trim()
      && String(process.env.YOUTUBE_CLIENT_SECRET || '').trim()
    if (!localReady) throw siteError
  }

  const refreshToken = requiredEnv('YOUTUBE_REFRESH_TOKEN')
  const clientId = requiredEnv('YOUTUBE_CLIENT_ID')
  const clientSecret = requiredEnv('YOUTUBE_CLIENT_SECRET')
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.access_token) throw new Error(data?.error_description || data?.error || `YouTube token refresh failed: ${response.status}`)
  return data.access_token
}

async function peerTubeAccessToken() {
  try {
    const connected = await siteRequest('/api/episode-worker-credentials', { destination: 'peertube' })
    if (connected.accessToken) return connected.accessToken
  } catch (siteError) {
    const fallback = String(process.env.PEERTUBE_ACCESS_TOKEN || '').trim()
    if (!fallback) throw siteError
    return fallback
  }
  const fallback = String(process.env.PEERTUBE_ACCESS_TOKEN || '').trim()
  if (fallback) return fallback
  throw new Error('PeerTube access token is not configured')
}

async function claimJob() {
  const data = await siteRequest('/api/episode-worker', { action: 'claim' })
  return data.job || null
}

async function completeJob(jobId, result) {
  await siteRequest('/api/episode-worker', { action: 'complete', jobId, result })
}

async function siteRequest(path, body) {
  const response = await fetch(`${siteUrl}${path}`, {
    method: 'POST',
    headers: workerHeaders(true),
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) throw new Error(data?.error || `${path} failed: ${response.status}`)
  return data
}

function workerHeaders(json = true) {
  return {
    authorization: `Bearer ${workerToken}`,
    ...(json ? { 'content-type': 'application/json', accept: 'application/json' } : {}),
  }
}

async function downloadFile(url, path) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`media download failed: ${response.status} ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  await writeFile(path, bytes)
}

function resolveTemplate(payload = {}) {
  let map = {}
  try { map = JSON.parse(process.env.VIDEO_TEMPLATES_JSON || '{}') } catch { map = {} }
  const showId = String(payload.showId || '')
  const base = map.default && typeof map.default === 'object' ? map.default : {}
  const specific = map[showId] && typeof map[showId] === 'object' ? map[showId] : {}
  const saved = payload.videoTemplate && typeof payload.videoTemplate === 'object' ? payload.videoTemplate : {}
  return {
    width: 1920,
    height: 1080,
    frameRate: 30,
    waveform: true,
    crf: 20,
    preset: 'medium',
    audioBitrate: '192k',
    brandingText: 'Sabot Media',
    fontFile: process.env.VIDEO_FONT_FILE || '',
    ...base,
    ...specific,
    ...saved,
    fontFile: process.env.VIDEO_FONT_FILE || specific.fontFile || base.fontFile || '',
  }
}

function normalizeYouTubeTags(tags = []) {
  return (Array.isArray(tags) ? tags : []).map((tag) => truncate(String(tag || '').trim(), 100)).filter(Boolean).slice(0, 50)
}

function normalizePeerTubeTags(tags = []) {
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => truncate(String(tag || '').trim(), 30))
    .filter((tag) => tag.length >= 2)
    .slice(0, 5)
}

function normalizeYouTubePrivacy(value) {
  const privacy = String(value || '').toLowerCase()
  return ['public', 'private', 'unlisted'].includes(privacy) ? privacy : 'public'
}

function normalizePeerTubePrivacy(value) {
  const raw = String(value || '').toLowerCase()
  const direct = Number(raw)
  if ([1, 2, 3, 4, 5].includes(direct)) return direct
  if (raw === 'unlisted') return 2
  if (raw === 'private') return 3
  if (raw === 'internal') return 4
  if (raw === 'password') return 5
  return 1
}

function extensionFromUrl(url, fallback) {
  try {
    const name = basename(new URL(url, siteUrl).pathname)
    const match = name.match(/(\.[a-z0-9]{2,5})$/i)
    return match ? match[1] : fallback
  } catch {
    return fallback
  }
}

function escapeDrawText(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'episode'
}

function truncate(value, max) {
  return String(value || '').slice(0, max)
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function requiredValue(value, label) {
  const clean = String(value || '').trim()
  if (!clean) throw new Error(`${label} is required`)
  return clean
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'inherit', 'inherit'] })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)))
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
