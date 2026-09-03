import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const manifest = JSON.parse(fs.readFileSync(new URL('../public/site.webmanifest', import.meta.url), 'utf8'))
const portal = fs.readFileSync(new URL('../src/components/CampaignContributorPage.jsx', import.meta.url), 'utf8')

test('installed Sabot PWA accepts mobile share-sheet posts into the Gaza contributor flow', () => {
  assert.equal(manifest.share_target.action, '/contribute/food-not-bombs-gaza?share-target=1')
  assert.equal(manifest.share_target.method, 'GET')
  assert.deepEqual(manifest.share_target.params, { title: 'title', text: 'text', url: 'url' })
})

test('shared posts require the normal contributor session and an explicit public confirmation', () => {
  assert.match(portal, /const sharedPost = readSharedPost\(\)/)
  assert.match(portal, /same short campaign PIN/)
  assert.match(portal, /Archive this shared Instagram post publicly/)
  assert.match(portal, /Nothing is archived until you tap the public button and confirm/)
})

test('share-sheet posts enter the existing social archive instead of a separate publishing system', () => {
  assert.match(portal, /originSource: sharedPost \? 'instagram' : ''/)
  assert.match(portal, /originUrl: sharedPost\?\.url/)
  assert.match(portal, /reuseSocial: Boolean\(sharedPost\)/)
  assert.match(portal, /reuseOriginal: Boolean\(sharedPost\)/)
  assert.match(portal, /ARCHIVE SHARED POST/)
})
