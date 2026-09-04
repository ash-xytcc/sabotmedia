import assert from 'node:assert/strict'
import test from 'node:test'
import { buildIframeEmbed, buildMediaEmbed, iframeSourceFromInput } from '../src/lib/adminEditorEmbeds.js'

test('audio media becomes an inline player', () => {
  const html = buildMediaEmbed({ url: 'https://example.org/episode.mp3', title: 'Episode' })
  assert.match(html, /<audio controls/)
  assert.match(html, /episode\.mp3/)
  assert.match(html, /width:100%/)
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
})
