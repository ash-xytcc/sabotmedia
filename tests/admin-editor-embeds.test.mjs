import assert from 'node:assert/strict'
import test from 'node:test'
import { buildIframeEmbed, buildMediaEmbed, iframeSourceFromInput } from '../src/lib/adminEditorEmbeds.js'

test('audio media becomes an inline player', () => {
  const html = buildMediaEmbed({ url: 'https://example.org/episode.mp3', title: 'Episode' })
  assert.match(html, /<audio controls/)
  assert.match(html, /episode\.mp3/)
  assert.match(html, /width:100%/)
  assert.match(html, /aria-label="Episode"/)
})

test('audio player keeps known media metadata without arbitrary attributes', () => {
  const html = buildMediaEmbed({
    id: 'media-episode-42',
    url: '/media/episode-42.mp3',
    title: 'Episode 42',
    mediaType: 'audio',
    mimeType: 'audio/mpeg',
  })
  assert.match(html, /data-media-id="media-episode-42"/)
  assert.match(html, /data-media-title="Episode 42"/)
  assert.match(html, /data-media-mime="audio\/mpeg"/)
  assert.match(html, /src="\/media\/episode-42\.mp3"/)
})

test('video media becomes a responsive inline player', () => {
  const html = buildMediaEmbed({
    id: 'media-video-7',
    url: 'https://example.org/clip.mp4',
    title: 'Street interview',
    mediaType: 'video',
    mimeType: 'video/mp4',
  })
  assert.match(html, /sabot-embed--video/)
  assert.match(html, /<video controls/)
  assert.match(html, /playsinline/)
  assert.match(html, /src="https:\/\/example\.org\/clip\.mp4"/)
  assert.match(html, /data-media-id="media-video-7"/)
  assert.match(html, /data-media-mime="video\/mp4"/)
  assert.match(html, /width:100%/)
})

test('video URLs are inferred when the picker has incomplete metadata', () => {
  const html = buildMediaEmbed({ url: 'https://example.org/clip.webm', title: 'Clip' })
  assert.match(html, /<video controls/)
  assert.doesNotMatch(html, /<audio controls/)
})

test('pdf media becomes a full-width readable inline document with a link fallback', () => {
  const html = buildMediaEmbed({ url: 'https://example.org/zine.pdf', title: 'Zine' })
  assert.match(html, /sabot-embed--pdf/)
  assert.match(html, /<iframe/)
  assert.match(html, /width="100%"/)
  assert.match(html, /height="720"/)
  assert.match(html, /min-height:65vh/)
  assert.match(html, /<a href=/)
})

test('image media remains an image rather than a download link', () => {
  const html = buildMediaEmbed({ url: 'https://example.org/photo.jpg', mediaType: 'image', alt: 'Kitchen' })
  assert.match(html, /<img/)
  assert.match(html, /alt="Kitchen"/)
  assert.match(html, /max-width:100%/)
})

test('iframe input is reduced to a safe src and rebuilt at a usable width', () => {
  const src = iframeSourceFromInput('<iframe src="https://player.example.org/e/42" onload="alert(1)" allow="camera"></iframe>')
  assert.equal(src, 'https://player.example.org/e/42')
  const html = buildIframeEmbed('<iframe src="https://player.example.org/e/42" onload="alert(1)"></iframe>')
  assert.match(html, /src="https:\/\/player\.example\.org\/e\/42"/)
  assert.doesNotMatch(html, /onload=/)
  assert.match(html, /referrerpolicy="no-referrer"/)
  assert.match(html, /width:100%/)
  assert.match(html, /min-height:480px/)
})

test('javascript embed URLs are rejected', () => {
  assert.equal(buildIframeEmbed('javascript:alert(1)'), '')
  assert.equal(buildMediaEmbed({ url: 'javascript:alert(1)', mediaType: 'audio' }), '')
  assert.equal(buildMediaEmbed({ url: 'javascript:alert(1)', mediaType: 'video' }), '')
})
