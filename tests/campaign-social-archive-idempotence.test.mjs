import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../functions/api/_lib/campaignCorrespondence.js', import.meta.url), 'utf8')

test('campaign social archive keeps stable origin identity unique and repeated imports idempotent', () => {
  assert.match(source, /CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_messages_origin/)
  assert.match(source, /campaign_id, origin_source, origin_id/)
  assert.match(source, /if \(input\.reuseSocial && originSource && originId\)/)
  assert.match(source, /m\.campaign_id = \? AND m\.origin_source = \? AND m\.origin_id = \?/)
  const preflight = source.indexOf('if (input.reuseSocial && originSource && originId)')
  const insert = source.indexOf('INSERT INTO campaign_messages', preflight)
  assert.ok(preflight > -1 && insert > preflight)
  assert.match(source.slice(insert), /catch \(error\)[\s\S]*if \(input\.reuseSocial && originSource && originId\)/)
})
