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
  assert.match(page, /Only you and Ash \/ Sabot can see it in this room/)
  assert.match(page, /<strong>PRIVATE<\/strong>/)
  assert.match(page, /<strong>PUBLIC<\/strong>/)
  assert.match(page, /SEND PRIVATE MESSAGE/)
  assert.match(page, /PUBLISH TO WEBSITE/)
  assert.match(page, /confirm\('Publish this publicly/)
  assert.doesNotMatch(page, /email.*required/i)
})

test('public questions are moderated and never delivered directly to contributors', async () => {
  const [publicUi, adminUi] = await Promise.all([read('src/components/CampaignCorrespondence.jsx'), read('src/components/CampaignCorrespondenceAdmin.jsx')])
  assert.match(publicUi, /Sabot Media reviews submissions/)
  assert.match(adminUi, /Public question queue/)
  assert.match(adminUi, /shortlisted.*sent.*answered.*ready.*published.*archived/s)
})

test('private contributor routes skip analytics and private APIs perform their own authorization', async () => {
  const [app, middleware, endpoint, client, storage] = await Promise.all([read('src/App.jsx'), read('functions/_middleware.js'), read('functions/api/campaign-correspondence.js'), read('src/lib/campaignCorrespondenceApi.js'), read('functions/api/_lib/campaignCorrespondence.js')])
  assert.match(app, /pathname\.startsWith\('\/contribute\/'\).*return undefined/)
  assert.match(middleware, /campaign-contributor-auth/)
  assert.match(endpoint, /contributorFromRequest/)
  assert.match(endpoint, /permission\.canEdit/)
  assert.match(client, /x-sabot-contributor-session/)
  assert.match(storage, /x-sabot-contributor-session/)
  assert.match(storage, /datetime\(s\.expires_at\) > datetime\(\?\)/)
  assert.match(endpoint, /Contributor session expired or is invalid/)
})

test('editors can edit and permanently delete correspondence messages', async () => {
  const [admin, client, endpoint, storage] = await Promise.all([read('src/components/CampaignCorrespondenceAdmin.jsx'), read('src/lib/campaignCorrespondenceApi.js'), read('functions/api/campaign-correspondence.js'), read('functions/api/_lib/campaignCorrespondence.js')])
  assert.match(admin, /Save changes/)
  assert.match(admin, /Permanently delete/)
  assert.match(client, /method: 'DELETE'/)
  assert.match(endpoint, /onRequestDelete/)
  assert.match(endpoint, /campaign_correspondence\.message\.delete/)
  assert.match(storage, /UPDATE campaign_messages SET body = \?, visibility = \?, publication_confirmed = \?, status = \?/)
  assert.match(storage, /DELETE FROM campaign_messages WHERE id = \?/)
})

test('every saved campaign uses the same optional correspondence admin module', async () => {
  const admin = await read('src/components/CampaignAdminPage.jsx')
  assert.match(admin, /<CampaignCorrespondenceAdmin campaign=\{draft\} enabled=\{Boolean\(draft\.correspondence\?\.enabled\)\}/)
  assert.doesNotMatch(admin, /draft\.correspondence\?\.enabled \? <CampaignCorrespondenceAdmin/)
})

test('PIN unlock is atomic and editors can replace a lost private link without losing history', async () => {
  const [auth, portal, admin, endpoint, storage] = await Promise.all([read('functions/api/campaign-contributor-auth.js'), read('src/components/CampaignContributorPage.jsx'), read('src/components/CampaignCorrespondenceAdmin.jsx'), read('functions/api/campaign-correspondence.js'), read('functions/api/_lib/campaignCorrespondence.js')])
  assert.match(auth, /messages: await listMessages/)
  assert.match(portal, /data: \{ campaign: data\.campaign, contributor: data\.contributor, messages: data\.messages/)
  assert.doesNotMatch(portal, /authenticateContributor\(token, pin\)[\s\S]{0,240}await load\(data\.session\)/)
  assert.match(admin, /Replace private link/)
  assert.match(admin, /PIN and message history will remain/)
  assert.match(endpoint, /action === 'reissue'/)
  assert.match(storage, /reissueContributorToken/)
  assert.match(storage, /DELETE FROM campaign_contributor_sessions WHERE contributor_id/)
})

test('contributor media uses the complete persistent media binding model and D1 registry', async () => {
  const source = await read('functions/api/campaign-contributor-media.js')
  assert.match(source, /SABOT_MEDIA_BUCKET.*MEDIA_BUCKET.*ASSETS_BUCKET.*SABOT_AUDIO_BUCKET.*AUDIO_MEDIA_BUCKET/s)
  assert.match(source, /upsertMediaAsset/)
  assert.match(source, /campaign_correspondence\.media\.upload/)
  assert.match(source, /storage\.bucket\.delete\(key\)/)
  assert.match(source, /requiredBinding: CANONICAL_MEDIA_BINDING/)
  assert.match(source, /split\(';'\)\[0\]/)
  assert.match(source, /video\/quicktime/)
  assert.match(source, /image\/heic/)
  assert.match(source, /audio\/x-m4a/)
})

test('successful contributor sends update the room without a second session read', async () => {
  const portal = await read('src/components/CampaignContributorPage.jsx')
  assert.match(portal, /const result = await sendMessage/)
  assert.match(portal, /onMessage\(result\.item\)/)
  assert.doesNotMatch(portal, /sendMessage\([\s\S]{0,500}await reload\(\)/)
  assert.match(portal, /onMessageChange\(result\.item\)/)
})

test('private contributor sends cannot become public through a visibility field', async () => {
  const [endpoint, storage, client, portal] = await Promise.all([read('functions/api/campaign-correspondence.js'), read('functions/api/_lib/campaignCorrespondence.js'), read('src/lib/campaignCorrespondenceApi.js'), read('src/components/CampaignContributorPage.jsx')])
  assert.match(endpoint, /body\.action === 'message' \|\| body\.action === 'publish-message'/)
  assert.match(endpoint, /visibility: publishRequested \? 'public' : 'private'/)
  assert.match(endpoint, /publicationConfirmed: publishRequested/)
  assert.match(storage, /m\.publication_confirmed = 1/)
  assert.match(storage, /actor\.permissions\?\.directPublish && actor\.publicationConfirmed/)
  assert.match(client, /action: publish \? 'publish-message' : 'message'/)
  assert.match(portal, /session, publish\)/)
  assert.doesNotMatch(portal, /visibility: publish \? 'public' : 'private'/)
})

test('contributor sessions outrank editor cookies and public reads never expose the private room', async () => {
  const [endpoint, client, admin, portal] = await Promise.all([read('functions/api/campaign-correspondence.js'), read('src/lib/campaignCorrespondenceApi.js'), read('src/components/CampaignCorrespondenceAdmin.jsx'), read('src/components/CampaignContributorPage.jsx')])
  assert.match(endpoint, /if \(contributorSessionSupplied\) \{[\s\S]*contributor\?\.campaignId === campaign\.id/)
  assert.match(endpoint, /permission\.canEdit && url\.searchParams\.get\('view'\) === 'admin'/)
  assert.match(endpoint, /const actingAsContributor = contributorSessionSupplied && contributor/)
  assert.match(client, /admin \? '&view=admin' : ''/)
  assert.match(admin, /loadCorrespondence\(campaign\.slug, '', true\)/)
  assert.match(portal, /PUBLIC · ON THE CAMPAIGN WEBSITE/)
  assert.match(portal, /PRIVATE · ONLY IN THIS ROOM/)
})
