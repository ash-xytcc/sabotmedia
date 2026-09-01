import assert from 'node:assert/strict'
import test from 'node:test'
import { matchesCampaignPost } from '../functions/api/campaign-instagram-sync.js'

const campaign = { slug: 'food-not-bombs-gaza' }

test('Gaza Instagram sync only accepts explicitly marked Sabot reposts', () => {
  assert.equal(matchesCampaignPost(campaign, { caption: 'New dispatch #FoodNotBombsGaza' }), true)
  assert.equal(matchesCampaignPost(campaign, { caption: 'From @foodnotbombs_gaza today' }), true)
  assert.equal(matchesCampaignPost(campaign, { caption: 'Unrelated Sabot Media post' }), false)
  assert.equal(matchesCampaignPost(campaign, {}), false)
})

test('unknown campaigns fail closed instead of importing an entire account', () => {
  assert.equal(matchesCampaignPost({ slug: 'another-campaign' }, { caption: '#FoodNotBombsGaza' }), false)
})
