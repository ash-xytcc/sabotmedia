import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('Food Not Bombs Gaza is a distinct direct-aid campaign with verified outbound donation routing', async () => {
  const source = await read('functions/api/_lib/campaigns.js')
  assert.match(source, /FNB_GAZA_CAMPAIGN_SLUG = 'food-not-bombs-gaza'/)
  assert.match(source, /campaignType: 'direct-aid'/)
  assert.match(source, /lifecycleStatus: 'active'/)
  assert.match(source, /chuffed\.org\/project\/181554-send-direct-aid-to-food-not-bombs-gaza/)
  assert.match(source, /Sabot takes no percentage/)
  assert.doesNotMatch(source, /partnered with Food Not Bombs Gaza/i)
})

test('campaign heroes distinguish public lifecycle from urgency', async () => {
  const [page, admin, schema] = await Promise.all([read('src/components/CampaignPage.jsx'), read('src/components/CampaignAdminPage.jsx'), read('functions/api/_lib/campaigns.js')])
  assert.match(page, /campaign\.lifecycleStatus/)
  assert.match(admin, /Public lifecycle/)
  assert.match(schema, /\['active', 'inactive'\]\.includes\(input\.lifecycleStatus\)/)
})

test('field contributor access is campaign-scoped, hashed, revocable and rate-limited', async () => {
  const source = await read('functions/api/_lib/campaignCorrespondence.js')
  assert.match(source, /token_hash TEXT NOT NULL UNIQUE/)
  assert.match(source, /pin_hash TEXT NOT NULL/)
  assert.match(source, /campaign_id TEXT NOT NULL/)
  assert.match(source, /revoked_at/)
  assert.match(source, /PIN_ATTEMPT_LIMIT/)
  assert.match(source, /DELETE FROM campaign_contributor_sessions WHERE contributor_id/)
})

test('private contributor page uses URL fragment access and a familiar single-thread composer', async () => {
  const [app, page] = await Promise.all([read('src/App.jsx'), read('src/components/CampaignContributorPage.jsx')])
  assert.match(app, /path="\/contribute\/:slug"/)
  assert.match(page, /window\.location\.hash/)
  assert.match(page, /Record|Audio/)
  assert.match(page, /Publish this/)
  assert.match(page, /Only send to Sabot/)
  assert.doesNotMatch(page, /email.*required/i)
})

test('public questions are moderated and never delivered directly to contributors', async () => {
  const [publicUi, adminUi] = await Promise.all([read('src/components/CampaignCorrespondence.jsx'), read('src/components/CampaignCorrespondenceAdmin.jsx')])
  assert.match(publicUi, /Sabot Media reviews submissions/)
  assert.match(adminUi, /Public question queue/)
  assert.match(adminUi, /shortlisted.*sent.*answered.*ready.*published.*archived/s)
})

test('private contributor routes skip analytics and private APIs perform their own authorization', async () => {
  const [app, middleware, endpoint] = await Promise.all([read('src/App.jsx'), read('functions/_middleware.js'), read('functions/api/campaign-correspondence.js')])
  assert.match(app, /pathname\.startsWith\('\/contribute\/'\).*return undefined/)
  assert.match(middleware, /campaign-contributor-auth/)
  assert.match(endpoint, /contributorFromRequest/)
  assert.match(endpoint, /permission\.canEdit/)
})
