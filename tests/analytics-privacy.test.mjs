import assert from 'node:assert/strict'
import test from 'node:test'
import { respectsPrivacySignal } from '../functions/api/analytics/collect.js'

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
