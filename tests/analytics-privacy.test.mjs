import assert from 'node:assert/strict'
import test from 'node:test'
import { respectsPrivacySignal } from '../functions/api/analytics/collect.js'
import { cleanPath, isSameOriginAnalyticsRequest, parseDevice } from '../functions/api/analytics/_lib.js'

function requestWith(headers = {}) {
  return new Request('https://sabot.media/api/analytics/collect', { headers })
}

test('analytics ingestion respects Do Not Track', () => {
  assert.equal(respectsPrivacySignal(requestWith({ DNT: '1' })), true)
  assert.equal(respectsPrivacySignal(requestWith({ DNT: '0' })), false)
})

test('analytics ingestion respects Global Privacy Control', () => {
  assert.equal(respectsPrivacySignal(requestWith({ 'Sec-GPC': '1' })), true)
  assert.equal(respectsPrivacySignal(requestWith({ 'Sec-GPC': '0' })), false)
})

test('analytics ingestion proceeds without opt-out signals', () => {
  assert.equal(respectsPrivacySignal(requestWith()), false)
})

test('analytics canonicalizes content aliases and presentation routes', () => {
  assert.equal(cleanPath('/piece/Example-Slug/'), '/post/example-slug')
  assert.equal(cleanPath('/piece/example-slug/print'), '/post/example-slug')
  assert.equal(cleanPath('/post/example-slug/print'), '/post/example-slug')
  assert.equal(cleanPath('/print/example-slug'), '/post/example-slug')
  assert.equal(cleanPath('/updates/example-slug'), '/post/example-slug')
  assert.equal(cleanPath('/ABOUT/?utm_source=test'), '/about')
})

test('analytics only accepts same-origin browser collection', () => {
  const sameOrigin = new Request('https://sabot.media/api/analytics/collect', {
    headers: { origin: 'https://sabot.media' },
  })
  const foreign = new Request('https://sabot.media/api/analytics/collect', {
    headers: { origin: 'https://example.org' },
  })
  assert.equal(isSameOriginAnalyticsRequest(sameOrigin), true)
  assert.equal(isSameOriginAnalyticsRequest(foreign), false)
})

test('analytics bot and browser classification is conservative', () => {
  assert.equal(parseDevice('').bot, true)
  assert.equal(parseDevice('Mozilla/5.0 compatible Googlebot/2.1').bot, true)
  assert.deepEqual(
    parseDevice('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'),
    { bot: false, device: 'mobile', browser: 'Safari' },
  )
})
